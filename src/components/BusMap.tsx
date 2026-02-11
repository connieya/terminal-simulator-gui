import { useTerminalStore } from '@/stores/terminalStore'
import { busRoutes } from '@/data/terminalPresets'
import type { BusRouteOption } from '@/data/terminalPresets'

const BUS_LINE_COLOR = '#E85D04'

interface BusMapProps {
  /** 통합 노선도 탭 내부에 넣을 때 true (제목·카드 래퍼 생략) */
  embedded?: boolean
}

/**
 * 버스 노선도 컴포넌트
 * 노선 클릭 시 단일 단말기의 정류장/노선 정보를 갱신한다. (transitType: 'bus'로 설정)
 */
export function BusMap({ embedded }: BusMapProps) {
  const terminal = useTerminalStore((s) => s.terminals[0])
  const updateTerminal = useTerminalStore((s) => s.updateTerminal)

  const currentRouteId =
    terminal?.transitType === 'bus' && terminal?.line
      ? busRoutes.find((r) => r.routeName === terminal.line)?.id ?? null
      : null

  const handleRouteClick = (route: BusRouteOption) => {
    if (!terminal) return
    const firstStop = route.stops[0]
    if (!firstStop) return
    const terminalId =
      terminal.type === 'entry'
        ? firstStop.entryTerminalId
        : firstStop.exitTerminalId
    updateTerminal(terminal.id, {
      transitType: 'bus',
      terminalId,
      station: firstStop.stopName,
      line: route.routeName,
    })
  }

  const content = (
    <div className="flex flex-col gap-2.5">
      {busRoutes.map((route) => {
        const isSelected = route.id === currentRouteId
        return (
          <RouteNode
            key={route.id}
            route={route}
            isSelected={isSelected}
            onClick={() => handleRouteClick(route)}
          />
        )
      })}
    </div>
  )

  if (embedded) return content
  return (
    <div className="rounded-lg border bg-card p-4">
      <h3 className="mb-3 text-sm font-semibold text-foreground">버스 노선도</h3>
      {content}
    </div>
  )
}

interface RouteNodeProps {
  route: BusRouteOption
  isSelected: boolean
  onClick: () => void
}

function RouteNode({ route, isSelected, onClick }: RouteNodeProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-lg border-2 px-4 py-3 text-left transition-colors hover:bg-muted/70 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
      style={{
        borderColor: isSelected ? BUS_LINE_COLOR : 'var(--border)',
        backgroundColor: isSelected ? 'rgba(232, 93, 4, 0.1)' : undefined,
      }}
      title={`${route.routeName}: ${route.entryStopName} ↔ ${route.exitStopName} (정류장 ${route.stops.length}개)`}
    >
      <span
        className="h-2.5 w-2.5 shrink-0 rounded-full"
        style={{ backgroundColor: BUS_LINE_COLOR }}
      />
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-foreground">
          {route.routeName}
        </div>
        <div className="text-xs text-muted-foreground mt-0.5">
          {route.entryStopName} ↔ {route.exitStopName}
        </div>
      </div>
    </button>
  )
}
