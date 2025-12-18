import { create } from 'zustand'
import type { TerminalInfo } from '@shared/types'

interface TerminalStore {
  terminals: TerminalInfo[]
  addTerminal: (terminal: Omit<TerminalInfo, 'isPoweredOn' | 'isConnected' | 'lastCommandTime'>) => void
  removeTerminal: (id: string) => void
  updateTerminal: (id: string, updates: Partial<TerminalInfo>) => void
  setTerminalPower: (id: string, isPoweredOn: boolean) => void
  setTerminalConnected: (id: string, isConnected: boolean) => void
}

// 기본 단말기 데이터 (예시)
const defaultTerminals: Omit<TerminalInfo, 'isPoweredOn' | 'isConnected'>[] = [
  { id: 'terminal-1', name: '2호선 홍대입구역', line: '2호선', station: '홍대입구역' },
  { id: 'terminal-2', name: '2호선 신도림역', line: '2호선', station: '신도림역' },
  { id: 'terminal-3', name: '2호선 강남역', line: '2호선', station: '강남역' },
  { id: 'terminal-4', name: '1호선 서울역', line: '1호선', station: '서울역' },
  { id: 'terminal-5', name: '1호선 종로3가역', line: '1호선', station: '종로3가역' },
]

export const useTerminalStore = create<TerminalStore>((set) => ({
  terminals: defaultTerminals.map((t) => ({
    ...t,
    isPoweredOn: false,
    isConnected: false,
  })),

  addTerminal: (terminal) =>
    set((state) => ({
      terminals: [
        ...state.terminals,
        {
          ...terminal,
          isPoweredOn: false,
          isConnected: false,
        },
      ],
    })),

  removeTerminal: (id) =>
    set((state) => ({
      terminals: state.terminals.filter((t) => t.id !== id),
    })),

  updateTerminal: (id, updates) =>
    set((state) => ({
      terminals: state.terminals.map((t) =>
        t.id === id ? { ...t, ...updates } : t
      ),
    })),

  setTerminalPower: (id, isPoweredOn) =>
    set((state) => ({
      terminals: state.terminals.map((t) =>
        t.id === id ? { ...t, isPoweredOn } : t
      ),
    })),

  setTerminalConnected: (id, isConnected) =>
    set((state) => ({
      terminals: state.terminals.map((t) =>
        t.id === id ? { ...t, isConnected } : t
      ),
    })),
}))

