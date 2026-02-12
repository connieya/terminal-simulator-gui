import { useMemo } from 'react'
import { useTerminalStore } from '@/stores/terminalStore'
import { getStationsByLine } from '@/data/terminalPresets'
import type { SubwayStationOption } from '@/data/terminalPresets'

/** 서울 지하철 노선별 공식 색상 */
const LINE_COLORS: Record<string, string> = {
  '1호선': '#0052A4',
  '2호선': '#00A84D',
  '3호선': '#EF7C1C',
  '4호선': '#00A5DE',
}

const LINE_ORDER = ['1호선', '2호선', '3호선', '4호선']

/** 노선도 좌표계: viewBox 0 0 560 420 (실제 서울 노선도 스키매틱 반영) */
const VW = 560
const VH = 420

/** 환승역 공통 좌표 (실제 노선도에서 1·4호선이 만나는 서울역 등) */
const TRANSFER = {
  /** 서울역: 1호선·4호선 환승 */
  seoul: { x: 400, y: 100 },
}

/** 2호선 순환: 사각형 둘레, 역 균등 배치 (상→우→하→좌) */
function getLine2Points(count: number): { x: number; y: number }[] {
  const [left, top, right, bottom] = [100, 70, 460, 350]
  const w = right - left
  const h = bottom - top
  const perimeter = 2 * (w + h)
  const n = Math.max(1, count)
  const pts: { x: number; y: number }[] = []
  for (let i = 0; i < n; i++) {
    const d = (i / n) * perimeter
    if (d < w) pts.push({ x: left + d, y: top })
    else if (d < w + h) pts.push({ x: right, y: top + (d - w) })
    else if (d < w * 2 + h) pts.push({ x: right - (d - w - h), y: bottom })
    else pts.push({ x: left, y: bottom - (d - w * 2 - h) })
  }
  return pts
}

/**
 * 1호선: 서울역(1·4호선 환승) ↔ 종로3가 수평선
 * 실제 노선도처럼 서울역에서 4호선과 만남
 */
function getLine1Points(count: number): { x: number; y: number }[] {
  const { x: sx, y: sy } = TRANSFER.seoul
  if (count <= 0) return []
  if (count === 1) return [TRANSFER.seoul]
  return [{ x: sx, y: sy }, { x: sx - 120, y: sy }]
}

/**
 * 3호선: 구파발~수서. 2호선과 을지로3가(상단), 교대(하단)에서 만남
 * 2호선 좌표를 참조해 환승역에서 만나도록 꺾인 경로
 */
function getLine3Points(count: number, line2Points?: { x: number; y: number }[]): { x: number; y: number }[] {
  const n = Math.max(1, count)
  const leftX = 48
  const euljiro3ga = line2Points && line2Points[2] ? line2Points[2] : { x: 244, y: 70 }
  const gyodae = line2Points && line2Points[17] ? line2Points[17] : { x: 460, y: 350 }
  const pts: { x: number; y: number }[] = []
  for (let i = 0; i < n; i++) {
    if (i <= 3) {
      pts.push({ x: leftX, y: 75 + (220 * i) / 3 })
    } else if (i === 4) {
      pts.push(euljiro3ga)
    } else if (i === 5) {
      pts.push({ x: 320, y: 140 })
    } else if (i === 6) {
      pts.push({ x: 400, y: 250 })
    } else if (i === 7) {
      pts.push(gyodae)
    } else if (i >= 8) {
      pts.push({ x: leftX, y: 310 + (35 * (i - 8)) / (n - 9 || 1) })
    }
  }
  return pts
}

/**
 * 4호선: 상계~사당. 서울역에서 1호선과 만나도록 세로선이 (400, 100)을 지남
 */
function getLine4Points(count: number): { x: number; y: number }[] {
  const { x: sx, y: sy } = TRANSFER.seoul
  const n = Math.max(1, count)
  const pts: { x: number; y: number }[] = []
  const yAbove = [58, 66, 74, 82, 90, 98]
  const yBelow = [170, 240, 310]
  for (let i = 0; i < n; i++) {
    if (i < 6) pts.push({ x: sx, y: yAbove[i] })
    else if (i === 6) pts.push({ x: sx, y: sy })
    else pts.push({ x: sx, y: yBelow[i - 7] })
  }
  return pts
}

interface SubwayMapProps {
  embedded?: boolean
}

/**
 * 지하철 노선도: 실제 노선도처럼 한 화면에 모든 노선을 스키매틱하게 배치.
 * 2호선 순환, 1/3/4호선 선형. 역은 작은 원에 노선색 적용.
 */
