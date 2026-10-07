import { D, round, Decimal } from '../../../utils/money.js';
import { BOQ_CATALOGUE } from '../../../config/constants.js';
import { ApiError } from '../../../utils/ApiError.js';

const q3 = (x) => round(x, 3);

// Section 7.4 DETAILED BOQ. Every coefficient is a consumption norm (N) or a derived value.
export function buildDetailedLines(c) {
  const { d, N, steelKg, tpl } = c;
  const { Af, At, AtStruct, FF, P, floorCount, rooms, points, doors, windows, persons } = d;
  const share = D(tpl.includeFoundationShare);
  const L = [];
  const add = (code, qty, tag) => {
    const q = q3(qty);
    L.push({ code, category: BOQ_CATALOGUE[code].category, qty: q, tag });
    return q;
  };

  // Site and foundation (flats carry only their share of the foundation)
  add('S01', Af.times(N('N_SITE_CLEAR')).times(share), 'SITE');
  add('S02', Af.times(N('N_EXC_WORKING')).times(N('N_EXC_DEPTH_M')).times(c.soilF).times(share), 'SITE');
  add('S03', Af.times(N('N_PLINTH_FILL')).times(share), 'SITE');
  add('F01', Af.times(N('N_PCC')).times(share), 'SITE');
  const f02 = add('F02', Af.times(N('N_FOOT_RCC')).times(FF).times(share), 'SITE');
  add('F03', Af.times(N('N_DPC')).times(share), 'SITE');
  add('F04', Af.times(N('N_ANTITERMITE')).times(share), 'SITE');

  // Superstructure, masonry, plaster
  add('R01', AtStruct.times(N('N_RCC_SUPER')), 'EACH');
  add('R02', AtStruct.times(steelKg).plus(f02.times(N('N_FOOT_STEEL_KG_PER_CUM'))), 'EACH');
  add('M01', AtStruct.times(N('N_MAS_EXT')), 'EACH');
  add('M02', AtStruct.times(N('N_MAS_INT')), 'EACH');
  add('M03', P, 'TOP');
  const p01 = add('P01', AtStruct.times(N('N_PLASTER_INT')), 'EACH');
  const p02 = add('P02', AtStruct.times(N('N_PLASTER_CEIL')), 'EACH');
  const p03 = add('P03', P.times(N('N_STOREY_HT_M')).times(floorCount), 'EACH');

  // Flooring
  add('FL01', At.times(N('N_FLOOR_TILE')).times(N('N_WASTAGE')), 'EACH');
  add('FL02', D(rooms.bathrooms).times(N('N_BATH_TILE_SQM')).times(N('N_WASTAGE')), 'EACH');
  add('FL03', rooms.kitchens, 'EACH');
  add('FL04', At.times(N('N_SKIRT')), 'EACH');
  add('FL05', c.tpl.includeStaircase ? floorCount : 0, 'TOP');

  // Openings
  add('D01', 1, 'EACH');
  add('D02', Decimal.max(D(doors).minus(1).minus(rooms.bathrooms), 0), 'EACH');
  add('D03', rooms.bathrooms, 'EACH');
  add('W01', windows, 'EACH');
  add('W02', windows, 'EACH');

  // Painting
  add('PT01', p01.plus(p02), 'EACH');
  add('PT02', p03, 'EACH');
  add('PT03', doors + windows, 'EACH');

  // Electrical
  add('E01', points, 'EACH');
  add('E02', floorCount, 'EACH');
  add('E03', 1, 'EACH');
  add('E04', D(points).times(N('N_FIXTURE_SHARE')), 'EACH');

  // Plumbing and water
  add('PL01', rooms.bathrooms, 'EACH');
  add('PL02', rooms.kitchens, 'EACH');
  add('PL03', At.times(N('N_PIPE_RM')), 'EACH');
  if (tpl.includeOverheadTank) {
    const step = N('N_TANK_ROUND_L');
    const litres = Decimal.max(N('N_TANK_MIN_L'), D(persons).times(N('N_WATER_LPCD')).div(step).ceil().times(step));
    add('PL04', litres, 'TOP');
  }
  if (tpl.includeSeptic) {
    const code = persons <= N('N_SEPTIC_S_MAX_PERSONS').toNumber() ? 'PL05S'
      : persons <= N('N_SEPTIC_M_MAX_PERSONS').toNumber() ? 'PL05M' : 'PL05L';
    add(code, 1, 'EXT');
  }
  return L;
}

// Optional add-ons (Section 7.4 table). Shared by QUICK and DETAILED. Priced with the finishing multiplier.
export function buildAddonLines(c) {
  const { d, N, inp } = c;
  const { Af, At, P, rooms } = d;
  const out = [];
  for (const a of inp.addons) {
    const push = (qty, tag, desc) => out.push({ code: a.code, category: 'FINISHING', group: 'finishing', qty: q3(qty), tag, desc });
    switch (a.code) {
      case 'ADD_WATERPROOF':
        push(Af.times(N('N_WP_TERRACE')), 'TOP', 'Terrace waterproofing');
        push(D(rooms.bathrooms).times(N('N_WP_WET_BATH')).plus(D(rooms.kitchens).times(N('N_WP_WET_KIT'))), 'EACH', 'Wet-area waterproofing (bathrooms, kitchen)');
        break;
      case 'ADD_FALSE_CEILING':
        push(a.pct !== undefined ? At.times(a.pct).div(100) : At.times(N('N_FALSECEIL_SHARE')), 'EACH');
        break;
      case 'ADD_POP': push(At.times(N('N_POP_RM')), 'EACH'); break;
      case 'ADD_MODULAR_KITCHEN': push(rooms.kitchens, 'EACH'); break;
      case 'ADD_WARDROBE': push(rooms.bedrooms, 'EACH'); break;
      case 'ADD_ELEVATION':
        push(a.qty !== undefined ? a.qty : P.times(N('N_ELEV_HT_M')).times(N('N_ELEV_SHARE')), 'EACH');
        break;
      case 'ADD_COMPOUND_WALL': {
        const plot = inp.plotAreaSqm !== undefined ? D(inp.plotAreaSqm) : Af.times(N('N_COMPOUND_PLOT_FACTOR'));
        const len = D(4).times(plot.sqrt()).times(D(1).minus(N('N_COMPOUND_ROAD_DEDUCT')));
        push(a.qty !== undefined ? a.qty : len, 'EXT');
        break;
      }
      case 'ADD_GATE': push(1, 'EXT'); break;
      case 'ADD_BOREWELL': push(1, 'EXT'); break;
      case 'ADD_SECURITY': push(1, 'EXT'); break;
      case 'ADD_RWH': push(1, 'EXT'); break;
      case 'ADD_SOLAR_HEATER': push(1, 'TOP'); break;
      case 'ADD_LANDSCAPE':
        push(a.qty !== undefined ? a.qty : Af.times(N('N_LANDSCAPE_SHARE')), 'EXT');
        break;
      default:
        throw ApiError.internal(`Add-on ${a.code} has no quantity rule`);
    }
  }
  return out;
}
