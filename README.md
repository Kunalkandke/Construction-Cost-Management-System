# Construction Cost Management System (CCMS) - Phase 1: Backend

Node.js 20+, Express 4, Supabase (PostgreSQL), custom JWT + bcrypt, Google Gemini, decimal.js.
Implements Sections 4-11 of `CCMS_Build_Specification.pdf`. The frontend (Phase 2) only consumes this API.

> **All rupee values are ILLUSTRATIVE.** Replace the DEMO rate set with official Maharashtra PWD SSR / MJP SSR data before launch (see "Go-live").

## Setup

```bash
cd backend
npm install
cp .env.example .env        # fill in values (see below)
```

1. **Supabase**: create a project. In the SQL editor run, in order: `sql/001_schema.sql`, `002_indexes.sql`, `003_rls.sql`, `004_seed_master.sql`, `005_seed_demo_rates.sql`.
   - RLS is enabled on every table with **no policies**: only the backend (service-role key) can read or write.
2. **.env**: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (server only), two *different* 64+ char secrets for `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET`
   (`node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`), `GEMINI_API_KEY`, `GEMINI_MODEL` (verify the current model id), `CLIENT_ORIGIN` (exact origin, no wildcard).
   The app refuses to start if required values are missing or weak.
3. **Super admin**: set `SUPERADMIN_EMAIL` / `SUPERADMIN_PASSWORD` then `npm run seed:superadmin`. Change the password after first login.
4. **Run**: `npm run dev` (watch) or `npm start`. Health: `GET /health`. API base: `/api/v1`.

### Optional
- **PDF rupee sign**: drop `NotoSans-Regular.ttf` (and `NotoSans-Bold.ttf`) into `backend/assets/fonts/`. Without them the PDF prints "Rs.".
- **Email**: set `SMTP_*`. Without SMTP, in development the reset link is printed to the server log.
- **Behind a proxy/host** (Render, Railway): set `TRUST_PROXY=1`. Cross-site cookies: `COOKIE_SAMESITE=none` (forces `Secure`).

## Scripts
| Script | Purpose |
|---|---|
| `npm test` | Vitest: engine unit tests + API tests (API integration tests are skipped unless `RUN_API_TESTS=1`) |
| `npm run test:engine` | Engine only (no database needed): Appendix B parity etc. |
| `npm run test:api` | Integration tests against your Supabase project (`RUN_API_TESTS=1`) |
| `npm run seed:superadmin` | Create/promote the super admin |
| `npm run import:rates -- --file rates.csv --name "PWD SSR 2026-27" --fy 2026-27 [--commit]` | CSV import into a draft rate set (dry run by default) |

## Rate sets
- Seeded: `DEMO-2026-27` (published, unverified) and `SAMPLE-FIXTURE` (draft; reproduces the reference Rs. 19,49,420 in QUICK mode).
- To check the reference sample through the API: `POST /api/v1/admin/rate-sets/<SAMPLE-FIXTURE id>/preview` with the Appendix B input and `"mode":"QUICK"`.
- Workflow: create/clone draft -> import CSV (dry-run first) -> `POST /admin/rate-sets/:id/publish` (validates completeness, units, >40% changes need `acknowledgeChanges`) -> published set becomes active; saved estimates never change.
- CSV columns: `item_code,category,description,unit,base_rate,dsr_rate,source,source_ref,labour_pct,group`.

## Architecture notes
- `src/modules/estimates/engine/` is a **pure** module (`calculate`, `budgetPlan`): no DB, no network, decimal.js (precision 20, ROUND_HALF_UP). Data is loaded by `estimates.data.js` and passed in.
- No rate, factor or percentage is hard-coded: they come from `rate_items`, `consumption_norms`, `quality_tiers`, `bhk_configs`, `locations`, `structure_types`, `system_settings`. Only structural constants (1 sqm = 10.7639 sqft, catalogue of item codes/units) live in `config/constants.js`.
- Gemini only explains; the backend converts AI percentage ranges to rupees and overrides the outlook trend from the engine.
- Response envelope: `{ success, data, meta }` / `{ success:false, error:{ code, message, details } }`; JSON is camelCase, DB columns snake_case.

