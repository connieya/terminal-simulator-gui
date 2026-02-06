import { useEffect, useRef, useState } from 'react'
import { useTcpLogStore } from '@/stores/tcpLogStore'
import { tcpClient } from '@/utils/tcpClient'

const formatTime = (timestamp: number) => {
  const date = new Date(timestamp)
  const hh = String(date.getHours()).padStart(2, '0')
  const mm = String(date.getMinutes()).padStart(2, '0')
  const ss = String(date.getSeconds()).padStart(2, '0')
  return `${hh}:${mm}:${ss}`
}

const directionLabel = {
  out: '송신',
  in: '수신',
  info: '정보',
  error: '오류',
} as const

const directionClass = {
  out: 'text-blue-600 dark:text-blue-400',
  in: 'text-green-600 dark:text-green-400',
  info: 'text-muted-foreground',
  error: 'text-red-600 dark:text-red-400',
} as const

/**
 * TCP 통신 로그 패널
 * terminal-simulator와 주고받은 명령/응답 로그를 표시한다.
 * 연결 상태와 연결 해제 버튼을 제공한다.
 */
export function TcpLogPanel() {
  const { logs, clearLogs } = useTcpLogStore()
  const endRef = useRef<HTMLDivElement | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isDisconnecting, setIsDisconnecting] = useState(false)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs.length])

  // 연결 상태 주기적 확인
  useEffect(() => {
    let cancelled = false
    const check = async () => {
      if (cancelled) return
      try {
        const connected = await tcpClient.isConnected()
        if (!cancelled) setIsConnected(connected)
      } catch {
        if (!cancelled) setIsConnected(false)
      }
    }
    check()
    const interval = setInterval(check, 2000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [])

  const handleDisconnect = async () => {
    setIsDisconnecting(true)
    try {
      await tcpClient.disconnect()
      setIsConnected(false)
    } catch {
      // 에러는 tcpClient에서 로그로 남김
    } finally {
      setIsDisconnecting(false)
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col rounded-lg border bg-card p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-foreground">TCP 통신 로그</h3>
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 text-xs ${
              isConnected ? 'text-green-600' : 'text-muted-foreground'
            }`}
          >
            <span
              className={`size-2 shrink-0 rounded-full ${
                isConnected ? 'bg-green-500' : 'bg-red-500'
              }`}
              aria-hidden
            />
            {isConnected ? '연결됨' : '연결 안 됨'}
          </span>
          {isConnected && (
            <button
              type="button"
              onClick={handleDisconnect}
              disabled={isDisconnecting}
              className="rounded border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50 dark:border-red-800 dark:hover:bg-red-950"
            >
              {isDisconnecting ? '해제 중…' : '연결 해제'}
            </button>
          )}
          <button
            type="button"
            onClick={clearLogs}
            className="rounded border px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
          >
            로그 비우기
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-auto rounded border bg-background p-2 text-xs">
        {logs.length === 0 ? (
          <div className="py-4 text-center text-muted-foreground">
            아직 로그가 없습니다.
          </div>
        ) : (
          <div className="space-y-1">
            {logs.map((log) => (
              <div key={log.id} className="flex gap-2">
                <span className="text-muted-foreground">{formatTime(log.timestamp)}</span>
                <span className={directionClass[log.direction]}>
                  {directionLabel[log.direction]}
                </span>
                <span className="truncate">{log.message}</span>
              </div>
            ))}
            <div ref={endRef} />
          </div>
        )}
      </div>
    </div>
  )
}
