import { api, unwrap } from './client';

export const aiApi = {
  generate: (id, force = false) => unwrap(api.post(`/estimates/${id}/ai-insights`, { force })),
  latest: (id) => unwrap(api.get(`/estimates/${id}/ai-insights`)),
  quick: (input, mode = 'DETAILED') => unwrap(api.post('/ai/quick-insights', { ...input, mode })),
};