## Assumptions
1. Add-on catalogue and stage templates live in `system_settings` (`addon_catalogue`, `stage_templates`); no separate table is specified.
2. Added nullable `ai_insights.results_hash` (Section 8.2 cache) and an atomic `publish_rate_set()` SQL function (supabase-js has no transactions); validation stays in the service.
3. Literals embedded in spec formulas became `consumption_norms` keys (`N_WATER_LPCD`, `N_TANK_MIN_L`, `N_TANK_ROUND_L`, `N_SEPTIC_*_MAX_PERSONS`, `N_LANDSCAPE_SHARE`, `N_COMPOUND_*`, `N_ELEV_SHARE`); `SCH_FLOOR_FACTOR` is stored as `_1/_2/_3`. Extra settings keys: `dynamic_band.step`, `escalation_items`, `outlook_rising_threshold_percent`, `fallback_rules`, `monsoon_months`, `sensitivity_config`, `budget_planner_config`, `escalation_config`, `area_limits_sqm`, etc.
4. FLAT: `includeFoundationShare` seeded 0.40, `commonAreaLoad` 1.00 (admin-editable). BHK `PER_FLOOR` multiplies rooms/points/doors/windows/persons by floor count; `D01` (main door) stays 1.
5. `LOAD_BEARING` `norm_overrides` are multiplicative; `steelKg` scales the tier steel norm. `structure_types.cost_multiplier` multiplies the *structure* group rates.
6. Categories in results are the BOQ categories (SITE, FOUNDATION, SUPERSTRUCTURE, ..., FINISHING); QUICK mode uses the 7 reference categories (STRUCTURE, ELECTRICAL, PLUMBING, FLOORING, PAINTING, OPENINGS, FINISHING). Materials are empty in QUICK mode (no BOQ).
7. `AREA_UNUSUAL_FOR_BHK`: per-floor area vs the typical range; for WHOLE_HOUSE multi-floor the lower bound is divided by floor count.
8. Over the daily AI limit, users/guests get `RATE_LIMITED` (429); disabled AI / timeout / invalid JSON gives the rule-based `fallback`. Guest AI calls log metrics only (no content, no estimate).
9. `gst_enabled` is the system switch for GST (seeded `false`); `includeGst` only applies when it is on.
10. Refresh tokens are stored as HMAC-SHA256 (keyed with `JWT_REFRESH_SECRET`). Login lockout returns `RATE_LIMITED` with the "Too many attempts" message. Reuse of a rotated refresh token revokes the whole family (strict, no grace window).
11. Publishing sets `rates_verified` setting to the published set's `is_verified` flag so the banner stays consistent.
12. Dashboard analytics aggregate in Node over a capped scan (20,000 rows); fine for this scale, move to SQL views if it grows.
13. Not implemented because Section 6.5 lists no endpoint for it: "reset norm to seed default".
14. Extra endpoints beyond the spec: `POST /admin/rate-sets/:id/preview`, `GET /admin/estimates/:id/recalculate?rateSetId=`, `POST /admin/actuals/calibration/apply`, `POST /admin/ai/prompts/:id/test`, `GET /admin/audit-logs/export.csv`.

## Go-live checklist (Section 21.2)
1. Replace DEMO with a verified PWD SSR / MJP SSR rate set (CPWD DSR only as corrected fallback), publish it with `isVerified: true`.
2. Calibrate norms with real projects; review tier benchmarks.
3. Review disclaimer text; change the seeded super-admin password.
4. Run `npm run test:engine` and `npm run test:api`; smoke-test production.
5. Confirm Gemini quota, daily limits and fallback behaviour.

---

# Phase 2: Frontend

See `frontend/README.md`. Quick start for the whole system:

```bash
# 1) Supabase: run backend/sql/001..005 in order, then
cd backend && npm install && cp .env.example .env   # fill values
npm run seed:superadmin && npm run dev               # API on :5000

# 2) Frontend
cd ../frontend && npm install && cp .env.example .env
npm run dev                                          # http://localhost:5173
```
Log in with the super admin at `/login`; the admin panel is at `/admin`.
