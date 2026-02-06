import { useTerminalStore } from '@/stores/terminalStore'
import { TerminalCard } from './TerminalCard'
import { SubwayMap } from './SubwayMap'
import { JourneyPanel } from './JourneyPanel'

/**
 * 단말기 목록 컴포넌트
 * 왼쪽: 지하철 노선도(상단) + 단말기 카드(하단), 오른쪽: 여정 패널
 * 지하철 단말기 1개에서 드롭다운으로 승차/하차 선택. 노선도 역 클릭 시 해당 단말기 역 갱신.
 */
export function TerminalList() {
  const { terminals } = useTerminalStore()
  const subwayTerminal = terminals.find((t) => t.transitType === 'subway')
  const busTerminal = terminals.find((t) => t.transitType === 'bus')
  const displayTerminals = [subwayTerminal, busTerminal].filter(
    (t): t is (typeof terminals)[number] => Boolean(t)
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">연동 단말기</h2>
        <span className="text-sm text-muted-foreground">
          총 {displayTerminals.length}개 단말기
        </span>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        {/* 왼쪽: 노선도(상단) + 단말기(하단) */}
        <div className="flex flex-col gap-4">
          <SubwayMap />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {displayTerminals.map((terminal) => (
              <TerminalCard
                key={terminal.id}
                terminal={terminal}
                isSelected={terminal.transitType === 'subway'}
                onSelect={undefined}
              />
            ))}
          </div>
          {displayTerminals.length === 0 && (
            <div className="py-12 text-center text-muted-foreground">
              등록된 단말기가 없습니다.
            </div>
          )}
        </div>

        {/* 오른쪽: 여정 패널 */}
        <div className="flex flex-col gap-4">
          <JourneyPanel />
        </div>
      </div>
    </div>
  )
}

