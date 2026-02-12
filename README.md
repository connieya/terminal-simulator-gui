# Terminal Simulator GUI

교통 단말기(Open Loop EMV)를 관리하는 **Electron + React** 데스크톱 애플리케이션입니다.  
Java 기반 **Terminal Simulator**와 TCP로 통신하며, 단말기 목록 표시·연결 설정·카드 탭 시뮬레이션 등을 제공합니다.

---

## 기술 스택

| 구분 | 기술 |
|------|------|
| 런타임/빌드 | Electron, Vite |
| 프론트엔드 | React 19, TypeScript |
| 스타일 | TailwindCSS |
| 상태 관리 | Zustand |
| 포트 | Vite Dev: **5175**, Java Simulator TCP: **9999** |

---

## 프로젝트 구조

```
terminal-simulator-gui/
├── electron/                 # Electron Main Process
│   ├── main.ts               # 앱 진입점, 창 생성, IPC·TCP 초기화
│   ├── preload.ts            # Renderer ↔ Main IPC 브릿지 (contextBridge)
│   └── tcpClient.ts          # Java Terminal Simulator와 TCP 통신 (연결/명령/재연결)
├── shared/
│   └── types.ts              # 공유 타입 (TerminalInfo, TerminalCommand, TcpConnectionConfig 등)
├── src/                      # React 렌더러 (Vite 빌드)
│   ├── App.tsx               # 루트: 좌측 탭 + 탭별 화면 분기
│   ├── main.tsx              # React 진입점
│   ├── components/           # UI 컴포넌트
│   │   ├── LeftTabs.tsx       # 좌측 탭 (연동/직접거래)
│   │   ├── TerminalList.tsx  # 연동 단말기 레이아웃 (노선도+단말기 | 여정 | TCP 로그)
│   │   ├── UnifiedRouteMap.tsx # 통합 노선도 (상단 선택: 지하철/버스, 지하철 시 1호선/2호선 → 선택한 내용만 표시)
│   │   ├── SubwayMap.tsx     # 지하철 노선도 (line prop으로 1호선 또는 2호선만 표시 가능, 역 클릭 시 단일 단말기 설정)
│   │   ├── BusMap.tsx        # 버스 노선 (노선 클릭 시 단일 단말기 정류장/노선 설정)
│   │   ├── JourneyPanel.tsx  # 여정 패널 (카드 탭 기록, 지하철/버스 공통)
│   │   ├── TerminalCard.tsx  # 단말기 카드 1개 (정보·액션, 노선도 클릭으로 모드 전환)
│   │   ├── CardTapButton.tsx # 카드 탭 시뮬레이션 버튼
│   │   ├── ConnectionSettings.tsx  # TCP 연결 설정 (호스트/포트)
│   │   ├── TcpLogPanel.tsx   # TCP 통신 로그 패널
│   │   ├── TcpConnectionPanel.tsx   # 연결 상태·연결/해제 UI
│   │   ├── EmvTransactionDetailModal.tsx  # 카드 탭 EMV 상세 표시 모달 (단계별 설명)
│   │   └── Toast.tsx         # 토스트 알림
│   ├── data/
│   │   ├── terminalPresets.ts   # 지하철/버스 옵션, getStationsByLine, BusRouteOption·BusStopOption
│   │   ├── busRoutesWithStops.json # 버스 노선·정류장 (생성 파일, git 미포함)
│   │   └── emvStepDescriptions.ts  # EMV 단계별 한글 설명
│   ├── contexts/
│   │   └── ToastContext.tsx  # 전역 토스트 컨텍스트
│   ├── stores/
│   │   ├── terminalStore.ts  # Zustand 단말기 1대 상태 (노선도 클릭 시 데이터 갱신)
│   │   ├── journeyStore.ts   # 카드 탭 기반 승하차 여정 기록 (지하철/버스 공통)
│   │   └── tcpLogStore.ts    # TCP 통신 로그 기록
│   ├── utils/
│   │   ├── tcpClient.ts      # Renderer용: window.electronAPI.tcp 호출 래퍼
│   │   └── emvLogParser.ts   # EMV 트랜잭션 로그 단계별 파싱
│   ├── lib/
│   │   └── utils.ts          # 유틸 (cn 등)
│   └── styles/
│       └── global.css        # 전역 스타일
├── operational-data/         # TAS_LOG_5.txt 등 참조 데이터 (git 미포함)
├── dist-electron/            # Electron·Preload·공유 타입 빌드 결과 (JS)
├── index.html                # Vite HTML 진입점
├── vite.config.ts            # Vite 설정 (alias: @, @shared, port 5175)
├── tsconfig.json             # 공통 TS 설정
├── tsconfig.app.json         # React 앱 TS
├── tsconfig.electron.json    # Electron Main TS
├── tsconfig.preload.json     # Preload TS
└── package.json
```

