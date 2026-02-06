import { create } from 'zustand'

export type TcpLogDirection = 'out' | 'in' | 'info' | 'error'

export type TcpLogEntry = {
  id: string
  direction: TcpLogDirection
  message: string
  timestamp: number
}

interface TcpLogStore {
  logs: TcpLogEntry[]
  addLog: (entry: Omit<TcpLogEntry, 'id'>) => void
  clearLogs: () => void
}

const MAX_LOGS = 500
const createId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

export const useTcpLogStore = create<TcpLogStore>((set) => ({
  logs: [],
  addLog: (entry) =>
    set((state) => {
      const next = [...state.logs, { ...entry, id: createId() }]
      return { logs: next.slice(-MAX_LOGS) }
    }),
  clearLogs: () => set({ logs: [] }),
}))
