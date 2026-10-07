import { create } from 'zustand';

// Non-persistent UI state. lastResult keeps a guest's result in memory only.
export const useUiStore = create((set) => ({
  areaUnit: 'sqm',
  setAreaUnit: (areaUnit) => set({ areaUnit }),
  dismissedBanners: {},
  dismiss: (id) => set((s) => ({ dismissedBanners: { ...s.dismissedBanners, [id]: true } })),
  lastResult: null, // { result, input }
  setLastResult: (lastResult) => set({ lastResult }),
  sidebarOpen: false,
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  sidebarCollapsed: false,
  toggleCollapsed: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
}));