---

## 계층별 역할

### 1. Electron (`electron/`)

- **main.ts**: 브라우저 창 생성, 개발 시 Vite(5175) 로드, IPC 핸들러 등록, `TcpClient` 생성/연결/해제 및 명령 전달.
- **preload.ts**: `contextBridge`로 `window.electronAPI.tcp`만 노출 (connect, disconnect, isConnected, sendCommand, tapCard).
- **tcpClient.ts**: Node `net.Socket`으로 Java Simulator(기본 `localhost:9999`)에 접속, JSON 명령 전송, 응답 파싱, 재연결·타임아웃 처리.

### 2. 공유 타입 (`shared/types.ts`)

- `TerminalInfo`, `TerminalCommand`, `TerminalResponse`, `TcpConnectionConfig`, `CardTapCommand` 등.
- Electron과 React 양쪽에서 `@shared/types`로 참조.

### 3. React 앱 (`src/`)

- **App**: 좌측 탭(`LeftTabs`)으로 **EMV 시뮬레이터 연동**(`/simulator`)과 **EMV 직접 거래**(`/direct`) 화면 분기.
- **기능 모드**
  - **EMV 시뮬레이터 연동**: Java Terminal Simulator(TCP)와 연동. 전원 on/off, Sync, Echo, 카드 탭이 모두 TCP 명령으로 처리.
  - **EMV 직접 거래**: 시뮬레이터 없이 **실제 서버에 TCP 직접 연결** 후, Sign On, Sign Off, Echo Test, Sync, 카드 탭을 **동일하게** 사용. 차이는 연결 대상만(시뮬레이터 vs 직접 서버 호스트/포트).
- **TerminalList**: 시뮬레이터 연동 페이지. **왼쪽**에 통합 노선도+단말기 1대, **가운데**에 여정, **오른쪽**에 TCP 통신 로그.
- **DirectTradePage** (App 내): 직접 거래 페이지. 동일 3열 그리드. `UnifiedRouteMap`·`TerminalCard`(tcpConfig=직접 서버 주소)·`JourneyPanel`·**TcpLogPanel** 사용. **Sign On** 클릭 시 해당 서버로 TCP 연결 후 Echo/Sync/카드 탭 동일 사용. 카드 탭 완료 시 `EmvTransactionDetailModal` 동일하게 표시.
- **TerminalCard**: 선택적 `tcpConfig` 전달 시 Sign On 시 해당 설정으로 연결(미전달 시 기본 시뮬레이터 주소). 전원·Sync·Echo·카드 탭 모두 `tcpClient.sendCommand`로 처리.
- **UnifiedRouteMap**: 노선도 한 패널. 상단에서 지하철/버스 선택, 지하철 선택 시 1호선/2호선 선택. 선택한 항목만 하단에 표시(지하철은 해당 노선 역만, 버스는 노선 목록). 노선/역 클릭 시 동일 단말기 데이터 갱신.
- **SubwayMap**: `subwayStations` 기반 노선표 UI. `line` prop으로 1호선 또는 2호선만 표시 가능. 역 클릭 시 단일 단말기의 역 정보 갱신(transitType: subway).
- **BusMap**: `busRoutes` 기반 버스 노선 목록. 노선 클릭 시 단일 단말기를 해당 노선 + **첫 정류장**으로 설정(transitType: bus). 정류장 변경은 단말기 카드의 정류장 드롭다운에서만 가능.
- **JourneyPanel**: 카드 탭 성공 시 기록된 승하차 여정(지하철/버스)을 시간순으로 표시.
- **TerminalCard**: 단말기 1대 카드. 노선도에서 지하철 역 또는 버스 노선 클릭 시 현재 모드가 바뀌며, 지하철 모드일 때는 역 선택·승차/하차 드롭다운, **버스 모드일 때는 먼저 노선도를 통해 노선을 선택한 뒤, 정류장 선택 드롭다운에 그 노선의 정류장만 표시**되어 정류장을 고를 수 있음. 전원·Sync·카드 탭 등. `tcpConfig` 전달 시(직접 거래 페이지) 해당 서버로 연결 후 동일 명령 사용.
- **ConnectionSettings / TcpConnectionPanel**: TCP 호스트·포트 설정, 연결/해제, 상태 표시.
- **TcpLogPanel**: terminal-simulator와 주고받은 TCP 통신 로그 표시.
- **EmvTransactionDetailModal**: 카드 탭 응답 수신 후 EMV 트랜잭션 상세를 TCP 로그와 별도로 모달에 표시. 단계별 아코디언과 한글 설명(emvStepDescriptions) 사용.
- **stores/terminalStore**: Zustand로 단말기 1대 상태. 노선도에서 지하철 역 또는 버스 노선 클릭 시 terminalId·station·line·transitType 등 갱신. 전원/연결 상태.
- **stores/journeyStore**: 카드 탭 시 승하차 여정 로그를 저장(지하철/버스 공통).
- **stores/tcpLogStore**: TCP 통신 로그를 저장.
- **data/terminalPresets**: `TerminalConfig.json` 기반 지하철/버스 옵션, `getStationsByLine()` 노선별 역 목록(노선도 배치용). 버스는 **노선(route) + 정류장(stop) 2단계**: `BusRouteOption`에 `routeId`, `stops: BusStopOption[]`가 있으며, `busRoutesWithStops.json`에서 로드.
- **data/emvStepDescriptions**: EMV 단계 제목별 한글 설명. 모달에서 단계별 설명 표시에 사용.
- **utils/tcpClient**: Renderer에서 `window.electronAPI.tcp` 호출만 담당 (실제 소켓은 Main의 `tcpClient.ts`).
- **utils/emvLogParser**: 카드 탭 응답 메시지를 `===== ... =====` 구간으로 파싱해 단계 배열로 반환. 모달에서 아코디언 표시에 사용.

