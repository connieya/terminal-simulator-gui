import { useTerminalStore } from '@/stores/terminalStore'
import { TerminalCard } from './TerminalCard'

/**
 * 단말기 목록 컴포넌트
 * 모든 교통 단말기를 그리드로 표시
 */
export function TerminalList() {
  const { terminals } = useTerminalStore()

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">교통 단말기 관리</h2>
        <span className="text-sm text-muted-foreground">
          총 {terminals.length}개 단말기
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {terminals.map((terminal) => (
          <TerminalCard key={terminal.id} terminal={terminal} />
        ))}
      </div>

      {terminals.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          등록된 단말기가 없습니다.
        </div>
      )}
    </div>
  )
}

