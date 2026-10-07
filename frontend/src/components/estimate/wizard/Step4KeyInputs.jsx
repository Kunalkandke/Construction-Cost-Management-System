import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Tile, TileGroup } from '../../ui/Tile';
import { Input, NumberInput, Select, SegmentedControl, Field } from '../../ui/Form';
import { Badge } from '../../ui/Feedback';
import { useWizardStore } from '../../../store/wizardStore';
import { useUiStore } from '../../../store/uiStore';
import { areaSchema } from '../../../lib/validators';
import { TIER_BULLETS } from '../../../lib/constants';
import { currentMonth, formatNumber, round2, sqftToSqm, sqmToSqft, formatINR } from '../../../lib/format';

function AreaInput({ meta }) {
  const w = useWizardStore();
  const { areaUnit, setAreaUnit } = useUiStore();
  const lim = meta.limits;
  const toDisplay = (sqm) => (sqm === null || sqm === undefined ? null : areaUnit === 'sqft' ? sqmToSqft(sqm) : sqm);
  const [shown, setShown] = useState(toDisplay(w.builtUpAreaSqm));
  useEffect(() => { setShown(toDisplay(w.builtUpAreaSqm)); /* converts the value instead of resetting it */ // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [areaUnit]);
  const change = (n) => { setShown(n); w.set({ builtUpAreaSqm: n === null ? null : areaUnit === 'sqft' ? sqftToSqm(n) : round2(n) }); };
  const err = w.builtUpAreaSqm !== null && !areaSchema(lim).safeParse(w.builtUpAreaSqm).success
    ? `Built-up area must be between ${lim.minAreaSqm} and ${lim.maxAreaSqm} sqm (${formatNumber(sqmToSqft(lim.minAreaSqm))} to ${formatNumber(sqmToSqft(lim.maxAreaSqm))} sqft)` : undefined;
  const floorCount = meta.floorOptions.find((f) => f.code === w.floors)?.floorCount || 1;
  const multi = floorCount > 1 && w.houseType !== 'FLAT';
  const cfg = meta.bhkConfigs.find((b) => b.bhk === w.bhk);
  const perFloor = w.builtUpAreaSqm ? (w.areaBasis === 'TOTAL' ? w.builtUpAreaSqm / floorCount : w.builtUpAreaSqm) : null;
  const total = w.builtUpAreaSqm ? (w.areaBasis === 'TOTAL' || !multi ? w.builtUpAreaSqm : w.builtUpAreaSqm * floorCount) : null;
  const unusual = cfg && perFloor && !err && (perFloor < cfg.typicalMinSqm / (w.bhkMode === 'WHOLE_HOUSE' ? floorCount : 1) || perFloor > cfg.typicalMaxSqm);
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
        <NumberInput label="Built-up area" required value={shown} onChange={change} suffix={areaUnit} error={err} placeholder={areaUnit === 'sqm' ? 'e.g. 120' : 'e.g. 1300'} hint={multi ? (w.areaBasis === 'PER_FLOOR' ? 'Area of each floor' : 'Total area of all floors') : 'Covered area including wall thickness'} />
        <SegmentedControl label="Unit" value={areaUnit} onChange={setAreaUnit} options={[{ value: 'sqm', label: 'sqm' }, { value: 'sqft', label: 'sqft' }]} />
      </div>
      {multi && <SegmentedControl label="The area I entered is" value={w.areaBasis} onChange={(v) => w.set({ areaBasis: v })} options={[{ value: 'PER_FLOOR', label: 'Per floor' }, { value: 'TOTAL', label: 'Total of all floors' }]} />}
      {total && !err && <p className="text-sm text-ink-700" aria-live="polite">Total built-up area: <b className="num">{formatNumber(total, 1)} sqm</b> ({formatNumber(sqmToSqft(total))} sqft)</p>}
      {unusual && <Badge tone="warning" icon={AlertTriangle}>Unusual for a {cfg.bhk} BHK. You can continue, but please re-check.</Badge>}
    </div>
  );
}

function LocationPicker({ meta, value, onChange }) {
  const [q, setQ] = useState('');
  const groups = useMemo(() => {
    const f = meta.locations.filter((l) => l.displayName.toLowerCase().includes(q.toLowerCase()) || l.district.toLowerCase().includes(q.toLowerCase()));
    return f.reduce((acc, l) => { (acc[l.district] ||= []).push(l); return acc; }, {});
  }, [meta.locations, q]);
  return (
    <div className="space-y-2">
      <Input label="City / Taluka" required placeholder="Search city or district" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search locations" />
      <Select aria-label="Select location" value={value || ''} onChange={(e) => onChange(e.target.value)} placeholder="Select location">
        {Object.entries(groups).map(([district, ls]) => <optgroup key={district} label={district}>{ls.map((l) => <option key={l.id} value={l.id}>{l.displayName}</option>)}</optgroup>)}
      </Select>
    </div>
  );
}

export function Step4KeyInputs({ meta }) {
  const w = useWizardStore();
  const floorCount = meta.floorOptions.find((f) => f.code === w.floors)?.floorCount || 1;
  const lb = meta.structureTypes.find((s) => s.code === 'LOAD_BEARING');
  const lbBlocked = w.houseType === 'FLAT' ? 'Flats must use an RCC frame.' : lb && floorCount > lb.maxFloorCount ? `Load-bearing allows at most ${lb.maxFloorCount} floors.` : null;
  useEffect(() => { if (!w.locationId && meta.locations.length) w.set({ locationId: (meta.locations.find((l) => l.displayName.startsWith('Chhatrapati')) || meta.locations[0]).id }); }, [meta.locations]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (lbBlocked && w.structureType === 'LOAD_BEARING') w.set({ structureType: 'RCC_FRAME' }); }, [lbBlocked]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-extrabold">The key details</h2>
        <p className="text-ink-500">Only four things to enter: area, quality, location and structure.</p>
      </div>
      <AreaInput meta={meta} />
      <div>
        <p className="mb-2 text-sm font-medium text-ink-700">Quality tier <span className="text-danger" aria-hidden>*</span></p>
        <TileGroup label="Quality tier" className="grid gap-3 md:grid-cols-3">
          {meta.qualityTiers.map((t) => (
            <Tile key={t.code} title={t.name} helper={t.description} selected={w.qualityTier === t.code} onSelect={() => w.set({ qualityTier: t.code })}>
              <ul className="mt-2 list-disc space-y-0.5 pl-4 text-xs text-ink-700">{TIER_BULLETS[t.code]?.map((b) => <li key={b}>{b}</li>)}</ul>
              <span className="mt-2 block text-xs text-ink-500">Typical range: {formatINR(t.benchmarkMinPerSqft)} - {formatINR(t.benchmarkMaxPerSqft)} / sqft</span>
            </Tile>
          ))}
        </TileGroup>
      </div>
      <LocationPicker meta={meta} value={w.locationId} onChange={(id) => w.set({ locationId: id })} />
      <div>
        <SegmentedControl label="Structure type" value={w.structureType} onChange={(v) => w.set({ structureType: v })}
          options={meta.structureTypes.map((s) => ({ value: s.code, label: s.code === 'RCC_FRAME' ? 'RCC frame (recommended)' : s.name, disabled: s.code === 'LOAD_BEARING' && Boolean(lbBlocked), hint: s.code === 'LOAD_BEARING' ? lbBlocked || undefined : undefined }))} />
        {lbBlocked && <p className="mt-1 text-xs text-ink-500">{lbBlocked}</p>}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Select label="Soil type (optional)" value={w.soilType} onChange={(e) => w.set({ soilType: e.target.value })}
          options={[{ value: 'MEDIUM', label: 'I do not know (assume medium)' }, { value: 'HARD', label: 'Hard (rocky / murum)' }, { value: 'SOFT', label: 'Soft (black cotton / loose)' }]} hint="A soil test gives the best answer." />
        <Field label="Project start month (optional)" id="start-month" hint="Used for the escalation forecast">
          <input id="start-month" type="month" min={currentMonth()} value={w.startMonth} onChange={(e) => w.set({ startMonth: e.target.value })} className="glass-input" />
        </Field>
      </div>
    </div>
  );
}
