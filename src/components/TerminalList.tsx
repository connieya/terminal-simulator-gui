import { useTerminalStore } from '@/stores/terminalStore'
import { TerminalCard } from './TerminalCard'
import { SubwayMap } from './SubwayMap'
import { JourneyPanel } from './JourneyPanel'
import { TcpLogPanel } from './TcpLogPanel'
import { ConnectionSettings } from './ConnectionSettings'

/**
 * 단말기 목록 컴포넌트
 * 왼쪽: 지하철 노선도(상단) + 단말기 카드(하단)
 * 가운데: 지하철 여정
 * 오른쪽: TCP 통신 로그
 */
export function TerminalList() {
  const { terminals } = useTerminalStore()
  const subwayTerminal = terminals.find((t) => t.transitType === 'subway')
  const busTerminal = terminals.find((t) => t.transitType === 'bus')
  const displayTerminals = [subwayTerminal, busTerminal].filter(
    (t): t is (typeof terminals)[number] => Boolean(t)
  )

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)_minmax(0,0.8fr)]">
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

      {/* 가운데: 여정 패널 */}
      <div className="flex flex-col gap-4">
        <JourneyPanel />
      </div>

      {/* 오른쪽: 연결 설정 + TCP 로그 */}
      <div className="flex flex-col gap-4">
        <ConnectionSettings variant="inline" />
        <TcpLogPanel />
      </div>
    </div>
  )
}

