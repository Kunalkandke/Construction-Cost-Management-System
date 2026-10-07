import { Router } from 'express';
import { supabase, unwrap } from '../../config/supabase.js';
import { ApiError } from '../../utils/ApiError.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok, toSnake, parsePaging, pageMeta, clientIp } from '../../utils/format.js';
import { writeAudit } from '../../middleware/audit.js';
import { validate } from '../../middleware/validate.js';
import { requireRole } from '../../middleware/requireRole.js';
import { invalidateCaches } from '../estimates/estimates.data.js';
import { z } from 'zod';

export const ctxOf = (req) => ({ actorId: req.user.id, role: req.user.role, ip: clientIp(req) });
export const idParams = z.object({ id: z.string().uuid() });
export const pagingQuery = z.object({
  page: z.coerce.number().int().min(1).default(1), pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.string().max(40).optional(), q: z.string().max(100).optional(),
}).passthrough();
export const safeLike = (s) => String(s).replace(/[%,()*\\]/g, ' ').trim();

// Generic admin CRUD: audit every write, drop caches so changes affect NEW calculations immediately.
export function makeCrud(cfg) {
  const { table, entity, searchCols = [], sortable = [], extraFilters, removeStrategy = 'hard', canDeactivate = true } = cfg;
  const after = () => invalidateCaches();
  const find = async (id) => {
    const row = unwrap(await supabase.from(table).select('*').eq('id', id).maybeSingle(), `${table}.get`);
    if (!row) throw ApiError.notFound(`${entity} not found`);
    return row;
  };
  return {
    async list(q) {
      const p = parsePaging(q, sortable);
      let query = supabase.from(table).select('*', { count: 'exact' });
      if (q.q && searchCols.length) query = query.or(searchCols.map((c) => `${c}.ilike.%${safeLike(q.q)}%`).join(','));
      if (extraFilters) query = extraFilters(query, q);
      const { data, error, count } = await query.order(p.sortField === 'created_at' && cfg.defaultSort ? cfg.defaultSort : p.sortField, { ascending: cfg.defaultSort && p.sortField === 'created_at' ? cfg.ascending !== false : p.ascending }).range(p.from, p.to);
      if (error) { console.error(`[${table}.list]`, error.message); throw ApiError.internal(); }
      return { rows: data, meta: pageMeta(p, count) };
    },
    get: find,
    async create(ctx, body) {
      const row = unwrap(await supabase.from(table).insert(toSnake(body)).select('*').single(), `${table}.create`);
      await writeAudit({ actorId: ctx.actorId, action: `${entity}.create`, entity, entityId: row.id, after: row, ip: ctx.ip });
      after();
      return row;
    },
    async update(ctx, id, body) {
      const before = await find(id);
      const row = unwrap(await supabase.from(table).update(toSnake(body)).eq('id', id).select('*').single(), `${table}.update`);
      await writeAudit({ actorId: ctx.actorId, action: `${entity}.update`, entity, entityId: id, before, after: row, ip: ctx.ip });
      after();
      return row;
    },
    async remove(ctx, id) {
      const before = await find(id);
      const strategy = cfg.chooseRemove ? await cfg.chooseRemove(before) : removeStrategy;
      if (strategy === 'deactivate' && canDeactivate) {
        unwrap(await supabase.from(table).update({ is_active: false }).eq('id', id), `${table}.deactivate`);
        await writeAudit({ actorId: ctx.actorId, action: `${entity}.deactivate`, entity, entityId: id, before, after: { is_active: false }, ip: ctx.ip });
        after();
        return { deactivated: true };
      }
      unwrap(await supabase.from(table).delete().eq('id', id), `${table}.delete`);
      await writeAudit({ actorId: ctx.actorId, action: `${entity}.delete`, entity, entityId: id, before, ip: ctx.ip });
      after();
      return { deleted: true };
    },
  };
}

// roles for writes default to admin + super_admin (the router is already admin-only)
export function makeCrudRouter(service, { create, update, listQuery = pagingQuery, allowCreate = true, allowRemove = true, writeRoles = ['admin', 'super_admin'] }) {
  const r = Router();
  const w = requireRole(...writeRoles);
  r.get('/', validate({ query: listQuery }), asyncHandler(async (req, res) => { const o = await service.list(req.query); ok(res, o.rows, o.meta); }));
  r.get('/:id', validate({ params: idParams }), asyncHandler(async (req, res) => ok(res, await service.get(req.params.id))));
  if (allowCreate && create) r.post('/', w, validate({ body: create }), asyncHandler(async (req, res) => ok(res, await service.create(ctxOf(req), req.body), undefined, 201)));
  r.patch('/:id', w, validate({ params: idParams, body: update }), asyncHandler(async (req, res) => ok(res, await service.update(ctxOf(req), req.params.id, req.body))));
  if (allowRemove) r.delete('/:id', w, validate({ params: idParams }), asyncHandler(async (req, res) => ok(res, await service.remove(ctxOf(req), req.params.id))));
  return r;
}
