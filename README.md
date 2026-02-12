# Terminal Simulator GUI

교통 단말기(Open Loop EMV)를 관리하는 **Electron + React** 데스크톱 애플리케이션입니다.  
Java 기반 **Terminal Simulator**와 TCP로 통신하며, 단말기 목록 표시·연결 설정·카드 탭 시뮬레이션 등을 제공합니다.

---

## 기술 스택

| 구분        | 기술                                             |
| ----------- | ------------------------------------------------ |
| 런타임/빌드 | Electron, Vite                                   |
| 프론트엔드  | React 19, TypeScript                             |
| 스타일      | TailwindCSS                                      |
| 상태 관리   | Zustand                                          |
| 포트        | Vite Dev: **5175**, Java Simulator TCP: **9999** |

---

## 프로젝트 구조

```
terminal-simulator-gui/
├── electron/                 # Electron Main Process
│   ├── main.ts               # 앱 진입점, 창 생성, IPC·TCP 초기화
│   ├── preload.ts            # Renderer ↔ Main IPC 브릿지 (contextBridge)
│   ├── tcpClient.ts          # Java Terminal Simulator와 TCP 통신 (연결/명령/재연결)
│   └── cardReader.ts        # PC/SC 카드 리더 연동 (리더 목록/연결/해제)
├── shared/
│   └── types.ts              # 공유 타입 (TerminalInfo, TerminalCommand, TcpConnectionConfig 등)
├── src/                      # React 렌더러 (Vite 빌드)
│   ├── App.tsx               # 루트: 라우팅 설정 + 레이아웃 (좌측 탭 + 헤더 + 라우트)
│   ├── main.tsx              # React 진입점
│   ├── config/               # 설정 상수
│   │   └── tcp.ts            # DIRECT_TCP_CONFIG (직접 거래 서버 주소)
│   ├── pages/                # 페이지 컴포넌트
│   │   ├── SimulatorPage.tsx # 시뮬레이터 연동 페이지 (TerminalWorkspace 래핑)
│   │   └── DirectTradePage.tsx # 직접 거래 페이지 (TerminalWorkspace + tcpConfig)
│   ├── components/           # UI 컴포넌트
│   │   ├── LeftTabs.tsx       # 좌측 탭 (연동/직접거래)
│   │   ├── TerminalWorkspace.tsx # 공통 레이아웃 (노선도+단말기 | 여정 | TCP 로그 + 모달)
│   │   ├── UnifiedRouteMap.tsx # 통합 노선도 (상단 선택: 지하철/버스, 지하철 시 모든 노선 한 화면)
│   │   ├── SubwayMap.tsx     # 지하철 노선도 (1~4호선 전체 표시, 노선별 색상·스크롤, 역 클릭 시 단일 단말기 설정)
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
│   │   ├── terminalPresets.ts   # 지하철/버스 옵션, getStationsByLine(1~4호선), BusRouteOption·BusStopOption
│   │   ├── subwayStations.json  # 지하철 역 목록 (Terminal Simulator scripts/generate-subway-for-gui.cjs로 생성)
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
- **preload.ts**: `contextBridge`로 `window.electronAPI.tcp`와 `window.electronAPI.cardReader` 노출.
- **tcpClient.ts**: Node `net.Socket`으로 Java Simulator(기본 `localhost:9999`)에 접속, JSON 명령 전송, 응답 파싱, 재연결·타임아웃 처리.
- **cardReader.ts**: PC/SC(`pcsclite`)로 카드 리더 목록 조회·선택·연결/해제. 직접 거래 카드 탭 시 실제 리더에서 카드를 읽기 위한 1단계.

### 2. 공유 타입 (`shared/types.ts`)

- `TerminalInfo`, `TerminalCommand`, `TerminalResponse`, `TcpConnectionConfig`, `CardTapCommand` 등.
- Electron과 React 양쪽에서 `@shared/types`로 참조.

### 3. React 앱 (`src/`)

- **App**: 라우팅만 담당. 좌측 탭(`LeftTabs`)과 라우트(`/simulator`, `/direct`)를 설정.
- **pages/SimulatorPage**: 시뮬레이터 연동 페이지. `TerminalWorkspace`를 래핑(시뮬레이터 기본 주소).
- **pages/DirectTradePage**: 직접 거래 페이지. Sign On 시 **시뮬레이터가 아닌 TPS 서버에 직접 연결**. `TerminalWorkspace`에 `DIRECT_TCP_CONFIG`(포트 21000) 전달.
- **config/tcp.ts**: 직접 거래 시 연결할 TPS 서버 주소(`DIRECT_TCP_CONFIG`, 기본 21000).
- **TerminalWorkspace**: 공통 레이아웃 컴포넌트. **왼쪽**에 통합 노선도+단말기 1대, **가운데**에 여정, **오른쪽**에 TCP 통신 로그. `tcpConfig` 전달 시 해당 주소로 연결(미전달 시 시뮬레이터 기본). `EmvTransactionDetailModal` 상태 관리 포함.
- **기능 모드**
  - **EMV 시뮬레이터 연동**: GUI → Java Terminal Simulator(TCP). 전원 on/off, Sync, Echo, 카드 탭이 모두 TCP 명령으로 처리.
  - **EMV 직접 거래**: Sign On 시 **TPS 서버에 직접 연결**(시뮬레이터 경유 없음). Echo, Sync, 카드 탭 등 동일하게 사용.
- **TerminalCard**: 선택적 `tcpConfig` 전달 시 Sign On 시 해당 설정으로 연결(미전달 시 기본 시뮬레이터 주소). 전원·Sync·Echo·카드 탭 모두 `tcpClient.sendCommand`로 처리.
- **UnifiedRouteMap**: 노선도 한 패널. 상단에서 지하철/버스 선택. 지하철 선택 시 **모든 노선(1~4호선)을 한 화면**에 표시. 노선/역 클릭 시 동일 단말기 데이터 갱신.
- **SubwayMap**: `subwayStations`(subwayStations.json) 기반 노선도. 1~4호선 전체를 노선별 색상·블록으로 표시, 세로 스크롤. 역 클릭 시 단일 단말기의 역 정보 갱신(transitType: subway).
- **BusMap**: `busRoutes` 기반 버스 노선 목록. 노선 클릭 시 단일 단말기를 해당 노선 + **첫 정류장**으로 설정(transitType: bus). 정류장 변경은 단말기 카드의 정류장 드롭다운에서만 가능.
- **JourneyPanel**: 카드 탭 성공 시 기록된 승하차 여정(지하철/버스)을 시간순으로 표시.
- **TerminalCard**: 단말기 1대 카드. 노선도에서 지하철 역 또는 버스 노선 클릭 시 현재 모드가 바뀌며, 지하철 모드일 때는 역 선택·승차/하차 드롭다운, **버스 모드일 때는 먼저 노선도를 통해 노선을 선택한 뒤, 정류장 선택 드롭다운에 그 노선의 정류장만 표시**되어 정류장을 고를 수 있음. 전원·Sync·카드 탭 등. `tcpConfig` 전달 시 해당 주소로 연결 후 동일 명령 사용.
- **ConnectionSettings / TcpConnectionPanel**: TCP 호스트·포트 설정, 연결/해제, 상태 표시.
- **TcpLogPanel**: terminal-simulator와 주고받은 TCP 통신 로그 표시.
- **EmvTransactionDetailModal**: 카드 탭 응답 수신 후 EMV 트랜잭션 상세를 TCP 로그와 별도로 모달에 표시. 단계별 아코디언과 한글 설명(emvStepDescriptions) 사용.
- **stores/terminalStore**: Zustand로 단말기 1대 상태. 노선도에서 지하철 역 또는 버스 노선 클릭 시 terminalId·station·line·transitType 등 갱신. 전원/연결 상태.
- **stores/journeyStore**: 카드 탭 시 승하차 여정 로그를 저장(지하철/버스 공통).
- **stores/tcpLogStore**: TCP 통신 로그를 저장.
- **data/terminalPresets**: 지하철 역은 `subwayStations.json`(Terminal Simulator의 `generate-subway-for-gui.cjs`로 생성)에서 로드, `getStationsByLine()`으로 1~4호선 노선별 역 목록(노선도 배치용). 버스는 **노선(route) + 정류장(stop) 2단계**: `BusRouteOption`에 `routeId`, `stops: BusStopOption[]`가 있으며, `busRoutesWithStops.json`에서 로드.
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
- 버스 데이터(`busRoutesWithStops.json` / `terminalPresets.ts`)와 Terminal Simulator의 `TerminalConfig.json` `journeyPresets`(bus*in*_ / bus*out*_)가 1:1로 대응합니다.

---

## 지원 명령어 (Java Simulator와의 프로토콜)

- `signon` / `signoff`: 전원 on/off
- `sync`: 동기화 (승차/하차, 역 정보 등)
- `card_tap`: 카드 탭 시뮬레이션
- `echo-test`, `status`, `ping`, `reset` 등

---

## 직접 거래 서버(TPS) 프로토콜

직접 거래 모드에서 연결하는 서버는 **psp-server-tps**(Spring Boot TPS)이며, TCP 리스너는 `TerminalTlvServer`(Netty), 기본 **포트 21000**(`terminal.channel.netty.port`)이다.

- **프레임**: `[2바이트 Length (big-endian)][Body]`. Body = RequestMessage(송신) 또는 ResponseMessage(수신).
- **RequestMessage** (단말→서버): **RequestHeader(42바이트) + Payload(TLV) + MAC(8바이트)**.
  - RequestHeader: magic "TRM"(3) + version(1) + **MessageType**(1) + seq(2) + payloadType(1) + terminalId(32) + reserved(2).
  - MessageType: SIGN_ON(0x01), ECHO_TEST(0x02), AUTHORIZATION(0x03), SYNC(0x04), SIGN_OFF(0x06) 등.
  - Payload: 타입별 TLV (SignOnRequest, EchoTestRequest 등). payloadType 예: TLV_UNCOMPRESSED(0x01).
- **수신**: 동일하게 2바이트 Length + ResponseMessage(ResponseHeader + Payload + MAC).

참고 코드: `psp-api-terminal`의 `RequestMessage`, `RequestHeader`, `MessageType`, `SignOnRequest`, `EchoTestRequest` 등. 서버 채널: `psp-server-tps`의 `TerminalTlvServer`.  
현재 GUI는 JSON 기반 tcpClient만 사용하므로, TPS와 실제 통신하려면 TLV 인코딩/디코딩을 수행하는 전용 클라이언트 구현이 필요하다.

---

## 카드 리더 (PC/SC) - 직접 거래용

직접 거래 카드 탭 시 **실제 NFC/콘택트리스 리더**에서 카드를 읽으려면 PC/SC 연동이 필요합니다.

- **구현**: `electron/cardReader.ts`에서 `pcsclite`로 리더 연동. **카드 탭 버튼 클릭 시** 연결된 리더가 없으면 자동으로 리더를 탐색해 첫 번째 리더에 연결한 뒤 카드 탭을 진행합니다. 별도 리더 선택 UI는 없습니다.
- **플랫폼**:
  - **macOS**: PC/SC 프레임워크 내장. NFC 리더 연결 후 카드 탭 시 자동 인식.
  - **Linux**: `libpcsclite1`, `libpcsclite-dev`, `pcscd` 설치 후 `npm install` 및 필요 시 `electron-rebuild`.
  - **Windows**: WinSCard.dll 사용. 필요 시 `electron-rebuild` 권장.

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
