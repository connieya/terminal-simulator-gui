const { contextBridge, ipcRenderer } = require("electron");
// Electron Preload Script
// Renderer와 Main Process 간의 안전한 통신을 설정합니다
console.log("[Preload] Preload script loaded");
contextBridge.exposeInMainWorld("electronAPI", {
    // TCP 통신 API
    tcp: {
        // TCP 서버에 연결
        connect: (config) => ipcRenderer.invoke("tcp:connect", config),
        // TCP 연결 해제
        disconnect: () => ipcRenderer.invoke("tcp:disconnect"),
        // 연결 상태 확인
        isConnected: () => ipcRenderer.invoke("tcp:isConnected"),
        // 명령 전송
        sendCommand: (command) => ipcRenderer.invoke("tcp:sendCommand", command),
        // 카드 탭 트리거 (편의 함수)
        tapCard: (cardData) => ipcRenderer.invoke("tcp:tapCard", cardData),
    },
    // PC/SC 카드 리더 API (직접 거래 카드 탭 시 카드 태그 대기 후 연결)
    cardReader: {
        waitForCardAndConnect: (options) => ipcRenderer.invoke("cardReader:waitForCardAndConnect", options),
        runEmvTransaction: () => ipcRenderer.invoke("cardReader:runEmvTransaction"),
    },
    /** Main에서 보내는 로그 수신 (EMV 단계 등) - 구독 해제용 함수 반환 */
    onTcpLogAdd: (callback) => {
        const handler = (_event, entry) => {
            callback(entry);
        };
        ipcRenderer.on("tcp-log:add", handler);
        return () => ipcRenderer.removeListener("tcp-log:add", handler);
    },
});
export {};
