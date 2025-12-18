import { useState } from 'react'
import { useTerminalStore } from '@/stores/terminalStore'
import { tcpClient } from '@/utils/tcpClient'
import type { TerminalInfo } from '@shared/types'

interface TerminalCardProps {
  terminal: TerminalInfo
}

/**
 * 단말기 카드 컴포넌트
 * 각 교통 단말기의 정보와 전원 on/off 기능을 제공
 */
export function TerminalCard({ terminal }: TerminalCardProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const { setTerminalPower, updateTerminal } = useTerminalStore()

  const handlePowerToggle = async () => {
    setIsProcessing(true)
    try {
      // TCP 연결 확인
      const isConnected = await tcpClient.isConnected()
      if (!isConnected) {
        alert('Terminal Simulator에 연결되지 않았습니다. 먼저 연결해주세요.')
        return
      }

      const commandType = terminal.isPoweredOn ? 'signoff' : 'signon'
      const response = await tcpClient.sendCommand({
        type: commandType,
        terminalId: terminal.terminalId,
      })

      if (response.success) {
        setTerminalPower(terminal.id, !terminal.isPoweredOn)
        updateTerminal(terminal.id, {
          lastCommandTime: Date.now(),
        })
      } else {
        alert(`명령 실행 실패: ${response.message || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Power toggle failed:', error)
      alert(error instanceof Error ? error.message : '명령 실행에 실패했습니다')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleEchoTest = async () => {
    setIsProcessing(true)
    try {
      const isConnected = await tcpClient.isConnected()
      if (!isConnected) {
        alert('Terminal Simulator에 연결되지 않았습니다.')
        return
      }

      const response = await tcpClient.sendCommand({
        type: 'echo-test',
        terminalId: terminal.terminalId,
      })

      if (response.success) {
        alert('Echo 테스트 성공!')
        updateTerminal(terminal.id, {
          lastCommandTime: Date.now(),
        })
      } else {
        alert(`Echo 테스트 실패: ${response.message || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Echo test failed:', error)
      alert(error instanceof Error ? error.message : 'Echo 테스트에 실패했습니다')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleSync = async () => {
    setIsProcessing(true)
    try {
      const isConnected = await tcpClient.isConnected()
      if (!isConnected) {
        alert('Terminal Simulator에 연결되지 않았습니다.')
        return
      }

      const response = await tcpClient.sendCommand({
        type: 'sync',
        terminalId: terminal.terminalId,
      })

      if (response.success) {
        alert('동기화 성공!')
        updateTerminal(terminal.id, {
          lastCommandTime: Date.now(),
        })
      } else {
        alert(`동기화 실패: ${response.message || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Sync failed:', error)
      alert(error instanceof Error ? error.message : '동기화에 실패했습니다')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="border rounded-lg p-4 bg-card hover:shadow-lg transition-shadow">
      {/* 단말기 헤더 */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-lg font-semibold text-foreground">{terminal.name}</h3>
            <span className={`px-2 py-0.5 text-xs font-medium rounded ${
              terminal.type === 'entry' 
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' 
                : 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
            }`}>
              {terminal.type === 'entry' ? '승차' : '하차'}
            </span>
          </div>
          <div className="space-y-1">
            {terminal.line && (
              <p className="text-sm text-muted-foreground">{terminal.line}</p>
            )}
            <p className="text-xs font-mono text-muted-foreground">
              Terminal ID: <span className="font-semibold">{terminal.terminalId}</span>
            </p>
          </div>
        </div>
        
        {/* 상태 표시 */}
        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${
                terminal.isPoweredOn ? 'bg-green-500' : 'bg-gray-400'
              }`}
            />
            <span className="text-xs text-muted-foreground">
              {terminal.isPoweredOn ? '전원 ON' : '전원 OFF'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${
                terminal.isConnected ? 'bg-blue-500' : 'bg-gray-400'
              }`}
            />
            <span className="text-xs text-muted-foreground">
              {terminal.isConnected ? '연결됨' : '연결 안 됨'}
            </span>
          </div>
        </div>
      </div>

      {/* 전원 버튼 */}
      <div className="space-y-2">
        <button
          onClick={handlePowerToggle}
          disabled={isProcessing}
          className={`w-full px-4 py-2 rounded font-medium transition-colors ${
            terminal.isPoweredOn
              ? 'bg-red-500 text-white hover:bg-red-600 disabled:bg-gray-400'
              : 'bg-green-500 text-white hover:bg-green-600 disabled:bg-gray-400'
          }`}
        >
          {isProcessing
            ? '처리 중...'
            : terminal.isPoweredOn
            ? '전원 끄기 (Sign Off)'
            : '전원 켜기 (Sign On)'}
        </button>

        {/* 추가 명령 버튼들 */}
        {terminal.isPoweredOn && (
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleEchoTest}
              disabled={isProcessing}
              className="px-3 py-2 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400 transition-colors"
            >
              Echo Test
            </button>
            <button
              onClick={handleSync}
              disabled={isProcessing}
              className="px-3 py-2 text-sm bg-purple-500 text-white rounded hover:bg-purple-600 disabled:bg-gray-400 transition-colors"
            >
              Sync
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

