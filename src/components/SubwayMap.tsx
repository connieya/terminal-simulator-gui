import { useMemo, useRef, useState } from 'react'
import { useTerminalStore } from '@/stores/terminalStore'
import { getStationsByLine } from '@/data/terminalPresets'
import type { SubwayStationOption } from '@/data/terminalPresets'
import { calculateStationPositions, LINE_COLORS } from '@/data/stationCoordinates'

const VW = 1000
const VH = 800

interface SubwayMapProps {
  embedded?: boolean
}

export function SubwayMap({ embedded }: SubwayMapProps) {
  const terminal = useTerminalStore((s) => s.terminals[0])
  const updateTerminal = useTerminalStore((s) => s.updateTerminal)
  const stationsByLine = getStationsByLine()
  const containerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)

  const { stationsByLineWithPos, allStations, linePaths } = useMemo(() => {
    return calculateStationPositions(stationsByLine)
  }, [stationsByLine])

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
      terminal.type === 'entry' ? station.entryTerminalId : station.exitTerminalId
    updateTerminal(terminal.id, {
      transitType: 'subway',
      terminalId,
      station: station.name,
      line: station.line ?? undefined,
    })
  }

  const stationRole = (station: SubwayStationOption) => {
    // ID might differ if multiple entries for same station name exist (e.g. transfer)
    // We match by name for highlighting if selected
    const selectedStation = allStations.find(s => s.id === currentStationId)
    if (selectedStation && selectedStation.name === station.name) {
       return terminal?.type === 'entry' ? 'entry' : 'exit'
    }
    return null
  }

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault()
      const delta = e.deltaY > 0 ? 0.9 : 1.1
      setScale(s => Math.min(Math.max(0.5, s * delta), 3))
    }
  }

  const content = (
    <div 
      ref={containerRef}
      className="w-full h-[600px] overflow-auto rounded-lg bg-[#f8fafc] dark:bg-[#0f172a] relative border"
      onWheel={handleWheel}
    >
      <div 
        style={{ 
          width: VW, 
          height: VH, 
          transform: `scale(${scale})`, 
          transformOrigin: 'top left',
          transition: 'transform 0.1s ease-out'
        }}
      >
        <svg
          width={VW}
          height={VH}
          viewBox={`0 0 ${VW} ${VH}`}
          className="block"
        >
          {/* Lines (직각 경로 우선) */}
          {Object.entries(stationsByLineWithPos).map(([lineKey, stations]) => {
            const points = linePaths[lineKey] ?? stations.map((s) => `${s.x},${s.y}`).join(' ')
            const color = LINE_COLORS[lineKey] ?? '#999'
            return (
              <polyline
                key={lineKey}
                points={points}
                fill="none"
                stroke={color}
                strokeWidth="6"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={0.8}
              />
            )
          })}

          {/* Stations */}
          {allStations.map((station) => {
            const role = stationRole(station)
            const isEntry = role === 'entry'
            const isExit = role === 'exit'
            const isHighlight = isEntry || isExit
            
            // Simple label positioning logic
            // Default: bottom
            let dx = 0
            let dy = 16
            let anchor: 'start' | 'middle' | 'end' = 'middle'

            // Adjust based on position to keep inside bounds
            if (station.y > VH - 30) dy = -16
            if (station.x < 30) { dx = 12; dy = 4; anchor = 'start' }
            if (station.x > VW - 30) { dx = -12; dy = 4; anchor = 'end' }

            // Special cases for crowded areas could be added here

            return (
              <g key={`${station.line}-${station.id}`} className="group">
                {/* Hit area */}
                <circle
                  cx={station.x}
                  cy={station.y}
                  r="12"
                  fill="transparent"
                  className="cursor-pointer"
                  onClick={() => handleStationClick(station)}
                >
                  <title>{`${station.line} ${station.name}`}</title>
                </circle>

                {/* Visible node */}
                <circle
                  cx={station.x}
                  cy={station.y}
                  r="5"
                  fill={isHighlight ? (isEntry ? '#2563eb' : '#16a34a') : 'white'}
                  stroke={LINE_COLORS[station.line ?? ''] ?? '#666'}
                  strokeWidth={isHighlight ? 3 : 2}
                  className="cursor-pointer transition-all group-hover:r-7"
                  onClick={() => handleStationClick(station)}
                />

                {/* Label */}
                <text
                  x={station.x + dx}
                  y={station.y + dy}
                  textAnchor={anchor}
                  className="text-[10px] font-medium fill-slate-700 dark:fill-slate-300 pointer-events-none select-none"
                  style={{
                    paintOrder: 'stroke fill',
                    stroke: 'rgba(255,255,255,0.8)',
                    strokeWidth: 3,
                  }}
                >
                  {station.name}
                </text>

                {/* Status Label */}
                {isHighlight && (
                  <text
                    x={station.x + dx}
                    y={station.y + dy + 12}
                    textAnchor={anchor}
                    className="text-[9px] font-bold fill-white pointer-events-none select-none"
                    style={{
                      paintOrder: 'stroke fill',
                      stroke: isEntry ? '#2563eb' : '#16a34a',
                      strokeWidth: 3,
                    }}
                  >
                    {isEntry ? '승차' : '하차'}
                  </text>
                )}
              </g>
            )
          })}
        </svg>
      </div>
      <div className="absolute bottom-4 right-4 flex gap-2">
        <button 
          className="bg-white dark:bg-slate-800 p-2 rounded shadow border text-xs hover:bg-slate-100"
          onClick={() => setScale(s => Math.min(s + 0.2, 3))}
        >
          +
        </button>
        <button 
          className="bg-white dark:bg-slate-800 p-2 rounded shadow border text-xs hover:bg-slate-100"
          onClick={() => setScale(s => Math.max(s - 0.2, 0.5))}
        >
          -
        </button>
      </div>
    </div>
  )

  if (embedded) return content
  return (
    <div className="rounded-lg border bg-card p-4">
      <h3 className="mb-3 text-sm font-semibold text-foreground">지하철 노선도 (1~9호선)</h3>
      {content}
    </div>
  )
}
