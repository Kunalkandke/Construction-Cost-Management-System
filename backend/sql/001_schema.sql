-- CCMS schema. Run files 001..005 in order on a fresh Supabase project (SQL editor).
create extension if not exists pgcrypto;
create extension if not exists citext;

create or replace function set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ───────────── 4.1 Identity and security ─────────────
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email citext not null unique,
  phone text,
  password_hash text not null,
  role text not null default 'user' check (role in ('user','admin','super_admin')),
  status text not null default 'active' check (status in ('active','blocked')),
  failed_login_count int not null default 0,
  locked_until timestamptz,
  last_login_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists refresh_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  token_hash text not null,
  family_id uuid not null,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  replaced_by uuid,
  user_agent text,
  ip text,
  created_at timestamptz not null default now()
);

create table if not exists password_resets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  token_hash text not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references users(id) on delete set null,
  action text not null,
  entity text not null,
  entity_id text,
  before jsonb,
  after jsonb,
  ip text,
  created_at timestamptz not null default now()
);

-- ───────────── 4.2 Master data ─────────────
create table if not exists house_types (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  icon text,
  sort_order int not null default 0,
  is_active boolean not null default true,
  template jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists floor_options (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  floor_count int not null check (floor_count between 1 and 3),
  floor_factor_foundation numeric(5,3) not null default 1.000,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists bhk_configs (
  id uuid primary key default gen_random_uuid(),
  bhk int not null unique check (bhk between 1 and 5),
  bedrooms int not null,
  halls int not null,
  kitchens int not null,
  bathrooms int not null,
  balconies int not null,
  electrical_points int not null,
  doors int not null,
  windows int not null,
  persons int not null,
  typical_min_sqm numeric(8,2) not null,
  typical_max_sqm numeric(8,2) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists quality_tiers (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code in ('BASIC','STANDARD','PREMIUM')),
  name text not null,
  description text,
  multipliers jsonb not null,
  steel_kg_per_sqm numeric(8,2) not null,
  benchmark_min_per_sqft numeric(10,2) not null,
  benchmark_max_per_sqft numeric(10,2) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists structure_types (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code in ('RCC_FRAME','LOAD_BEARING')),
  name text not null,
  max_floor_count int not null,
  cost_multiplier numeric(6,3) not null default 1.000,
  norm_overrides jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists locations (
  id uuid primary key default gen_random_uuid(),
  state text not null,
  district text not null,
  taluka text,
  display_name text not null unique,
  cost_index numeric(5,3) not null default 1.000,
  lead_lift_factor numeric(5,3) not null default 1.000,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists consumption_norms (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  category text not null,
  description text,
  unit text,
  basic numeric(14,4) not null,
  standard numeric(14,4) not null,
  premium numeric(14,4) not null,
  notes text,
  version int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists material_coefficients (
  id uuid primary key default gen_random_uuid(),
  item_code text not null,
  material text not null check (material in
    ('cement_bag','sand_cum','aggregate_cum','brick_no','steel_kg','tile_sqm','paint_litre')),
  per_unit numeric(14,4) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (item_code, material)
);

create table if not exists system_settings (
  key text primary key,
  value jsonb not null,
  updated_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ───────────── 4.3 Rate tables ─────────────
create table if not exists rate_sets (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  fiscal_year text not null,
  source_label text,
  status text not null default 'draft' check (status in ('draft','published','archived')),
  effective_from date,
  is_verified boolean not null default false,
  published_by uuid references users(id) on delete set null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists rate_items (
  id uuid primary key default gen_random_uuid(),
  rate_set_id uuid not null references rate_sets(id) on delete cascade,
  item_code text not null,
  category text not null,
  description text not null,
  unit text not null,
  base_rate numeric(14,2) check (base_rate is null or base_rate >= 0),
  dsr_rate numeric(14,2) check (dsr_rate is null or dsr_rate >= 0),
  source text not null default 'CUSTOM'
    check (source in ('PWD_SSR','MJP_SSR','CPWD_DSR','MARKET','CUSTOM')),
  source_ref text,
  labour_pct numeric(5,2) not null default 0 check (labour_pct between 0 and 100),
  lead_lift_applied boolean not null default false,
  "group" text not null check ("group" in ('structure','finishing','electrical','plumbing','openings')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (rate_set_id, item_code)
);

create table if not exists rate_history (
  id uuid primary key default gen_random_uuid(),
  item_code text not null,
  rate numeric(14,2) not null,
  effective_date date not null,
  rate_set_id uuid references rate_sets(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (item_code, rate_set_id)
);

-- ───────────── 4.4 Estimates and AI ─────────────
create table if not exists estimates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete set null,
  title text not null default 'Untitled estimate',
  mode text not null check (mode in ('QUICK','DETAILED')),
  inputs jsonb not null,
  derived jsonb,
  results jsonb not null,
  grand_total numeric(14,2) not null,
  cost_per_sqft numeric(10,2),
  range_min numeric(14,2),
  range_max numeric(14,2),
  total_area_sqm numeric(10,2),
  location_id uuid references locations(id),
  rate_set_id uuid references rate_sets(id),
  engine_version text,
  status text not null default 'final' check (status in ('draft','final')),
  share_token text unique,
  is_shared boolean not null default false,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists estimate_items (
  id uuid primary key default gen_random_uuid(),
  estimate_id uuid not null references estimates(id) on delete cascade,
  category text not null,
  item_code text not null,
  description text,
  unit text,
  quantity numeric(14,3),
  rate numeric(14,2),
  amount numeric(14,2),
  labour_amount numeric(14,2),
  source text,
  floor_label text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists ai_insights (
  id uuid primary key default gen_random_uuid(),
  estimate_id uuid references estimates(id) on delete cascade,
  user_id uuid references users(id) on delete set null,
  type text not null default 'SUGGESTIONS' check (type in ('SUGGESTIONS','OUTLOOK')),
  model text,
  prompt_key text,
  prompt_version int,
  results_hash text,
  content jsonb,
  tokens_in int,
  tokens_out int,
  latency_ms int,
  status text not null check (status in ('ok','failed','fallback')),
  error text,
  created_at timestamptz not null default now()
);

create table if not exists ai_prompts (
  id uuid primary key default gen_random_uuid(),
  key text not null,
  version int not null,
  template text not null,
  is_active boolean not null default false,
  updated_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (key, version)
);

create table if not exists project_actuals (
  id uuid primary key default gen_random_uuid(),
  estimate_id uuid not null references estimates(id) on delete cascade,
  user_id uuid references users(id) on delete set null,
  category text not null,
  actual_amount numeric(14,2) not null check (actual_amount >= 0),
  completed_on date,
  notes text,
  verified boolean not null default false,
  verified_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ───────────── 4.5 Content ─────────────
create table if not exists faqs (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  answer text not null,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text,
  kind text not null default 'info' check (kind in ('info','warning','success')),
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  subject text,
  message text not null,
  status text not null default 'new' check (status in ('new','read','resolved')),
  handled_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ───────────── Atomic publish (Section 9.2 step 4) ─────────────
-- supabase-js cannot open transactions, so the publish is one atomic RPC.
-- Validation (completeness, 40% rule) is performed by the service BEFORE calling this.
create or replace function publish_rate_set(p_set_id uuid, p_actor uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_eff date;
begin
  select effective_from into v_eff from rate_sets where id = p_set_id for update;
  if not found then
    raise exception 'RATE_SET_NOT_FOUND';
  end if;

  update rate_sets set status = 'archived'
   where status = 'published' and id <> p_set_id;

  update rate_sets
     set status = 'published', published_by = p_actor, published_at = now()
   where id = p_set_id;

  insert into rate_history (item_code, rate, effective_date, rate_set_id)
  select item_code, coalesce(base_rate, dsr_rate), coalesce(v_eff, current_date), p_set_id
    from rate_items
   where rate_set_id = p_set_id
     and is_active
     and coalesce(base_rate, dsr_rate) is not null
  on conflict (item_code, rate_set_id) do nothing;
end $$;
