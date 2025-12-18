import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, './shared'),
    },
  },
  server: {
    port: 5175, // 다른 프로젝트와 겹치지 않는 포트
    strictPort: true, // 포트가 사용 중이면 다른 포트로 변경하지 않음
  },
})
