import { api, unwrap, unwrapList } from './client';
import { downloadFile } from '../lib/download';

export const estimatesApi = {
  calculate: (input, mode = 'DETAILED') => unwrap(api.post('/estimates/calculate', input, { params: { mode } })),
  create: (input, { title, mode } = {}) => unwrap(api.post('/estimates', { ...input, ...(title ? { title } : {}), mode })),
  list: (params) => unwrapList(api.get('/estimates', { params })),
  get: (id) => unwrap(api.get(`/estimates/${id}`)),
  patch: (id, body) => unwrap(api.patch(`/estimates/${id}`, body)),
  remove: (id) => api.delete(`/estimates/${id}`),
  duplicate: (id) => unwrap(api.post(`/estimates/${id}/duplicate`)),
  share: (id) => unwrap(api.post(`/estimates/${id}/share`)),
  unshare: (id) => api.delete(`/estimates/${id}/share`),
  shared: (token) => unwrap(api.get(`/shared/${token}`)),
  compare: (ids) => unwrap(api.post('/estimates/compare', { ids })),
  budgetPlan: (body) => unwrap(api.post('/estimates/budget-plan', body)),
  addActual: (id, body) => unwrap(api.post(`/estimates/${id}/actuals`, body)),
  exportPdf: (id) => downloadFile(`/estimates/${id}/export/pdf`, 'CCMS-Estimate.pdf'),
  exportXlsx: (id) => downloadFile(`/estimates/${id}/export/xlsx`, 'CCMS-Estimate.xlsx'),
};
