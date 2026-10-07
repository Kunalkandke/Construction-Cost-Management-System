import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { AlertTriangle, ArrowRight } from 'lucide-react';
import { Seo } from '../../components/layout/Seo';
import { GlassCard } from '../../components/ui/GlassCard';
import { Button } from '../../components/ui/Button';
import { NumberInput, Select, SegmentedControl } from '../../components/ui/Form';
import { Banner, ErrorState, Skeleton } from '../../components/ui/Feedback';
import { GroupedBars } from '../../components/charts/TierBars';
import { estimatesApi } from '../../api/estimates';
import { useMeta } from '../../hooks/useMeta';
import { useWizardStore } from '../../store/wizardStore';
import { budgetSchema } from '../../lib/validators';
import { formatINR, formatNumber, titleCase } from '../../lib/format';

export default function BudgetPlanner() {
  const { data: meta, isLoading, error, refetch } = useMeta();
  const nav = useNavigate();
  const wiz = useWizardStore();
  const [f, setF] = useState({ budget: null, houseType: 'PLOT_HOUSE', floors: 'G+1', bhk: 2, locationId: '', structureType: 'RCC_FRAME' });
  const [err, setErr] = useState('');
  const run = useMutation({ mutationFn: (b) => estimatesApi.budgetPlan(b) });
  if (error) return <div className="container-page py-10"><ErrorState error={error} onRetry={refetch} /></div>;
  if (isLoading || !meta) return <div className="container-page max-w-3xl space-y-3 py-10"><Skeleton className="h-10" /><Skeleton className="h-64" /></div>;
  const locationId = f.locationId || (meta.locations.find((l) => l.displayName.startsWith('Chhatrapati')) || meta.locations[0]).id;
  const flat = f.houseType === 'FLAT';
  const floorCount = meta.floorOptions.find((o) => o.code === (flat ? 'G' : f.floors))?.floorCount || 1;
  const lb = meta.structureTypes.find((s) => s.code === 'LOAD_BEARING');
  const lbBlocked = flat || (lb && floorCount > lb.maxFloorCount);

  const submit = (e) => {
    e.preventDefault();
    const v = budgetSchema.safeParse({ budget: f.budget });
    if (!v.success) { setErr(v.error.issues[0].message); return; }
    setErr('');
    run.mutate({ budget: f.budget, houseType: f.houseType, floors: flat ? 'G' : f.floors, bhk: f.bhk, locationId, structureType: lbBlocked ? 'RCC_FRAME' : f.structureType });
  };
  const tiers = run.data?.tiers || [];
  const create = (t) => {
    const h = meta.houseTypes.find((x) => x.code === f.houseType);
    wiz.load({ houseType: f.houseType, floors: flat ? 'G' : f.floors, bhk: f.bhk, builtUpAreaSqm: t.maxAreaSqm, areaBasis: 'PER_FLOOR', qualityTier: t.tier, locationId, structureType: lbBlocked ? 'RCC_FRAME' : f.structureType, addons: (h?.template?.defaultAddons || []).map((code) => ({ code })) }, { currentStep: 4 });
    nav('/estimate?step=4');
  };
  return (
    <div className="container-page max-w-4xl space-y-6 py-10">
      <Seo title="Budget planner" description="Enter your budget and see how much built-up area you can afford in each quality tier." />
      <div><h1 className="text-4xl font-extrabold">Budget planner</h1><p className="text-ink-500">Tell us your budget. We work backwards to the largest home you can build in each quality tier.</p></div>
      <GlassCard strong>
        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2" noValidate>
          <NumberInput fieldClass="sm:col-span-2" label="Total budget" required group decimal={false} value={f.budget} onChange={(n) => setF({ ...f, budget: n })} suffix="INR" error={err} hint="For example 25,00,000" />
          <Select label="House type" value={f.houseType} onChange={(e) => setF({ ...f, houseType: e.target.value })} options={meta.houseTypes.map((h) => ({ value: h.code, label: h.name }))} />
          {!flat && <Select label="Floors" value={f.floors} onChange={(e) => setF({ ...f, floors: e.target.value })} options={meta.floorOptions.map((o) => ({ value: o.code, label: o.code }))} />}
          <Select label="Bedrooms" value={f.bhk} onChange={(e) => setF({ ...f, bhk: Number(e.target.value) })} options={meta.bhkConfigs.map((b) => ({ value: b.bhk, label: `${b.bhk} BHK` }))} />
          <Select label="Location" value={locationId} onChange={(e) => setF({ ...f, locationId: e.target.value })} options={meta.locations.map((l) => ({ value: l.id, label: l.displayName }))} />
          <SegmentedControl className="sm:col-span-2" label="Structure" value={lbBlocked ? 'RCC_FRAME' : f.structureType} onChange={(v) => setF({ ...f, structureType: v })} options={meta.structureTypes.map((s) => ({ value: s.code, label: s.name, disabled: s.code === 'LOAD_BEARING' && lbBlocked }))} />
          <div className="sm:col-span-2"><Button type="submit" size="lg" loading={run.isPending}>Plan my budget</Button></div>
        </form>
      </GlassCard>
      {run.error && <Banner kind="danger">{run.error.message}</Banner>}
      {run.isPending && <Skeleton className="h-48" />}
      {tiers.length > 0 && (
        <section aria-live="polite" className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            {tiers.map((t) => (
              <GlassCard key={t.tier} strong>
                <h2 className="text-lg font-bold">{titleCase(t.tier)}</h2>
                {t.feasible ? (<>
                  <p className="num mt-2 font-display text-3xl text-brand-700">{formatNumber(t.maxAreaSqm, 1)} sqm</p>
                  <p className="text-sm text-ink-500">per floor ({formatNumber(t.totalAreaSqft)} sqft in total)</p>
                  <p className="mt-2 text-sm">About <b className="num">{formatINR(t.costPerSqft)}</b> per sqft, total <b className="num">{formatINR(t.grandTotal)}</b></p>
                  <Button size="sm" className="mt-3 w-full" icon={ArrowRight} onClick={() => create(t)}>Create detailed estimate</Button>
                </>) : (
                  <div className="mt-2 text-sm"><p className="flex items-start gap-2 text-warning"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />This budget is below the minimum cost for this tier.</p>
                    <p className="mt-1 text-ink-700">Minimum for the smallest home: <b className="num">{formatINR(t.minimumCost)}</b></p></div>)}
              </GlassCard>
            ))}
          </div>
          {tiers.some((t) => t.feasible) && <GroupedBars title="Affordable area by tier (sqm per floor)" data={tiers.filter((t) => t.feasible).map((t) => ({ name: titleCase(t.tier), area: t.maxAreaSqm }))} series={[{ key: 'area', name: 'Area (sqm)' }]} format={(v) => `${formatNumber(v, 1)} sqm`} height={240} />}
          <p className="text-xs text-ink-500">{run.data.disclaimer}</p>
        </section>
      )}
    </div>
  );
}
