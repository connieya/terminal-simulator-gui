import { useState, useEffect } from 'react'
import { tcpClient } from '@/utils/tcpClient'
import type { TcpConnectionConfig } from '@shared/types'
import { DEFAULT_TCP_CONFIG } from '@shared/types'

/**
 * TCP 연결 설정 컴포넌트 (백그라운드 설정)
 */
export function ConnectionSettings() {
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [host, setHost] = useState(DEFAULT_TCP_CONFIG.host)
  const [port, setPort] = useState(DEFAULT_TCP_CONFIG.port.toString())
  const [isExpanded, setIsExpanded] = useState(false)

  // 연결 상태 확인
  const checkConnection = async () => {
    try {
      const connected = await tcpClient.isConnected()
      setIsConnected(connected)
    } catch (error) {
      setIsConnected(false)
    }
  }

  useEffect(() => {
    checkConnection()
    const interval = setInterval(checkConnection, 2000)
    return () => clearInterval(interval)
  }, [])

  const handleConnect = async () => {
    setIsConnecting(true)
    try {
      const config: TcpConnectionConfig = {
        host,
        port: parseInt(port, 10),
        ...DEFAULT_TCP_CONFIG,
      }
      await tcpClient.connect(config)
      await checkConnection()
    } catch (error) {
      console.error('Connection failed:', error)
      alert(error instanceof Error ? error.message : '연결에 실패했습니다')
    } finally {
      setIsConnecting(false)
    }
  }

  const handleDisconnect = async () => {
    try {
      await tcpClient.disconnect()
      await checkConnection()
    } catch (error) {
      console.error('Disconnect failed:', error)
    }
  }

  return (
    <div className="fixed bottom-4 right-4 bg-card border rounded-lg shadow-lg p-4 min-w-[280px]">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between mb-2"
      >
        <span className="text-sm font-medium">연결 설정</span>
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${
              isConnected ? 'bg-green-500' : 'bg-red-500'
            }`}
          />
          <span className="text-xs text-muted-foreground">
            {isConnected ? '연결됨' : '연결 안 됨'}
          </span>
          <span className="text-xs">{isExpanded ? '▲' : '▼'}</span>
        </div>
      </button>

      {isExpanded && (
        <div className="space-y-3 mt-3">
          <div>
            <label className="block text-xs font-medium mb-1">호스트</label>
            <input
              type="text"
              value={host}
              onChange={(e) => setHost(e.target.value)}
              disabled={isConnected}
              className="w-full px-2 py-1 text-sm border rounded"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">포트</label>
            <input
              type="number"
              value={port}
              onChange={(e) => setPort(e.target.value)}
              disabled={isConnected}
              className="w-full px-2 py-1 text-sm border rounded"
            />
          </div>
          {!isConnected ? (
            <button
              onClick={handleConnect}
              disabled={isConnecting}
              className="w-full px-3 py-2 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
            >
              {isConnecting ? '연결 중...' : '연결'}
            </button>
          ) : (
            <button
              onClick={handleDisconnect}
              className="w-full px-3 py-2 text-sm bg-red-500 text-white rounded hover:bg-red-600"
            >
              연결 해제
            </button>
          )}
        </div>
      )}
    </div>
  )
}

