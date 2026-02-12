import { TerminalWorkspace } from '@/components/TerminalWorkspace'
import { DIRECT_TCP_CONFIG } from '@/config/tcp'

/**
 * 직접 거래 페이지
 * psp-server-tps(TLV)와 직접 통신하는 모드
 */
export function DirectTradePage() {
  return <TerminalWorkspace tcpConfig={DIRECT_TCP_CONFIG} />
}
