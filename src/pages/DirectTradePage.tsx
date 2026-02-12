import { TerminalWorkspace } from '@/components/TerminalWorkspace'
import { DIRECT_TCP_CONFIG } from '@/config/tcp'

/**
 * 직접 거래 페이지
 * Sign On 시 시뮬레이터가 아닌 TPS 서버에 직접 연결한다.
 */
export function DirectTradePage() {
  return <TerminalWorkspace tcpConfig={DIRECT_TCP_CONFIG} />
}
