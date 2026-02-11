const { contextBridge, ipcRenderer } = require('electron');
// Electron Preload Script
// Renderer와 Main Process 간의 안전한 통신을 설정합니다
console.log('[Preload] Preload script loaded');
contextBridge.exposeInMainWorld('electronAPI', {
    // TCP 통신 API
    tcp: {
        // TCP 서버에 연결
        connect: (config) => ipcRenderer.invoke('tcp:connect', config),
        // TCP 연결 해제
        disconnect: () => ipcRenderer.invoke('tcp:disconnect'),
        // 연결 상태 확인
        isConnected: () => ipcRenderer.invoke('tcp:isConnected'),
        // 명령 전송
        sendCommand: (command) => ipcRenderer.invoke('tcp:sendCommand', command),
        // 카드 탭 트리거 (편의 함수)
        tapCard: (cardData) => ipcRenderer.invoke('tcp:tapCard', cardData),
    },
});
export {};
