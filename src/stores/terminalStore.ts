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

// 기본 단말기 데이터 (DB 쿼리 기반)
const defaultTerminals: Omit<TerminalInfo, 'isPoweredOn' | 'isConnected'>[] = [
  // 서울역
  { 
    id: 'terminal-seoul-entry', 
    terminalId: 'M-SEOUL-E01',
    name: '서울역', 
    line: '1호선', 
    station: '서울역',
    type: 'entry' // 승차
  },
  { 
    id: 'terminal-seoul-exit', 
    terminalId: 'M-SEOUL-X01',
    name: '서울역', 
    line: '1호선', 
    station: '서울역',
    type: 'exit' // 하차
  },
  
  // 강남역
  { 
    id: 'terminal-gangnam-entry', 
    terminalId: 'M-GANGNAM-E01',
    name: '강남역', 
    line: '2호선', 
    station: '강남역',
    type: 'entry' // 승차
  },
  { 
    id: 'terminal-gangnam-exit', 
    terminalId: 'M-GANGNAM-X01',
    name: '강남역', 
    line: '2호선', 
    station: '강남역',
    type: 'exit' // 하차
  },
  
  // 종로3가역
  { 
    id: 'terminal-jongno3ga-entry', 
    terminalId: 'M-JONGNO3GA-E01',
    name: '종로3가역', 
    line: '1호선', 
    station: '종로3가역',
    type: 'entry' // 승차
  },
  { 
    id: 'terminal-jongno3ga-exit', 
    terminalId: 'M-JONGNO3GA-X01',
    name: '종로3가역', 
    line: '1호선', 
    station: '종로3가역',
    type: 'exit' // 하차
  },
  
  // 신도림역
  { 
    id: 'terminal-sindorim-entry', 
    terminalId: 'M-SINDORIM-E01',
    name: '신도림역', 
    line: '2호선', 
    station: '신도림역',
    type: 'entry' // 승차
  },
  { 
    id: 'terminal-sindorim-exit', 
    terminalId: 'M-SINDORIM-X01',
    name: '신도림역', 
    line: '2호선', 
    station: '신도림역',
    type: 'exit' // 하차
  },
  
  // 홍대입구역
  { 
    id: 'terminal-hongdae-entry', 
    terminalId: 'M-HONGDAE-E01',
    name: '홍대입구역', 
    line: '2호선', 
    station: '홍대입구역',
    type: 'entry' // 승차
  },
  { 
    id: 'terminal-hongdae-exit', 
    terminalId: 'M-HONGDAE-X01',
    name: '홍대입구역', 
    line: '2호선', 
    station: '홍대입구역',
    type: 'exit' // 하차
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

