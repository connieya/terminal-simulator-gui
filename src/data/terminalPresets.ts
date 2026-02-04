export type SubwayStationOption = {
  id: string
  name: string
  line?: string
  entryTerminalId: string
  exitTerminalId: string
}

export type BusRouteOption = {
  id: string
  routeName: string
  entryStopName: string
  exitStopName: string
  entryTerminalId: string
  exitTerminalId: string
}

export const subwayStations: SubwayStationOption[] = [
  {
    id: 'seoul',
    name: '서울역',
    line: '1호선',
    entryTerminalId: 'M-SEOUL-E01',
    exitTerminalId: 'M-SEOUL-X01',
  },
  {
    id: 'gangnam',
    name: '강남역',
    line: '2호선',
    entryTerminalId: 'M-GANGNAM-E01',
    exitTerminalId: 'M-GANGNAM-X01',
  },
  {
    id: 'jongno3ga',
    name: '종로3가역',
    line: '1호선',
    entryTerminalId: 'M-JONGNO3GA-E01',
    exitTerminalId: 'M-JONGNO3GA-X01',
  },
  {
    id: 'sindorim',
    name: '신도림역',
    line: '2호선',
    entryTerminalId: 'M-SINDORIM-E01',
    exitTerminalId: 'M-SINDORIM-X01',
  },
  {
    id: 'hongdae',
    name: '홍대입구역',
    line: '2호선',
    entryTerminalId: 'M-HONGDAE-E01',
    exitTerminalId: 'M-HONGDAE-X01',
  },
  {
    id: 'hapjeong',
    name: '합정역',
    line: '2호선',
    entryTerminalId: 'M-HAPJEONG-E01',
    exitTerminalId: 'M-HAPJEONG-X01',
  },
  {
    id: 'sicheong',
    name: '시청',
    line: '2호선',
    entryTerminalId: 'M-SICHEONG-E01',
    exitTerminalId: 'M-SICHEONG-X01',
  },
  {
    id: 'euljiro3ga',
    name: '을지로3가',
    line: '2호선',
    entryTerminalId: 'M-EULJIRO3GA-E01',
    exitTerminalId: 'M-EULJIRO3GA-X01',
  },
  {
    id: 'hanyangdae',
    name: '한양대',
    line: '2호선',
    entryTerminalId: 'M-HANYANGDAE-E01',
    exitTerminalId: 'M-HANYANGDAE-X01',
  },
  {
    id: 'gyodae',
    name: '교대',
    line: '2호선',
    entryTerminalId: 'M-GYODAE-E01',
    exitTerminalId: 'M-GYODAE-X01',
  },
  {
    id: 'bangbae',
    name: '방배',
    line: '2호선',
    entryTerminalId: 'M-BANGBAE-E01',
    exitTerminalId: 'M-BANGBAE-X01',
  },
]

export const busRoutes: BusRouteOption[] = [
  {
    id: 'dobo_to_yeongdeungpo',
    routeName: '새벽A160',
    entryStopName: '도봉산역',
    exitStopName: '영등포역',
    entryTerminalId: 'B12001',
    exitTerminalId: 'B12002',
  },
  {
    id: 'hapjeong_to_dongdaemun',
    routeName: '심야A21',
    entryStopName: '합정역',
    exitStopName: '동대문역.흥인지문',
    entryTerminalId: 'B-HAPJEONG-E01',
    exitTerminalId: 'B-DONGDAEMUN-X01',
  },
  {
    id: 'janghan_to_kyunghee',
    routeName: '동대문A01',
    entryStopName: '장한평역3번출구',
    exitStopName: '경희대의료원.경희여중고',
    entryTerminalId: 'B-JANGHANPYEONG-E01',
    exitTerminalId: 'B-KYUNGHEE-X01',
  },
  {
    id: 'seodaemun_to_gajwa',
    routeName: '서대문A01',
    entryStopName: '서대문문화체육회관입구',
    exitStopName: '가좌역3번출구',
    entryTerminalId: 'B-SEODAEMUN-E01',
    exitTerminalId: 'B-GAJWA-X01',
  },
]
