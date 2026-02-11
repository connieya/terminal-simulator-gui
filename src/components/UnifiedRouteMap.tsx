import { useState } from 'react'
import { SubwayMap, type SubwayLineKey } from './SubwayMap'
import { BusMap } from './BusMap'

type TransitType = 'subway' | 'bus'

const LINE1_COLOR = '#0052A4'
const LINE2_COLOR = '#00A84D'

/**
 * 통합 노선도 패널
 * 상단에서 지하철/버스 선택, 지하철일 때 1호선/2호선 선택 후 해당 내용만 표시
 */
export function UnifiedRouteMap() {
  const [transitType, setTransitType] = useState<TransitType>('subway')
  const [subwayLine, setSubwayLine] = useState<SubwayLineKey>('1호선')

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
      {/* 1단계: 지하철 | 버스 */}
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

      {/* 지하철일 때: 1호선 / 2호선 필 스타일 */}
      {transitType === 'subway' && (
        <div className="flex items-center gap-2 border-b border-border bg-gradient-to-r from-muted/20 to-muted/10 px-4 py-3">
          <span className="text-xs font-medium text-muted-foreground shrink-0">
            노선
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setSubwayLine('1호선')}
              className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 ${
                subwayLine === '1호선'
                  ? 'text-white shadow-md ring-2 ring-offset-2 ring-offset-background ring-[#0052A4]'
                  : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
              style={
                subwayLine === '1호선' ? { backgroundColor: LINE1_COLOR } : undefined
              }
            >
              <span
                className="h-2 w-2 rounded-full shrink-0"
                style={{
                  backgroundColor: subwayLine === '1호선' ? 'rgba(255,255,255,0.9)' : LINE1_COLOR,
                }}
              />
              1호선
            </button>
            <button
              type="button"
              onClick={() => setSubwayLine('2호선')}
              className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 ${
                subwayLine === '2호선'
                  ? 'text-white shadow-md ring-2 ring-offset-2 ring-offset-background ring-[#00A84D]'
                  : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
              style={
                subwayLine === '2호선' ? { backgroundColor: LINE2_COLOR } : undefined
              }
            >
              <span
                className="h-2 w-2 rounded-full shrink-0"
                style={{
                  backgroundColor: subwayLine === '2호선' ? 'rgba(255,255,255,0.9)' : LINE2_COLOR,
                }}
              />
              2호선
            </button>
          </div>
        </div>
      )}

      <div className="p-4">
        {transitType === 'subway' && (
          <SubwayMap embedded line={subwayLine} />
        )}
        {transitType === 'bus' && <BusMap embedded />}
      </div>
    </div>
  )
}
