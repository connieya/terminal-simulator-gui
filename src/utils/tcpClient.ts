/**
 * React에서 사용할 TCP 클라이언트 래퍼
 * Electron API를 타입 안전하게 사용할 수 있도록 래핑
 */

import type { TcpConnectionConfig, TerminalCommand, TerminalResponse } from '@shared/types'

// Electron API 타입 정의
declare global {
  interface Window {
    electronAPI: {
      tcp: {
        connect: (config?: TcpConnectionConfig) => Promise<{ success: boolean; error?: string }>
        disconnect: () => Promise<{ success: boolean; error?: string }>
        isConnected: () => Promise<boolean>
        sendCommand: (command: TerminalCommand) => Promise<{
          success: boolean
          response?: TerminalResponse
          error?: string
        }>
        tapCard: (cardData?: { type?: string; data?: string }) => Promise<{
          success: boolean
          response?: TerminalResponse
          error?: string
        }>
      }
    }
  }
}

/**
 * TCP 클라이언트 클래스
 */
export class TcpClientService {
  /**
   * TCP 서버에 연결
   */
  async connect(config?: TcpConnectionConfig): Promise<void> {
    console.log('[TcpClient] connect called, window.electronAPI:', window.electronAPI)
    if (!window.electronAPI) {
      console.error('[TcpClient] Electron API is not available')
      throw new Error('Electron API is not available. Please run this application in Electron, not in a web browser.')
    }
    const result = await window.electronAPI.tcp.connect(config)
    if (!result.success) {
      throw new Error(result.error || 'Failed to connect')
    }
  }

  /**
   * TCP 연결 해제
   */
  async disconnect(): Promise<void> {
    if (!window.electronAPI) {
      throw new Error('Electron API is not available')
    }
    const result = await window.electronAPI.tcp.disconnect()
    if (!result.success) {
      throw new Error(result.error || 'Failed to disconnect')
    }
  }

  /**
   * 연결 상태 확인
   */
  async isConnected(): Promise<boolean> {
    if (!window.electronAPI) {
      return false
    }
    return await window.electronAPI.tcp.isConnected()
  }

  /**
   * 명령 전송
   */
  async sendCommand(command: TerminalCommand): Promise<TerminalResponse> {
    if (!window.electronAPI) {
      throw new Error('Electron API is not available')
    }
    const result = await window.electronAPI.tcp.sendCommand(command)
    if (!result.success) {
      throw new Error(result.error || 'Failed to send command')
    }
    if (!result.response) {
      throw new Error('No response received')
    }
    return result.response
  }

  /**
   * 카드 탭 트리거
   */
  async tapCard(cardData?: { type?: 'transport' | 'credit' | 'debit'; data?: string }): Promise<TerminalResponse> {
    if (!window.electronAPI) {
      throw new Error('Electron API is not available')
    }
    const result = await window.electronAPI.tcp.tapCard(cardData)
    if (!result.success) {
      throw new Error(result.error || 'Failed to tap card')
    }
    if (!result.response) {
      throw new Error('No response received')
    }
    return result.response
  }
}

// 싱글톤 인스턴스
export const tcpClient = new TcpClientService()

