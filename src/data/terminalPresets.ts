/** JSON에서 로드한 지하철 역 한 건 (generate-subway-for-gui.cjs 출력 형식) */
export type SubwayStationOption = {
  id: string
  name: string
  line?: string
  /** journeyLog 내 역 식별자 (external_station_no) */
  stationId: string
  /** 노선별 zone (Z01~Z04). getSubwayJourneyLog에서 사용 */
  zoneCode?: string
  entryTerminalId: string
  exitTerminalId: string
  /** TerminalConfig journeyPresets 키 (있으면 CLI presetKey로 사용) */
  entryPresetKey?: string
  exitPresetKey?: string
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
  const zone =
    station.zoneCode ||
    (station.line === '1호선' ? 'Z01' : station.line === '2호선' ? 'Z02' : station.line === '3호선' ? 'Z03' : station.line === '4호선' ? 'Z04' : 'Z02')
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

import subwayData from './subwayStations.json'
import busRoutesWithStops from './busRoutesWithStops.json'

type SubwayJson = { stations: SubwayStationOption[]; stationsByLine: Record<string, SubwayStationOption[]> }

/** 지하철 역 목록 (TerminalConfig generate-subway-for-gui.cjs로 생성된 JSON에서 로드) */
export const subwayStations: SubwayStationOption[] = (subwayData as SubwayJson).stations

/** 노선별 역 목록 (노선도 배치용). 1~4호선 */
export function getStationsByLine(): Record<string, SubwayStationOption[]> {
  const data = subwayData as SubwayJson
  return data.stationsByLine || {
    '1호선': subwayStations.filter((s) => s.line === '1호선'),
    '2호선': subwayStations.filter((s) => s.line === '2호선'),
    '3호선': subwayStations.filter((s) => s.line === '3호선'),
    '4호선': subwayStations.filter((s) => s.line === '4호선'),
  }
}

export const busRoutes: BusRouteOption[] = busRoutesWithStops as BusRouteOption[]
