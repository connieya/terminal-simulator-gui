import { Socket } from 'net'
import type { TcpConnectionConfig, TerminalCommand, TerminalResponse } from '../shared/types.js'

/**
 * Java Terminal Simulator와의 TCP 통신을 담당하는 클라이언트
 */
export class TcpClient {
  private socket: Socket | null = null
  private config: TcpConnectionConfig
  private isConnecting = false
  private reconnectTimer: NodeJS.Timeout | null = null
  private messageBuffer: string = ''

  constructor(config: TcpConnectionConfig) {
    this.config = config
  }

  /**
   * TCP 서버에 연결
   */
  async connect(): Promise<void> {
    if (this.socket?.readyState === 'open' || this.isConnecting) {
      return
    }

    return new Promise((resolve, reject) => {
      this.isConnecting = true
      this.socket = new Socket()

      const timeout = setTimeout(() => {
        this.socket?.destroy()
        this.isConnecting = false
        reject(new Error('Connection timeout'))
      }, this.config.timeout || 5000)

      this.socket.on('connect', () => {
        clearTimeout(timeout)
        this.isConnecting = false
        this.clearReconnectTimer()
        console.log(`TCP Connected to ${this.config.host}:${this.config.port}`)
        resolve()
      })

      this.socket.on('error', (error) => {
        clearTimeout(timeout)
        this.isConnecting = false
        console.error('TCP Connection error:', error)
        reject(error)
        this.scheduleReconnect()
      })

      this.socket.on('close', () => {
        console.log('TCP Connection closed')
        this.socket = null
        this.scheduleReconnect()
      })

      this.socket.on('data', (data) => {
        this.handleData(data)
      })

      this.socket.connect(this.config.port, this.config.host)
    })
  }

  /**
   * TCP 서버 연결 해제
   */
  disconnect(): void {
    this.clearReconnectTimer()
    if (this.socket) {
      this.socket.destroy()
      this.socket = null
    }
  }

  /**
   * Java Terminal Simulator에 명령 전송
   */
  async sendCommand(command: TerminalCommand): Promise<TerminalResponse> {
    if (!this.socket || this.socket.readyState !== 'open') {
      throw new Error('Not connected to terminal simulator')
    }

    return new Promise((resolve, reject) => {
      const message = JSON.stringify(command) + '\n' // 줄바꿈으로 메시지 구분
      
      const timeout = setTimeout(() => {
        reject(new Error('Command timeout'))
      }, 10000) // 10초 타임아웃

      // 응답을 기다리는 리스너 (일회성)
      const responseHandler = (response: TerminalResponse) => {
        clearTimeout(timeout)
        resolve(response)
      }

      // 임시로 응답 핸들러 등록 (실제 구현은 handleData에서 처리)
      this.onceResponse(responseHandler)

      this.socket!.write(message, (error) => {
        if (error) {
          clearTimeout(timeout)
          reject(error)
        }
      })
    })
  }

  /**
   * 연결 상태 확인
   */
  isConnected(): boolean {
    return this.socket?.readyState === 'open'
  }

  /**
   * 데이터 수신 처리
   */
  private handleData(data: Buffer): void {
    this.messageBuffer += data.toString()
    
    // 줄바꿈으로 메시지 구분
    const lines = this.messageBuffer.split('\n')
    this.messageBuffer = lines.pop() || '' // 마지막 불완전한 메시지는 버퍼에 보관

    for (const line of lines) {
      if (line.trim()) {
        try {
          const response: TerminalResponse = JSON.parse(line)
          this.emitResponse(response)
        } catch (error) {
          console.error('Failed to parse response:', error, line)
        }
      }
    }
  }

  private responseListeners: Array<(response: TerminalResponse) => void> = []

  private onceResponse(listener: (response: TerminalResponse) => void): void {
    this.responseListeners.push(listener)
  }

  private emitResponse(response: TerminalResponse): void {
    const listeners = [...this.responseListeners]
    this.responseListeners = []
    listeners.forEach(listener => listener(response))
  }

  /**
   * 재연결 스케줄링
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      return
    }

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      if (!this.isConnected() && !this.isConnecting) {
        console.log('Attempting to reconnect...')
        this.connect().catch(console.error)
      }
    }, this.config.reconnectInterval || 3000)
  }

  /**
   * 재연결 타이머 클리어
   */
  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
  }
}

