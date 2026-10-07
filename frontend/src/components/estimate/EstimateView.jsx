import { Fragment, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, ChevronDown, Copy, FileSpreadsheet, FileText, Gauge, IndianRupee, Pencil, RefreshCw, Ruler, Save, Share2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { GlassCard } from '../ui/GlassCard';
import { Button } from '../ui/Button';
import { Badge, Banner, KpiCard } from '../ui/Feedback';
import { Tabs } from '../ui/Tabs';
import { CostDonut } from '../charts/CostDonut';
import { CategoryBar } from '../charts/CategoryBar';
import { FloorStack } from '../charts/FloorStack';
import { BoqTable } from './BoqTable';
import { MaterialsTab } from './MaterialsTab';
import { ScheduleTab } from './ScheduleTab';
import { PredictionTab } from './PredictionTab';
import { TierCompare } from './TierCompare';
import { AiInsightsPanel } from './AiInsightsPanel';
import { ShareModal } from './ShareModal';
import { ActualsForm } from './ActualsForm';
import { useMeta } from '../../hooks/useMeta';
import { useCountUp } from '../../hooks/useCountUp';
import { useEstimateMutations } from '../../hooks/useEstimate';
import { useWizardStore } from '../../store/wizardStore';
import { estimatesApi } from '../../api/estimates';
import { refreshInputs } from '../../lib/inputs';
import { formatDate, formatINR, formatMonth, formatNumber, titleCase } from '../../lib/format';

function RangeBar({ min, total, max }) {
  const pos = max > min ? ((total - min) / (max - min)) * 100 : 50;
  return (
    <div className="mt-2" role="img" aria-label={`Likely range ${formatINR(min)} to ${formatINR(max)}`}>
      <div className="relative h-2 rounded-full bg-gradient-to-r from-brand-100 via-accent-200 to-brand-100"><span className="absolute top-1/2 h-4 w-1.5 -translate-y-1/2 rounded bg-accent-600" style={{ left: `${pos}%` }} /></div>
    </div>
  );
}

function CategoryTable({ result }) {
  const [open, setOpen] = useState(null);
  return (
    <GlassCard strong padding="p-0">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-sm">
          <thead className="bg-brand-50/80 text-left text-xs uppercase text-ink-500"><tr><th className="px-3 py-2">Category</th><th className="px-3 py-2 text-right">Amount</th><th className="px-3 py-2 text-right">Share</th><th className="px-3 py-2 text-right">Labour part</th></tr></thead>
          <tbody>
            {result.categories.map((c) => (
              <Fragment key={c.key}>
                <tr className="cursor-pointer border-t border-ink-300/30 hover:bg-white/70" onClick={() => setOpen(open === c.key ? null : c.key)}>
                  <td className="px-3 py-2 font-medium"><button type="button" aria-expanded={open === c.key} className="inline-flex items-center gap-1"><ChevronDown className={`h-4 w-4 transition ${open === c.key ? 'rotate-180' : ''}`} aria-hidden />{c.label}</button></td>
                  <td className="tabular px-3 py-2 text-right font-semibold">{formatINR(c.amount)}</td><td className="tabular px-3 py-2 text-right">{c.sharePct}%</td><td className="tabular px-3 py-2 text-right">{formatINR(c.labourAmount)}</td>
                </tr>
                {open === c.key && result.lineItems.filter((l) => l.category === c.key).map((l, i) => (
                  <tr key={`${l.itemCode}${i}`} className="bg-brand-50/40 text-xs"><td className="px-3 py-1.5 pl-10">{l.description}</td><td className="tabular px-3 py-1.5 text-right">{formatINR(l.amount)}</td><td className="px-3 py-1.5 text-right text-ink-500" colSpan={2}>{formatNumber(l.quantity, 2)} {l.unit} x {formatINR(l.rate)}</td></tr>
                ))}
              </Fragment>
            ))}
          </tbody>
          <tfoot className="border-t-2 border-ink-300/60 text-sm">
            <tr><td className="px-3 py-2">Subtotal</td><td className="tabular px-3 py-2 text-right" colSpan={3}>{formatINR(result.subtotal)}</td></tr>
            <tr><td className="px-3 py-2">Contingency ({result.contingencyPercent}%)</td><td className="tabular px-3 py-2 text-right" colSpan={3}>{formatINR(result.contingency)}</td></tr>
            {result.softCosts > 0 && <tr><td className="px-3 py-2">Professional and statutory fees</td><td className="tabular px-3 py-2 text-right" colSpan={3}>{formatINR(result.softCosts)}</td></tr>}
            {result.gst > 0 && <tr><td className="px-3 py-2">GST</td><td className="tabular px-3 py-2 text-right" colSpan={3}>{formatINR(result.gst)}</td></tr>}
            <tr className="bg-accent-50/70 font-bold"><td className="px-3 py-2">Grand total</td><td className="tabular px-3 py-2 text-right" colSpan={3}>{formatINR(result.grandTotal)}</td></tr>
          </tfoot>
        </table>
      </div>
    </GlassCard>
  );
}

const BENCH = { WITHIN: ['success', 'Within typical range for this tier'], BELOW: ['warning', 'Below the typical range. Check whether your inputs are complete.'], ABOVE: ['info', 'Above the typical range for this tier'] };

/**
 * One view for /estimate/result, /estimates/:id and /shared/:token.
 * variant: 'result' (unsaved) | 'saved' | 'shared' (read-only, actions hidden)
 */
export function EstimateView({ result, estimate = null, variant = 'result', title, isAuthed = false, onSave, saving, onSwitchTier, switching, onRegenerate, regenerating }) {
  const nav = useNavigate();
  const { data: meta } = useMeta();
  const { duplicate, patch } = useEstimateMutations();
  const wiz = useWizardStore();
  const [tab, setTab] = useState('overview');
  const [shareOpen, setShareOpen] = useState(false);
  const [dismissed, setDismissed] = useState({});
  const [name, setName] = useState(null);
  const total = useCountUp(result.grandTotal);
  const i = result.inputs;
  const saved = variant === 'saved' && estimate;
  const shared = variant === 'shared';

  const chips = useMemo(() => [
    meta?.houseTypes?.find((h) => h.code === i.houseType)?.name || titleCase(i.houseType),
    i.houseType === 'FLAT' ? null : i.floors, `${i.bhk} BHK`, `${formatNumber(result.derived.totalAreaSqm, 1)} sqm (${formatNumber(result.derived.totalAreaSqft)} sqft)`,
    titleCase(i.qualityTier), meta?.locations?.find((l) => l.id === i.locationId)?.displayName, titleCase(i.structureType), result.mode === 'QUICK' ? 'Quick mode' : null,
  ].filter(Boolean), [meta, i, result]);

  const editInputs = () => {
    wiz.load(refreshInputs(i), { editingId: saved ? estimate.id : null, title: estimate?.title || '', mode: result.mode, currentStep: 4, saveToAccount: true });
    nav('/estimate?step=4');
  };
  const rename = () => { if (saved && name !== null && name.trim() && name.trim() !== estimate.title) patch.mutate({ id: estimate.id, body: { title: name.trim() } }); setName(null); };
  const exp = async (fn, label) => { const t = toast.loading(`Preparing ${label}...`); try { await fn(estimate.id); toast.success(`${label} ready`, { id: t }); } catch { toast.dismiss(t); } };

  const tabs = [{ id: 'overview', label: 'Overview' }, { id: 'boq', label: 'BOQ' }, { id: 'materials', label: 'Materials & labour' }, { id: 'schedule', label: 'Schedule' }, { id: 'prediction', label: 'Prediction' },
    ...(shared ? [] : [{ id: 'ai', label: 'AI insights' }]), ...(saved ? [{ id: 'actuals', label: 'Actuals' }] : [])];
  const bench = BENCH[result.benchmark.status];

  return (
    <div className="space-y-5">
      <div className="glass-strong sticky top-16 z-20 p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            {saved ? (
              <input aria-label="Estimate title" value={name ?? estimate.title} onChange={(e) => setName(e.target.value)} onBlur={rename} onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()} maxLength={120} className="w-full truncate rounded-lg bg-transparent font-display text-2xl font-extrabold hover:bg-white/60 focus:bg-white/80" />
            ) : <h1 className="font-display text-2xl font-extrabold">{title || estimate?.title || 'Your estimate'}</h1>}
            <div className="mt-2 flex flex-wrap gap-1.5">{chips.map((c) => <Badge key={c} tone="brand">{c}</Badge>)}</div>
            {estimate?.createdAt && <p className="mt-1 text-xs text-ink-500">Created {formatDate(estimate.createdAt)}</p>}
          </div>
          {!shared && (
            <div className="flex flex-wrap gap-2">
              {!saved && <Button icon={Save} loading={saving} onClick={onSave}>{isAuthed ? 'Save' : 'Log in to save'}</Button>}
              <Button variant="secondary" icon={Pencil} onClick={editInputs}>Edit inputs</Button>
              {saved && <>
                <Button variant="secondary" icon={Copy} loading={duplicate.isPending} onClick={async () => { const c = await duplicate.mutateAsync(estimate.id); nav(`/estimates/${c.id}`); }}>Duplicate</Button>
                <Button variant="secondary" icon={Share2} onClick={() => setShareOpen(true)}>Share</Button>
                <Button variant="secondary" icon={FileText} onClick={() => exp(estimatesApi.exportPdf, 'PDF')}>PDF</Button>
                <Button variant="secondary" icon={FileSpreadsheet} onClick={() => exp(estimatesApi.exportXlsx, 'Excel')}>Excel</Button>
                <Button variant="ghost" icon={RefreshCw} loading={regenerating} onClick={onRegenerate}>Re-run with latest rates</Button>
              </>}
            </div>
          )}
        </div>
      </div>

      <div className="space-y-2">
        {!result.ratesUsed.verified && <Banner kind="warning" title="Illustrative rates">These figures use illustrative rates (not yet verified against the current SSR). Treat them as a planning range.</Banner>}
        {result.derived.warnings.filter((w) => !dismissed[w.code]).map((w) => <Banner key={w.code} kind="info" onDismiss={() => setDismissed({ ...dismissed, [w.code]: true })}>{w.message}</Banner>)}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Grand total" value={formatINR(total)} accent icon={IndianRupee} hint={`Subtotal ${formatINR(result.subtotal)} + contingency`} />
        <KpiCard label="Cost per sqft" value={formatINR(result.costPerSqft)} icon={Ruler} hint="Based on total built-up area" />
        <KpiCard label="Likely range (approx.)" value={`${formatINR(result.range.min)} - ${formatINR(result.range.max)}`} icon={Gauge} hint={`+/- ${result.range.bandPercent}%`}><RangeBar min={result.range.min} total={result.grandTotal} max={result.range.max} /></KpiCard>
        <KpiCard label="Estimated duration" value={`${result.schedule.durationMonths} months`} icon={Calendar} hint={`Completion ${formatMonth(result.prediction.completionMonth)}`} />
      </div>

      <Tabs tabs={tabs} value={tab} onChange={setTab} />
      <div role="tabpanel" className="space-y-4">
        {tab === 'overview' && (
          <>
            <div className="grid gap-4 lg:grid-cols-2"><CostDonut categories={result.categories} total={result.subtotal} /><CategoryBar categories={result.categories} /></div>
            <CategoryTable result={result} />
            <div className="grid gap-4 lg:grid-cols-2"><FloorStack floorSplit={result.floorSplit} />
              <GlassCard strong><h3 className="mb-2 font-bold">Benchmark</h3><Badge tone={bench[0]}>{bench[1]}</Badge>
                <p className="mt-2 text-sm text-ink-500">Typical {titleCase(i.qualityTier)} range: {formatINR(result.benchmark.tierMinPerSqft)} - {formatINR(result.benchmark.tierMaxPerSqft)} per sqft. Yours: {formatINR(result.costPerSqft)}.</p></GlassCard></div>
            <div><h3 className="mb-2 text-lg font-bold">Compare tiers</h3><TierCompare result={result} onSwitchTier={shared ? null : onSwitchTier} switching={switching} /></div>
          </>
        )}
        {tab === 'boq' && <BoqTable result={result} />}
        {tab === 'materials' && <MaterialsTab result={result} />}
        {tab === 'schedule' && <ScheduleTab result={result} />}
        {tab === 'prediction' && <PredictionTab result={result} />}
        {tab === 'ai' && !shared && <AiInsightsPanel estimateId={saved ? estimate.id : null} result={result} />}
        {tab === 'actuals' && saved && <ActualsForm estimateId={estimate.id} categories={result.categories} />}
      </div>

      <GlassCard padding="p-4" className="text-xs text-ink-500">
        <p><b>Rates used:</b> {result.ratesUsed.rateSetName} ({result.ratesUsed.fiscalYear}), {result.ratesUsed.verified ? 'verified' : 'illustrative, not verified'}. Engine v{result.engineVersion}.
          {result.ratesUsed.fallbackItemCount > 0 && ` ${result.ratesUsed.fallbackItemCount} item(s) use corrected CPWD DSR rates.`}</p>
        <p className="mt-1">{result.disclaimer}</p>
      </GlassCard>
      {saved && <ShareModal open={shareOpen} onClose={() => setShareOpen(false)} estimate={estimate} />}
    </div>
  );
}
