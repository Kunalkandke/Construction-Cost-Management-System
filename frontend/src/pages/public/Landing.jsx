import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ArrowRight, BarChart3, Brain, CalendarClock, ClipboardList, Hammer, Home, Layers, LineChart, ListChecks, Scale, ShieldCheck, Sparkles, TrendingUp, Wallet } from 'lucide-react';
import { Seo } from '../../components/layout/Seo';
import { Button } from '../../components/ui/Button';
import { GlassCard } from '../../components/ui/GlassCard';
import { Accordion } from '../../components/ui/Tabs';
import { Badge } from '../../components/ui/Feedback';
import { SegmentedControl, Slider } from '../../components/ui/Form';
import { Donut } from '../../components/charts/CostDonut';
import { useMeta } from '../../hooks/useMeta';
import { useDebounce } from '../../hooks/useDebounce';
import { useWizardStore } from '../../store/wizardStore';
import { metaApi } from '../../api/meta';
import { estimatesApi } from '../../api/estimates';
import { formatINR, formatINRCompact, titleCase } from '../../lib/format';

const fade = { initial: { opacity: 0, y: 14 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true }, transition: { duration: 0.3 } };

function MiniCalculator() {
  const { data: meta } = useMeta();
  const nav = useNavigate();
  const wiz = useWizardStore();
  const [area, setArea] = useState(80);
  const [tier, setTier] = useState('STANDARD');
  const dArea = useDebounce(area, 400);
  const loc = meta?.locations?.find((l) => l.displayName.startsWith('Chhatrapati')) || meta?.locations?.[0];
  const { data, isFetching } = useQuery({
    queryKey: ['mini', dArea, tier, loc?.id], enabled: Boolean(loc), placeholderData: (p) => p, retry: false,
    queryFn: () => estimatesApi.calculate({ houseType: 'PLOT_HOUSE', floors: 'G+1', bhk: 2, builtUpAreaSqm: dArea, areaBasis: 'PER_FLOOR', qualityTier: tier, locationId: loc.id, structureType: 'RCC_FRAME', addons: [] }, 'QUICK'),
  });
  const go = () => { wiz.load({ houseType: 'PLOT_HOUSE', floors: 'G+1', bhk: 2, builtUpAreaSqm: dArea, areaBasis: 'PER_FLOOR', qualityTier: tier, locationId: loc.id, structureType: 'RCC_FRAME', addons: [] }, { currentStep: 4 }); nav('/estimate?step=4'); };
  return (
    <GlassCard strong className="mx-auto max-w-3xl">
      <div className="grid gap-5 md:grid-cols-2">
        <div className="space-y-4">
          <h3 className="font-display text-xl font-bold">Try a quick estimate</h3>
          <p className="text-sm text-ink-500">A 2 BHK, G+1 house. Move the slider to see how the cost changes.</p>
          <Slider label="Area per floor" value={area} onChange={setArea} min={40} max={200} step={5} format={(v) => `${v} sqm`} />
          <SegmentedControl label="Quality" value={tier} onChange={setTier} options={['BASIC', 'STANDARD', 'PREMIUM'].map((t) => ({ value: t, label: titleCase(t) }))} />
        </div>
        <div className="flex flex-col justify-between rounded-2xl bg-white/70 p-4" aria-live="polite">
          <div><p className="text-sm text-ink-500">Approximate range</p>
            <p className={`num font-display text-2xl text-brand-700 ${isFetching ? 'opacity-60' : ''}`}>{data ? `${formatINRCompact(data.range.min)} - ${formatINRCompact(data.range.max)}` : '...'}</p>
            <p className="text-xs text-ink-500">{data ? `Around ${formatINR(data.grandTotal)}, illustrative` : ' '}</p></div>
          <Button onClick={go} className="mt-4">Get the detailed estimate<ArrowRight className="h-4 w-4" aria-hidden /></Button>
        </div>
      </div>
    </GlassCard>
  );
}

const HOW = [[Home, 'Choose house', 'Plot house, row house, flat or bungalow.'], [ClipboardList, 'Enter key details', 'Floors, BHK, area, quality and location.'], [BarChart3, 'Get detailed estimate', 'BOQ, materials, timeline and cash flow.'], [Brain, 'Get AI advice', 'Savings ideas, risks and next steps.']];
const FEATURES = [[Layers, 'Category-wise cost'], [ListChecks, 'Line-item BOQ'], [Hammer, 'Materials and labour'], [CalendarClock, 'Timeline and cash flow'], [TrendingUp, 'Price prediction'], [LineChart, 'Sensitivity analysis'], [Scale, 'Tier comparison'], [Sparkles, 'AI suggestions']];
const STANDARDS = ['Maharashtra PWD SSR', 'MJP SSR', 'CPWD DSR (fallback)', 'IS 1200', 'NBC 2016'];

