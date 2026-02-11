export type SubwayStationOption = {
  id: string
  name: string
  line?: string
  /** journeyLog 내 역 식별자 (external_station_no, 예: 0201) */
  stationId: string
  entryTerminalId: string
  exitTerminalId: string
}

/** 노선 내 정류장 한 건 (정류장 드롭다운·GUI JSON 전송용) */
export type BusStopOption = {
  id: string
  stopName: string
  /** GUI→Simulator JSON 전송 시 사용 (TerminalConfig 미참조) */
  entryJourneyLog?: string
  exitJourneyLog?: string
  entryPresetKey: string
  exitPresetKey: string
  entryTerminalId: string
  exitTerminalId: string
}

/** 지하철 역의 journeyLog 문자열 생성 (SUBWAY,stationId,Z??,G01,IN/OUT, , , ) */
export function getSubwayJourneyLog(
  station: SubwayStationOption,
  type: 'entry' | 'exit'
): string {
  const inOut = type === 'entry' ? 'IN' : 'OUT'
  const zone = station.line === '1호선' ? 'Z01' : 'Z02'
  return `SUBWAY,${station.stationId},${zone},G01,${inOut}, , , `
}

export type BusRouteOption = {
  id: string
  routeName: string
  /** TerminalConfig journeyLog의 route_id (9자) */
  routeId: string
  /** 노선의 정류장 목록 (순서 유지) */
  stops: BusStopOption[]
  /** 첫/끝 정류장 표시용 (stops[0] / stops[stops.length-1]) */
  entryStopName: string
  exitStopName: string
  entryTerminalId: string
  exitTerminalId: string
  entryPresetKey: string
  exitPresetKey: string
}

/**
 * 지하철 역 목록. TerminalConfig.json journeyPresets 키와 1:1 대응해야 함.
 * - 2호선 역 중 TerminalConfig에 subway_in_XXX_2line / subway_out_XXX_2line 이 있으면
 *   id는 XXX_2line, terminalId는 M-XXX2-E01/X01, stationId는 해당 journeyLog 값 사용.
 *   예: 강남역(2호선)→gangnam_2line/M-GANGNAM2-*, 신도림역(2호선)→sindorim_2line/M-SINDORIM2-*
 */
export const subwayStations: SubwayStationOption[] = [
  {
    id: 'seoul',
    name: '서울역',
    line: '1호선',
    stationId: '1251',
    entryTerminalId: 'M-SEOUL-E01',
    exitTerminalId: 'M-SEOUL-X01',
  },
  {
    id: 'gangnam_2line',
    name: '강남역',
    line: '2호선',
    stationId: '0222',
    entryTerminalId: 'M-GANGNAM2-E01',
    exitTerminalId: 'M-GANGNAM2-X01',
  },
  {
    id: 'jongno3ga',
    name: '종로3가역',
    line: '1호선',
    stationId: '3120',
    entryTerminalId: 'M-JONGNO3GA-E01',
    exitTerminalId: 'M-JONGNO3GA-X01',
  },
  {
    id: 'sindorim_2line',
    name: '신도림역',
    line: '2호선',
    stationId: '0234',
    entryTerminalId: 'M-SINDORIM2-E01',
    exitTerminalId: 'M-SINDORIM2-X01',
  },
  {
    id: 'hongdae',
    name: '홍대입구역',
    line: '2호선',
    stationId: '0239',
    entryTerminalId: 'M-HONGDAE-E01',
    exitTerminalId: 'M-HONGDAE-X01',
  },
  {
    id: 'hapjeong',
    name: '합정역',
    line: '2호선',
    stationId: '0238',
    entryTerminalId: 'M-HAPJEONG-E01',
    exitTerminalId: 'M-HAPJEONG-X01',
  },
  {
    id: 'sicheong',
    name: '시청',
    line: '2호선',
    stationId: '0201',
    entryTerminalId: 'M-SICHEONG-E01',
    exitTerminalId: 'M-SICHEONG-X01',
  },
  {
    id: 'euljiro3ga',
    name: '을지로3가',
    line: '2호선',
    stationId: '0203',
    entryTerminalId: 'M-EULJIRO3GA-E01',
    exitTerminalId: 'M-EULJIRO3GA-X01',
  },
  {
    id: 'hanyangdae',
    name: '한양대',
    line: '2호선',
    stationId: '0209',
    entryTerminalId: 'M-HANYANGDAE-E01',
    exitTerminalId: 'M-HANYANGDAE-X01',
  },
  {
    id: 'gyodae',
    name: '교대',
    line: '2호선',
    stationId: '0223',
    entryTerminalId: 'M-GYODAE-E01',
    exitTerminalId: 'M-GYODAE-X01',
  },
  {
    id: 'bangbae',
    name: '방배',
    line: '2호선',
    stationId: '0225',
    entryTerminalId: 'M-BANGBAE-E01',
    exitTerminalId: 'M-BANGBAE-X01',
  },
  {
    id: 'sindang',
    name: '신당',
    line: '2호선',
    stationId: '0206',
    entryTerminalId: 'M-SINDANG-E01',
    exitTerminalId: 'M-SINDANG-X01',
  },
  {
    id: 'sadang',
    name: '사당',
    line: '2호선',
    stationId: '0226',
    entryTerminalId: 'M-SADANG-E01',
    exitTerminalId: 'M-SADANG-X01',
  },
  {
    id: 'wangsimni',
    name: '왕십리',
    line: '2호선',
    stationId: '0208',
    entryTerminalId: 'M-WANGSIMNI-E01',
    exitTerminalId: 'M-WANGSIMNI-X01',
  },
  {
    id: 'jamsil',
    name: '잠실',
    line: '2호선',
    stationId: '0216',
    entryTerminalId: 'M-JAMSIL-E01',
    exitTerminalId: 'M-JAMSIL-X01',
  },
  {
    id: 'daerim',
    name: '대림',
    line: '2호선',
    stationId: '0233',
    entryTerminalId: 'M-DAERIM-E01',
    exitTerminalId: 'M-DAERIM-X01',
  },
]

/** 노선별 역 목록 (노선도 배치용). 1호선: 배열 순서, 2호선: 순환 순서(시청 기준) */
export function getStationsByLine(): {
  '1호선': SubwayStationOption[]
  '2호선': SubwayStationOption[]
} {
  const line1 = subwayStations.filter((s) => s.line === '1호선')
  // 2호선 순환 순서 (시청 → 을지로3가 → … → 신도림 → … → 시청 방향, stationId 기준)
  const line2Order = [
    'sicheong', 'euljiro3ga', 'sindang', 'hanyangdae', 'wangsimni', 'jamsil',
    'gangnam_2line', 'gyodae', 'bangbae', 'sadang', 'daerim', 'sindorim_2line',
    'hapjeong', 'hongdae',
  ]
  const line2Map = new Map(subwayStations.filter((s) => s.line === '2호선').map((s) => [s.id, s]))
  const line2 = line2Order.map((id) => line2Map.get(id)).filter((s): s is SubwayStationOption => Boolean(s))
  return { '1호선': line1, '2호선': line2 }
}

import busRoutesWithStops from './busRoutesWithStops.json'

export const busRoutes: BusRouteOption[] = busRoutesWithStops as BusRouteOption[]
