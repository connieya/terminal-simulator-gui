import { useState } from 'react'
import { TerminalList } from './components/TerminalList'
import { ConnectionSettings } from './components/ConnectionSettings'
import { ToastProvider } from './contexts/ToastContext'
import { LeftTabs } from './components/LeftTabs'
import './App.css'

function App() {
  const [activeTab, setActiveTab] = useState<'simulator' | 'direct'>('simulator')

  return (
    <ToastProvider>
      <div className="min-h-screen bg-background flex">
        <LeftTabs activeTab={activeTab} onChange={setActiveTab} />
        <main className="flex-1 p-8">
          {activeTab === 'simulator' ? (
            <>
              <div className="max-w-7xl mx-auto">
                <h1 className="text-3xl font-bold mb-6">
                  EMV 교통 단말기 시뮬레이터
                </h1>
                <TerminalList />
              </div>
              <ConnectionSettings />
            </>
          ) : (
            <div className="max-w-3xl mx-auto space-y-4">
              <h1 className="text-3xl font-bold">EMV 직접 거래</h1>
              <div className="border rounded-lg p-6 bg-card space-y-2">
                <h2 className="text-lg font-semibold">준비 중</h2>
                <p className="text-sm text-muted-foreground">
                  APDU 직접 처리와 거래 서버 연동 기능을 위한 영역입니다.
                  이후 카드 리더 상태, APDU 로그, 거래 요청/응답 패널이
                  추가될 예정입니다.
                </p>
              </div>
            </div>
          )}
        </main>
      </div>
    </ToastProvider>
  )
}

export default App
