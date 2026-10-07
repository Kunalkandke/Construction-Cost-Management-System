import { describe, it, expect } from 'vitest';
import { areaSchema, passwordSchema, registerSchema, stepValid } from '../src/lib/validators.js';

describe('validators mirror the backend rules', () => {
  const a = areaSchema({ minAreaSqm: 20, maxAreaSqm: 600 });
  it('area bounds 20-600 and max 2 decimals', () => {
    expect(a.safeParse(19).success).toBe(false);
    expect(a.safeParse(20).success).toBe(true);
    expect(a.safeParse(600).success).toBe(true);
    expect(a.safeParse(601).success).toBe(false);
    expect(a.safeParse(120.55).success).toBe(true);
    expect(a.safeParse(120.555).success).toBe(false);
    expect(a.safeParse(null).success).toBe(false);
  });
  it('password policy: 8+ chars, a letter and a number', () => {
    expect(passwordSchema.safeParse('abc12345').success).toBe(true);
    expect(passwordSchema.safeParse('abcdefgh').success).toBe(false);
    expect(passwordSchema.safeParse('12345678').success).toBe(false);
    expect(passwordSchema.safeParse('a1').success).toBe(false);
  });
  it('register needs matching passwords and accepted terms', () => {
    const base = { name: 'A', email: 'a@b.co', password: 'abc12345', confirm: 'abc12345', terms: true };
    expect(registerSchema.safeParse(base).success).toBe(true);
    expect(registerSchema.safeParse({ ...base, confirm: 'x' }).success).toBe(false);
    expect(registerSchema.safeParse({ ...base, terms: false }).success).toBe(false);
  });
  it('wizard steps are valid only when complete', () => {
    const w = { houseType: 'PLOT_HOUSE', floors: 'G+1', bhk: 2, builtUpAreaSqm: 120, qualityTier: 'STANDARD', locationId: 'x', structureType: 'RCC_FRAME' };
    expect(stepValid(1, w)).toBe(true);
    expect(stepValid(2, { ...w, houseType: 'FLAT', floors: null })).toBe(true);
    expect(stepValid(2, { ...w, floors: null })).toBe(false);
    expect(stepValid(4, w)).toBe(true);
    expect(stepValid(4, { ...w, builtUpAreaSqm: 19 })).toBe(false);
    expect(stepValid(4, { ...w, locationId: null })).toBe(false);
  });
});
