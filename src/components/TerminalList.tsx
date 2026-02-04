import { useTerminalStore } from '@/stores/terminalStore'
import { TerminalCard } from './TerminalCard'

/**
 * 단말기 목록 컴포넌트
 * 모든 교통 단말기를 그리드로 표시
 */
export function TerminalList() {
  const { terminals } = useTerminalStore()
  const subwayTerminal = terminals.find((terminal) => terminal.transitType === 'subway')
  const busTerminal = terminals.find((terminal) => terminal.transitType === 'bus')
  const displayTerminals = [subwayTerminal, busTerminal].filter(
    (terminal): terminal is (typeof terminals)[number] => Boolean(terminal)
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">교통 단말기 관리</h2>
        <span className="text-sm text-muted-foreground">
          총 {displayTerminals.length}개 단말기
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {displayTerminals.map((terminal) => (
          <TerminalCard key={terminal.id} terminal={terminal} />
        ))}
      </div>

      {displayTerminals.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          등록된 단말기가 없습니다.
        </div>
      )}
    </div>
  )
}

