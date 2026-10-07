import { D, round } from '../../../utils/money.js';

const q3 = (x) => round(x, 3);

// Section 7.4 QUICK mode: composite rates, reference-parity formulas.
export function buildQuickLines(c) {
  const { d, N } = c;
  const { At, AtStruct, rooms, points, doors, windows } = d;
  const L = [];
  const add = (code, category, qty) => L.push({ code, category, qty: q3(qty), tag: 'EACH' });
  add('Q_STRUCT', 'STRUCTURE', AtStruct);
  add('Q_ELEC_POINT', 'ELECTRICAL', points);
  add('Q_ELEC_WIRING_SQM', 'ELECTRICAL', At);
  add('Q_BATH_SET', 'PLUMBING', rooms.bathrooms);
  add('Q_KITCHEN_SET', 'PLUMBING', rooms.kitchens);
  add('Q_PIPING_RM', 'PLUMBING', At.times(N('Q_PIPING_FACTOR')));
  add('Q_FLOOR', 'FLOORING', At.times(N('Q_WASTAGE')));
  add('Q_PAINT', 'PAINTING', At.times(N('Q_SURFACE_FACTOR')));
  add('Q_DOOR', 'OPENINGS', doors);
  add('Q_WINDOW', 'OPENINGS', windows);
  return L;
}
