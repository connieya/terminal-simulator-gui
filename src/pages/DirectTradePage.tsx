import { TerminalWorkspace } from '@/components/TerminalWorkspace'
import { DIRECT_TCP_CONFIG } from '@/config/tcp'

/**
 * 직접 거래 페이지
 * Sign On 시 시뮬레이터가 아닌 TPS 서버에 직접 연결한다.
 * 카드 탭 클릭 시 PC에 연결된 NFC 리더를 자동으로 탐색해 사용한다.
 */
export function DirectTradePage() {
  return <TerminalWorkspace tcpConfig={DIRECT_TCP_CONFIG} />
}
