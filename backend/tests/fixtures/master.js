// Test fixtures mirroring sql/004 and sql/005 seeds (Appendix A). Values are illustrative.
export const BASE_LOC = '00000000-0000-4000-8000-000000000001';
export const PUNE_LOC = '00000000-0000-4000-8000-000000000002';
const T = (v) => ({ basic: v, standard: v, premium: v });

const tpl = (o) => ({ includeFoundationShare: 1, includeCompoundWall: false, includeSeptic: true, includeOverheadTank: true, includeStaircase: true, commonAreaLoad: 1, ...o });

export const master = {
  houseTypes: [
    { code: 'PLOT_HOUSE', name: 'Plot House', is_active: true, template: tpl({}) },
    { code: 'ROW_HOUSE', name: 'Row House', is_active: true, template: tpl({}) },
    { code: 'FLAT', name: 'Flat', is_active: true, template: tpl({ includeFoundationShare: 0.4, includeSeptic: false, includeOverheadTank: false, includeStaircase: false }) },
    { code: 'BUNGALOW', name: 'Bungalow', is_active: true, template: tpl({ includeCompoundWall: true }) },
  ],
  floorOptions: [
    { code: 'G', floor_count: 1, floor_factor_foundation: 1.0, is_active: true },
    { code: 'G+1', floor_count: 2, floor_factor_foundation: 1.25, is_active: true },
    { code: 'G+2', floor_count: 3, floor_factor_foundation: 1.5, is_active: true },
  ],
  bhkConfigs: [
    [1, 1, 1, 1, 1, 1, 24, 4, 5, 3, 25, 70], [2, 2, 1, 1, 2, 1, 40, 6, 8, 5, 45, 120], [3, 3, 1, 1, 3, 2, 58, 8, 11, 7, 80, 200],
    [4, 4, 1, 1, 4, 2, 76, 10, 14, 9, 120, 300], [5, 5, 1, 1, 5, 3, 96, 12, 17, 11, 180, 450],
  ].map(([bhk, bedrooms, halls, kitchens, bathrooms, balconies, electrical_points, doors, windows, persons, typical_min_sqm, typical_max_sqm]) => (
    { bhk, bedrooms, halls, kitchens, bathrooms, balconies, electrical_points, doors, windows, persons, typical_min_sqm, typical_max_sqm })),
  tiers: [
    { code: 'BASIC', multipliers: { structure: 0.95, finishing: 0.85, electrical: 0.9, plumbing: 0.85, openings: 0.85 }, steel_kg_per_sqm: 38, benchmark_min_per_sqft: 1400, benchmark_max_per_sqft: 1800 },
    { code: 'STANDARD', multipliers: { structure: 1, finishing: 1, electrical: 1, plumbing: 1, openings: 1 }, steel_kg_per_sqm: 42, benchmark_min_per_sqft: 1800, benchmark_max_per_sqft: 2300 },
    { code: 'PREMIUM', multipliers: { structure: 1.08, finishing: 1.4, electrical: 1.25, plumbing: 1.45, openings: 1.4 }, steel_kg_per_sqm: 48, benchmark_min_per_sqft: 2400, benchmark_max_per_sqft: 3500 },
  ],
  structureTypes: [
    { code: 'RCC_FRAME', name: 'RCC Frame', max_floor_count: 3, cost_multiplier: 1, norm_overrides: {} },
    { code: 'LOAD_BEARING', name: 'Load-bearing', max_floor_count: 2, cost_multiplier: 1, norm_overrides: { N_RCC_SUPER: 0.8, steelKg: 0.85, N_MAS_EXT: 1.15 } },
  ],
  locations: [
    { id: BASE_LOC, display_name: 'Chhatrapati Sambhajinagar', cost_index: 1.0, lead_lift_factor: 1.0, is_active: true },
    { id: PUNE_LOC, display_name: 'Pune', cost_index: 1.12, lead_lift_factor: 1.02, is_active: true },
  ],
  norms: {
    ...Object.fromEntries(Object.entries({
      N_SITE_CLEAR: 1.3, N_EXC_WORKING: 1.1, N_EXC_DEPTH_M: 1.2, N_PLINTH_FILL: 0.45, N_PCC: 0.05, N_FOOT_RCC: 0.14,
      N_FOOT_STEEL_KG_PER_CUM: 80, N_DPC: 0.35, N_ANTITERMITE: 1, N_RCC_SUPER: 0.16, N_MAS_EXT: 0.12, N_MAS_INT: 0.05,
      N_EXT_PERIM_FACTOR: 1.1, N_STOREY_HT_M: 3, N_PLASTER_INT: 1.8, N_PLASTER_CEIL: 0.9, N_FLOOR_TILE: 0.8, N_WASTAGE: 1.05,
      N_BATH_TILE_SQM: 18, N_SKIRT: 0.6, N_PIPE_RM: 0.5, N_WP_TERRACE: 1.05, N_WP_WET_BATH: 8, N_WP_WET_KIT: 4,
      N_FALSECEIL_SHARE: 0.35, N_POP_RM: 0.5, N_ELEV_HT_M: 3, N_ELEV_SHARE: 0.25, N_WATER_LPCD: 135, N_TANK_MIN_L: 1000,
      N_TANK_ROUND_L: 500, N_SEPTIC_S_MAX_PERSONS: 8, N_SEPTIC_M_MAX_PERSONS: 15, N_LANDSCAPE_SHARE: 0.3,
      N_COMPOUND_PLOT_FACTOR: 2.5, N_COMPOUND_ROAD_DEDUCT: 0.25, Q_WASTAGE: 1.05, Q_SURFACE_FACTOR: 2.75, Q_PIPING_FACTOR: 0.5,
      SCH_BASE: 3, SCH_PER_SQM: 0.015, SCH_FLOOR_FACTOR_1: 1, SCH_FLOOR_FACTOR_2: 1.1, SCH_FLOOR_FACTOR_3: 1.2,
    }).map(([k, v]) => [k, T(v)])),
    N_FIXTURE_SHARE: { basic: 0.5, standard: 0.6, premium: 0.8 },
    SCH_TIER_FACTOR: { basic: 0.95, standard: 1, premium: 1.15 },
  },
  materialCoefficients: [
    ['F01', 'cement_bag', 4.4], ['F01', 'sand_cum', 0.45], ['F01', 'aggregate_cum', 0.9],
    ['F02', 'cement_bag', 6.4], ['F02', 'sand_cum', 0.45], ['F02', 'aggregate_cum', 0.9],
    ['R01', 'cement_bag', 6.4], ['R01', 'sand_cum', 0.45], ['R01', 'aggregate_cum', 0.9],
    ['M01', 'cement_bag', 1.2], ['M01', 'sand_cum', 0.28], ['M01', 'brick_no', 500],
    ['M02', 'cement_bag', 1.2], ['M02', 'sand_cum', 0.28], ['M02', 'brick_no', 500],
    ['R02', 'steel_kg', 1], ['FL01', 'tile_sqm', 1], ['PT01', 'paint_litre', 0.17],
  ].map(([item_code, material, per_unit]) => ({ item_code, material, per_unit })),
  verifiedActualsCount: 0,
};

