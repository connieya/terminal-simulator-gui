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
│   │   ├── LeftTabs.tsx      # 좌측 탭 (연동/직접거래)
│   │   ├── TerminalList.tsx  # 연동 단말기 레이아웃 (노선도+단말기 | 여정 | TCP 로그)
│   │   ├── SubwayMap.tsx     # 지하철 노선도 (1호선/2호선, 역 클릭 시 단말기 설정)
│   │   ├── BusMap.tsx        # 버스 노선도 (노선 클릭 시 버스 단말기 정류장/노선 설정)
│   │   ├── JourneyPanel.tsx  # 지하철 여정 패널 (카드 탭 기록)
│   │   ├── TerminalCard.tsx  # 개별 단말기 카드 (정보·액션)
│   │   ├── CardTapButton.tsx # 카드 탭 시뮬레이션 버튼
│   │   ├── ConnectionSettings.tsx  # TCP 연결 설정 (호스트/포트)
│   │   ├── TcpLogPanel.tsx   # TCP 통신 로그 패널
│   │   ├── TcpConnectionPanel.tsx   # 연결 상태·연결/해제 UI
│   │   ├── EmvTransactionDetailModal.tsx  # 카드 탭 EMV 상세 표시 모달 (단계별 설명)
│   │   └── Toast.tsx         # 토스트 알림
│   ├── data/
│   │   ├── terminalPresets.ts # 지하철/버스 선택 옵션, getStationsByLine (노선도용)
│   │   └── emvStepDescriptions.ts  # EMV 단계별 한글 설명
│   ├── contexts/
│   │   └── ToastContext.tsx  # 전역 토스트 컨텍스트
│   ├── stores/
│   │   ├── terminalStore.ts  # Zustand 단말기 목록·상태
│   │   ├── journeyStore.ts   # 카드 탭 기반 지하철 여정 기록
│   │   └── tcpLogStore.ts    # TCP 통신 로그 기록
│   ├── utils/
│   │   ├── tcpClient.ts      # Renderer용: window.electronAPI.tcp 호출 래퍼
│   │   └── emvLogParser.ts   # EMV 트랜잭션 로그 단계별 파싱
│   ├── lib/
│   │   └── utils.ts          # 유틸 (cn 등)
│   └── styles/
│       └── global.css        # 전역 스타일
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

- **App**: 좌측 탭(`LeftTabs`)으로 **연동 모드/직접 거래 모드** 화면 분기.
- **TerminalList**: 연동 단말기 페이지. **왼쪽**에 지하철 노선도+버스 노선도+단말기, **가운데**에 지하철 여정, **오른쪽**에 TCP 통신 로그.
- **SubwayMap**: `subwayStations` 기반 1호선·2호선 노선표 UI. 역 클릭 시 지하철 단말기(1개) 역 설정.
- **BusMap**: `busRoutes` 기반 버스 노선 목록. 노선 클릭 시 버스 단말기(1개) 정류장·노선 설정.
- **JourneyPanel**: 카드 탭 성공 시 기록된 지하철 여정을 시간순으로 표시.
- **TerminalCard**: 개별 단말기 카드. 지하철은 승차/하차 드롭다운만(역은 노선도 클릭), 버스는 정류장·승차/하차 선택, 전원·Sync·카드 탭 등.
- **ConnectionSettings / TcpConnectionPanel**: TCP 호스트·포트 설정, 연결/해제, 상태 표시.
- **TcpLogPanel**: terminal-simulator와 주고받은 TCP 통신 로그 표시.
- **EmvTransactionDetailModal**: 카드 탭 응답 수신 후 EMV 트랜잭션 상세를 TCP 로그와 별도로 모달에 표시. 단계별 아코디언과 한글 설명(emvStepDescriptions) 사용.
- **stores/terminalStore**: Zustand로 단말기 목록(지하철 1개·버스 1개), 전원/연결 상태.
- **stores/journeyStore**: 카드 탭 시 지하철 여정 로그를 저장.
- **stores/tcpLogStore**: TCP 통신 로그를 저장.
- **data/terminalPresets**: `TerminalConfig.json` 기반 지하철/버스 옵션, `getStationsByLine()` 노선별 역 목록(노선도 배치용).
- **data/emvStepDescriptions**: EMV 단계 제목별 한글 설명. 모달에서 단계별 설명 표시에 사용.
- **utils/tcpClient**: Renderer에서 `window.electronAPI.tcp` 호출만 담당 (실제 소켓은 Main의 `tcpClient.ts`).
- **utils/emvLogParser**: 카드 탭 응답 메시지를 `===== ... =====` 구간으로 파싱해 단계 배열로 반환. 모달에서 아코디언 표시에 사용.

---

## 데이터 흐름

1. 사용자가 연결 설정에서 "연결" → Renderer `tcpClient` → IPC `tcp:connect` → Main `TcpClient.connect()`.
2. 사용자가 단말기 카드에서 "카드 탭" 등 액션 → IPC `tcp:sendCommand` / `tcp:tapCard` → Main에서 JSON으로 TCP 전송.
3. Java Simulator 응답 → Main `TcpClient`가 수신 → 필요 시 IPC로 Renderer에 전달 → 스토어/UI 갱신.

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

## 관련 프로젝트

- **terminal-simulator**: Java 기반 CLI 단말기 시뮬레이터. TCP 서버(기본 9999)를 열고, 이 GUI가 해당 서버에 TCP 클라이언트로 연결합니다.
