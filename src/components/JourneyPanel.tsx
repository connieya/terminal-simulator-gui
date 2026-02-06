import { useTerminalStore } from '@/stores/terminalStore'
import { subwayStations } from '@/data/terminalPresets'

/**
 * 지하철 여정 패널
 * 지하철 단말기 1개의 현재 설정을 "현재: OO역 승차" 또는 "현재: OO역 하차" 형태로 표시.
 */
export function JourneyPanel() {
  const { terminals } = useTerminalStore()
  const subwayTerminal = terminals.find((t) => t.transitType === 'subway')

  const station = subwayTerminal
    ? subwayStations.find(
        (s) =>
          s.entryTerminalId === subwayTerminal.terminalId ||
          s.exitTerminalId === subwayTerminal.terminalId
      )
    : null
  const stationName = station?.name ?? subwayTerminal?.station ?? '—'
  const isEntry = subwayTerminal?.type === 'entry'

  return (
    <div className="rounded-lg border bg-card p-4">
      <h3 className="mb-3 text-sm font-semibold text-foreground">지하철 여정</h3>
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`inline-flex items-center gap-2 rounded-lg border-2 px-3 py-2 text-sm font-medium ${
            isEntry
              ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
              : 'border-green-500 bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300'
          }`}
        >
          <span className="text-muted-foreground">현재</span>
          <span className="font-semibold">{stationName}</span>
          <span className="text-muted-foreground">
            {isEntry ? '승차' : '하차'}
          </span>
        </span>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        단말기에서 승차/하차를 선택한 뒤 노선도에서 역을 클릭하면 역이 설정됩니다.
      </p>
    </div>
  )
}
