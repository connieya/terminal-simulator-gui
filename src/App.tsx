import { TcpConnectionPanel } from './components/TcpConnectionPanel'
import './App.css'

function App() {
  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">교통 단말기 시뮬레이터 GUI</h1>
        <TcpConnectionPanel />
      </div>
    </div>
  )
}

export default App
