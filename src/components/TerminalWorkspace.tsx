import { useState } from 'react'
import { useTerminalStore } from '@/stores/terminalStore'
import { TerminalCard } from './TerminalCard'
import { UnifiedRouteMap } from './UnifiedRouteMap'
import { TerminalInfoPanel } from './TerminalInfoPanel'
import { TcpLogPanel } from './TcpLogPanel'
import { EmvTransactionDetailModal } from './EmvTransactionDetailModal'
import type { TerminalResponse, TcpConnectionConfig } from '@shared/types'

interface TerminalWorkspaceProps {
  /** 직접 거래 시 사용할 TCP 설정. 없으면 시뮬레이터 기본 연결 */
  tcpConfig?: TcpConnectionConfig
}

/**
 * 단말기 워크스페이스 공통 레이아웃
 * 왼쪽: 노선도(상단) + 단말기 카드(하단) / 가운데: 터미널 정보 / 오른쪽: TCP 통신 로그
 */
export function TerminalWorkspace({ tcpConfig }: TerminalWorkspaceProps) {
  const terminal = useTerminalStore((s) => s.terminals[0])

  const [transactionModal, setTransactionModal] = useState<{
    open: boolean
    message: string
    success: boolean
  }>({ open: false, message: '', success: false })

  const handleCardTapComplete = (response: TerminalResponse) => {
    setTransactionModal({
      open: true,
      message: response.message ?? '',
      success: response.success,
    })
  }

  return (
    <>
      <div className="grid min-w-0 grid-cols-1 gap-6 md:gap-8 md:grid-cols-2 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)_minmax(0,0.8fr)]">
        {/* 왼쪽: 노선도 + 단말기 */}
        <section className="flex min-w-0 flex-col gap-5" aria-label="노선도 및 단말기">
          <UnifiedRouteMap />
          {terminal ? (
            <TerminalCard
              terminal={terminal}
              tcpConfig={tcpConfig}
              onCardTapComplete={handleCardTapComplete}
            />
          ) : (
            <div className="rounded-xl border border-dashed border-border bg-muted/20 py-12 text-center text-sm text-muted-foreground">
              등록된 단말기가 없습니다.
            </div>
          )}
        </section>

        {/* 가운데: 터미널 정보 */}
        <section className="flex min-w-0 flex-col gap-4" aria-label="터미널 정보">
          <TerminalInfoPanel />
        </section>

        {/* 오른쪽: TCP 통신 로그 */}
        <section
          className="flex min-w-0 flex-col gap-4 md:col-start-2 md:row-start-2 xl:col-start-auto xl:row-start-auto"
          aria-label="통신 로그"
        >
          <div className="min-h-0 flex-1">
            <TcpLogPanel />
          </div>
        </section>
      </div>

      <EmvTransactionDetailModal
        open={transactionModal.open}
        onClose={() =>
          setTransactionModal((prev) => ({ ...prev, open: false }))
        }
        logText={transactionModal.message}
        success={transactionModal.success}
      />
    </>
  )
}
