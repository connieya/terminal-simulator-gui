import { app, BrowserWindow, ipcMain } from "electron";
import path from "path";
import { fileURLToPath } from "url";
import { TcpClient } from "./tcpClient.js";
import { listReaders, connectReader, disconnectReader, getConnectionStatus, ensureConnected, waitForCardAndConnect, transmitApdu, closePcsc, } from "./cardReader.js";
import { runEmvContactless } from "./emvContactless.js";
// ESM에서 __dirname 정의
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Electron Main Process
let mainWindow = null;
let tcpClient = null;
/** Main에서 Renderer 우측 TCP 로그 패널로 로그 푸시 (EMV 단계 등) */
function sendTcpLog(direction, message) {
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send("tcp-log:add", { direction, message });
    }
}
const DEFAULT_CONFIG = {
    host: "localhost",
    port: 9999, // Java Terminal Simulator 소켓 서버 포트
    timeout: 5000,
    reconnectInterval: 3000,
};
function createWindow() {
    // 개발 모드와 프로덕션 모드에서 preload 경로 설정
    const isDev = process.env.NODE_ENV === "development" || !app.isPackaged;
    // preload는 항상 JavaScript 파일이어야 함 (Electron 제약)
    // 빌드된 파일을 사용하므로 __dirname은 dist-electron/electron/을 가리킴
    // 절대 경로로 변환 (Electron은 절대 경로를 요구함)
    const preloadPath = path.resolve(__dirname, "preload.js");
    console.log("[Main] Preload path:", preloadPath);
    console.log("[Main] __dirname:", __dirname);
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            preload: preloadPath,
            contextIsolation: true,
            nodeIntegration: false,
        },
    });
    // 개발 모드에서는 Vite dev server를 사용
    if (isDev) {
        // 포트가 5173이 아닐 수 있으므로 환경 변수에서 가져오거나 기본값 사용
        // Vite가 다른 포트를 사용할 경우 환경 변수로 전달
        const port = process.env.VITE_PORT || process.env.PORT || "5175";
        const url = `http://localhost:${port}`;
        console.log(`Loading Vite dev server: ${url}`);
        if (mainWindow) {
            mainWindow.loadURL(url).catch((err) => {
                console.error("Failed to load URL:", err);
                // 포트를 찾지 못하면 다른 포트 시도
                if (mainWindow) {
                    const altPort = port === "5173" ? "5174" : "5173";
                    console.log(`Trying alternative port: ${altPort}`);
                    mainWindow
                        .loadURL(`http://localhost:${altPort}`)
                        .catch(console.error);
                }
            });
            mainWindow.webContents.openDevTools();
        }
    }
    else {
        if (mainWindow) {
            mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
        }
    }
    mainWindow.on("closed", () => {
        mainWindow = null;
    });
}
// TCP 클라이언트 초기화
function initTcpClient(config = DEFAULT_CONFIG) {
    if (tcpClient) {
        tcpClient.disconnect();
    }
    tcpClient = new TcpClient(config);
}
// IPC 핸들러 등록
function setupIpcHandlers() {
    // TCP 연결
    ipcMain.handle("tcp:connect", async (_, config) => {
        try {
            // config가 제공되면 새로운 클라이언트 생성, 없으면 기본값 사용
            const connectionConfig = config || DEFAULT_CONFIG;
            // 기존 연결이 있으면 먼저 끊기
            if (tcpClient) {
                tcpClient.disconnect();
                tcpClient = null;
            }
            // 새로운 클라이언트 생성 및 연결
            initTcpClient(connectionConfig);
            await tcpClient.connect();
            console.log(`TCP connected to ${connectionConfig.host}:${connectionConfig.port}`);
            return { success: true };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Unknown error";
            console.error("TCP connection failed:", errorMessage);
            return {
                success: false,
                error: errorMessage,
            };
        }
    });
    // TCP 연결 해제
    ipcMain.handle("tcp:disconnect", async () => {
        try {
            if (tcpClient) {
                tcpClient.disconnect();
                tcpClient = null;
            }
            return { success: true };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : "Unknown error",
            };
        }
    });
    // 연결 상태 확인
    ipcMain.handle("tcp:isConnected", () => {
        return tcpClient?.isConnected() || false;
    });
    // 명령 전송
    ipcMain.handle("tcp:sendCommand", async (_, command) => {
        try {
            if (!tcpClient || !tcpClient.isConnected()) {
                throw new Error("Not connected to terminal simulator");
            }
            const response = await tcpClient.sendCommand(command);
            return { success: true, response };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : "Unknown error",
            };
        }
    });
    // 카드 탭 트리거 (편의 함수)
    ipcMain.handle("tcp:tapCard", async (_, cardData) => {
        try {
            if (!tcpClient || !tcpClient.isConnected()) {
                throw new Error("Not connected to terminal simulator");
            }
            const command = {
                type: "card_tap",
                cardType: cardData?.type,
                cardData: cardData?.data,
            };
            const response = await tcpClient.sendCommand(command);
            return { success: true, response };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : "Unknown error",
            };
        }
    });
    // PC/SC 카드 리더 API
    ipcMain.handle("cardReader:listReaders", async () => {
        try {
            const readers = await listReaders();
            return { success: true, readers };
        }
        catch (error) {
            const msg = error instanceof Error ? error.message : "Unknown error";
            console.error("[Main] cardReader:listReaders failed:", msg);
            return { success: false, error: msg, readers: [] };
        }
    });
    ipcMain.handle("cardReader:connect", async (_, readerName) => {
        try {
            await connectReader(readerName);
            return { success: true };
        }
        catch (error) {
            const msg = error instanceof Error ? error.message : "Unknown error";
            console.error("[Main] cardReader:connect failed:", msg);
            return { success: false, error: msg };
        }
    });
    ipcMain.handle("cardReader:disconnect", async () => {
        try {
            await disconnectReader();
            return { success: true };
        }
        catch (error) {
            const msg = error instanceof Error ? error.message : "Unknown error";
            console.error("[Main] cardReader:disconnect failed:", msg);
            return { success: false, error: msg };
        }
    });
    ipcMain.handle("cardReader:getStatus", () => {
        return getConnectionStatus();
    });
    /** 카드 탭 시: 연결돼 있지 않으면 첫 번째 리더로 자동 연결 (카드 없이 시도 → 실패 가능) */
    ipcMain.handle("cardReader:ensureConnected", async () => {
        try {
            return await ensureConnected();
        }
        catch (error) {
            const msg = error instanceof Error ? error.message : "Unknown error";
            console.error("[Main] cardReader:ensureConnected failed:", msg);
            return { success: false, error: msg };
        }
    });
    /** 카드 탭 시: 리더에 카드가 태그될 때까지 대기(최대 30초) 후 연결 */
    ipcMain.handle("cardReader:waitForCardAndConnect", async (_, options) => {
        try {
            return await waitForCardAndConnect(options);
        }
        catch (error) {
            const msg = error instanceof Error ? error.message : "Unknown error";
            console.error("[Main] cardReader:waitForCardAndConnect failed:", msg);
            return { success: false, error: msg };
        }
    });
    /** EMV Contactless 트랜잭션: 카드 대기 → PPSE → AID → GPO → Read Record → ICC Data, 로그는 sendTcpLog로 전송 */
    ipcMain.handle("cardReader:runEmvTransaction", async () => {
        try {
            sendTcpLog("info", "EMV Contactless 트랜잭션 시작");
            const connectResult = await waitForCardAndConnect({ timeoutMs: 30_000 });
            if (!connectResult.success) {
                sendTcpLog("error", connectResult.error ?? "리더 연결 실패");
                return {
                    success: false,
                    error: connectResult.error,
                    iccDataHex: undefined,
                };
            }
            const result = await runEmvContactless((cmd) => transmitApdu(cmd, 512), sendTcpLog);
            if (!result.success) {
                return { success: false, error: result.error, iccDataHex: undefined };
            }
            return {
                success: true,
                iccDataHex: result.iccData?.toString("hex"),
                error: undefined,
            };
        }
        catch (error) {
            const msg = error instanceof Error ? error.message : "Unknown error";
            sendTcpLog("error", msg);
            console.error("[Main] cardReader:runEmvTransaction failed:", msg);
            return { success: false, error: msg, iccDataHex: undefined };
        }
    });
}
app.whenReady().then(() => {
    setupIpcHandlers();
    initTcpClient();
    createWindow();
    app.on("activate", () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});
app.on("window-all-closed", () => {
    if (tcpClient) {
        tcpClient.disconnect();
    }
    if (process.platform !== "darwin") {
        app.quit();
    }
});
app.on("before-quit", () => {
    if (tcpClient) {
        tcpClient.disconnect();
    }
    closePcsc();
});