---

## 데이터 흐름

1. 사용자가 연결 설정에서 "연결" → Renderer `tcpClient` → IPC `tcp:connect` → Main `TcpClient.connect()`.
2. 사용자가 단말기 카드에서 "카드 탭" 등 액션 → IPC `tcp:sendCommand` / `tcp:tapCard` → Main에서 JSON으로 TCP 전송.
3. Java Simulator 응답 → Main `TcpClient`가 수신 → 필요 시 IPC로 Renderer에 전달 → 스토어/UI 갱신.

### 버스 노선/정류장 2단계 선택

- **노선 선택**: 통합 노선도에서 "버스" 탭을 선택한 뒤, 표시된 버스 노선(새벽A160, 심야A21, 동대문A01, 서대문A01 등) 중 하나를 클릭하면, 단말기가 해당 노선 + 그 노선의 **첫 정류장**으로 설정됩니다.
- **정류장 선택**: 단말기 카드의 "정류장 선택" 드롭다운에는 **현재 선택된 노선의 정류장만** 나열됩니다. 노선을 선택하지 않은 상태에서는 "노선을 먼저 선택하세요" 안내가 표시됩니다. 정류장을 바꾸면 해당 정류장의 preset(승차/하차)과 terminalId로 단말기 상태가 갱신됩니다.
- 버스 데이터(`busRoutesWithStops.json` / `terminalPresets.ts`)와 Terminal Simulator의 `TerminalConfig.json` `journeyPresets`(bus_in_* / bus_out_*)가 1:1로 대응합니다.

---

## 지원 명령어 (Java Simulator와의 프로토콜)

- `signon` / `signoff`: 전원 on/off  
- `sync`: 동기화 (승차/하차, 역 정보 등)  
- `card_tap`: 카드 탭 시뮬레이션  
- `echo-test`, `status`, `ping`, `reset` 등  

---

## 실행 방법

```bash
# 의존성 설치
npm install

# 개발 (Electron 빌드 + Vite 서버 + Electron 창)
npm run dev

# Electron만 실행 (이미 빌드된 경우)
npm run electron
```

---

## 운영 데이터 (git 미포함)

- **`operational-data/`**: TAS 원본 등 참조용 데이터. 저장소에 올리지 않음(.gitignore). 파싱 스크립트는 `operational-data/TAS_LOG_5.txt`를 참조합니다.
- **`src/data/busRoutesWithStops.json`**: 버스 노선·정류장 목록. TAS 파싱 후 terminal-simulator 쪽 스크립트로 생성하며, 동일하게 git에 포함하지 않습니다. 앱 실행을 위해 이 파일이 로컬에 있어야 합니다.
- 이미 커밋된 파일을 추적 해제하려면: `git rm --cached operational-data/TAS_LOG_5.txt`, `git rm --cached src/data/busRoutesWithStops.json` 후 커밋하세요.

---

## 관련 프로젝트

- **terminal-simulator**: Java 기반 CLI 단말기 시뮬레이터. TCP 서버(기본 9999)를 열고, 이 GUI가 해당 서버에 TCP 클라이언트로 연결합니다.
