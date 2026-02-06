import { useTerminalStore } from '@/stores/terminalStore'
import { getStationsByLine } from '@/data/terminalPresets'
import type { SubwayStationOption } from '@/data/terminalPresets'

const LINE1_COLOR = '#0052A4' // 1호선 파랑
const LINE2_COLOR = '#00A84D' // 2호선 초록

/**
 * 지하철 노선도 컴포넌트
 * subwayStations 기반으로 1호선/2호선을 노선표 스타일로 표시하고,
 * 역 클릭 시 지하철 단말기(1개)의 역 정보를 해당 역으로 갱신한다. 단말기의 승차/하차 타입에 따라 terminalId 반영.
 */
export function SubwayMap() {
  const { terminals, updateTerminal } = useTerminalStore()
  const subwayTerminal = terminals.find((t) => t.transitType === 'subway')
  const { '1호선': line1Stations, '2호선': line2Stations } = getStationsByLine()
  const allStations = line1Stations.concat(line2Stations)

  const currentStationId = subwayTerminal
    ? allStations.find(
        (s) =>
          s.entryTerminalId === subwayTerminal.terminalId ||
          s.exitTerminalId === subwayTerminal.terminalId
      )?.id
    : null

  const handleStationClick = (station: SubwayStationOption) => {
    if (!subwayTerminal || subwayTerminal.transitType !== 'subway') return
    const terminalId =
      subwayTerminal.type === 'entry'
        ? station.entryTerminalId
        : station.exitTerminalId
    updateTerminal(subwayTerminal.id, {
      terminalId,
      station: station.name,
      line: station.line ?? undefined,
    })
  }

  const stationRole = (station: SubwayStationOption) => {
    if (station.id !== currentStationId) return null
    return subwayTerminal?.type === 'entry' ? 'entry' : 'exit'
  }

  return (
    <div className="rounded-lg border bg-card p-4">
      <h3 className="mb-3 text-sm font-semibold text-foreground">지하철 노선도</h3>
      <div className="flex flex-col gap-6">
        {/* 1호선 */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span
              className="h-3 w-6 rounded-sm"
              style={{ backgroundColor: LINE1_COLOR }}
            />
            <span className="text-xs font-medium text-muted-foreground">1호선</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {line1Stations.map((station, index) => (
              <div key={station.id} className="flex items-center gap-2">
                {index > 0 && (
                  <div
                    className="h-0.5 w-4"
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

        {/* 2호선 */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span
              className="h-3 w-6 rounded-sm"
              style={{ backgroundColor: LINE2_COLOR }}
            />
            <span className="text-xs font-medium text-muted-foreground">2호선</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {line2Stations.map((station, index) => (
              <div key={station.id} className="flex items-center gap-2">
                {index > 0 && (
                  <div
                    className="h-0.5 w-4"
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
      </div>
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
  const isHighlight =
    isEntry || isExit

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center gap-0.5 rounded-md px-2 py-1 transition-colors hover:bg-muted/80 focus:outline-none focus:ring-2 focus:ring-primary"
      title={station.name}
    >
      <div
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-medium text-foreground"
        style={{
          borderColor: isHighlight ? lineColor : 'var(--border)',
          backgroundColor: isEntry
            ? 'rgba(0, 82, 164, 0.15)'
            : isExit
              ? 'rgba(0, 168, 77, 0.15)'
              : 'transparent',
        }}
      >
        {station.name.slice(0, 1)}
      </div>
      <span className="max-w-[4rem] truncate text-[10px] text-muted-foreground">
        {station.name}
      </span>
      {isEntry && (
        <span className="text-[9px] text-blue-600 dark:text-blue-400">승차</span>
      )}
      {isExit && (
        <span className="text-[9px] text-green-600 dark:text-green-400">하차</span>
      )}
    </button>
  )
}
