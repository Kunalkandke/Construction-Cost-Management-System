import { ApiError } from '../utils/ApiError.js';

export const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) return next(ApiError.unauthenticated());
  if (!roles.includes(req.user.role)) return next(ApiError.forbidden());
  return next();
};
export const isSuper = (user) => user?.role === 'super_admin';
export const requireCsrfHeader = (req, res, next) =>
  req.get('X-Requested-With') === 'ccms' ? next() : next(ApiError.forbidden('Missing X-Requested-With header'));
