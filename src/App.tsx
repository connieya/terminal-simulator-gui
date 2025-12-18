import { TerminalList } from './components/TerminalList'
import { ConnectionSettings } from './components/ConnectionSettings'
import './App.css'

function App() {
  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">교통 단말기 관리 시스템</h1>
        <TerminalList />
      </div>
      <ConnectionSettings />
    </div>
  )
}

export default App
