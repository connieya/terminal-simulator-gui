import { create } from 'zustand'
import type { TerminalInfo, BootStage } from '@shared/types'

interface TerminalStore {
  terminals: TerminalInfo[]
  addTerminal: (terminal: Omit<TerminalInfo, 'isPoweredOn' | 'isConnected' | 'bootStage' | 'lastCommandTime'>) => void
  removeTerminal: (id: string) => void
  updateTerminal: (id: string, updates: Partial<TerminalInfo>) => void
  setTerminalPower: (id: string, isPoweredOn: boolean) => void
  setTerminalConnected: (id: string, isConnected: boolean) => void
  setBootStage: (id: string, stage: BootStage) => void
}

// 기본 단말기 1대 (노선도에서 지하철/버스 클릭 시 데이터가 변경됨)
const defaultTerminals: Omit<TerminalInfo, 'isPoweredOn' | 'isConnected' | 'bootStage'>[] = [
  {
    id: 'terminal-1',
    transitType: 'subway',
    terminalId: 'M-SEOUL-E01',
    name: '교통 단말기',
    line: '1호선',
    station: '서울역',
    type: 'entry',
  },
]

export const useTerminalStore = create<TerminalStore>((set) => ({
  terminals: defaultTerminals.map((t) => ({
    ...t,
    isPoweredOn: false,
    isConnected: false,
    bootStage: 'off' as const,
  })),

  addTerminal: (terminal) =>
    set((state) => ({
      terminals: [
        ...state.terminals,
        {
          ...terminal,
          isPoweredOn: false,
          isConnected: false,
          bootStage: 'off' as const,
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
        t.id === id ? { ...t, isPoweredOn, ...(isPoweredOn ? {} : { bootStage: 'off' as const }) } : t
      ),
    })),

  setTerminalConnected: (id, isConnected) =>
    set((state) => ({
      terminals: state.terminals.map((t) =>
        t.id === id ? { ...t, isConnected } : t
      ),
    })),

  setBootStage: (id, stage) =>
    set((state) => ({
      terminals: state.terminals.map((t) =>
        t.id === id ? { ...t, bootStage: stage } : t
      ),
    })),
}))

