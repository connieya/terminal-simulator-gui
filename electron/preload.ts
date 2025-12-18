import { contextBridge, ipcRenderer } from 'electron'
import type { TcpConnectionConfig, TerminalCommand, TerminalResponse } from '../shared/types.js'

// Electron Preload Script
// Renderer와 Main Process 간의 안전한 통신을 설정합니다

contextBridge.exposeInMainWorld('electronAPI', {
  // TCP 통신 API
  tcp: {
    // TCP 서버에 연결
    connect: (config?: TcpConnectionConfig) => 
      ipcRenderer.invoke('tcp:connect', config) as Promise<{ success: boolean; error?: string }>,
    
    // TCP 연결 해제
    disconnect: () => 
      ipcRenderer.invoke('tcp:disconnect') as Promise<{ success: boolean; error?: string }>,
    
    // 연결 상태 확인
    isConnected: () => 
      ipcRenderer.invoke('tcp:isConnected') as Promise<boolean>,
    
    // 명령 전송
    sendCommand: (command: TerminalCommand) => 
      ipcRenderer.invoke('tcp:sendCommand', command) as Promise<{ 
        success: boolean
        response?: TerminalResponse
        error?: string 
      }>,
    
    // 카드 탭 트리거 (편의 함수)
    tapCard: (cardData?: { type?: string; data?: string }) => 
      ipcRenderer.invoke('tcp:tapCard', cardData) as Promise<{ 
        success: boolean
        response?: TerminalResponse
        error?: string 
      }>,
  },
})

