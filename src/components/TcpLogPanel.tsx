import { useEffect, useRef } from 'react'
import { useTcpLogStore } from '@/stores/tcpLogStore'

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
 */
export function TcpLogPanel() {
  const { logs, clearLogs } = useTcpLogStore()
  const endRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs.length])

  return (
    <div className="flex h-full flex-col rounded-lg border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">TCP 통신 로그</h3>
        <button
          type="button"
          onClick={clearLogs}
          className="rounded border px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
        >
          로그 비우기
        </button>
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
