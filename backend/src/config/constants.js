// Structural constants only. No rate, factor or percentage that an admin may tune lives here.
export const ENGINE_VERSION = '1.0.0';
export const SQM_TO_SQFT = '10.7639';

export const ROLES = { USER: 'user', ADMIN: 'admin', SUPER: 'super_admin' };
export const TIERS = ['BASIC', 'STANDARD', 'PREMIUM'];
export const GROUPS = ['structure', 'finishing', 'electrical', 'plumbing', 'openings'];
export const SOURCES = ['PWD_SSR', 'MJP_SSR', 'CPWD_DSR', 'MARKET', 'CUSTOM'];

export const CATEGORY_LABELS = {
  SITE: 'Site works',
  FOUNDATION: 'Foundation',
  SUPERSTRUCTURE: 'Superstructure',
  MASONRY: 'Masonry',
  PLASTER: 'Plastering',
  FLOORING: 'Flooring and tiling',
  OPENINGS: 'Doors and windows',
  PAINTING: 'Painting',
  ELECTRICAL: 'Electrical',
  PLUMBING: 'Plumbing and sanitary',
  WATER: 'Water tank and septic',
  FINISHING: 'Finishing and add-ons',
  STRUCTURE: 'Structure',
};
export const CATEGORY_ORDER = [
  'STRUCTURE', 'SITE', 'FOUNDATION', 'SUPERSTRUCTURE', 'MASONRY', 'PLASTER', 'FLOORING',
  'PAINTING', 'OPENINGS', 'ELECTRICAL', 'PLUMBING', 'WATER', 'FINISHING',
];
export const QUICK_CATEGORIES = ['STRUCTURE', 'ELECTRICAL', 'PLUMBING', 'FLOORING', 'PAINTING', 'OPENINGS', 'FINISHING'];

export const FLOOR_LABELS = {
  SITE: 'Foundation and site',
  EACH: 'All floors',
  TOP: 'Top floor',
  EXT: 'External works',
};
export const FLOOR_NAMES = ['Ground floor', 'First floor', 'Second floor'];

// Catalogue of rate item codes the engine can ask for (structure of the BOQ, not values).
const b = (category, unit, group) => ({ category, unit, group });
export const BOQ_CATALOGUE = {
  S01: b('SITE', 'sqm', 'structure'), S02: b('SITE', 'cum', 'structure'), S03: b('SITE', 'cum', 'structure'),
  F01: b('FOUNDATION', 'cum', 'structure'), F02: b('FOUNDATION', 'cum', 'structure'),
  F03: b('FOUNDATION', 'sqm', 'structure'), F04: b('FOUNDATION', 'sqm', 'structure'),
  R01: b('SUPERSTRUCTURE', 'cum', 'structure'), R02: b('SUPERSTRUCTURE', 'kg', 'structure'),
  M01: b('MASONRY', 'cum', 'structure'), M02: b('MASONRY', 'cum', 'structure'), M03: b('MASONRY', 'rm', 'structure'),
  P01: b('PLASTER', 'sqm', 'structure'), P02: b('PLASTER', 'sqm', 'structure'), P03: b('PLASTER', 'sqm', 'structure'),
  FL01: b('FLOORING', 'sqm', 'finishing'), FL02: b('FLOORING', 'sqm', 'finishing'), FL03: b('FLOORING', 'set', 'finishing'),
  FL04: b('FLOORING', 'rm', 'finishing'), FL05: b('FLOORING', 'flight', 'finishing'),
  D01: b('OPENINGS', 'no', 'openings'), D02: b('OPENINGS', 'no', 'openings'), D03: b('OPENINGS', 'no', 'openings'),
  W01: b('OPENINGS', 'no', 'openings'), W02: b('OPENINGS', 'no', 'openings'),
  PT01: b('PAINTING', 'sqm', 'finishing'), PT02: b('PAINTING', 'sqm', 'finishing'), PT03: b('PAINTING', 'no', 'finishing'),
  E01: b('ELECTRICAL', 'pt', 'electrical'), E02: b('ELECTRICAL', 'no', 'electrical'),
  E03: b('ELECTRICAL', 'LS', 'electrical'), E04: b('ELECTRICAL', 'pt', 'electrical'),
  PL01: b('PLUMBING', 'set', 'plumbing'), PL02: b('PLUMBING', 'set', 'plumbing'), PL03: b('PLUMBING', 'rm', 'plumbing'),
  PL04: b('WATER', 'litre', 'plumbing'), PL05S: b('WATER', 'set', 'plumbing'),
  PL05M: b('WATER', 'set', 'plumbing'), PL05L: b('WATER', 'set', 'plumbing'),
};
export const ADDON_CATALOGUE_CODES = {
  ADD_WATERPROOF: 'sqm', ADD_FALSE_CEILING: 'sqm', ADD_POP: 'rm', ADD_MODULAR_KITCHEN: 'set',
  ADD_WARDROBE: 'no', ADD_ELEVATION: 'sqm', ADD_COMPOUND_WALL: 'rm', ADD_GATE: 'set',
  ADD_BOREWELL: 'LS', ADD_SOLAR_HEATER: 'no', ADD_RWH: 'no', ADD_LANDSCAPE: 'sqm', ADD_SECURITY: 'LS',
};
export const QUICK_CODES = {
  Q_STRUCT: 'sqm', Q_ELEC_POINT: 'point', Q_ELEC_WIRING_SQM: 'sqm', Q_BATH_SET: 'set', Q_KITCHEN_SET: 'set',
  Q_PIPING_RM: 'm', Q_FLOOR: 'sqm', Q_PAINT: 'sqm', Q_DOOR: 'no', Q_WINDOW: 'no',
};
export const ZERO_RATE_ALLOWED = ['Q_ELEC_WIRING_SQM'];
export const REQUIRED_RATE_UNITS = {
  ...Object.fromEntries(Object.entries(BOQ_CATALOGUE).map(([k, v]) => [k, v.unit])),
  ...ADDON_CATALOGUE_CODES,
  ...QUICK_CODES,
};
export const CEMENT_ITEM_CODES = ['F01', 'F02', 'R01', 'M01', 'M02', 'P01', 'P02', 'P03'];
export const STEEL_ITEM_CODE = 'R02';

export const MATERIALS = [
  { key: 'cement', material: 'cement_bag', label: 'Cement', unit: 'bags (50 kg)' },
  { key: 'steel', material: 'steel_kg', label: 'Steel', unit: 'kg' },
  { key: 'sand', material: 'sand_cum', label: 'Sand', unit: 'cum' },
  { key: 'aggregate', material: 'aggregate_cum', label: 'Aggregate', unit: 'cum' },
  { key: 'bricks', material: 'brick_no', label: 'Bricks / blocks', unit: 'nos' },
  { key: 'tiles', material: 'tile_sqm', label: 'Tiles', unit: 'sqm' },
  { key: 'paint', material: 'paint_litre', label: 'Paint', unit: 'litres' },
];

// Settings keys the public meta endpoint may expose
export const COOKIE_NAME = 'ccms_rt';
export const COOKIE_PATH = '/api/v1/auth';
export const LOCK_AFTER_FAILURES = 5;
export const LOCK_MINUTES = 15;
export const RESET_TOKEN_MINUTES = 30;
export const USER_CACHE_MS = 30_000;
export const MASTER_CACHE_MS = 10_000;
