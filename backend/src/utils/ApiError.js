export class ApiError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
    this.isApiError = true;
  }
  static validation(message = 'Validation failed', details) { return new ApiError(400, 'VALIDATION_ERROR', message, details); }
  static unauthenticated(message = 'Authentication required') { return new ApiError(401, 'UNAUTHENTICATED', message); }
  static tokenExpired(message = 'Access token expired') { return new ApiError(401, 'TOKEN_EXPIRED', message); }
  static forbidden(message = 'You do not have permission to do this') { return new ApiError(403, 'FORBIDDEN', message); }
  static notFound(message = 'Resource not found') { return new ApiError(404, 'NOT_FOUND', message); }
  static conflict(message = 'Conflict') { return new ApiError(409, 'CONFLICT', message); }
  static rateLimited(message = 'Too many requests. Please try again later.') { return new ApiError(429, 'RATE_LIMITED', message); }
  static aiUnavailable(message = 'AI service is unavailable') { return new ApiError(503, 'AI_UNAVAILABLE', message); }
  static internal(message = 'Something went wrong') { return new ApiError(500, 'INTERNAL_ERROR', message); }
  static fromZod(err, message = 'Validation failed') {
    return new ApiError(400, 'VALIDATION_ERROR', message, err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })));
  }
}
