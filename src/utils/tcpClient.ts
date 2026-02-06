/**
 * React에서 사용할 TCP 클라이언트 래퍼
 * Electron API를 타입 안전하게 사용할 수 있도록 래핑
 */

import type { TcpConnectionConfig, TerminalCommand, TerminalResponse } from '@shared/types'
import { useTcpLogStore } from '@/stores/tcpLogStore'

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
  private addLog = (direction: 'out' | 'in' | 'info' | 'error', message: string) => {
    useTcpLogStore.getState().addLog({
      direction,
      message,
      timestamp: Date.now(),
    })
  }

  /**
   * TCP 서버에 연결
   */
  async connect(config?: TcpConnectionConfig): Promise<void> {
    console.log('[TcpClient] connect called, window.electronAPI:', window.electronAPI)
    if (!window.electronAPI) {
      console.error('[TcpClient] Electron API is not available')
      this.addLog('error', 'Electron API를 찾을 수 없습니다. Electron 환경에서 실행하세요.')
      throw new Error('Electron API is not available. Please run this application in Electron, not in a web browser.')
    }
    this.addLog('info', `TCP 연결 시도: ${config?.host ?? 'localhost'}:${config?.port ?? 9999}`)
    const result = await window.electronAPI.tcp.connect(config)
    if (!result.success) {
      this.addLog('error', `TCP 연결 실패: ${result.error || 'Unknown error'}`)
      throw new Error(result.error || 'Failed to connect')
    }
    this.addLog('info', 'TCP 연결 성공')
  }

  /**
   * TCP 연결 해제
   */
  async disconnect(): Promise<void> {
    if (!window.electronAPI) {
      this.addLog('error', 'Electron API를 찾을 수 없습니다. Electron 환경에서 실행하세요.')
      throw new Error('Electron API is not available')
    }
    this.addLog('info', 'TCP 연결 해제 시도')
    const result = await window.electronAPI.tcp.disconnect()
    if (!result.success) {
      this.addLog('error', `TCP 연결 해제 실패: ${result.error || 'Unknown error'}`)
      throw new Error(result.error || 'Failed to disconnect')
    }
    this.addLog('info', 'TCP 연결 해제 완료')
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
      this.addLog('error', 'Electron API를 찾을 수 없습니다. Electron 환경에서 실행하세요.')
      throw new Error('Electron API is not available')
    }
    this.addLog('out', `명령 전송: ${JSON.stringify(command)}`)
    const result = await window.electronAPI.tcp.sendCommand(command)
    if (!result.success) {
      this.addLog('error', `명령 실패: ${result.error || 'Unknown error'}`)
      throw new Error(result.error || 'Failed to send command')
    }
    if (!result.response) {
      this.addLog('error', '응답이 없습니다.')
      throw new Error('No response received')
    }
    this.addLog('in', `응답 수신: ${JSON.stringify(result.response)}`)
    return result.response
  }

  /**
   * 카드 탭 트리거
   */
  async tapCard(cardData?: { type?: 'transport' | 'credit' | 'debit'; data?: string }): Promise<TerminalResponse> {
    if (!window.electronAPI) {
      this.addLog('error', 'Electron API를 찾을 수 없습니다. Electron 환경에서 실행하세요.')
      throw new Error('Electron API is not available')
    }
    this.addLog('out', `카드 탭 요청: ${JSON.stringify(cardData ?? {})}`)
    const result = await window.electronAPI.tcp.tapCard(cardData)
    if (!result.success) {
      this.addLog('error', `카드 탭 실패: ${result.error || 'Unknown error'}`)
      throw new Error(result.error || 'Failed to tap card')
    }
    if (!result.response) {
      this.addLog('error', '응답이 없습니다.')
      throw new Error('No response received')
    }
    this.addLog('in', `카드 탭 응답: ${JSON.stringify(result.response)}`)
    return result.response
  }
}

// 싱글톤 인스턴스
export const tcpClient = new TcpClientService()

