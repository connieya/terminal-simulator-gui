/**
 * PC/SC 카드 리더 연동 모듈
 * 리더 목록 조회, 선택, 연결/해제 및 카드 감지 이벤트 진입점 제공
 */
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
// pcsclite는 네이티브 모듈이므로 로드 실패 시 선택적으로 처리
let pcscliteFactory = null;
try {
    pcscliteFactory = require("pcsclite");
}
catch (err) {
    console.warn("[CardReader] pcsclite 모듈을 로드할 수 없습니다:", err);
    console.warn("[CardReader] 카드 리더 기능이 비활성화됩니다.");
}
/** PC/SC 카드 감지 상태 (카드가 리더에 있음) */
const SCARD_STATE_PRESENT = 0x20;
let pcscInstance = null;
/** 현재 선택해 연결한 리더 이름. 연결 해제 시 null */
let connectedReaderName = null;
/** 연결 시 확정된 프로토콜 (T=0/T=1). transmit 시 사용 */
let connectedProtocol = null;
/** PC/SC 초기화. 한 번만 생성 */
function ensurePcsc() {
    if (!pcscliteFactory) {
        throw new Error("pcsclite 모듈을 사용할 수 없습니다. 카드 리더 기능이 비활성화되어 있습니다.");
    }
    if (!pcscInstance) {
        pcscInstance = pcscliteFactory();
        pcscInstance.on("error", (err) => {
            console.error("[CardReader] PC/SC error:", err.message);
        });
    }
    return pcscInstance;
}
/**
 * 리더 목록 조회
 * PC/SC가 비동기로 리더를 채우므로 짧은 대기 후 반환
 */
export function listReaders() {
    if (!pcscliteFactory) {
        return Promise.resolve([]);
    }
    try {
        const pcsc = ensurePcsc();
        return new Promise((resolve) => {
            const timeout = 600;
            setTimeout(() => {
                const names = Object.keys(pcsc.readers || {});
                resolve(names);
            }, timeout);
        });
    }
    catch (err) {
        console.warn("[CardReader] listReaders 실패:", err);
        return Promise.resolve([]);
    }
}
/**
 * 지정한 리더에 연결
 */
export function connectReader(readerName) {
    if (!pcscliteFactory) {
        return Promise.reject(new Error("pcsclite 모듈을 사용할 수 없습니다."));
    }
    try {
        const pcsc = ensurePcsc();
        const reader = pcsc.readers?.[readerName];
        if (!reader) {
            return Promise.reject(new Error(`리더를 찾을 수 없음: ${readerName}`));
        }
        return new Promise((resolve, reject) => {
            const shareMode = reader.SCARD_SHARE_SHARED ?? reader.SCARD_SHARE_EXCLUSIVE ?? 2;
            const protocol = (reader.SCARD_PROTOCOL_T0 ?? 1) | (reader.SCARD_PROTOCOL_T1 ?? 2);
            reader.connect({ share_mode: shareMode, protocol }, (err, protocolEstablished) => {
                if (err) {
                    reject(err);
                    return;
                }
                connectedReaderName = readerName;
                connectedProtocol = protocolEstablished ?? protocol ?? 0;
                resolve();
            });
        });
    }
    catch (err) {
        return Promise.reject(err);
    }
}
/**
 * 현재 연결된 리더 연결 해제
 */
export function disconnectReader() {
    if (!connectedReaderName || !pcscInstance?.readers) {
        connectedReaderName = null;
        return Promise.resolve();
    }
    const reader = pcscInstance.readers[connectedReaderName];
    if (!reader) {
        connectedReaderName = null;
        return Promise.resolve();
    }
    return new Promise((resolve) => {
        const disposition = reader.SCARD_LEAVE_CARD ?? reader.SCARD_UNPOWER_CARD ?? 0;
        reader.disconnect(disposition, () => {
            connectedReaderName = null;
            connectedProtocol = null;
            resolve();
        });
    });
}
/**
 * 연결된 리더로 APDU 전송 (EMV 트랜잭션용)
 */
export function transmitApdu(command, maxResponseLength = 256) {
    if (!pcscliteFactory) {
        return Promise.reject(new Error("pcsclite 모듈을 사용할 수 없습니다."));
    }
    if (!connectedReaderName ||
        connectedProtocol == null ||
        !pcscInstance?.readers) {
        return Promise.reject(new Error("카드 리더에 연결되지 않았습니다."));
    }
    const reader = pcscInstance.readers[connectedReaderName];
    if (!reader) {
        return Promise.reject(new Error("리더를 찾을 수 없습니다."));
    }
    const protocol = connectedProtocol;
    return new Promise((resolve, reject) => {
        reader.transmit(command, maxResponseLength, protocol, (err, data) => {
            if (err) {
                reject(err);
                return;
            }
            resolve(data ?? Buffer.alloc(0));
        });
    });
}
/**
 * 현재 연결 상태 반환
 */
