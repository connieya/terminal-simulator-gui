import { useState, useEffect } from 'react'
import { CardTapButton } from './CardTapButton'

// 임시 Button 컴포넌트
const Button = ({ 
  onClick, 
  disabled, 
  variant = 'default',
  children 
}: { 
  onClick?: () => void
  disabled?: boolean
  variant?: 'default' | 'destructive'
  children: React.ReactNode
}) => {
  const baseStyles = 'px-4 py-2 rounded font-medium transition-colors'
  const variantStyles = variant === 'destructive' 
    ? 'bg-red-500 text-white hover:bg-red-600 disabled:bg-gray-400' 
    : 'bg-blue-500 text-white hover:bg-blue-600 disabled:bg-gray-400'
  
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyles} ${variantStyles}`}
    >
      {children}
    </button>
  )
}
import { tcpClient } from '@/utils/tcpClient'
import type { TcpConnectionConfig } from '@shared/types'
import { DEFAULT_TCP_CONFIG } from '@shared/types'

/**
 * TCP 연결 관리 패널 컴포넌트
 */
export function TcpConnectionPanel() {
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [host, setHost] = useState(DEFAULT_TCP_CONFIG.host)
  const [port, setPort] = useState(DEFAULT_TCP_CONFIG.port.toString())

  // 연결 상태 확인
  const checkConnection = async () => {
    try {
      const connected = await tcpClient.isConnected()
      setIsConnected(connected)
    } catch (error) {
      setIsConnected(false)
    }
  }

  // 주기적으로 연결 상태 확인
  useEffect(() => {
    checkConnection()
    const interval = setInterval(checkConnection, 2000)
    return () => clearInterval(interval)
  }, [])

  // 연결
  const handleConnect = async () => {
    setIsConnecting(true)
    try {
      const config: TcpConnectionConfig = {
        ...DEFAULT_TCP_CONFIG,
        host,
        port: parseInt(port, 10),
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

  // 연결 해제
  const handleDisconnect = async () => {
    try {
      await tcpClient.disconnect()
      await checkConnection()
    } catch (error) {
      console.error('Disconnect failed:', error)
    }
  }

  return (
    <div className="p-4 border rounded-lg space-y-4">
      <h2 className="text-xl font-bold">Terminal Simulator 연결</h2>
      
      <div className="flex gap-2 items-end">
        <div className="flex-1">
          <label className="block text-sm font-medium mb-1">호스트</label>
          <input
            type="text"
            value={host}
            onChange={(e) => setHost(e.target.value)}
            disabled={isConnected}
            className="w-full px-3 py-2 border rounded"
          />
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium mb-1">포트</label>
          <input
            type="number"
            value={port}
            onChange={(e) => setPort(e.target.value)}
            disabled={isConnected}
            className="w-full px-3 py-2 border rounded"
          />
        </div>
        {!isConnected ? (
          <Button onClick={handleConnect} disabled={isConnecting}>
            {isConnecting ? '연결 중...' : '연결'}
          </Button>
        ) : (
          <Button onClick={handleDisconnect} variant="destructive">
            연결 해제
          </Button>
        )}
      </div>

      <div className="flex items-center gap-2">
        <div
          className={`w-3 h-3 rounded-full ${
            isConnected ? 'bg-green-500' : 'bg-red-500'
          }`}
        />
        <span className="text-sm">
          {isConnected ? '연결됨' : '연결 안 됨'}
        </span>
      </div>

      {isConnected && (
        <div className="pt-4 border-t">
          <h3 className="text-lg font-semibold mb-2">카드 탭 테스트</h3>
          <div className="flex gap-2">
            <CardTapButton
              cardType="transport"
              onSuccess={(response) => {
                console.log('Card tap success:', response)
                alert('카드 탭 성공!')
              }}
              onError={(error) => {
                alert(`카드 탭 실패: ${error.message}`)
              }}
            />
            <CardTapButton
              cardType="credit"
              onSuccess={(response) => {
                console.log('Card tap success:', response)
                alert('카드 탭 성공!')
              }}
              onError={(error) => {
                alert(`카드 탭 실패: ${error.message}`)
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

