import { api } from '../api/client';

export function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
const nameFrom = (res, fallback) => /filename="?([^";]+)"?/i.exec(res.headers['content-disposition'] || '')?.[1] || fallback;

export async function downloadFile(path, fallbackName, params) {
  const res = await api.get(path, { responseType: 'blob', params });
  saveBlob(res.data, nameFrom(res, fallbackName));
}
export function downloadText(text, filename, type = 'text/csv') { saveBlob(new Blob([text], { type }), filename); }