export function SubwayMap({ embedded }: SubwayMapProps) {
  const terminal = useTerminalStore((s) => s.terminals[0])
  const updateTerminal = useTerminalStore((s) => s.updateTerminal)
  const stationsByLine = getStationsByLine()

  const { segments, stationsWithPos } = useMemo(() => {
    type LabelOffset = { dx: number; dy: number; textAnchor: 'start' | 'middle' | 'end' }
    const getLabelOffset = (lineKey: string, index: number, count: number): LabelOffset => {
      switch (lineKey) {
        case '1호선':
          return { dx: 0, dy: 18, textAnchor: 'middle' }
        case '3호선':
          return { dx: -16, dy: 0, textAnchor: 'end' }
        case '4호선':
          return { dx: 16, dy: 0, textAnchor: 'start' }
        case '2호선': {
          const perEdge = count / 4
          if (index < perEdge) return { dx: 0, dy: -16, textAnchor: 'middle' }
          if (index < perEdge * 2) return { dx: 16, dy: 0, textAnchor: 'start' }
          if (index < perEdge * 3) return { dx: 0, dy: 18, textAnchor: 'middle' }
          return { dx: -16, dy: 0, textAnchor: 'end' }
        }
        default:
          return { dx: 0, dy: 18, textAnchor: 'middle' }
      }
    }

    const line2Stations = stationsByLine['2호선'] ?? []
    const line2Points = getLine2Points(line2Stations.length)

    const segments: { lineKey: string; color: string; points: string }[] = []
    const stationsWithPos: {
      station: SubwayStationOption
      x: number
      y: number
      lineKey: string
      labelOffset: LabelOffset
    }[] = []

    LINE_ORDER.forEach((lineKey) => {
      const stations = stationsByLine[lineKey] ?? []
      if (!stations.length) return
      const color = LINE_COLORS[lineKey] ?? '#666'
      let points: { x: number; y: number }[]
      switch (lineKey) {
        case '1호선':
          points = getLine1Points(stations.length)
          break
        case '2호선':
          points = line2Points
          break
        case '3호선':
          points = getLine3Points(stations.length, line2Points)
          break
        case '4호선':
          points = getLine4Points(stations.length)
          break
        default:
          points = []
      }
      segments.push({
        lineKey,
        color,
        points: points.map((p) => `${p.x},${p.y}`).join(' '),
      })
      stations.forEach((station, i) => {
        const p = points[i] ?? points[0]
        const labelOffset = getLabelOffset(lineKey, i, stations.length)
        stationsWithPos.push({ station, x: p.x, y: p.y, lineKey, labelOffset })
      })
    })
    return { segments, stationsWithPos }
  }, [stationsByLine])

  const allStations = stationsWithPos.map((s) => s.station)
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
    if (station.id !== currentStationId) return null
    return terminal?.type === 'entry' ? 'entry' : 'exit'
  }

  const content = (
    <div className="w-full overflow-hidden rounded-lg bg-[#f8fafc] dark:bg-[#0f172a]">
      <svg
        viewBox={`0 0 ${VW} ${VH}`}
        className="h-auto w-full min-h-[320px]"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* 노선 선 (먼저 그려서 역 아래에 깔림) */}
        {segments.map(({ lineKey, color, points }) => (
          <polyline
            key={lineKey}
            fill="none"
            stroke={color}
            strokeWidth="6"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={points}
          />
        ))}
        {/* 역 원 + 클릭 영역 */}
        {stationsWithPos.map(({ station, x, y, lineKey, labelOffset }) => {
          const color = LINE_COLORS[lineKey] ?? '#666'
          const role = stationRole(station)
          const isEntry = role === 'entry'
          const isExit = role === 'exit'
          const isHighlight = isEntry || isExit
          const tx = x + labelOffset.dx
          const ty = y + labelOffset.dy
          const labelText = station.name.length > 4 ? station.name.slice(0, 4) : station.name
          const isAbove = labelOffset.dy < 0
          const isSide = labelOffset.dy === 0
          const labelY = isSide ? ty + 4 : isAbove ? ty - 6 : ty + 12
          const subLabelY = isSide ? ty + 14 : isAbove ? ty - 14 : ty + 22
          return (
            <g key={station.id}>
              <circle
                cx={x}
                cy={y}
                r="14"
                fill="transparent"
                stroke="none"
                className="cursor-pointer"
                onClick={() => handleStationClick(station)}
              >
                <title>{`${lineKey} ${station.name}`}</title>
              </circle>
              <circle
                cx={x}
                cy={y}
                r="8"
                fill={isHighlight ? (isEntry ? 'rgba(0,82,164,0.25)' : 'rgba(0,168,77,0.25)') : '#fff'}
                stroke={color}
                strokeWidth={isHighlight ? 3 : 2}
                className="cursor-pointer"
                onClick={() => handleStationClick(station)}
              />
              <text
                x={tx}
                y={labelY}
                textAnchor={labelOffset.textAnchor}
                className="fill-muted-foreground font-medium pointer-events-none select-none"
                style={{
                  fontSize: '9px',
                  paintOrder: 'stroke fill',
                  stroke: 'rgba(255,255,255,0.9)',
                  strokeWidth: 2,
                }}
              >
                {labelText}
              </text>
              {(isEntry || isExit) && (
                <text
                  x={tx}
                  y={subLabelY}
                  textAnchor={labelOffset.textAnchor}
                  className="font-medium pointer-events-none select-none"
                  style={{
                    fontSize: '8px',
                    paintOrder: 'stroke fill',
                    stroke: 'rgba(255,255,255,0.9)',
                    strokeWidth: 1.5,
                  }}
                  fill={isEntry ? '#2563eb' : '#16a34a'}
                >
                  {isEntry ? '승차' : '하차'}
                </text>
              )}
            </g>
          )
        })}
      </svg>
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
