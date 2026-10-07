import { api, unwrap, refreshSession } from './client';

export const authApi = {
  login: (body) => unwrap(api.post('/auth/login', body)),
  register: (body) => unwrap(api.post('/auth/register', body)),
  refresh: refreshSession,
  logout: (all = false) => api.post('/auth/logout', { all }),
  forgot: (email) => unwrap(api.post('/auth/forgot-password', { email })),
  reset: (token, newPassword) => unwrap(api.post('/auth/reset-password', { token, newPassword })),
  me: () => unwrap(api.get('/auth/me')),
  patchMe: (body) => unwrap(api.patch('/auth/me', body)),
  changePassword: (body) => unwrap(api.post('/auth/change-password', body)),
};
