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

// 단말기 정보
export type TerminalInfo = {
  id: string
  name: string // 예: "2호선 홍대입구역"
  line?: string // 예: "2호선"
  station?: string // 예: "홍대입구역"
  isPoweredOn: boolean
  isConnected: boolean
  lastCommandTime?: number
}

// 단말기 명령 타입 (Java Terminal Simulator CLI 명령어)
export type TerminalCommandType = 
  | 'signon'      // 전원 켜기
  | 'signoff'     // 전원 끄기
  | 'echo-test'   // 에코 테스트
  | 'sync'        // 동기화
  | 'card_tap'    // 카드 탭
  | 'ping'        // 핑
  | 'status'      // 상태 확인
  | 'reset'       // 리셋

// 단말기 명령
export type TerminalCommand = {
  type: TerminalCommandType
  terminalId?: string // 단말기 ID (선택적)
  cardType?: 'transport' | 'credit' | 'debit'
  cardData?: string
  [key: string]: unknown // 기타 명령 파라미터
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

