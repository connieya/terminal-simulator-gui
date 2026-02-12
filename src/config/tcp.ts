import type { TcpConnectionConfig } from '@shared/types'
import { DIRECT_TRADE_PORT } from '@shared/types'

/**
 * 직접 거래 시 Sign On 할 서버 주소.
 * psp-server-tps TerminalTlvServer 기본 포트
 */
export const DIRECT_TCP_CONFIG: TcpConnectionConfig = {
  host: 'localhost',
  port: DIRECT_TRADE_PORT,
  timeout: 5000,
  reconnectInterval: 3000,
}
