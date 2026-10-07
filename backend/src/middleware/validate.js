import { ApiError } from '../utils/ApiError.js';

// validate({ body, query, params }) with zod schemas. Parsed (and stripped) values replace the originals.
export const validate = (schemas) => (req, res, next) => {
  for (const part of ['params', 'query', 'body']) {
    if (!schemas[part]) continue;
    const r = schemas[part].safeParse(req[part] ?? {});
    if (!r.success) return next(ApiError.fromZod(r.error));
    if (part === 'query') { Object.keys(req.query).forEach((k) => delete req.query[k]); Object.assign(req.query, r.data); } else req[part] = r.data;
  }
  return next();
};
