import { create } from 'zustand'

type UiState = {
  showCriticalOnly: boolean
  toggleCriticalOnly: () => void
}

export const useUiStore = create<UiState>((set) => ({
  showCriticalOnly: false,
  toggleCriticalOnly: () => {
    set((state) => ({ showCriticalOnly: !state.showCriticalOnly }))
  },
}))
