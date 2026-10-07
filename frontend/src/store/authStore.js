import { create } from 'zustand';

// Access token lives in memory only (never localStorage). The refresh cookie is httpOnly.
export const useAuthStore = create((set) => ({
  user: null,
  accessToken: null,
  status: 'loading', // loading | authed | guest
  setSession: ({ user, accessToken }) => set({ user, accessToken, status: 'authed' }),
  setUser: (user) => set({ user }),
  clear: () => set({ user: null, accessToken: null, status: 'guest' }),
}));
