import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';
import { Calculator, FileText, IndianRupee, Lightbulb, Ruler } from 'lucide-react';
import { Seo } from '../../components/layout/Seo';
import { GlassCard } from '../../components/ui/GlassCard';
import { Button } from '../../components/ui/Button';
import { Banner, EmptyState, ErrorState, KpiCard, Skeleton } from '../../components/ui/Feedback';
import { estimatesApi } from '../../api/estimates';
import { useAuth } from '../../hooks/useAuth';
import { useMeta } from '../../hooks/useMeta';
import { CHART_COLORS } from '../../lib/constants';
import { formatDate, formatINR, formatINRCompact } from '../../lib/format';

export function MiniDonut({ categories }) {
  const data = (categories || []).map((c) => ({ name: c.label, value: c.amount }));
  return (
    <div className="h-16 w-16 shrink-0" role="img" aria-label="Cost split">
      <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={data} dataKey="value" innerRadius="55%" outerRadius="95%" stroke="none">{data.map((d, i) => <Cell key={d.name} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}</Pie></PieChart></ResponsiveContainer>
    </div>
  );
}

const TIPS = ['Get three quotations for the largest categories before you finalise.', 'Keep a 5-10% contingency on top of any estimate.', 'Start foundation work outside the monsoon where possible.', 'Freeze drawings and finishes before work begins to avoid costly changes.'];

export default function Dashboard() {
  const { user } = useAuth();
  const { data: meta } = useMeta();
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['estimates', 'dashboard'], queryFn: () => estimatesApi.list({ page: 1, pageSize: 100, sort: '-created_at' }) });
  const rows = data?.rows || [];
  const avgSqft = rows.length ? rows.reduce((a, r) => a + Number(r.costPerSqft), 0) / rows.length : null;
  return (
    <div className="container-page space-y-6 py-8">
      <Seo title="Dashboard" noindex />
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-3xl font-extrabold">Hello, {user?.name?.split(' ')[0]}</h1><p className="text-ink-500">Here is a summary of your estimates.</p></div>
        <Link to="/estimate"><Button icon={Calculator}>Start new estimate</Button></Link></div>
      {meta?.announcements?.map((a) => <Banner key={a.id} kind={a.kind} title={a.title}>{a.body}</Banner>)}
      {error ? <GlassCard><ErrorState error={error} onRetry={refetch} /></GlassCard> : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <KpiCard label="Estimates saved" value={isLoading ? '...' : data.meta.total} icon={FileText} />
            <KpiCard label="Last estimate" value={rows[0] ? formatINRCompact(rows[0].grandTotal) : '-'} icon={IndianRupee} hint={rows[0]?.title} />
            <KpiCard label="Average cost per sqft" value={avgSqft ? formatINR(avgSqft) : '-'} icon={Ruler} />
          </div>
          <section aria-labelledby="recent"><div className="mb-2 flex items-center justify-between"><h2 id="recent" className="text-xl font-bold">Recent estimates</h2><Link to="/estimates" className="text-sm font-semibold text-brand-700">View all</Link></div>
            {isLoading ? <Skeleton className="h-32" /> : rows.length === 0 ? <GlassCard><EmptyState icon={FileText} title="No estimates yet" action={<Link to="/estimate"><Button>Create your first estimate</Button></Link>}>Your saved estimates will appear here.</EmptyState></GlassCard> : (
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">{rows.slice(0, 5).map((r) => (
                <Link key={r.id} to={`/estimates/${r.id}`}><GlassCard hoverLift className="flex items-center gap-3"><MiniDonut categories={r.categories} />
                  <div className="min-w-0"><p className="truncate font-bold">{r.title}</p><p className="num text-brand-700">{formatINR(r.grandTotal)}</p><p className="text-xs text-ink-500">{formatDate(r.createdAt)}</p></div></GlassCard></Link>))}</div>)}
          </section>
        </>
      )}
      <GlassCard><h2 className="mb-2 flex items-center gap-2 text-lg font-bold"><Lightbulb className="h-5 w-5 text-accent-500" aria-hidden />Tips</h2><ul className="list-disc space-y-1 pl-5 text-sm text-ink-700">{TIPS.map((t) => <li key={t}>{t}</li>)}</ul></GlassCard>
    </div>
  );
}
