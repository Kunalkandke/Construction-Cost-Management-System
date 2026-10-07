# CCMS - Phase 2: Frontend

React 18 + Vite 5, Tailwind CSS 3.4, React Router 6, TanStack Query 5, react-hook-form + zod, Zustand, Recharts, framer-motion (light use).
Light glassmorphism UI, responsive, keyboard accessible. Consumes the Phase 1 API only: **the frontend never calculates costs** (it formats what `/api/v1` returns).

## Run

```bash
cd frontend
npm install
cp .env.example .env      # VITE_API_BASE_URL=http://localhost:5000/api/v1
npm run dev               # http://localhost:5173
npm run build             # output in dist/ (SPA)
npm test                  # formatting + validator unit tests
```

Backend must be running with `CLIENT_ORIGIN=http://localhost:5173` (exact origin; the refresh cookie needs CORS credentials).

## Structure

```
src/
  api/          client.js (axios, silent single-flight refresh, error normalisation), auth, meta, estimates, ai, admin
  store/        authStore (token in memory only), wizardStore (persisted to sessionStorage), uiStore
  hooks/        useAuth(+bootstrap), useMeta, useEstimate, useDebounce, useCountUp
  lib/          format (Indian grouping, sqm/sqft), validators (mirror backend rules), constants, inputs, download
  components/   ui (Glass card, Button, forms, Tile, Stepper, Modal/Drawer/Confirm, Tabs, DataTable ...)
                layout (Public/User/Admin layouts, guards, banners, SEO), charts (Recharts, each with "View data" table),
                estimate (wizard steps, EstimateView, BOQ, materials, schedule, prediction, AI panel, share, actuals)
  pages/        public, user, admin
```

## Routes
Public: `/`, `/estimate`, `/estimate/result`, `/how-it-works`, `/budget-planner`, `/faq`, `/contact`, `/terms`, `/privacy`, `/disclaimer`, `/shared/:token`, auth pages (guest only).
User (login required): `/dashboard`, `/estimates`, `/estimates/:id`, `/compare?ids=a,b`, `/profile`.
Admin (`admin` / `super_admin`): `/admin`, `/admin/users`, `/admin/estimates`(+`/:id`), `/admin/rates`(+`/:id`), `/admin/norms`, `/admin/master-data`, `/admin/ai`, `/admin/actuals`, `/admin/content`, `/admin/audit`; `/admin/settings` is super admin only.
Route guards wait for the initial `/auth/refresh` and show a skeleton (no flash of the login page).

## Behaviour notes
- **Access token** lives in memory (Zustand); the refresh token is an httpOnly cookie. On `TOKEN_EXPIRED` one shared refresh runs and queued requests retry; if it fails you are sent to `/login?next=`.
- **Wizard** state persists in `sessionStorage`; the URL `?step=n` is synced so the browser Back button moves one step back; deep links cannot skip incomplete steps. Flats skip the floors step. The area field converts (not resets) when you switch sqm/sqft.
- **Guest flow**: result is kept in memory. Clicking Save sends you to log in, then the estimate is saved automatically (`?autosave=1`).
- **Edit inputs** loads a saved estimate into the wizard; generating then PATCHes it (recalculated with the current rates; the old total is kept in history).
- **AI panel** auto-requests insights; states: loading, success, rule-based fallback ("Showing rule-based suggestions"), rate-limited/unavailable (friendly, never blocks the page). Regenerate is disabled with a countdown until the server allows it.
- **Rates banner**: shown while the active rate set is not verified (and inside every result).
- **Admin**: generic `ResourceEditor` (list + create/edit modal + delete confirm) drives norms, BHK, tiers, structure types, house types, floor options, locations, material coefficients, FAQs and announcements. Complex settings (stage templates, JSON settings) are edited as validated JSON; the server validates every key.

## Assumptions
1. Admin routes `/admin/estimates/:id` and `/admin/rates/:id` are added (the route map lists only the list pages).
2. FAQ ordering uses a numeric order field, not drag-and-drop.
3. Norm/master-data edits use a modal form rather than inline cell editing; "reset norm to seed default" is not available (the API has no such endpoint).
4. Illustrations are inline SVG/icons only; no images are shipped. Fonts load from Google Fonts with system fallbacks.
5. Placeholder legal pages (Terms, Privacy) are marked "to be reviewed by legal counsel".
6. `sitemap.xml` / `robots.txt` use `https://example.com`; replace with your domain.

## Deploy
Vercel/Netlify: build `npm run build`, output `dist`, add a SPA rewrite of all paths to `/index.html`, set `VITE_API_BASE_URL` to the backend URL. Prefer serving frontend and API on the same site (e.g. `app.` and `api.` subdomains with `COOKIE_DOMAIN`); for unrelated domains set backend `COOKIE_SAMESITE=none` and test on Safari.
