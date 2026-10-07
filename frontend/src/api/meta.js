import { api, unwrap } from './client';

export const metaApi = {
  config: () => unwrap(api.get('/meta/config')),
  faqs: () => unwrap(api.get('/faqs')),
  contact: (body) => unwrap(api.post('/contact', body)),
};
