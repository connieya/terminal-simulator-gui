import { useTerminalStore } from '@/stores/terminalStore'
import { getStationsByLine } from '@/data/terminalPresets'
import type { SubwayStationOption } from '@/data/terminalPresets'

const LINE1_COLOR = '#0052A4' // 1호선 파랑
const LINE2_COLOR = '#00A84D' // 2호선 초록

export type SubwayLineKey = '1호선' | '2호선'

interface SubwayMapProps {
  /** 통합 노선도 탭 내부에 넣을 때 true (제목·카드 래퍼 생략) */
  embedded?: boolean
  /** 지정 시 해당 노선의 역만 표시. 없으면 1·2호선 모두 표시 */
  line?: SubwayLineKey
}

/**
 * 지하철 노선도 컴포넌트
 * 역 클릭 시 단일 단말기의 역 정보를 해당 역으로 갱신한다. (transitType: 'subway'로 설정)
 */
export function SubwayMap({ embedded, line }: SubwayMapProps) {
  const terminal = useTerminalStore((s) => s.terminals[0])
  const updateTerminal = useTerminalStore((s) => s.updateTerminal)
  const { '1호선': line1Stations, '2호선': line2Stations } = getStationsByLine()
  const allStations = line1Stations.concat(line2Stations)

  const currentStationId =
    terminal?.transitType === 'subway'
      ? allStations.find(
          (s) =>
            s.entryTerminalId === terminal.terminalId ||
            s.exitTerminalId === terminal.terminalId
        )?.id ?? null
      : null

  const handleStationClick = (station: SubwayStationOption) => {
    if (!terminal) return
    const terminalId =
      terminal.type === 'entry'
        ? station.entryTerminalId
        : station.exitTerminalId
    updateTerminal(terminal.id, {
      transitType: 'subway',
      terminalId,
      station: station.name,
      line: station.line ?? undefined,
    })
  }

  const stationRole = (station: SubwayStationOption) => {
    if (station.id !== currentStationId) return null
    return terminal?.type === 'entry' ? 'entry' : 'exit'
  }

  const showLine1 = !line || line === '1호선'
  const showLine2 = !line || line === '2호선'

  const content = (
    <div className="flex flex-col gap-6">
        {showLine1 && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span
                className="h-3.5 w-7 rounded-md"
                style={{ backgroundColor: LINE1_COLOR }}
              />
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">1호선</span>
            </div>
            <div className="flex flex-wrap items-center gap-1">
              {line1Stations.map((station, index) => (
                <div key={station.id} className="flex items-center gap-1">
                  {index > 0 && (
                    <div
                      className="h-1 w-3 rounded-px"
                      style={{ backgroundColor: LINE1_COLOR }}
                    />
                  )}
                  <StationNode
                    station={station}
                    lineColor={LINE1_COLOR}
                    role={stationRole(station)}
                    onClick={() => handleStationClick(station)}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {showLine2 && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span
                className="h-3.5 w-7 rounded-md"
                style={{ backgroundColor: LINE2_COLOR }}
              />
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">2호선</span>
            </div>
            <div className="flex flex-wrap items-center gap-1">
              {line2Stations.map((station, index) => (
                <div key={station.id} className="flex items-center gap-1">
                  {index > 0 && (
                    <div
                      className="h-1 w-3 rounded-px"
                      style={{ backgroundColor: LINE2_COLOR }}
                    />
                  )}
                  <StationNode
                    station={station}
                    lineColor={LINE2_COLOR}
                    role={stationRole(station)}
                    onClick={() => handleStationClick(station)}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
  )

  if (embedded) return content
  return (
    <div className="rounded-lg border bg-card p-4">
      <h3 className="mb-3 text-sm font-semibold text-foreground">지하철 노선도</h3>
      {content}
    </div>
  )
}

interface StationNodeProps {
  station: SubwayStationOption
  lineColor: string
  role: 'entry' | 'exit' | null
  onClick: () => void
}

function StationNode({ station, lineColor, role, onClick }: StationNodeProps) {
  const isEntry = role === 'entry'
  const isExit = role === 'exit'
  const isHighlight = isEntry || isExit

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center gap-1 rounded-lg px-2.5 py-2 min-w-[3.5rem] transition-colors hover:bg-muted hover:border-muted-foreground/20 border border-transparent focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
      title={station.name}
    >
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 text-sm font-semibold text-foreground transition-colors"
        style={{
          borderColor: isHighlight ? lineColor : 'var(--border)',
          backgroundColor: isEntry
            ? 'rgba(0, 82, 164, 0.18)'
            : isExit
              ? 'rgba(0, 168, 77, 0.18)'
              : 'transparent',
        }}
      >
        {station.name.slice(0, 1)}
      </div>
      <span className="min-w-0 max-w-[4.5rem] truncate text-[11px] text-muted-foreground font-medium">
        {station.name}
      </span>
      {isEntry && (
        <span className="text-[10px] font-medium text-blue-600 dark:text-blue-400">승차</span>
      )}
      {isExit && (
        <span className="text-[10px] font-medium text-green-600 dark:text-green-400">하차</span>
      )}
    </button>
  )
}
