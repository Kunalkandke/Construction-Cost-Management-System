import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Pencil, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '../../ui/Button';
import { GlassCard } from '../../ui/GlassCard';
import { SegmentedControl, Checkbox } from '../../ui/Form';
import { Banner } from '../../ui/Feedback';
import { useWizardStore } from '../../../store/wizardStore';
import { useUiStore } from '../../../store/uiStore';
import { useAuth } from '../../../hooks/useAuth';
import { estimatesApi } from '../../../api/estimates';
import { formatArea, titleCase } from '../../../lib/format';

export function Step6Review({ meta, goTo }) {
  const w = useWizardStore();
  const { isAuthed } = useAuth();
  const nav = useNavigate();
  const qc = useQueryClient();
  const setLastResult = useUiStore((s) => s.setLastResult);
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState('');
  const [errs, setErrs] = useState([]);
  const house = meta.houseTypes.find((h) => h.code === w.houseType)?.name;
  const loc = meta.locations.find((l) => l.id === w.locationId)?.displayName;
  const rows = [
    [1, 'House type', house], [2, 'Floors', w.houseType === 'FLAT' ? 'Single unit' : w.floors], [3, 'Configuration', `${w.bhk} BHK (${w.bhkMode === 'PER_FLOOR' ? 'rooms per floor' : 'whole house'})`],
    [4, 'Built-up area', `${formatArea(w.builtUpAreaSqm)} ${w.areaBasis === 'PER_FLOOR' && w.floors !== 'G' && w.houseType !== 'FLAT' ? 'per floor' : ''}`], [4, 'Quality', titleCase(w.qualityTier)],
    [4, 'Location', loc], [4, 'Structure', titleCase(w.structureType)], [4, 'Soil', titleCase(w.soilType)], [4, 'Start month', w.startMonth || 'Next month'],
    [5, 'Add-ons', w.addons.length ? w.addons.map((a) => meta.addons.find((x) => x.code === a.code)?.label || a.code).join(', ') : 'None'],
  ];
  const title = w.title || `${house} ${w.bhk}BHK ${w.houseType === 'FLAT' ? '' : w.floors}`.trim();

  const submit = async () => {
    setBusy(true); setErrs([]); setPhase('Reading rates...');
    const t1 = setTimeout(() => setPhase('Calculating...'), 700); const t2 = setTimeout(() => setPhase('Preparing insights...'), 1500);
    try {
      const input = w.toInput();
      if (isAuthed && w.saveToAccount) {
        const saved = w.editingId ? await estimatesApi.patch(w.editingId, { inputs: input, mode: w.mode, title }) : await estimatesApi.create(input, { title, mode: w.mode });
        qc.invalidateQueries({ queryKey: ['estimates'] }); qc.invalidateQueries({ queryKey: ['estimate', saved.id] });
        w.set({ editingId: null });
        nav(`/estimate/result?id=${saved.id}`);
      } else {
        const result = await estimatesApi.calculate(input, w.mode);
        setLastResult({ result, input, mode: w.mode });
        nav('/estimate/result');
      }
    } catch (e) {
      setErrs(e.details?.length ? e.details : [{ message: e.message }]);
      toast.error(e.message);
    } finally { clearTimeout(t1); clearTimeout(t2); setBusy(false); setPhase(''); }
  };

  return (
    <div className="space-y-6">
      <div><h2 className="text-2xl font-extrabold">Review and generate</h2><p className="text-ink-500">Check your choices, then generate a detailed estimate.</p></div>
      {errs.length > 0 && <Banner kind="danger" title="Please fix these and try again">{errs.map((e, i) => <p key={i}>{e.path ? `${e.path}: ` : ''}{e.message}</p>)}</Banner>}
      <GlassCard strong padding="p-0">
        <dl className="divide-y divide-ink-300/40">
          {rows.map(([step, k, v]) => (
            <div key={k} className="flex items-center justify-between gap-3 px-4 py-3">
              <dt className="text-sm text-ink-500">{k}</dt>
              <dd className="flex items-center gap-2 text-right text-sm font-semibold">{v}
                <button type="button" onClick={() => goTo(step)} className="rounded-lg p-2 text-brand-600 hover:bg-brand-50" aria-label={`Edit ${k}`}><Pencil className="h-4 w-4" /></button></dd>
            </div>
          ))}
        </dl>
      </GlassCard>
      <SegmentedControl label="Estimate mode" value={w.mode} onChange={(v) => w.set({ mode: v })} options={[{ value: 'DETAILED', label: 'Detailed (recommended)' }, { value: 'QUICK', label: 'Quick estimate' }]} />
      {isAuthed ? <Checkbox label="Save to my account" checked={w.saveToAccount} onChange={(e) => w.set({ saveToAccount: e.target.checked })} /> : <p className="text-sm text-ink-500">You can log in after generating to save and export your estimate.</p>}
      <Button size="lg" icon={Sparkles} onClick={submit} loading={busy} className="w-full sm:w-auto">{busy ? phase : 'Generate Estimate'}</Button>
      <p aria-live="polite" className="sr-only">{phase}</p>
    </div>
  );
}
