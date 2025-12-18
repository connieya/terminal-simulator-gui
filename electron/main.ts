import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'path'
import { TcpClient } from './tcpClient'
import type { TcpConnectionConfig, TerminalCommand } from '../shared/types'

// Electron Main Process
let mainWindow: BrowserWindow | null = null
let tcpClient: TcpClient | null = null

const DEFAULT_CONFIG: TcpConnectionConfig = {
  host: 'localhost',
  port: 8080,
  timeout: 5000,
  reconnectInterval: 3000,
}

function createWindow() {
  // 개발 모드와 프로덕션 모드에서 preload 경로 설정
  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged
  // preload는 항상 JavaScript 파일이어야 함 (Electron 제약)
  // tsx로 실행할 때는 __dirname이 소스 폴더를 가리키므로 dist-electron을 사용
  const preloadPath = isDev
    ? path.join(__dirname, '../dist-electron/electron/preload.js')
    : path.join(__dirname, 'preload.js')

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  // 개발 모드에서는 Vite dev server를 사용
  if (isDev) {
    // 포트가 5173이 아닐 수 있으므로 환경 변수에서 가져오거나 기본값 사용
    // Vite가 다른 포트를 사용할 경우 환경 변수로 전달
    const port = process.env.VITE_PORT || process.env.PORT || '5173'
    const url = `http://localhost:${port}`
    console.log(`Loading Vite dev server: ${url}`)
    if (mainWindow) {
      mainWindow.loadURL(url).catch((err) => {
        console.error('Failed to load URL:', err)
        // 포트를 찾지 못하면 다른 포트 시도
        if (mainWindow) {
          const altPort = port === '5173' ? '5174' : '5173'
          console.log(`Trying alternative port: ${altPort}`)
          mainWindow.loadURL(`http://localhost:${altPort}`).catch(console.error)
        }
      })
      mainWindow.webContents.openDevTools()
    }
  } else {
    if (mainWindow) {
      mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
    }
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

// TCP 클라이언트 초기화
function initTcpClient(config: TcpConnectionConfig = DEFAULT_CONFIG) {
  if (tcpClient) {
    tcpClient.disconnect()
  }
  tcpClient = new TcpClient(config)
}

// IPC 핸들러 등록
function setupIpcHandlers() {
  // TCP 연결
  ipcMain.handle('tcp:connect', async (_, config?: TcpConnectionConfig) => {
    try {
      if (!tcpClient) {
        initTcpClient(config)
      }
      await tcpClient!.connect()
      return { success: true }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  })

  // TCP 연결 해제
  ipcMain.handle('tcp:disconnect', async () => {
    try {
      if (tcpClient) {
        tcpClient.disconnect()
        tcpClient = null
      }
      return { success: true }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  })

  // 연결 상태 확인
  ipcMain.handle('tcp:isConnected', () => {
    return tcpClient?.isConnected() || false
  })

  // 명령 전송
  ipcMain.handle('tcp:sendCommand', async (_, command: TerminalCommand) => {
    try {
      if (!tcpClient || !tcpClient.isConnected()) {
        throw new Error('Not connected to terminal simulator')
      }
      const response = await tcpClient.sendCommand(command)
      return { success: true, response }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  })

  // 카드 탭 트리거 (편의 함수)
  ipcMain.handle('tcp:tapCard', async (_, cardData?: { type?: string; data?: string }) => {
    try {
      if (!tcpClient || !tcpClient.isConnected()) {
        throw new Error('Not connected to terminal simulator')
      }
      const command: TerminalCommand = {
        type: 'card_tap',
        cardType: cardData?.type as any,
        cardData: cardData?.data,
      }
      const response = await tcpClient.sendCommand(command)
      return { success: true, response }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  })
}

app.whenReady().then(() => {
  setupIpcHandlers()
  initTcpClient()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (tcpClient) {
    tcpClient.disconnect()
  }
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  if (tcpClient) {
    tcpClient.disconnect()
  }
})

