import { Routes, Route, Navigate } from 'react-router-dom'
import { TerminalList } from './components/TerminalList'
import { ToastProvider } from './contexts/ToastContext'
import { LeftTabs } from './components/LeftTabs'
import './App.css'

/** EMV 직접 거래 플레이스홀더 (예정 화면) */
function DirectTradePage() {
  return (
    <div className="space-y-6">
      <div className="border rounded-lg p-6 md:p-8 bg-card space-y-2">
        <h2 className="text-lg font-semibold">준비 중</h2>
        <p className="text-sm text-muted-foreground">
          APDU 직접 처리와 거래 서버 연동 기능을 위한 영역입니다.
          이후 카드 리더 상태, APDU 로그, 거래 요청/응답 패널이
          추가될 예정입니다.
        </p>
      </div>
    </div>
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
