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
│   ├── App.tsx               # 루트: 단말기 목록 + 연결 설정
│   ├── main.tsx              # React 진입점
│   ├── components/           # UI 컴포넌트
│   │   ├── TerminalList.tsx  # 단말기 카드 목록
│   │   ├── TerminalCard.tsx  # 개별 단말기 카드 (정보·액션)
│   │   ├── CardTapButton.tsx # 카드 탭 시뮬레이션 버튼
│   │   ├── ConnectionSettings.tsx  # TCP 연결 설정 (호스트/포트)
│   │   ├── TcpConnectionPanel.tsx   # 연결 상태·연결/해제 UI
│   │   └── Toast.tsx         # 토스트 알림
│   ├── contexts/
│   │   └── ToastContext.tsx  # 전역 토스트 컨텍스트
│   ├── stores/
│   │   └── terminalStore.ts  # Zustand 단말기 목록·상태
│   ├── utils/
│   │   └── tcpClient.ts      # Renderer용: window.electronAPI.tcp 호출 래퍼
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

- **App**: `ToastProvider` + 단말기 목록(`TerminalList`) + 연결 설정(`ConnectionSettings`).
- **TerminalList / TerminalCard**: `terminalStore`의 단말기 목록 표시, 전원/연결 상태, 카드 탭 등 액션.
- **ConnectionSettings / TcpConnectionPanel**: TCP 호스트·포트 설정, 연결/해제, 상태 표시.
- **stores/terminalStore**: Zustand로 단말기 CRUD, 전원/연결 상태.
- **utils/tcpClient**: Renderer에서 `window.electronAPI.tcp` 호출만 담당 (실제 소켓은 Main의 `tcpClient.ts`).

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
