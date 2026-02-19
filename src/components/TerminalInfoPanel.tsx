import { useTerminalStore } from '@/stores/terminalStore'

/**
 * 터미널 정보 패널
 * 단말기의 모든 정보를 표시한다.
 */
export function TerminalInfoPanel() {
  const terminal = useTerminalStore((s) => s.terminals[0])

  const formatTime = (timestamp?: number) => {
    if (!timestamp) return '—'
    const date = new Date(timestamp)
    const hh = String(date.getHours()).padStart(2, '0')
    const mm = String(date.getMinutes()).padStart(2, '0')
    const ss = String(date.getSeconds()).padStart(2, '0')
    return `${hh}:${mm}:${ss}`
  }

  if (!terminal) {
    return (
      <div className="rounded-lg border bg-card p-4">
        <h3 className="mb-3 text-sm font-semibold text-foreground">터미널 정보</h3>
        <div className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
          등록된 단말기가 없습니다.
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-lg border bg-card p-4">
      <h3 className="mb-3 text-sm font-semibold text-foreground">터미널 정보</h3>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-muted-foreground">단말기 이름</span>
            <p className="mt-1 font-medium">{terminal.name}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Terminal ID</span>
            <p className="mt-1 font-mono font-medium">{terminal.terminalId}</p>
          </div>
          <div>
            <span className="text-muted-foreground">교통 수단</span>
            <p className="mt-1 font-medium">
              {terminal.transitType === 'subway' ? '지하철' : terminal.transitType === 'bus' ? '버스' : '—'}
            </p>
          </div>
          <div>
            <span className="text-muted-foreground">노선</span>
            <p className="mt-1 font-medium">{terminal.line || '—'}</p>
          </div>
          <div>
            <span className="text-muted-foreground">역/정류장</span>
            <p className="mt-1 font-medium">{terminal.station || '—'}</p>
          </div>
          <div>
            <span className="text-muted-foreground">타입</span>
            <p className="mt-1 font-medium">
              {terminal.type === 'entry' ? '승차' : terminal.type === 'exit' ? '하차' : '—'}
            </p>
          </div>
          <div>
            <span className="text-muted-foreground">전원 상태</span>
            <div className="mt-1 flex items-center gap-2">
              <span
                className={`inline-block h-2 w-2 rounded-full ${
                  terminal.isPoweredOn ? 'bg-emerald-500' : 'bg-slate-500'
                }`}
              />
              <span className="font-medium">{terminal.isPoweredOn ? 'ON' : 'OFF'}</span>
            </div>
          </div>
          <div>
            <span className="text-muted-foreground">연결 상태</span>
            <div className="mt-1 flex items-center gap-2">
              <span
                className={`inline-block h-2 w-2 rounded-full ${
                  terminal.isConnected ? 'bg-blue-500' : 'bg-slate-500'
                }`}
              />
              <span className="font-medium">{terminal.isConnected ? '연결됨' : '연결 안 됨'}</span>
            </div>
          </div>
          <div className="col-span-2">
            <span className="text-muted-foreground">마지막 명령 시간</span>
            <p className="mt-1 font-mono text-sm">{formatTime(terminal.lastCommandTime)}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
