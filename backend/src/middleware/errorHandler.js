import { ZodError } from 'zod';
import { ApiError } from '../utils/ApiError.js';

export const notFoundHandler = (req, res, next) => next(ApiError.notFound(`Route not found: ${req.method} ${req.path}`));

// Never leaks stack traces or SQL errors. Unknown errors become INTERNAL_ERROR.
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  let e = err;
  if (err instanceof ZodError) e = ApiError.fromZod(err);
  else if (err?.type === 'entity.parse.failed') e = ApiError.validation('Request body is not valid JSON');
  else if (err?.type === 'entity.too.large') e = ApiError.validation('Request body too large');
  else if (err?.name === 'MulterError') e = ApiError.validation(`Upload error: ${err.message}`);
  else if (!err?.isApiError) {
    console.error(`[${req.id}] Unhandled error:`, err?.stack || err);
    e = ApiError.internal();
  }
  if (e.status >= 500 && e.isApiError && e.code === 'INTERNAL_ERROR') console.error(`[${req.id}] ${req.method} ${req.originalUrl} -> ${e.message}`);
  const error = { code: e.code, message: e.message };
  if (e.details) error.details = e.details;
  return res.status(e.status).json({ success: false, error });
}
