import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import { authApi } from '../api/auth';

export function useAuth() {
  const { user, status } = useAuthStore();
  const qc = useQueryClient();
  return {
    user, status,
    isAuthed: status === 'authed',
    isAdmin: user?.role === 'admin' || user?.role === 'super_admin',
    isSuper: user?.role === 'super_admin',
    login: async (body) => { const s = await authApi.login(body); useAuthStore.getState().setSession(s); return s; },
    register: async (body) => { const s = await authApi.register(body); useAuthStore.getState().setSession(s); return s; },
    logout: async (all = false) => {
      try { await authApi.logout(all); } catch { /* cookie is cleared server-side either way */ }
      useAuthStore.getState().clear(); qc.clear();
    },
  };
}

// Restore the session once on app load (the refresh cookie is httpOnly)
export function useAuthBootstrap() {
  useEffect(() => {
    let alive = true;
    authApi.refresh().catch(() => { if (alive) useAuthStore.getState().clear(); });
    return () => { alive = false; };
  }, []);
}
