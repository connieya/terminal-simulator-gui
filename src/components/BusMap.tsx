import { useTerminalStore } from '@/stores/terminalStore'
import { busRoutes } from '@/data/terminalPresets'
import type { BusRouteOption } from '@/data/terminalPresets'

const BUS_LINE_COLOR = '#E85D04'

/**
 * 버스 노선도 컴포넌트
 * busRoutes 기반으로 노선을 표시하고, 노선 클릭 시 버스 단말기의 정류장/노선 정보를 갱신한다.
 */
export function BusMap() {
  const { terminals, updateTerminal } = useTerminalStore()
  const busTerminal = terminals.find((t) => t.transitType === 'bus')

  const currentRouteId = busTerminal
    ? busRoutes.find(
        (r) =>
          r.entryTerminalId === busTerminal.terminalId ||
          r.exitTerminalId === busTerminal.terminalId
      )?.id ?? null
    : null

  const handleRouteClick = (route: BusRouteOption) => {
    if (!busTerminal || busTerminal.transitType !== 'bus') return
    const terminalId =
      busTerminal.type === 'entry' ? route.entryTerminalId : route.exitTerminalId
    const station =
      busTerminal.type === 'entry' ? route.entryStopName : route.exitStopName
    updateTerminal(busTerminal.id, {
      terminalId,
      station,
      line: route.routeName,
    })
  }

  return (
    <div className="rounded-lg border bg-card p-4">
      <h3 className="mb-3 text-sm font-semibold text-foreground">버스 노선도</h3>
      <div className="flex flex-col gap-2">
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
      className="flex w-full items-center gap-2 rounded-md border px-3 py-2 text-left transition-colors hover:bg-muted/80 focus:outline-none focus:ring-2 focus:ring-primary"
      style={{
        borderColor: isSelected ? BUS_LINE_COLOR : undefined,
        backgroundColor: isSelected ? 'rgba(232, 93, 4, 0.08)' : undefined,
      }}
      title={`${route.routeName}: ${route.entryStopName} ↔ ${route.exitStopName}`}
    >
      <span
        className="h-2 w-2 shrink-0 rounded-full"
        style={{ backgroundColor: BUS_LINE_COLOR }}
      />
      <span className="text-xs font-medium text-foreground">
        {route.routeName}
      </span>
      <span className="text-xs text-muted-foreground">
        {route.entryStopName} ↔ {route.exitStopName}
      </span>
    </button>
  )
}
