import { useState } from 'react'
import { SubwayMap } from './SubwayMap'
import { BusMap } from './BusMap'

type TransitType = 'subway' | 'bus'

/**
 * 통합 노선도 패널
 * 상단에서 지하철/버스 선택. 지하철 선택 시 모든 노선(1~4호선)을 한 화면에 표시
 */
export function UnifiedRouteMap() {
  const [transitType, setTransitType] = useState<TransitType>('subway')

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
      {/* 지하철 | 버스 */}
      <div className="flex border-b border-border bg-muted/30">
        <button
          type="button"
          onClick={() => setTransitType('subway')}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
            transitType === 'subway'
              ? 'bg-background text-foreground border-b-2 border-primary shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
          }`}
        >
          지하철
        </button>
        <button
          type="button"
          onClick={() => setTransitType('bus')}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
            transitType === 'bus'
              ? 'bg-background text-foreground border-b-2 border-primary shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
          }`}
        >
          버스
        </button>
      </div>

      <div className="p-4">
        {transitType === 'subway' && <SubwayMap embedded />}
        {transitType === 'bus' && <BusMap embedded />}
      </div>
    </div>
  )
}
