import type { SubwayStationOption } from './terminalPresets'

/** 공공데이터 CSV 스크립트로 생성한 스키매틱 좌표 (위경도 → view 좌표) */
export interface PublicStationCoord {
  line: string
  name: string
  stationId?: string
  lat: number
  lon: number
  x: number
  y: number
}

export interface StationCoordsFromPublic {
  bounds: { lonMin: number; lonMax: number; latMin: number; latMax: number } | null
  view: { width: number; height: number }
  stations: PublicStationCoord[]
  generatedAt: string | null
}

export const LINE_COLORS: Record<string, string> = {
  '1호선': '#0052A4',
  '2호선': '#00A84D',
  '3호선': '#EF7C1C',
  '4호선': '#00A5DE',
  '5호선': '#996CAC',
  '6호선': '#CD7C2F',
  '7호선': '#747F00',
  '8호선': '#E6186C',
  '9호선': '#BDB092',
  '수인분당선': '#F5A200',
  '신분당선': '#D4003B',
  '경의중앙선': '#77C4A3',
  '공항철도': '#0090D2',
}

// 주요 환승역 및 랜드마크 좌표 정의 (Schematic Map Layout)
// 캔버스 크기: 1000 x 800 (가상 좌표계)
const T = {
  seoul: { x: 450, y: 400 }, // 서울역
  cityHall: { x: 450, y: 380 }, // 시청
  jongno3: { x: 500, y: 360 }, // 종로3가
  dongdaemun: { x: 550, y: 360 }, // 동대문
  ddp: { x: 550, y: 380 }, // 동대문역사문화공원
  wangsimni: { x: 600, y: 380 }, // 왕십리
  jamsil: { x: 700, y: 500 }, // 잠실
  gangnam: { x: 550, y: 600 }, // 강남
  sadang: { x: 450, y: 650 }, // 사당
  sindorim: { x: 250, y: 550 }, // 신도림
  hongdae: { x: 300, y: 350 }, // 홍대입구
  hapjeong: { x: 300, y: 380 }, // 합정
  yeouido: { x: 350, y: 450 }, // 여의도
  gimpo: { x: 100, y: 300 }, // 김포공항
  expressBus: { x: 500, y: 620 }, // 고속터미널
  daerim: { x: 250, y: 600 }, // 대림
  gasan: { x: 250, y: 650 }, // 가산디지털단지
  samgakji: { x: 400, y: 450 }, // 삼각지
  yaksu: { x: 500, y: 420 }, // 약수
  gongdeok: { x: 350, y: 400 }, // 공덕
  cheongnyangni: { x: 620, y: 320 }, // 청량리
}

export const TRANSFER_STATIONS: Record<string, { x: number; y: number }> = {
  '서울역': T.seoul,
  '시청': T.cityHall,
  '종로3가': T.jongno3,
  '동대문': T.dongdaemun,
  '동대문역사문화공원': T.ddp,
  '왕십리': T.wangsimni,
  '잠실': T.jamsil,
  '강남': T.gangnam,
  '사당': T.sadang,
  '신도림': T.sindorim,
  '홍대입구': T.hongdae,
  '합정': T.hapjeong,
  '여의도': T.yeouido,
  '김포공항': T.gimpo,
  '고속터미널': T.expressBus,
  '대림': T.daerim,
  '가산디지털단지': T.gasan,
  '삼각지': T.samgakji,
  '약수': T.yaksu,
  '공덕': T.gongdeok,
  '청량리': T.cheongnyangni,
}

export interface StationPosition {
  x: number
  y: number
  labelAlign?: 'top' | 'bottom' | 'left' | 'right'
}

/** 핵심 역만 표시, 직각(가로·세로) 경로만 사용하는 스키매틱 정의 */
interface KeyStationSchematic {
  /** 역명 (순서대로, 매칭 시 name.includes(key) 사용) */
  keyNames: string[]
  /** 직각 경로 점 (연속 점은 x 동일 또는 y 동일) */
  path: { x: number; y: number }[]
  /** path 중 역이 위치하는 인덱스 (keyNames와 1:1) */
  stationIndices: number[]
}

