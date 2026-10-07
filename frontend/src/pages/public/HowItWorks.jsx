import { Seo } from '../../components/layout/Seo';
import { GlassCard } from '../../components/ui/GlassCard';
import { Term } from '../../components/ui/Feedback';
import { useMeta } from '../../hooks/useMeta';
import { GLOSSARY } from '../../lib/constants';

function RateFlow() {
  const box = (x, y, w, t, fill = '#EAF2FB') => (<g><rect x={x} y={y} width={w} height="46" rx="12" fill={fill} stroke="#1F78B4" /><text x={x + w / 2} y={y + 28} textAnchor="middle" fontSize="13" fill="#0F172A">{t}</text></g>);
  return (
    <svg viewBox="0 0 700 330" role="img" aria-label="Rate selection flowchart: state SSR first, then corrected CPWD DSR, otherwise the estimate stops" className="w-full max-w-2xl">
      {box(240, 10, 220, 'For each BOQ item')}
      <path d="M350 56v24" stroke="#334155" markerEnd="url(#a)" />
      {box(200, 80, 300, 'State SSR rate (PWD / MJP) exists?', '#FFF6E8')}
      <path d="M200 103H110v47" stroke="#16A34A" fill="none" markerEnd="url(#a)" /><text x="130" y="96" fontSize="12" fill="#16A34A">Yes</text>
      {box(20, 150, 180, 'Use SSR rate')}
      <path d="M500 103h90v47" stroke="#DC2626" fill="none" markerEnd="url(#a)" /><text x="540" y="96" fontSize="12" fill="#DC2626">No</text>
      {box(470, 150, 220, 'CPWD DSR x lead/lift factor', '#FFF6E8')}
      <path d="M580 196v40" stroke="#334155" markerEnd="url(#a)" />
      {box(470, 236, 220, 'Mark as "DSR corrected"')}
      <path d="M110 196v90h130" stroke="#334155" fill="none" markerEnd="url(#a)" /><path d="M470 259H400" stroke="#334155" markerEnd="url(#a)" />
      {box(240, 262, 160, 'x tier x location', '#D2E5F6')}
      <defs><marker id="a" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0 0l6 3-6 3z" fill="#334155" /></marker></defs>
    </svg>
  );
}

export default function HowItWorks() {
  const { data: meta } = useMeta();
  const rs = meta?.settings?.activeRateSet;
  return (
    <div className="container-page max-w-4xl space-y-6 py-10">
      <Seo title="How it works" description="The standards, rate rules and formulas behind your construction estimate." />
      <h1 className="text-4xl font-extrabold">How your estimate is made</h1>
      <GlassCard strong><h2 className="mb-2 text-2xl font-bold">1. A four-step funnel</h2><p className="text-ink-700">You pick a house type, floors and BHK, then enter area, quality tier, location and structure. Everything else (rooms, doors, windows, electrical points) is derived from your choices.</p></GlassCard>
      <GlassCard strong><h2 className="mb-2 text-2xl font-bold">2. Standards we use</h2>
        <ul className="list-disc space-y-1 pl-5 text-ink-700"><li>Maharashtra PWD <Term tip={GLOSSARY.SSR}>SSR</Term> and MJP SSR for rates</li><li>CPWD <Term tip={GLOSSARY.DSR}>DSR</Term> only as a corrected fallback</li><li>IS 1200 for measurement of quantities</li><li>NBC 2016 for planning norms, IS 456 for concrete</li></ul></GlassCard>
      <GlassCard strong><h2 className="mb-2 text-2xl font-bold">3. The rate selection rule</h2><p className="mb-3 text-ink-700">State rates always win. A CPWD figure is used only if no state rate exists, and it is corrected for local lead, lift and labour.</p><RateFlow />
        {rs && <p className="mt-3 text-sm text-ink-500">Current rate set: <b>{rs.name}</b> ({rs.fiscalYear}){meta.settings.ratesVerified ? '' : ' - illustrative until verified'}.</p>}</GlassCard>
      <GlassCard strong><h2 className="mb-2 text-2xl font-bold">4. How quantities are derived</h2><p className="text-ink-700">Quantities in the <Term tip={GLOSSARY.BOQ}>BOQ</Term> come from your built-up area and the BHK configuration, using consumption norms (for example concrete per sqm). Norms are calibrated over time with real project data.</p></GlassCard>
      <GlassCard strong><h2 className="mb-2 text-2xl font-bold">5. Accuracy range</h2><p className="text-ink-700">We show a likely range (about plus or minus {meta?.settings?.accuracyBandPercent ?? 10}%), widened when rates are unverified or partly from fallback sources.</p></GlassCard>
      <GlassCard strong><h2 className="mb-2 text-2xl font-bold">6. What AI does and does not do</h2><p className="text-ink-700">AI explains and advises. It never calculates or changes a total. Savings it suggests are indicative percentage ranges converted using our numbers.</p></GlassCard>
      <GlassCard strong><h2 className="mb-2 text-2xl font-bold">7. Limitations</h2><p className="text-ink-700">This is a planning-level tool for low-rise residential buildings up to G+2. It is not a quotation, a structural design or a substitute for a registered engineer or architect.</p></GlassCard>
    </div>
  );
}
