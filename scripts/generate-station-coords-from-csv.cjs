/**
 * 공공데이터포털 위경도 CSV → 스키매틱 좌표 JSON 생성
 *
 * 사용법:
 *   1. 공공데이터포털에서 CSV 다운로드:
 *      - 1~8호선: https://www.data.go.kr/data/15099316/fileData.do
 *      - 9호선:   https://www.data.go.kr/data/15099317/fileData.do
 *   2. node scripts/generate-station-coords-from-csv.cjs <1-8호선.csv> [9호선.csv]
 *   3. 생성된 src/data/stationCoordsFromPublic.json 이 노선도에 사용됩니다.
 *
 * CSV 컬럼(예상): 연번, 호선, 고유역번호(외부역코드), 역명, 위도, 경도, ...
 * 인코딩: UTF-8
 */
const fs = require('fs')
const path = require('path')

const VIEW_WIDTH = 1000
const VIEW_HEIGHT = 800

const args = process.argv.slice(2)
const projectRoot = path.join(__dirname, '..')
const defaultCoordDir = path.join(projectRoot, 'data', 'seoul-subway-coords')

/** 인자 경로 또는 기본 data/seoul-subway-coords/ 내 첫 CSV 반환 */
function resolveCsvPath(argPath, preferDefaultDir) {
  if (argPath && fs.existsSync(argPath)) return argPath
  const fromRoot = path.join(projectRoot, argPath || '')
  if (argPath && fs.existsSync(fromRoot)) return fromRoot
  if (!preferDefaultDir || !fs.existsSync(defaultCoordDir)) return argPath || null
  const files = fs.readdirSync(defaultCoordDir).filter((f) => f.endsWith('.csv'))
  if (files.length === 0) return null
  return path.join(defaultCoordDir, files[0])
}

const csvPath18 = resolveCsvPath(args[0], true)
const csvPath9 = args[1] ? resolveCsvPath(args[1], false) : null

if (!csvPath18) {
  console.error('사용법: node scripts/generate-station-coords-from-csv.cjs [1-8호선.csv] [9호선.csv]')
  console.error('  인자 생략 시 data/seoul-subway-coords/ 폴더의 CSV를 사용합니다.')
  process.exit(1)
}

/** CSV 한 행 파싱 (따옴표 감싼 필드 처리) */
function parseCsvRow(line) {
  const out = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (c === '"') {
      inQuotes = !inQuotes
    } else if ((c === ',' && !inQuotes) || c === '\r') {
      out.push(cur.trim())
      cur = ''
    } else if (c !== '\n' || inQuotes) {
      cur += c
    }
  }
  out.push(cur.trim())
  return out
}

/** CSV 파일 읽어서 { header, rows } 반환 (UTF-8 또는 CP949 자동 판단) */
function readCsv(filePath) {
  const buf = fs.readFileSync(filePath)
  const content = (() => {
    const utf8 = (buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf)
      ? buf.toString('utf8').replace(/^\uFEFF/, '')
      : buf.toString('utf8')
    if (utf8.includes('호선') || utf8.includes('역명')) return utf8
    try {
      const iconv = require('iconv-lite')
      return iconv.decode(buf, 'cp949')
    } catch (_) {
      return utf8
    }
  })().replace(/\r\n/g, '\n')
  const lines = content.split('\n').filter((l) => l.trim())
  if (lines.length < 2) return { header: [], rows: [] }
  const header = parseCsvRow(lines[0])
  const rows = lines.slice(1).map((l) => parseCsvRow(l))
  return { header, rows }
}

/** 헤더 인덱스 찾기 (여러 가능한 이름 허용) */
function findColumnIndex(header, names) {
  const h = header.map((c) => (c || '').trim().toLowerCase())
  for (const name of names) {
    const i = h.findIndex((c) => c.includes(name) || name.includes(c))
    if (i >= 0) return i
  }
  return -1
}

/** 위경도 → 스키매틱 좌표 (선형 매핑, 북쪽 = y 0) */
function latLonToSchematic(lat, lon, bounds, view) {
  const { lonMin, lonMax, latMin, latMax } = bounds
  const x = ((lon - lonMin) / (lonMax - lonMin)) * view.width
  const y = ((latMax - lat) / (latMax - latMin)) * view.height
  return { x, y }
}

const allStations = []
let lonMin = Infinity,
  lonMax = -Infinity,
  latMin = Infinity,
  latMax = -Infinity

function processFile(filePath) {
  if (!fs.existsSync(filePath)) {
    console.warn('파일 없음:', filePath)
    return
  }
  const { header, rows } = readCsv(filePath)
  const iLine = findColumnIndex(header, ['호선', 'line'])
  const iCode = findColumnIndex(header, ['고유역번호', '외부역코드', 'external'])
  const iName = findColumnIndex(header, ['역명', 'station', 'name'])
  const iLat = findColumnIndex(header, ['위도', 'lat'])
  const iLon = findColumnIndex(header, ['경도', 'lon', 'lng'])

  if (iLine < 0 || iName < 0 || iLat < 0 || iLon < 0) {
    console.warn('필수 컬럼 부족:', filePath, { iLine, iName, iLat, iLon, header })
    return
  }

  rows.forEach((row) => {
    const rawLine = (row[iLine] || '').trim()
    const line = /^\d+$/.test(rawLine) ? `${rawLine}호선` : rawLine
    const name = (row[iName] || '').trim()
    const code = iCode >= 0 ? (row[iCode] || '').trim() : ''
    const lat = parseFloat(row[iLat])
    const lon = parseFloat(row[iLon])
    if (!name || Number.isNaN(lat) || Number.isNaN(lon)) return
    if (lat < 37 || lat > 38 || lon < 126 || lon > 128) return

    lonMin = Math.min(lonMin, lon)
    lonMax = Math.max(lonMax, lon)
    latMin = Math.min(latMin, lat)
    latMax = Math.max(latMax, lat)

    allStations.push({
      line,
      name,
      stationId: code,
      lat,
      lon,
    })
  })
  console.log(filePath, '→', rows.length, '행 처리')
}

processFile(csvPath18)
if (csvPath9) processFile(csvPath9)

if (allStations.length === 0) {
  console.error('처리된 역이 없습니다. CSV 경로와 컬럼명을 확인하세요.')
  process.exit(1)
}

// 경계 확장(여백)
const margin = 0.002
lonMin -= margin
lonMax += margin
latMin -= margin
latMax += margin

const bounds = { lonMin, lonMax, latMin, latMax }
const view = { width: VIEW_WIDTH, height: VIEW_HEIGHT }

const stationsWithCoords = allStations.map((s) => ({
  ...s,
  x: Math.round(latLonToSchematic(s.lat, s.lon, bounds, view).x),
  y: Math.round(latLonToSchematic(s.lat, s.lon, bounds, view).y),
}))

const output = {
  bounds,
  view: { width: VIEW_WIDTH, height: VIEW_HEIGHT },
  stations: stationsWithCoords,
  generatedAt: new Date().toISOString(),
}

const outPath = path.join(__dirname, '..', 'src', 'data', 'stationCoordsFromPublic.json')
fs.writeFileSync(outPath, JSON.stringify(output, null, 2), 'utf8')
console.log('Wrote', outPath, '(', stationsWithCoords.length, 'stations )')
