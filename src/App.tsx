import { useEffect, useRef } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { ToastProvider } from './contexts/ToastContext'
import { LeftTabs } from './components/LeftTabs'
import { SimulatorPage } from './pages/SimulatorPage'
import { DirectTradePage } from './pages/DirectTradePage'
import { tcpClient } from './utils/tcpClient'
import { useTerminalStore } from './stores/terminalStore'
import './App.css'

function App() {
  const location = useLocation()
  const prevPathRef = useRef<string | null>(null)
  const setTerminalPower = useTerminalStore((s) => s.setTerminalPower)
  const setTerminalConnected = useTerminalStore((s) => s.setTerminalConnected)
  const terminalId = useTerminalStore((s) => s.terminals[0]?.id)

  useEffect(() => {
    const pathname = location.pathname
    const prev = prevPathRef.current
    if (
      prev !== null &&
      ((prev === '/simulator' && pathname === '/direct') ||
        (prev === '/direct' && pathname === '/simulator'))
    ) {
      tcpClient.disconnect().catch(() => {})
      if (terminalId) {
        setTerminalPower(terminalId, false)
        setTerminalConnected(terminalId, false)
      }
    }
    prevPathRef.current = pathname
  }, [location.pathname, terminalId, setTerminalPower, setTerminalConnected])

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
              <Route path="/simulator" element={<SimulatorPage />} />
              <Route path="/direct" element={<DirectTradePage />} />
            </Routes>
          </div>
        </main>
      </div>
    </ToastProvider>
  )
}

export default App
