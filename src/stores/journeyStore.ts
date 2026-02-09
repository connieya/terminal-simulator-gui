import { create } from 'zustand'

export type JourneyEntry = {
  id: string
  station: string
  line?: string
  type: 'entry' | 'exit'
  terminalId: string
  timestamp: number
}

interface JourneyStore {
  journeys: JourneyEntry[]
  addJourney: (entry: Omit<JourneyEntry, 'id'>) => void
  clearJourneys: () => void
}

const MAX_JOURNEYS = 200

const createId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

export const useJourneyStore = create<JourneyStore>((set) => ({
  journeys: [],
  addJourney: (entry) =>
    set((state) => {
      const next = [...state.journeys, { ...entry, id: createId() }]
      return { journeys: next.slice(-MAX_JOURNEYS) }
    }),
  clearJourneys: () => set({ journeys: [] }),
}))
