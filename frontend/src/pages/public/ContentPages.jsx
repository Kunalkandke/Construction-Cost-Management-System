import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle2, Search } from 'lucide-react';
import { Seo } from '../../components/layout/Seo';
import { GlassCard } from '../../components/ui/GlassCard';
import { Accordion } from '../../components/ui/Tabs';
import { Banner, EmptyState, ErrorState, Skeleton } from '../../components/ui/Feedback';
import { Button } from '../../components/ui/Button';
import { Input, Textarea } from '../../components/ui/Form';
import { metaApi } from '../../api/meta';
import { contactSchema } from '../../lib/validators';
import { useMeta } from '../../hooks/useMeta';
import { PUBLIC_DISCLAIMER } from '../../lib/constants';

export function FaqPage() {
  const [q, setQ] = useState('');
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['faqs'], queryFn: metaApi.faqs, staleTime: 600000 });
  const list = (data || []).filter((f) => `${f.question} ${f.answer}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="container-page max-w-3xl py-10">
      <Seo title="FAQ" description="Answers about accuracy, rates, AI suggestions and saving estimates." />
      <h1 className="mb-4 text-4xl font-extrabold">Frequently asked questions</h1>
      <div className="relative mb-4"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500" aria-hidden /><input className="glass-input pl-9" placeholder="Search questions" aria-label="Search FAQs" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      {isLoading ? <Skeleton className="h-48" /> : error ? <ErrorState error={error} onRetry={refetch} /> : list.length ? <Accordion items={list.map((f) => ({ id: f.id, title: f.question, content: f.answer }))} /> : <GlassCard><EmptyState title="No matching questions">Try different words or contact us.</EmptyState></GlassCard>}
    </div>
  );
}

export function ContactPage() {
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState('');
  const { register, handleSubmit, formState: { errors, isSubmitting }, reset } = useForm({ resolver: zodResolver(contactSchema) });
  const onSubmit = async (v) => { setErr(''); try { await metaApi.contact(v); setSent(true); reset(); } catch (e) { setErr(e.message); } };
  return (
    <div className="container-page max-w-xl py-10">
      <Seo title="Contact us" description="Questions, feedback or rate data? Send us a message." />
      <h1 className="mb-4 text-4xl font-extrabold">Contact us</h1>
      <GlassCard strong>
        {sent ? <EmptyState icon={CheckCircle2} title="Message sent">Thank you. We will reply by email soon.</EmptyState> : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3" noValidate>
            {err && <Banner kind="danger">{err}</Banner>}
            <Input label="Name" required error={errors.name?.message} {...register('name')} autoComplete="name" />
            <Input label="Email" type="email" required error={errors.email?.message} {...register('email')} autoComplete="email" />
            <Input label="Subject" error={errors.subject?.message} {...register('subject')} />
            <Textarea label="Message" required error={errors.message?.message} {...register('message')} />
            <div className="hidden" aria-hidden="true"><label>Website<input tabIndex={-1} autoComplete="off" {...register('website')} /></label></div>
            <Button type="submit" loading={isSubmitting} className="w-full">Send message</Button>
          </form>)}
      </GlassCard>
    </div>
  );
}

const Legal = ({ title, children, note = true }) => (
  <div className="container-page max-w-3xl py-10"><Seo title={title} />
    <h1 className="mb-4 text-4xl font-extrabold">{title}</h1>
    {note && <Banner kind="info" className="mb-4">Placeholder text. To be reviewed by legal counsel before launch.</Banner>}
    <GlassCard strong className="space-y-3 text-ink-700">{children}</GlassCard></div>
);
export const TermsPage = () => (<Legal title="Terms of use"><p>By using CCMS you agree to use it for lawful, personal or professional planning purposes only.</p><p>Estimates are informational. You are responsible for decisions you make using them.</p><p>We may update features, rates and these terms. Continued use means you accept the updated terms.</p><p>Accounts may be suspended for misuse, including attempts to disrupt the service.</p></Legal>);
export const PrivacyPage = () => (<Legal title="Privacy policy"><p>We store your account details (name, email, optional phone) and the estimates you save.</p><p>Estimate data sent to our AI provider contains only project details, never your name, email or phone.</p><p>You can ask us to delete your account from your profile page. Shared links never show personal details.</p><p>We use a secure cookie only to keep you signed in.</p></Legal>);
export function DisclaimerPage() {
  const { data } = useMeta();
  return <Legal title="Disclaimer" note={false}><p>{data?.settings?.disclaimerText || PUBLIC_DISCLAIMER}</p><p>Rates shown may be illustrative until marked as verified against the current Maharashtra PWD / MJP schedule of rates.</p></Legal>;
}
