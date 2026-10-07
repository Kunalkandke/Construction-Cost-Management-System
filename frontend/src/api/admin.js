import { api, unwrap, unwrapList } from './client';
import { downloadFile } from '../lib/download';

// Thin generic helpers for /admin/* (every admin page uses these)
export const adminApi = {
  list: (path, params) => unwrapList(api.get(`/admin${path}`, { params })),
  get: (path, params) => unwrap(api.get(`/admin${path}`, { params })),
  post: (path, body, params) => unwrap(api.post(`/admin${path}`, body, { params })),
  patch: (path, body) => unwrap(api.patch(`/admin${path}`, body)),
  del: (path, body) => api.delete(`/admin${path}`, { data: body }).then((r) => r.data?.data),
  download: (path, name, params) => downloadFile(`/admin${path}`, name, params),
  upload: (path, file, params) => {
    const fd = new FormData(); fd.append('file', file);
    return unwrap(api.post(`/admin${path}`, fd, { params, headers: { 'Content-Type': 'multipart/form-data' } }));
  },
};
