import type { TcpConnectionConfig } from '@shared/types'

/**
 * 직접 거래 시 Sign On 할 서버 주소.
 * psp-server-tps TerminalTlvServer 기본 포트 21000
 */
export const DIRECT_TCP_CONFIG: TcpConnectionConfig = {
  host: 'localhost',
  port: 21000,
  timeout: 5000,
  reconnectInterval: 3000,
}