const KEY_STATIONS_SCHEMATIC: Record<string, KeyStationSchematic> = {
  '1호선': {
    keyNames: ['서울역', '시청', '종로3가', '동대문', '청량리'],
    path: [
      { x: 380, y: 320 }, { x: 380, y: 300 }, { x: 380, y: 285 }, { x: 460, y: 285 },
      { x: 540, y: 285 }, { x: 620, y: 285 }, { x: 620, y: 260 },
    ],
    stationIndices: [0, 1, 3, 4, 6],
  },
  '2호선': {
    keyNames: ['시청', '을지로3가', '동대문역사문화공원', '왕십리', '잠실', '강남', '교대', '사당', '신도림', '합정', '홍대입구'],
    path: [
      { x: 380, y: 260 }, { x: 460, y: 260 }, { x: 540, y: 260 }, { x: 620, y: 260 },
      { x: 620, y: 380 }, { x: 540, y: 460 }, { x: 380, y: 460 }, { x: 260, y: 460 },
      { x: 260, y: 360 }, { x: 260, y: 260 }, { x: 320, y: 260 }, { x: 380, y: 260 },
    ],
    stationIndices: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  },
  '3호선': {
    keyNames: ['구파발', '을지로3가', '고속터미널', '양재', '수서'],
    path: [
      { x: 220, y: 220 }, { x: 220, y: 285 }, { x: 460, y: 285 }, { x: 380, y: 285 },
      { x: 380, y: 460 }, { x: 480, y: 460 }, { x: 480, y: 560 }, { x: 580, y: 560 },
    ],
    stationIndices: [0, 2, 4, 6, 7],
  },
  '4호선': {
    keyNames: ['동대문', '동대문역사문화공원', '서울역', '사당'],
    path: [
      { x: 540, y: 200 }, { x: 540, y: 260 }, { x: 540, y: 285 }, { x: 380, y: 285 },
      { x: 380, y: 360 }, { x: 380, y: 460 },
    ],
    stationIndices: [0, 1, 3, 5],
  },
  '5호선': {
    keyNames: ['김포공항', '여의도', '종로3가', '동대문역사문화공원', '왕십리'],
    path: [
      { x: 120, y: 280 }, { x: 120, y: 380 }, { x: 280, y: 380 }, { x: 460, y: 380 },
      { x: 460, y: 285 }, { x: 540, y: 285 }, { x: 620, y: 285 },
    ],
    stationIndices: [0, 2, 3, 4, 6],
  },
  '6호선': {
    keyNames: ['합정', '공덕', '삼각지', '약수', '동묘앞'],
    path: [
      { x: 260, y: 260 }, { x: 260, y: 320 }, { x: 340, y: 320 }, { x: 380, y: 320 },
      { x: 380, y: 400 }, { x: 480, y: 400 }, { x: 540, y: 400 },
    ],
    stationIndices: [0, 1, 2, 4, 6],
  },
  '7호선': {
    keyNames: ['장암', '건대입구', '고속터미널', '남성', '온수'],
    path: [
      { x: 580, y: 120 }, { x: 580, y: 380 }, { x: 380, y: 380 }, { x: 380, y: 460 },
      { x: 260, y: 460 }, { x: 260, y: 620 },
    ],
    stationIndices: [0, 1, 2, 4, 5],
  },
  '8호선': {
    keyNames: ['암사', '잠실', '가락시장', '모란'],
    path: [
      { x: 640, y: 340 }, { x: 640, y: 380 }, { x: 620, y: 380 }, { x: 620, y: 520 },
      { x: 580, y: 520 }, { x: 580, y: 620 },
    ],
    stationIndices: [0, 2, 4, 5],
  },
  '9호선': {
    keyNames: ['개화', '여의도', '노량진', '고속터미널', '선정릉'],
    path: [
      { x: 120, y: 280 }, { x: 120, y: 380 }, { x: 280, y: 380 }, { x: 380, y: 380 },
      { x: 380, y: 460 }, { x: 520, y: 460 }, { x: 520, y: 400 },
    ],
    stationIndices: [0, 2, 3, 4, 6],
  },
}

/** 역명이 핵심 역 키와 매칭되는지 (name.includes(key) 또는 key.includes(name)) */
function matchKeyStation(stationName: string, keyName: string): boolean {
  const n = (stationName || '').trim()
  const k = (keyName || '').trim()
  return n.includes(k) || k.includes(n)
}

/** 호선별 전체 역 목록에서 핵심 역만 순서대로 추출 */
function filterKeyStations(
  stations: SubwayStationOption[],
  keyNames: string[]
): SubwayStationOption[] {
  const result: SubwayStationOption[] = []
  const used = new Set<number>()
  for (const key of keyNames) {
    const idx = stations.findIndex((s, i) => !used.has(i) && matchKeyStation(s.name, key))
    if (idx >= 0) {
      used.add(idx)
      result.push(stations[idx])
    }
  }
  return result
}

export function calculateStationPositions(
  stationsByLine: Record<string, SubwayStationOption[]>
): {
  stationsByLineWithPos: Record<string, (SubwayStationOption & StationPosition)[]>
  allStations: (SubwayStationOption & StationPosition)[]
  /** 직각 경로 전체 (노선 선 그리기용). 없으면 stations 좌표로 선 그림 */
  linePaths: Record<string, string>
} {
  const stationsByLineWithPos: Record<string, (SubwayStationOption & StationPosition)[]> = {}
  const linePaths: Record<string, string> = {}
  const allStations: (SubwayStationOption & StationPosition)[] = []
  const seenIds = new Set<string>()

  const lineOrder = ['1호선', '2호선', '3호선', '4호선', '5호선', '6호선', '7호선', '8호선', '9호선']

  lineOrder.forEach((lineKey) => {
    const schematic = KEY_STATIONS_SCHEMATIC[lineKey]
    const stations = stationsByLine[lineKey] || []
    if (stations.length === 0) return

    if (schematic) {
      const keyStations = filterKeyStations(stations, schematic.keyNames)
      if (keyStations.length === 0) return

      const linePos: (SubwayStationOption & StationPosition)[] = keyStations.map((s, i) => {
        const idx = schematic.stationIndices[i]
        const pt = schematic.path[idx]
        const x = pt?.x ?? 0
        const y = pt?.y ?? 0
        return { ...s, x, y }
      })

      stationsByLineWithPos[lineKey] = linePos
      linePaths[lineKey] = schematic.path.map((p) => `${p.x},${p.y}`).join(' ')

      keyStations.forEach((s) => {
        const key = `${s.line ?? lineKey}-${s.id}`
        if (!seenIds.has(key)) {
          const pos = linePos.find((p) => p.id === s.id)
          if (pos) {
            allStations.push(pos)
            seenIds.add(key)
          }
        }
      })
    }
  })

  return { stationsByLineWithPos, allStations, linePaths }
}
