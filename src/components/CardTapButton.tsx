import { useState, useEffect } from 'react'
import { tcpClient } from '@/utils/tcpClient'
import type { TerminalResponse } from '@shared/types'

// 임시 Button 컴포넌트 (shadcn/ui button이 없을 경우)
const Button = ({ 
  onClick, 
  disabled, 
  className, 
  variant = 'default',
  children 
}: { 
  onClick?: () => void
  disabled?: boolean
  className?: string
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
      className={`${baseStyles} ${variantStyles} ${className || ''}`}
    >
      {children}
    </button>
  )
}

interface CardTapButtonProps {
  cardType?: 'transport' | 'credit' | 'debit'
  cardData?: string
  onSuccess?: (response: TerminalResponse) => void
  onError?: (error: Error) => void
  className?: string
}

/**
 * 카드 탭 트리거 버튼 컴포넌트
 * Java Terminal Simulator에 카드 탭 명령을 전송합니다
 */
export function CardTapButton({
  cardType,
  cardData,
  onSuccess,
  onError,
  className,
}: CardTapButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isConnected, setIsConnected] = useState(false)

  // 연결 상태 확인
  const checkConnection = async () => {
    try {
      const connected = await tcpClient.isConnected()
      setIsConnected(connected)
      return connected
    } catch (error) {
      setIsConnected(false)
      return false
    }
  }

  // 컴포넌트 마운트 시 연결 상태 확인
  useEffect(() => {
    checkConnection()
    // 주기적으로 연결 상태 확인 (5초마다)
    const interval = setInterval(checkConnection, 5000)
    return () => clearInterval(interval)
  }, [])

  const handleTapCard = async () => {
    setIsLoading(true)
    try {
      // 연결 상태 확인
      const connected = await checkConnection()
      if (!connected) {
        throw new Error('Terminal simulator에 연결되지 않았습니다. 먼저 연결해주세요.')
      }

      // 카드 탭 명령 전송
      const response = await tcpClient.tapCard({
        type: cardType,
        data: cardData,
      })

      onSuccess?.(response)
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error')
      onError?.(err)
      console.error('Card tap failed:', err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button
      onClick={handleTapCard}
      disabled={isLoading || !isConnected}
      className={className}
      variant={isConnected ? 'default' : 'destructive'}
    >
      {isLoading ? '처리 중...' : isConnected ? '카드 탭' : '연결 필요'}
    </Button>
  )
}

