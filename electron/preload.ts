import { contextBridge } from 'electron'

// Electron Preload Script
// 여기서 renderer와 main process 간의 안전한 통신을 설정합니다

contextBridge.exposeInMainWorld('electronAPI', {
  // 예시: API를 여기에 추가할 수 있습니다
  // platform: process.platform,
})