export function getConnectionStatus() {
    return {
        connected: connectedReaderName != null,
        readerName: connectedReaderName,
    };
}
/**
 * 카드 탭 시 사용: 이미 연결돼 있으면 그대로, 아니면 리더 목록에서 첫 번째 리더로 연결
 * (카드 없이 연결 시도하므로 실패할 수 있음 → 직접 거래에는 waitForCardAndConnect 사용 권장)
 */
export async function ensureConnected() {
    const status = getConnectionStatus();
    if (status.connected && status.readerName) {
        return { success: true, readerName: status.readerName };
    }
    const names = await listReaders();
    if (names.length === 0) {
        return { success: false, error: "연결된 카드 리더가 없습니다." };
    }
    try {
        await connectReader(names[0]);
        return { success: true, readerName: names[0] };
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : "리더 연결 실패";
        return { success: false, error: msg };
    }
}
/** 카드 탭 대기 기본 타임아웃(ms) */
const DEFAULT_WAIT_CARD_TIMEOUT_MS = 30_000;
/**
 * 카드 탭 버튼용: 리더에서 카드가 감지될 때까지 대기한 뒤 연결
 * 리더에 카드가 없으면 SCardConnect가 실패하므로, status 이벤트로 카드 감지 후 connect
 */
export function waitForCardAndConnect(options) {
    if (!pcscliteFactory) {
        return Promise.resolve({
            success: false,
            error: "pcsclite 모듈을 사용할 수 없습니다. 카드 리더 기능이 비활성화되어 있습니다.",
        });
    }
    const status = getConnectionStatus();
    if (status.connected && status.readerName) {
        return Promise.resolve({ success: true, readerName: status.readerName });
    }
    const timeoutMs = options?.timeoutMs ?? DEFAULT_WAIT_CARD_TIMEOUT_MS;
    let pcsc;
    try {
        pcsc = ensurePcsc();
    }
    catch (err) {
        return Promise.resolve({
            success: false,
            error: err instanceof Error ? err.message : "PC/SC 초기화 실패",
        });
    }
    return new Promise((resolve) => {
        let resolved = false;
        let timeoutId = null;
        let removeStatusListener = null;
        const finish = (result) => {
            if (resolved)
                return;
            resolved = true;
            if (timeoutId != null)
                clearTimeout(timeoutId);
            removeStatusListener?.();
            resolve(result);
        };
        const run = async () => {
            const names = await listReaders();
            if (names.length === 0) {
                finish({ success: false, error: "연결된 카드 리더가 없습니다." });
                return;
            }
            const readerName = names[0];
            const reader = pcsc.readers?.[readerName];
            if (!reader) {
                finish({ success: false, error: `리더를 찾을 수 없음: ${readerName}` });
                return;
            }
            const onStatus = (status) => {
                if ((status.state & SCARD_STATE_PRESENT) === 0)
                    return;
                removeStatusListener?.();
                removeStatusListener = null;
                if (resolved)
                    return;
                connectReader(readerName)
                    .then(() => finish({ success: true, readerName }))
                    .catch((err) => finish({
                    success: false,
                    error: err instanceof Error ? err.message : "리더 연결 실패",
                }));
            };
            reader.on("status", onStatus);
            removeStatusListener = () => {
                const r = reader;
                if (typeof r.removeListener === "function") {
                    r.removeListener("status", onStatus);
                }
            };
            timeoutId = setTimeout(() => {
                if (resolved)
                    return;
                finish({
                    success: false,
                    error: "카드 태그 대기 시간이 초과되었습니다. 리더에 카드를 태그해 주세요.",
                });
            }, timeoutMs);
        };
        run();
    });
}
/**
 * PC/SC 리소스 해제 (앱 종료 시 호출)
 */
export function closePcsc() {
    if (pcscInstance) {
        try {
            pcscInstance.close();
        }
        catch {
            // no-op
        }
        pcscInstance = null;
    }
    connectedReaderName = null;
}
/**
 * 카드 감지 시 콜백 등록용: 지정 리더의 'status' 이벤트에 리스너 부착
 * Main에서 IPC로 Renderer에 알릴 때 사용할 수 있도록 리더 참조 반환
 */
export function onReaderStatus(readerName, callback) {
    if (!pcscliteFactory) {
        return () => { };
    }
    try {
        const pcsc = ensurePcsc();
        const reader = pcsc.readers?.[readerName];
        if (!reader) {
            return () => { };
        }
        reader.on("status", callback);
        return () => {
            const r = reader;
            if (typeof r.removeListener === "function") {
                r.removeListener("status", callback);
            }
        };
    }
    catch (err) {
        console.warn("[CardReader] onReaderStatus 실패:", err);
        return () => { };
    }
}
