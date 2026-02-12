import { useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { TerminalList } from './components/TerminalList'
import { TerminalCard } from './components/TerminalCard'
import { UnifiedRouteMap } from './components/UnifiedRouteMap'
import { JourneyPanel } from './components/JourneyPanel'
import { TcpLogPanel } from './components/TcpLogPanel'
import { EmvTransactionDetailModal } from './components/EmvTransactionDetailModal'
import { ToastProvider } from './contexts/ToastContext'
import { LeftTabs } from './components/LeftTabs'
import { useTerminalStore } from './stores/terminalStore'
import type { TerminalResponse, TcpConnectionConfig } from '@shared/types'
import './App.css'

/** 직접 거래 시 Sign On 할 서버 주소. Sign On 클릭 시 이 설정으로 연결한다 */
const DIRECT_TCP_CONFIG: TcpConnectionConfig = {
  host: 'localhost',
  port: 9999,
  timeout: 5000,
  reconnectInterval: 3000,
}

/** EMV 직접 거래 페이지: Sign On 시 서버에 연결 후 Echo / Sync / 카드 탭 동일 사용 */
function DirectTradePage() {
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
        <section className="flex min-w-0 flex-col gap-5" aria-label="노선도 및 단말기">
          <UnifiedRouteMap />
          {terminal ? (
            <TerminalCard
              terminal={terminal}
              tcpConfig={DIRECT_TCP_CONFIG}
              onCardTapComplete={handleCardTapComplete}
            />
          ) : (
            <div className="rounded-xl border border-dashed border-border bg-muted/20 py-12 text-center text-sm text-muted-foreground">
              등록된 단말기가 없습니다.
            </div>
          )}
        </section>

        <section className="flex min-w-0 flex-col gap-4" aria-label="여정">
          <JourneyPanel />
        </section>

        <section className="flex min-w-0 flex-col gap-4 md:col-start-2 md:row-start-2 xl:col-start-auto xl:row-start-auto" aria-label="통신 로그">
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

function App() {
  return (
    <ToastProvider>
      <div className="flex min-h-screen bg-background overflow-hidden">
        <LeftTabs />
        <main className="min-w-0 flex-1 overflow-auto flex flex-col">
          <header className="shrink-0 border-b border-border bg-card/50 px-6 py-4 md:px-8">
            <h1 className="text-lg font-semibold text-foreground tracking-tight">
              Terminal Simulator
            </h1>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Open Loop EMV 교통 단말기 연동
            </p>
          </header>
          <div className="flex-1 p-6 md:p-8">
            <Routes>
              <Route path="/" element={<Navigate to="/simulator" replace />} />
              <Route path="/simulator" element={<TerminalList />} />
              <Route path="/direct" element={<DirectTradePage />} />
            </Routes>
          </div>
        </main>
      </div>
    </ToastProvider>
  )
}

export default App
