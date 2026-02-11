import { useJourneyStore } from '@/stores/journeyStore'

/**
 * 여정 패널
 * 카드 탭 성공 시 기록된 승하차 여정(지하철/버스)을 시간순으로 표시한다.
 */
export function JourneyPanel() {
  const journeys = useJourneyStore((state) => state.journeys)

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp)
    const hh = String(date.getHours()).padStart(2, '0')
    const mm = String(date.getMinutes()).padStart(2, '0')
    const ss = String(date.getSeconds()).padStart(2, '0')
    return `${hh}:${mm}:${ss}`
  }

  return (
    <div className="rounded-lg border bg-card p-4">
      <h3 className="mb-3 text-sm font-semibold text-foreground">여정</h3>
      <div className="flex flex-col gap-2">
        {journeys.length === 0 ? (
          <div className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
            카드 탭 이후 여정이 표시됩니다.
          </div>
        ) : (
          <div className="max-h-[360px] space-y-2 overflow-auto pr-1">
            {journeys.map((journey) => (
              <div
                key={journey.id}
                className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
              >
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">
                    {formatTime(journey.timestamp)}
                  </span>
                  <span className="font-semibold">{journey.station}</span>
                  {journey.line && (
                    <span className="text-xs text-muted-foreground">
                      ({journey.line})
                    </span>
                  )}
                </div>
                <span
                  className={`rounded px-2 py-0.5 text-xs font-medium ${
                    journey.type === 'entry'
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                      : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                  }`}
                >
                  {journey.type === 'entry' ? '승차' : '하차'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