export const settings = {
  contingency_percent: 10, accuracy_band_percent: 10, dynamic_band: { enabled: false, min: 6, max: 20, step: 2 },
  default_escalation_percent: 6, blended_wage_per_manday: 800, soft_cost_percent: 5, gst_percent: 18, gst_enabled: false,
  soil_depth_factors: { HARD: 0.9, MEDIUM: 1, SOFT: 1.25 }, calibration_min_projects: 10, rates_verified: false,
  labour_pct_by_category: { STRUCTURE: 35, ELECTRICAL: 30, PLUMBING: 30, FLOORING: 30, PAINTING: 45, OPENINGS: 15, FINISHING: 30 },
  area_limits_sqm: { min: 20, max: 600 }, low_density_sqm_per_bedroom: 70, fallback_share_threshold_percent: 20,
  escalation_config: { minPoints: 6, minSpanMonths: 12, clampMinPct: 0, clampMaxPct: 25 },
  escalation_items: { structure: ['R01', 'R02', 'M01'], finishing: ['FL01', 'PT01'], electrical: ['E01'], plumbing: ['PL01'], openings: ['D02', 'W01'] },
  sensitivity_config: { steelPct: 10, cementPct: 10, labourPct: 10, flooringPct: 15, areaPct: 5 },
  budget_planner_config: { maxIterations: 30, tolerancePct: 0.5, minIntervalSqm: 0.1 },
  disclaimer_text: 'Planning-level estimate only.',
  stage_templates: {
    DEFAULT: [[ 'Excavation and foundation', 15, 0, 0.14], ['Plinth and DPC', 10, 0.14, 0.24], ['Ground-floor columns and slab', 15, 0.24, 0.4], ['Upper floors and roof slabs', 15, 0.4, 0.55], ['Masonry', 10, 0.5, 0.68], ['Plaster and MEP rough-in', 15, 0.62, 0.8], ['Flooring, doors and windows', 10, 0.75, 0.92], ['Painting, fixtures and finishing', 10, 0.85, 1]].map(([name, pct, start, end]) => ({ name, pct, start, end })),
    SINGLE_FLOOR: [['Excavation and foundation', 15, 0, 0.14], ['Plinth and DPC', 10, 0.14, 0.24], ['Columns and roof slab', 30, 0.24, 0.55], ['Masonry', 10, 0.5, 0.68], ['Plaster and MEP rough-in', 15, 0.62, 0.8], ['Flooring, doors and windows', 10, 0.75, 0.92], ['Painting, fixtures and finishing', 10, 0.85, 1]].map(([name, pct, start, end]) => ({ name, pct, start, end })),
    FLAT: [['Structure and slab works', 40, 0, 0.4], ['Upper floors and roof slabs', 15, 0.4, 0.55], ['Masonry', 10, 0.5, 0.68], ['Plaster and MEP rough-in', 15, 0.62, 0.8], ['Flooring, doors and windows', 10, 0.75, 0.92], ['Painting, fixtures and finishing', 10, 0.85, 1]].map(([name, pct, start, end]) => ({ name, pct, start, end })),
  },
  addon_catalogue: [
    ['ADD_WATERPROOF', 0, 0], ['ADD_FALSE_CEILING', 0, 1], ['ADD_POP', 0, 0], ['ADD_MODULAR_KITCHEN', 0, 0], ['ADD_WARDROBE', 0, 0],
    ['ADD_ELEVATION', 1, 0], ['ADD_COMPOUND_WALL', 1, 0], ['ADD_GATE', 0, 0], ['ADD_BOREWELL', 0, 0], ['ADD_SOLAR_HEATER', 0, 0],
    ['ADD_RWH', 0, 0], ['ADD_LANDSCAPE', 1, 0], ['ADD_SECURITY', 0, 0],
  ].map(([code, q, p]) => ({ code, label: code, allowsQty: !!q, allowsPct: !!p })),
};

