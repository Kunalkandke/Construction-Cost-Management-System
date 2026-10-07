import Decimal from 'decimal.js';

// Section 7.9: precision 20, ROUND_HALF_UP globally.
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

export { Decimal };
export const D = (v) => (Decimal.isDecimal(v) ? v : new Decimal(v));
export const round = (v, dp = 0) => D(v).toDecimalPlaces(dp, Decimal.ROUND_HALF_UP);
export const roundTo100 = (v) => round(D(v).div(100), 0).times(100);
export const num = (v) => D(v).toNumber();
export const sumD = (arr) => arr.reduce((a, b) => a.plus(b), new Decimal(0));
