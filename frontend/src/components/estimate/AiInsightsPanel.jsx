import { ArrowDownRight, ArrowRight, ArrowUpRight, CheckSquare, RefreshCw, Sparkles, AlertTriangle } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { aiApi } from '../../api/ai';
import { GlassCard } from '../ui/GlassCard';
import { Button } from '../ui/Button';
import { Badge, Banner, Skeleton } from '../ui/Feedback';
import { useNow } from '../../hooks/useCountUp';
import { SEVERITY_TONE } from '../../lib/constants';
import { formatINR, titleCase } from '../../lib/format';

const TREND = { RISING: [ArrowUpRight, 'danger'], STABLE: [ArrowRight, 'info'], FALLING: [ArrowDownRight, 'success'] };

export function AiInsightsPanel({ estimateId, result }) {
  const qc = useQueryClient();
  const key = estimateId ? ['ai', estimateId] : ['ai-quick', result.grandTotal, result.inputs.qualityTier, result.inputs.builtUpAreaSqm, JSON.stringify(result.inputs.addons)];
  const run = (force) => (estimateId ? aiApi.generate(estimateId, force) : aiApi.quick(result.inputs, result.mode));
  const q = useQuery({ queryKey: key, queryFn: () => run(false), staleTime: Infinity, retry: false, refetchOnWindowFocus: false });
  const regen = useMutation({ mutationFn: () => run(true), onSuccess: (d) => qc.setQueryData(key, d) });
  const data = regen.data || q.data;
  const err = regen.error || q.error;
  const avail = data?.regenerateAvailableAt && estimateId ? new Date(data.regenerateAvailableAt).getTime() : 0;
  const now = useNow(avail > Date.now());
  const wait = Math.max(0, Math.ceil((avail - now) / 1000));
  const loading = q.isLoading || regen.isPending;

  if (loading) {
    return (
      <GlassCard strong aria-busy="true"><p className="mb-3 flex items-center gap-2 font-semibold text-brand-700"><Sparkles className="h-5 w-5 animate-pulse" aria-hidden />Analysing your estimate...</p>
        <div className="space-y-3"><Skeleton className="h-5 w-full" /><Skeleton className="h-5 w-4/5" /><Skeleton className="h-24 w-full" /></div></GlassCard>
    );
  }
  if (err && !data) {
    const msg = err.code === 'RATE_LIMITED' ? err.message || 'You have reached the AI limit for now. Please try again later.' : 'AI suggestions are unavailable right now. The rest of your estimate is unaffected.';
    return (
      <GlassCard><Banner kind="info" title="AI insights unavailable">{msg}</Banner>
        <div className="mt-3"><Button variant="secondary" icon={RefreshCw} onClick={() => q.refetch()}>Try again</Button></div></GlassCard>
    );
  }
  const c = data.content;
  const [TrendIcon, trendTone] = TREND[c.budgetOutlook.trend] || TREND.STABLE;
  return (
    <div className="space-y-4">
      <GlassCard strong>
        <div className="mb-1 flex items-center gap-2"><Sparkles className="h-5 w-5 text-accent-500" aria-hidden /><h3 className="font-bold">Summary</h3>
          {data.status === 'fallback' && <Badge tone="neutral">Showing rule-based suggestions</Badge>}</div>
        <p className="text-ink-700">{c.summary}</p>
      </GlassCard>

      <section aria-labelledby="tips-h"><h3 id="tips-h" className="mb-2 font-bold">Cost-saving ideas</h3>
        <div className="grid gap-3 md:grid-cols-2">
          {c.costSavingTips.map((t) => (
            <GlassCard key={t.title} strong>
              <div className="flex items-start justify-between gap-2"><h4 className="font-bold">{t.title}</h4><Badge tone={t.effort === 'LOW' ? 'success' : t.effort === 'MEDIUM' ? 'warning' : 'danger'}>{titleCase(t.effort)} effort</Badge></div>
              <p className="mt-1 text-sm text-ink-700">{t.description}</p>
              <p className="mt-2 text-sm"><span className="font-semibold text-success">Indicative saving: {formatINR(t.savingAmountMin)} - {formatINR(t.savingAmountMax)}</span> <span className="text-ink-500">({t.savingPctMin}-{t.savingPctMax}% of {titleCase(t.category)})</span></p>
              <p className="mt-1 text-xs text-ink-500"><b>Trade-off:</b> {t.tradeOff}</p>
            </GlassCard>
          ))}
        </div>
      </section>

      <section aria-labelledby="alt-h"><h3 id="alt-h" className="mb-2 font-bold">Material alternatives</h3>
        <div className="grid gap-3 md:grid-cols-2">
          {c.materialAlternatives.map((m) => (
            <GlassCard key={m.current + m.alternative} strong>
              <div className="grid grid-cols-2 gap-2 text-sm"><div><p className="text-xs text-ink-500">Instead of</p><p className="font-semibold">{m.current}</p></div><div><p className="text-xs text-ink-500">Consider</p><p className="font-semibold text-brand-700">{m.alternative}</p></div></div>
              <p className="mt-2 text-sm text-ink-700">{m.benefit}</p><p className="mt-1 text-xs text-ink-500"><b>Caution:</b> {m.caution}</p>
            </GlassCard>
          ))}
        </div>
      </section>

      <GlassCard strong><h3 className="mb-2 font-bold">Risks and how to handle them</h3>
        <ul className="space-y-3">{c.risks.map((r) => (
          <li key={r.risk} className="flex gap-3"><Badge tone={SEVERITY_TONE[r.severity]} icon={AlertTriangle}>{titleCase(r.severity)}</Badge>
            <div className="text-sm"><p className="font-semibold">{r.risk}</p><p className="text-ink-700">{r.mitigation}</p></div></li>))}</ul></GlassCard>

      <div className="grid gap-3 md:grid-cols-2">
        <GlassCard strong><h3 className="mb-1 font-bold">Timeline advice</h3><p className="text-sm text-ink-700">{c.timelineAdvice}</p></GlassCard>
        <GlassCard strong><div className="mb-1 flex items-center gap-2"><h3 className="font-bold">Budget outlook</h3><Badge tone={trendTone} icon={TrendIcon}>{titleCase(c.budgetOutlook.trend)}</Badge><Badge>{titleCase(c.budgetOutlook.confidence)} confidence</Badge></div>
          <p className="text-sm text-ink-700">{c.budgetOutlook.rationale}</p></GlassCard>
      </div>

      <GlassCard strong><h3 className="mb-2 font-bold">Next steps</h3>
        <ul className="space-y-2">{c.nextSteps.map((s) => <li key={s} className="flex items-start gap-2 text-sm"><CheckSquare className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" aria-hidden />{s}</li>)}</ul></GlassCard>

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-ink-500">
        <p>AI-generated guidance. Verify with a registered engineer. Savings are indicative only.</p>
        <Button size="sm" variant="secondary" icon={RefreshCw} loading={regen.isPending} disabled={wait > 0} onClick={() => regen.mutate()}>{wait > 0 ? `Regenerate in ${Math.floor(wait / 60)}:${String(wait % 60).padStart(2, '0')}` : 'Regenerate'}</Button>
      </div>
      {regen.error && <Banner kind="info">{regen.error.message}</Banner>}
    </div>
  );
}
