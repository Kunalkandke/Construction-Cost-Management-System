import { describe, it, expect } from 'vitest';
import { formatINR, formatINRCompact, formatMonth, sqftToSqm, sqmToSqft, formatNumber } from '../src/lib/format.js';

describe('Indian number formatting (U9)', () => {
  it('uses lakh/crore grouping with the rupee sign', () => {
    expect(formatINR(1949420).replace(/\s/g, '')).toBe('₹19,49,420');
    expect(formatINR(1754500).replace(/\s/g, '')).toBe('₹17,54,500');
    expect(formatINR(755).replace(/\s/g, '')).toBe('₹755');
    expect(formatNumber(12345678)).toBe('1,23,45,678');
  });
  it('compact form uses L and Cr', () => {
    expect(formatINRCompact(1949420)).toBe('19.49 L');
    expect(formatINRCompact(12000000)).toBe('1.2 Cr');
  });
  it('handles missing values', () => { expect(formatINR(null)).toBe('-'); expect(formatINR(undefined)).toBe('-'); });
  it('sqft toggle converts both ways without drifting', () => {
    expect(sqmToSqft(240)).toBe(2583.34);
    expect(sqftToSqm(2583.34)).toBe(240);
    expect(sqftToSqm(sqmToSqft(120))).toBe(120);
  });
  it('formats months', () => { expect(formatMonth('2027-06')).toBe('Jun 2027'); });
});
