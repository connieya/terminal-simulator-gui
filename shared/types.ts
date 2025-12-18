/**
 * Java Terminal Simulator와의 TCP 통신을 위한 타입 정의
 */

// TCP 연결 상태
export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error'

// 카드 탭 명령 타입
export type CardTapCommand = {
  type: 'card_tap'
  cardType?: 'transport' | 'credit' | 'debit' // 카드 타입 (선택적)
  cardData?: string // 카드 데이터 (선택적, 없으면 랜덤 생성)
}

// 일반 명령 타입
export type TerminalCommand = CardTapCommand | {
  type: 'ping' | 'status' | 'reset'
}

// Java Terminal Simulator로부터 받는 응답
export type TerminalResponse = {
  success: boolean
  message?: string
  data?: unknown
  timestamp: number
}

// TCP 연결 설정
export type TcpConnectionConfig = {
  host: string
  port: number
  timeout?: number // 연결 타임아웃 (ms)
  reconnectInterval?: number // 재연결 간격 (ms)
}

// 기본 TCP 설정
export const DEFAULT_TCP_CONFIG: TcpConnectionConfig = {
  host: 'localhost',
  port: 8080, // Java Terminal Simulator의 기본 포트 (필요시 변경)
  timeout: 5000,
  reconnectInterval: 3000,
}

