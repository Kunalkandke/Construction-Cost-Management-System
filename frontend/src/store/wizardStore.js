import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export const WIZARD_DEFAULTS = {
  houseType: null, floors: null, bhk: null, bhkMode: 'WHOLE_HOUSE', builtUpAreaSqm: null, areaBasis: 'PER_FLOOR',
  qualityTier: 'STANDARD', locationId: null, structureType: 'RCC_FRAME', soilType: 'MEDIUM', startMonth: '',
  addons: [], plotAreaSqm: null, includeSoftCosts: false, includeGst: false,
  mode: 'DETAILED', saveToAccount: true, editingId: null, title: '', currentStep: 1,
};

const clean = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== null && v !== undefined && v !== ''));

export const useWizardStore = create(
  persist(
    (set, get) => ({
      ...WIZARD_DEFAULTS,
      set: (patch) => set(patch),
      reset: () => set({ ...WIZARD_DEFAULTS }),
      // Prefill from a stored estimate's inputs (Edit inputs / budget planner / duplicate flows)
      load: (inputs, extra = {}) => set({ ...WIZARD_DEFAULTS, ...inputs, startMonth: inputs.startMonth || '', plotAreaSqm: inputs.plotAreaSqm ?? null, ...extra }),
      toggleAddon: (code) => {
        const list = get().addons;
        set({ addons: list.some((a) => a.code === code) ? list.filter((a) => a.code !== code) : [...list, { code }] });
      },
      patchAddon: (code, patch) => set({ addons: get().addons.map((a) => (a.code === code ? { ...a, ...patch } : a)) }),
      // The exact EstimateInput the API expects (Section 7.1)
      toInput: () => {
        const w = get();
        const input = {
          houseType: w.houseType, floors: w.houseType === 'FLAT' ? 'G' : w.floors, bhk: w.bhk, bhkMode: w.bhkMode,
          builtUpAreaSqm: w.builtUpAreaSqm, areaBasis: w.areaBasis, qualityTier: w.qualityTier, locationId: w.locationId,
          structureType: w.structureType, soilType: w.soilType, startMonth: w.startMonth,
          addons: w.addons.map((a) => clean({ code: a.code, qty: a.qty, pct: a.pct })),
          plotAreaSqm: w.plotAreaSqm, includeSoftCosts: w.includeSoftCosts, includeGst: w.includeGst,
        };
        return clean(input);
      },
    }),
    {
      name: 'ccms-wizard',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (s) => Object.fromEntries(Object.entries(s).filter(([, v]) => typeof v !== 'function')),
    },
  ),
);
