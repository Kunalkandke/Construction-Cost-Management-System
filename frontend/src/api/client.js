import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';

const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';
const headers = { 'X-Requested-With': 'ccms' };

export const api = axios.create({ baseURL, withCredentials: true, headers });
const bare = axios.create({ baseURL, withCredentials: true, headers }); // no interceptors: used for refresh

api.interceptors.request.use((config) => {
  const t = useAuthStore.getState().accessToken;
  if (t) config.headers.Authorization = `Bearer ${t}`;
  return config;
});

// One in-flight refresh shared by every queued request (Section 5.3 step 4)
let refreshing = null;
export function refreshSession() {
  if (!refreshing) {
    refreshing = bare.post('/auth/refresh')
      .then((r) => { const d = r.data.data; useAuthStore.getState().setSession(d); return d; })
      .finally(() => { refreshing = null; });
  }
  return refreshing;
}

async function readBlobError(data) {
  try { return JSON.parse(await data.text())?.error; } catch { return null; }
}

api.interceptors.response.use(
  (r) => r,
  async (err) => {
    const original = err.config;
    let body = err.response?.data?.error;
    if (err.response?.data instanceof Blob) body = await readBlobError(err.response.data);
    const status = err.response?.status;

    if (status === 401 && body?.code === 'TOKEN_EXPIRED' && original && !original._retry) {
      original._retry = true;
      try {
        await refreshSession();
        return api(original);
      } catch {
        useAuthStore.getState().clear();
        const here = window.location.pathname + window.location.search;
        if (!window.location.pathname.startsWith('/login')) window.location.assign(`/login?next=${encodeURIComponent(here)}`);
      }
    }
    const normalised = {
      status: status || 0,
      code: body?.code || (err.response ? 'INTERNAL_ERROR' : 'NETWORK_ERROR'),
      message: body?.message || (err.response ? 'Something went wrong. Please try again.' : 'Cannot reach the server. Check your connection.'),
      details: body?.details || [],
    };
    if (status >= 500 || !err.response) toast.error(normalised.message, { id: 'api-error' });
    return Promise.reject(normalised);
  },
);

export const unwrap = (p) => p.then((r) => r.data.data);
export const unwrapList = (p) => p.then((r) => ({ rows: r.data.data, meta: r.data.meta || { page: 1, pageSize: r.data.data.length, total: r.data.data.length } }));