const row = (set, code, base, labour, group, extra = {}) => [code, { item_code: code, base_rate: base, dsr_rate: null, source: 'CUSTOM', labour_pct: labour, lead_lift_applied: false, group, unit: 'x', description: code, is_active: true, ...extra }];

export const sampleRates = {
  rateSet: { id: 'rs-sample', name: 'SAMPLE-FIXTURE', fiscal_year: '2026-27', is_verified: false, effective_from: '2026-04-01' },
  items: Object.fromEntries([
    row(0, 'Q_STRUCT', 4500, 35, 'structure'), row(0, 'Q_ELEC_POINT', 1400, 30, 'electrical'), row(0, 'Q_ELEC_WIRING_SQM', 0, 30, 'electrical'),
    row(0, 'Q_BATH_SET', 45000, 30, 'plumbing'), row(0, 'Q_KITCHEN_SET', 25000, 30, 'plumbing'), row(0, 'Q_PIPING_RM', 250, 30, 'plumbing'),
    row(0, 'Q_FLOOR', 950, 30, 'finishing'), row(0, 'Q_PAINT', 180, 45, 'finishing'), row(0, 'Q_DOOR', 12500, 15, 'openings'), row(0, 'Q_WINDOW', 7250, 15, 'openings'),
  ]),
};

