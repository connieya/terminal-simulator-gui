import { useTerminalStore } from '@/stores/terminalStore'
import { subwayStations } from '@/data/terminalPresets'

interface JourneyPanelProps {
  /** 노선도 클릭 시 갱신할 단말기 id (표시용) */
  selectedTerminalId: string | null
  onSelectEntry: () => void
  onSelectExit: () => void
}

/**
 * 지하철 여정 패널
 * "OO역 승차 → OO역 하차" 형태로 표시. 승차/하차 영역 클릭 시 해당 단말기가 선택되어 노선도 클릭으로 역 설정 가능.
 */
export function JourneyPanel({
  selectedTerminalId,
  onSelectEntry,
  onSelectExit,
}: JourneyPanelProps) {
  const { terminals } = useTerminalStore()
  const subwayEntry = terminals.find((t) => t.id === 'terminal-subway-entry')
  const subwayExit = terminals.find((t) => t.id === 'terminal-subway-exit')

  const entryStation = subwayEntry
    ? subwayStations.find(
        (s) =>
          s.entryTerminalId === subwayEntry.terminalId ||
          s.exitTerminalId === subwayEntry.terminalId
      )
    : null
  const exitStation = subwayExit
    ? subwayStations.find(
        (s) =>
          s.entryTerminalId === subwayExit.terminalId ||
          s.exitTerminalId === subwayExit.terminalId
      )
    : null

  const entryName = entryStation?.name ?? subwayEntry?.station ?? '—'
  const exitName = exitStation?.name ?? subwayExit?.station ?? '—'
  const isEntrySelected = selectedTerminalId === 'terminal-subway-entry'
  const isExitSelected = selectedTerminalId === 'terminal-subway-exit'

  return (
    <div className="rounded-lg border bg-card p-4">
      <h3 className="mb-3 text-sm font-semibold text-foreground">지하철 여정</h3>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onSelectEntry}
          className={`rounded-lg border-2 px-3 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary ${
            isEntrySelected
              ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
              : 'border-transparent bg-muted/50 text-foreground hover:bg-muted'
          }`}
        >
          <span className="text-muted-foreground">승차</span>{' '}
          <span className="font-semibold">{entryName}</span>
        </button>
        <span className="text-muted-foreground">→</span>
        <button
          type="button"
          onClick={onSelectExit}
          className={`rounded-lg border-2 px-3 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary ${
            isExitSelected
              ? 'border-green-500 bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300'
              : 'border-transparent bg-muted/50 text-foreground hover:bg-muted'
          }`}
        >
          <span className="text-muted-foreground">하차</span>{' '}
          <span className="font-semibold">{exitName}</span>
        </button>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        여정에서 승차/하차를 클릭한 뒤 노선도에서 역을 클릭하면 해당 단말기 역이 설정됩니다.
      </p>
    </div>
  )
}
