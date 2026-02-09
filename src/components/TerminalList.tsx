import { useState } from 'react'
import { useTerminalStore } from '@/stores/terminalStore'
import { TerminalCard } from './TerminalCard'
import { SubwayMap } from './SubwayMap'
import { JourneyPanel } from './JourneyPanel'
import { TcpLogPanel } from './TcpLogPanel'
import { EmvTransactionDetailModal } from './EmvTransactionDetailModal'
import type { TerminalResponse } from '@shared/types'

/**
 * 단말기 목록 컴포넌트
 * 왼쪽: 지하철 노선도(상단) + 단말기 카드(하단)
 * 가운데: 지하철 여정
 * 오른쪽: TCP 통신 로그
 */
export function TerminalList() {
  const { terminals } = useTerminalStore()
  const subwayTerminal = terminals.find((t) => t.transitType === 'subway')
  const busTerminal = terminals.find((t) => t.transitType === 'bus')
  const displayTerminals = [subwayTerminal, busTerminal].filter(
    (t): t is (typeof terminals)[number] => Boolean(t)
  )

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
      {/* 왼쪽: 노선도(상단) + 단말기(하단) */}
      <div className="flex min-w-0 flex-col gap-4">
        <SubwayMap />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {displayTerminals.map((terminal) => (
            <TerminalCard
              key={terminal.id}
              terminal={terminal}
              isSelected={terminal.transitType === 'subway'}
              onSelect={undefined}
              onCardTapComplete={handleCardTapComplete}
            />
          ))}
        </div>
        {displayTerminals.length === 0 && (
          <div className="py-12 text-center text-muted-foreground">
            등록된 단말기가 없습니다.
          </div>
        )}
      </div>

      {/* 가운데: 여정 패널 (md~xl에서 오른쪽 열 상단, xl에서 중간 열) */}
      <div className="flex min-w-0 flex-col gap-4">
        <JourneyPanel />
      </div>

      {/* 오른쪽: TCP 로그 (연결 상태/해제는 TcpLogPanel 내부) */}
      <div className="flex min-w-0 flex-col gap-4 md:col-start-2 md:row-start-2 xl:col-start-auto xl:row-start-auto">
        <div className="min-h-0 flex-1">
          <TcpLogPanel />
        </div>
      </div>
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