const demo = [
  ['S01', 45, 90, 'structure'], ['S02', 320, 90, 'structure'], ['S03', 280, 85, 'structure'], ['F01', 5800, 30, 'structure'], ['F02', 9200, 28, 'structure'],
  ['F03', 260, 35, 'structure'], ['F04', 95, 40, 'structure'], ['R01', 10500, 28, 'structure'], ['R02', 78, 14, 'structure'], ['M01', 7400, 35, 'structure'],
  ['M02', 7100, 38, 'structure'], ['M03', 1150, 40, 'structure'], ['P01', 310, 48, 'structure'], ['P02', 290, 50, 'structure'], ['P03', 420, 50, 'structure'],
  ['FL01', 1150, 28, 'finishing'], ['FL02', 1350, 35, 'finishing'], ['FL03', 38000, 25, 'finishing'], ['FL04', 140, 40, 'finishing'], ['FL05', 35000, 35, 'finishing'],
  ['D01', 28000, 12, 'openings'], ['D02', 11000, 15, 'openings'], ['D03', 6500, 15, 'openings'], ['W01', 9500, 15, 'openings'], ['W02', 4200, 35, 'openings'],
  ['PT01', 72, 50, 'finishing'], ['PT02', 95, 50, 'finishing'], ['PT03', 1100, 65, 'finishing'], ['E01', 1400, 30, 'electrical'], ['E02', 4800, 20, 'electrical'],
  ['E03', 28000, 30, 'electrical'], ['E04', 900, 12, 'electrical'], ['PL01', 48000, 22, 'plumbing'], ['PL02', 18000, 25, 'plumbing'], ['PL03', 280, 35, 'plumbing'],
  ['PL04', 12, 20, 'plumbing'], ['PL05S', 55000, 40, 'plumbing'], ['PL05M', 85000, 40, 'plumbing'], ['PL05L', 130000, 40, 'plumbing'],
  ['ADD_WATERPROOF', 480, 40, 'finishing'], ['ADD_FALSE_CEILING', 85, 40, 'finishing'], ['ADD_POP', 120, 45, 'finishing'], ['ADD_MODULAR_KITCHEN', 140000, 25, 'finishing'],
  ['ADD_WARDROBE', 45000, 25, 'finishing'], ['ADD_ELEVATION', 1800, 35, 'finishing'], ['ADD_COMPOUND_WALL', 4500, 40, 'finishing'], ['ADD_GATE', 65000, 30, 'finishing'],
  ['ADD_BOREWELL', 110000, 30, 'finishing'], ['ADD_SOLAR_HEATER', 38000, 15, 'finishing'], ['ADD_RWH', 40000, 40, 'finishing'], ['ADD_LANDSCAPE', 650, 50, 'finishing'],
  ['ADD_SECURITY', 55000, 20, 'finishing'],
  ['Q_STRUCT', 9200, 35, 'structure'], ['Q_ELEC_POINT', 1400, 30, 'electrical'], ['Q_ELEC_WIRING_SQM', 0, 30, 'electrical'], ['Q_BATH_SET', 48000, 30, 'plumbing'],
  ['Q_KITCHEN_SET', 18000, 30, 'plumbing'], ['Q_PIPING_RM', 280, 30, 'plumbing'], ['Q_FLOOR', 1150, 30, 'finishing'], ['Q_PAINT', 190, 45, 'finishing'],
  ['Q_DOOR', 14000, 15, 'openings'], ['Q_WINDOW', 9500, 15, 'openings'],
];
export const makeDemoRates = () => ({
  rateSet: { id: 'rs-demo', name: 'DEMO-2026-27', fiscal_year: '2026-27', is_verified: false, effective_from: '2026-04-01' },
  items: Object.fromEntries(demo.map(([c, b, l, g]) => row(0, c, b, l, g))),
});
export const makeSampleRates = () => JSON.parse(JSON.stringify(sampleRates));
