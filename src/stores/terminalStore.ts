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

// 기본 단말기 데이터 (지하철 1개 + 버스 1개, 지하철은 드롭다운으로 승차/하차 선택)
const defaultTerminals: Omit<TerminalInfo, 'isPoweredOn' | 'isConnected'>[] = [
  {
    id: 'terminal-subway',
    transitType: 'subway',
    terminalId: 'M-SEOUL-E01',
    name: '지하철 단말기',
    line: '1호선',
    station: '서울역',
    type: 'entry', // 승차 (드롭다운으로 하차 전환 가능)
  },
  {
    id: 'terminal-bus',
    transitType: 'bus',
    terminalId: 'B12001',
    name: '버스 단말기',
    line: '새벽A160',
    station: '도봉산역',
    type: 'entry', // 승차
  },
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

