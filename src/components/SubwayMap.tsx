import { useMemo, useRef, useState, useEffect } from 'react'
import { useTerminalStore } from '@/stores/terminalStore'
import { getStationsByLine } from '@/data/terminalPresets'
import type { SubwayStationOption } from '@/data/terminalPresets'
import { calculateStationPositions, LINE_COLORS } from '@/data/stationCoordinates'

interface SubwayMapProps {
  embedded?: boolean
}

export function SubwayMap({ embedded }: SubwayMapProps) {
  const terminal = useTerminalStore((s) => s.terminals[0])
  const updateTerminal = useTerminalStore((s) => s.updateTerminal)
  const allStationsByLine = getStationsByLine()
  // 2호선만 필터링
  const stationsByLine = { '2호선': allStationsByLine['2호선'] || [] }
  const containerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)

  const { stationsByLineWithPos, allStations, linePaths } = useMemo(() => {
    return calculateStationPositions(stationsByLine)
  }, [stationsByLine])

  // 2호선 역들의 좌표 범위 계산하여 뷰포트 크기 결정
  const { viewBoxWidth, viewBoxHeight, padding, minX, minY } = useMemo(() => {
    if (allStations.length === 0) {
      return { viewBoxWidth: 400, viewBoxHeight: 250, padding: 50, minX: 0, minY: 0 }
    }
    
    const xs = allStations.map(s => s.x)
    const ys = allStations.map(s => s.y)
    const minX = Math.min(...xs)
    const maxX = Math.max(...xs)
    const minY = Math.min(...ys)
    const maxY = Math.max(...ys)
    
    const padding = 60
    const viewBoxWidth = maxX - minX + padding * 2
    const viewBoxHeight = maxY - minY + padding * 2
    
    return {
      viewBoxWidth: Math.max(400, viewBoxWidth),
      viewBoxHeight: Math.max(250, viewBoxHeight),
      padding,
      minX,
      minY,
    }
  }, [allStations])

  // 초기 스케일 자동 조정 (컨테이너에 맞게)
  useEffect(() => {
    if (!containerRef.current || allStations.length === 0) return
    
    const container = containerRef.current
    const containerWidth = container.clientWidth
    const containerHeight = container.clientHeight
    
    // 여백 고려
    const availableWidth = containerWidth - 40
    const availableHeight = containerHeight - 40
    
    const scaleX = availableWidth / viewBoxWidth
    const scaleY = availableHeight / viewBoxHeight
    const autoScale = Math.min(scaleX, scaleY, 1.2) // 최대 1.2배까지만
    
    setScale(autoScale)
  }, [viewBoxWidth, viewBoxHeight, allStations.length])

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
      className="w-full h-[400px] overflow-auto rounded-lg bg-[#f8fafc] dark:bg-[#0f172a] relative border"
      onWheel={handleWheel}
    >
      <div 
        className="flex items-center justify-center"
        style={{ 
          width: '100%',
          height: '100%',
          minHeight: '400px',
        }}
      >
        <svg
          width={viewBoxWidth}
          height={viewBoxHeight}
          viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
          className="block"
          style={{
            transform: `scale(${scale})`,
            transformOrigin: 'center center',
            transition: 'transform 0.1s ease-out',
          }}
        >
          {/* Lines (직각 경로 우선) */}
          {Object.entries(stationsByLineWithPos).map(([lineKey, stations]) => {
            const points = linePaths[lineKey] ?? stations.map((s) => `${s.x},${s.y}`).join(' ')
            const color = LINE_COLORS[lineKey] ?? '#999'
            // 좌표를 원점 이동 후 패딩 추가
            const adjustedPoints = points.split(' ').map(p => {
              const [x, y] = p.split(',').map(Number)
              return `${x - minX + padding},${y - minY + padding}`
            }).join(' ')
            return (
              <polyline
                key={lineKey}
                points={adjustedPoints}
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
            
            // 좌표를 원점 이동 후 패딩 추가
            const adjustedX = station.x - minX + padding
            const adjustedY = station.y - minY + padding
            
            // Simple label positioning logic
            // Default: bottom
            let dx = 0
            let dy = 16
            let anchor: 'start' | 'middle' | 'end' = 'middle'

            // Adjust based on position to keep inside bounds
            if (adjustedY > viewBoxHeight - 30) dy = -16
            if (adjustedX < 30) { dx = 12; dy = 4; anchor = 'start' }
            if (adjustedX > viewBoxWidth - 30) { dx = -12; dy = 4; anchor = 'end' }

            return (
              <g key={`${station.line}-${station.id}`} className="group">
                {/* Hit area */}
                <circle
                  cx={adjustedX}
                  cy={adjustedY}
                  r="12"
                  fill="transparent"
                  className="cursor-pointer"
                  onClick={() => handleStationClick(station)}
                >
                  <title>{`${station.line} ${station.name}`}</title>
                </circle>

                {/* Visible node */}
                <circle
                  cx={adjustedX}
                  cy={adjustedY}
                  r="5"
                  fill={isHighlight ? (isEntry ? '#2563eb' : '#16a34a') : 'white'}
                  stroke={LINE_COLORS[station.line ?? ''] ?? '#666'}
                  strokeWidth={isHighlight ? 3 : 2}
                  className="cursor-pointer transition-all group-hover:r-7"
                  onClick={() => handleStationClick(station)}
                />

                {/* Label */}
                <text
                  x={adjustedX + dx}
                  y={adjustedY + dy}
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
                    x={adjustedX + dx}
                    y={adjustedY + dy + 12}
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
      <h3 className="mb-3 text-sm font-semibold text-foreground">지하철 노선도 (2호선)</h3>
      {content}
    </div>
  )
}
