/**
 * Java Terminal Simulator와의 TCP 통신을 위한 타입 정의
 */

// TCP 연결 상태
export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error'

// DAEMON_START_STATE 기반 부트 시퀀스
export type BootStage =
  | 'off'              // 종료 상태
  | 'daemon_connect'   // 데몬 연결
  | 'reader_detect'    // 리더기 감지
  | 'vsam_detect'      // VSAM 감지
  | 'lib_init'         // 라이브러리 초기화
  | 'list_sync'        // 리스트 동기화
  | 'ready'            // 운영 대기

export const BOOT_STAGES: { stage: BootStage; label: string }[] = [
  { stage: 'daemon_connect', label: '데몬 연결' },
  { stage: 'reader_detect', label: '리더기 감지' },
  { stage: 'vsam_detect', label: 'VSAM 감지' },
  { stage: 'lib_init', label: '라이브러리 초기화' },
  { stage: 'list_sync', label: '리스트 동기화' },
  { stage: 'ready', label: '운영 대기' },
]

// 카드 탭 명령 타입
export type CardTapCommand = {
  type: 'card_tap'
  cardType?: 'transport' | 'credit' | 'debit' // 카드 타입 (선택적)
  cardData?: string // 카드 데이터 (선택적, 없으면 랜덤 생성)
}

// 단말기 타입 (승차/하차)
export type TerminalType = 'entry' | 'exit' // entry: 승차, exit: 하차

// 단말기 정보
export type TerminalInfo = {
  id: string
  transitType?: 'subway' | 'bus' // 단말기 구분 (지하철/버스)
  terminalId: string // Terminal ID (예: "T001", "T002")
  name: string // 예: "2호선 홍대입구역"
  line?: string // 예: "2호선"
  station?: string // 예: "홍대입구역"
  type: TerminalType // 'entry': 승차, 'exit': 하차
  isPoweredOn: boolean
  isConnected: boolean
  bootStage: BootStage  // 현재 부트 스테이지 (기본값: 'off')
  lastCommandTime?: number
}

// 단말기 명령 타입 (Java Terminal Simulator CLI 명령어)
export type TerminalCommandType =
  | 'signon'      // 터미널 구동
  | 'signoff'     // 터미널 종료
  | 'echo-test'   // 에코 테스트
  | 'sync'        // 동기화
  | 'card_tap'    // 카드 탭
  | 'ping'        // 핑
  | 'status'      // 상태 확인
  | 'reset'       // 리셋
  | 'list_sync'   // CLIB 리스트 동기화 (관리 서버용)

// 단말기 명령
export type TerminalCommand = {
  type: TerminalCommandType
  terminalId?: string // 단말기 ID (선택적)
  terminalType?: 'entry' | 'exit' // 승차/하차 구분 (sync 명령어용)
  transitType?: 'subway' | 'bus' // 지하철/버스 구분 (선택적)
  station?: string // 역 이름 (sync 명령어용)
  /** GUI→Simulator JSON 전송 시 사용. 있으면 presetKey 대신 terminalId+journeyLog로 전송 */
  journeyLog?: string
  /** @deprecated GUI JSON 사용 시 불필요. CLI 경로용 preset 이름 */
  presetKey?: string
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

// 추후 확장용: 직접 거래에서 카드 탭을 별도 핸들러로 주입할 경우 사용
// export type CardTapContext = {
//   terminal: TerminalInfo
//   getJourneyLog: () => string | undefined
//   getPresetKey: () => string
//   station?: string
//   line?: string
//   terminalType: TerminalType
// }

// TCP 연결 설정
export type TcpConnectionConfig = {
  host: string
  port: number
  timeout?: number // 연결 타임아웃 (ms)
  reconnectInterval?: number // 재연결 간격 (ms)
}

/** 직접 거래(TPS) 서버 기본 포트. electron tcpClient에서 TLV 모드 판별에 사용 */
export const DIRECT_TRADE_PORT = 21000

/** 관리 서버(terminal-transaction-server) 기본 포트. CLIB 바이너리 프로토콜 사용 */
export const MGMT_SERVER_PORT = 21000

// 기본 TCP 설정
export const DEFAULT_TCP_CONFIG: TcpConnectionConfig = {
  host: 'localhost',
  port: 9999, // Java Terminal Simulator 소켓 서버 포트
  timeout: 5000,
  reconnectInterval: 3000,
}

// 관리 서버 기본 TCP 설정 (CLIB 바이너리 프로토콜)
export const DEFAULT_MGMT_TCP_CONFIG: TcpConnectionConfig = {
  host: 'localhost',
  port: MGMT_SERVER_PORT,
  timeout: 5000,
  reconnectInterval: 3000,
}