export default function Landing() {
  const { data: faqs } = useQuery({ queryKey: ['faqs'], queryFn: metaApi.faqs, staleTime: 600000 });
  const sample = useMemo(() => [{ name: 'Structure', value: 48 }, { name: 'Finishing', value: 24 }, { name: 'Electrical', value: 9 }, { name: 'Plumbing', value: 11 }, { name: 'Openings', value: 8 }], []);
  return (
    <>
      <Seo title="Know your construction cost before you build" description="Few inputs, detailed estimate, AI suggestions. Standards-based cost estimates for houses in Maharashtra." path="/" />
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute -left-24 top-0 h-80 w-80 rounded-full bg-brand-200/30 blur-3xl" aria-hidden />
        <div className="pointer-events-none absolute -right-24 top-40 h-80 w-80 rounded-full bg-accent-200/40 blur-3xl" aria-hidden />
        <div className="container-page relative grid items-center gap-10 py-14 lg:grid-cols-2 lg:py-20">
          <motion.div {...fade}>
            <Badge tone="accent" icon={Sparkles}>Built for Maharashtra homes</Badge>
            <h1 className="mt-4 text-4xl font-extrabold leading-[1.1] sm:text-5xl lg:text-[56px]">Know your construction cost before you build.</h1>
            <p className="mt-4 max-w-xl text-lg text-ink-700">Answer a few simple questions and get a detailed, standards-based estimate with materials, timeline, price prediction and AI-powered saving tips.</p>
            <div className="mt-6 flex flex-wrap gap-3"><Link to="/estimate"><Button size="lg" icon={ArrowRight}>Start Free Estimate</Button></Link><Link to="/how-it-works"><Button size="lg" variant="secondary">How it works</Button></Link></div>
          </motion.div>
          <motion.div {...fade} className="lg:justify-self-end">
            <GlassCard strong className="mx-auto max-w-md" aria-label="Sample result">
              <div className="mb-1 flex items-center justify-between"><span className="text-sm font-semibold text-ink-500">Sample 2 BHK, G+1</span><Badge tone="warning">Illustrative</Badge></div>
              <Donut title="Cost split" label="Sample cost split donut" data={sample} money={false} centerValue="100%" centerLabel="of cost" height={240} />
            </GlassCard>
          </motion.div>
        </div>
      </section>

      <section aria-label="Standards used" className="container-page"><div className="glass flex flex-wrap items-center justify-center gap-2 p-4"><span className="mr-2 text-sm font-semibold text-ink-500">Based on</span>{STANDARDS.map((s) => <Badge key={s} tone="brand" icon={ShieldCheck}>{s}</Badge>)}</div></section>

      <section className="container-page py-14"><h2 className="mb-6 text-center text-3xl font-extrabold">How it works</h2>
        <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{HOW.map(([Icon, t, d], i) => (
          <motion.li key={t} {...fade}><GlassCard hoverLift className="h-full"><span className="num grid h-8 w-8 place-items-center rounded-full bg-accent-500 text-white">{i + 1}</span><Icon className="mt-3 h-7 w-7 text-brand-600" strokeWidth={1.75} aria-hidden /><h3 className="mt-2 text-lg font-bold">{t}</h3><p className="text-sm text-ink-500">{d}</p></GlassCard></motion.li>))}</ol></section>

      <section className="container-page pb-14"><h2 className="mb-6 text-center text-3xl font-extrabold">What you get</h2>
        <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">{FEATURES.map(([Icon, t]) => <li key={t}><GlassCard padding="p-4" hoverLift className="flex h-full items-center gap-3"><Icon className="h-6 w-6 shrink-0 text-brand-600" strokeWidth={1.75} aria-hidden /><span className="font-semibold">{t}</span></GlassCard></li>)}</ul></section>

      <section className="container-page pb-14"><MiniCalculator /></section>

      <section className="container-page pb-14"><h2 className="mb-6 text-center text-3xl font-extrabold">Why trust the numbers</h2>
        <div className="grid gap-4 md:grid-cols-3">{[[ShieldCheck, 'Standards-based rates', 'State schedule of rates first. CPWD DSR only as a corrected fallback.'], [ListChecks, 'Transparent sources', 'Every line item shows where its rate came from.'], [Wallet, 'Ranges, not false precision', 'You always see a likely range and whether rates are verified.']].map(([Icon, t, d]) => (
          <GlassCard key={t}><Icon className="h-7 w-7 text-accent-600" strokeWidth={1.75} aria-hidden /><h3 className="mt-2 text-lg font-bold">{t}</h3><p className="text-sm text-ink-500">{d}</p></GlassCard>))}</div></section>

      {faqs?.length > 0 && <section className="container-page max-w-3xl pb-14"><h2 className="mb-4 text-center text-3xl font-extrabold">Common questions</h2>
        <Accordion items={faqs.slice(0, 4).map((f) => ({ id: f.id, title: f.question, content: f.answer }))} /><p className="mt-3 text-center"><Link to="/faq" className="font-semibold text-brand-700">See all FAQs</Link></p></section>}

      <section className="container-page pb-6"><div className="rounded-3xl bg-gradient-to-r from-brand-700 to-brand-500 p-8 text-center text-white sm:p-12"><h2 className="text-3xl font-extrabold">Ready to plan your build?</h2><p className="mx-auto mt-2 max-w-lg text-brand-100">It takes about two minutes and no sign-up.</p><Link to="/estimate" className="mt-5 inline-block"><Button variant="accent" size="lg">Start Free Estimate</Button></Link></div></section>
    </>
  );
}
