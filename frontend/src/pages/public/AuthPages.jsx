import { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle2 } from 'lucide-react';
import { Seo } from '../../components/layout/Seo';
import { GlassCard } from '../../components/ui/GlassCard';
import { Button } from '../../components/ui/Button';
import { Input, Checkbox } from '../../components/ui/Form';
import { Banner } from '../../components/ui/Feedback';
import { useAuth } from '../../hooks/useAuth';
import { authApi } from '../../api/auth';
import { forgotSchema, loginSchema, passwordStrength, registerSchema, resetSchema } from '../../lib/validators';

function AuthCard({ title, subtitle, children }) {
  return (
    <div className="container-page grid min-h-[70vh] place-items-center py-10">
      <GlassCard strong className="w-full max-w-[440px]"><h1 className="text-3xl font-extrabold">{title}</h1>{subtitle && <p className="mb-4 mt-1 text-ink-500">{subtitle}</p>}{children}</GlassCard>
    </div>
  );
}

// Map API field errors (details[].path) onto the form
function applyServerErrors(e, setError, setTop) {
  const fields = (e.details || []).filter((d) => d.path);
  fields.forEach((d) => setError(d.path, { message: d.message }));
  if (!fields.length) setTop(e.code === 'RATE_LIMITED' ? 'Too many attempts. Try again in a few minutes.' : e.message);
}

function StrengthMeter({ value = '' }) {
  const { score } = passwordStrength(value);
  const labels = ['Too short', 'Weak', 'Okay', 'Good', 'Strong'];
  return (
    <div className="mt-1" aria-live="polite">
      <div className="flex gap-1" aria-hidden>{[0, 1, 2, 3].map((i) => <span key={i} className={`h-1.5 flex-1 rounded ${i < score ? (score < 3 ? 'bg-warning' : 'bg-success') : 'bg-ink-300'}`} />)}</div>
      <p className="mt-1 text-xs text-ink-500">Password strength: {labels[score]} (8+ characters, a letter and a number)</p>
    </div>
  );
}

export function LoginPage() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const [top, setTop] = useState('');
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(loginSchema) });
  const next = params.get('next');
  const onSubmit = async (v) => { setTop(''); try { await login(v); nav(next && next.startsWith('/') ? next : '/dashboard', { replace: true }); } catch (e) { applyServerErrors(e, setError, setTop); } };
  return (
    <AuthCard title="Welcome back" subtitle="Log in to save and manage your estimates.">
      <Seo title="Log in" noindex />
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3" noValidate>
        {top && <Banner kind="danger">{top}</Banner>}
        <Input label="Email" type="email" autoComplete="email" required error={errors.email?.message} {...register('email')} />
        <Input label="Password" type="password" autoComplete="current-password" required error={errors.password?.message} {...register('password')} />
        <div className="text-right text-sm"><Link to="/forgot-password" className="font-semibold text-brand-700">Forgot password?</Link></div>
        <Button type="submit" loading={isSubmitting} className="w-full">Log in</Button>
      </form>
      <p className="mt-4 text-center text-sm text-ink-700">New here? <Link to={`/register${next ? `?next=${encodeURIComponent(next)}` : ''}`} className="font-semibold text-brand-700">Create an account</Link></p>
    </AuthCard>
  );
}

export function RegisterPage() {
  const { register: signUp } = useAuth();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const [top, setTop] = useState('');
  const { register, handleSubmit, setError, watch, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(registerSchema) });
  const next = params.get('next');
  const onSubmit = async ({ confirm, terms, phone, ...v }) => {
    setTop('');
    try { await signUp({ ...v, ...(phone ? { phone } : {}) }); nav(next && next.startsWith('/') ? next : '/dashboard', { replace: true }); } catch (e) { applyServerErrors(e, setError, setTop); }
  };
  return (
    <AuthCard title="Create your account" subtitle="Free. Save, compare, export and share estimates.">
      <Seo title="Create account" noindex />
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3" noValidate>
        {top && <Banner kind="danger">{top}</Banner>}
        <Input label="Full name" autoComplete="name" required error={errors.name?.message} {...register('name')} />
        <Input label="Email" type="email" autoComplete="email" required error={errors.email?.message} {...register('email')} />
        <Input label="Phone (optional)" type="tel" autoComplete="tel" error={errors.phone?.message} {...register('phone')} />
        <div><Input label="Password" type="password" autoComplete="new-password" required error={errors.password?.message} {...register('password')} /><StrengthMeter value={watch('password')} /></div>
        <Input label="Confirm password" type="password" autoComplete="new-password" required error={errors.confirm?.message} {...register('confirm')} />
        <Checkbox label={<>I accept the <Link to="/terms" className="font-semibold text-brand-700" target="_blank">terms</Link> and <Link to="/privacy" className="font-semibold text-brand-700" target="_blank">privacy policy</Link></>} error={errors.terms?.message} {...register('terms')} />
        <Button type="submit" loading={isSubmitting} className="w-full">Create account</Button>
      </form>
      <p className="mt-4 text-center text-sm text-ink-700">Already registered? <Link to="/login" className="font-semibold text-brand-700">Log in</Link></p>
    </AuthCard>
  );
}

export function ForgotPage() {
  const [done, setDone] = useState(false);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(forgotSchema) });
  return (
    <AuthCard title="Forgot password" subtitle="Enter your email and we will send a reset link.">
      <Seo title="Forgot password" noindex />
      {done ? <Banner kind="success" title="Check your email">If an account exists for that address, a reset link is on its way. It works for 30 minutes.</Banner> : (
        <form onSubmit={handleSubmit(async (v) => { try { await authApi.forgot(v.email); } catch { /* neutral either way */ } setDone(true); })} className="space-y-3" noValidate>
          <Input label="Email" type="email" required error={errors.email?.message} {...register('email')} />
          <Button type="submit" loading={isSubmitting} className="w-full">Send reset link</Button>
        </form>)}
      <p className="mt-4 text-center text-sm"><Link to="/login" className="font-semibold text-brand-700">Back to login</Link></p>
    </AuthCard>
  );
}

export function ResetPage() {
  const { token } = useParams();
  const nav = useNavigate();
  const [top, setTop] = useState('');
  const [done, setDone] = useState(false);
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(resetSchema) });
  const onSubmit = async (v) => { setTop(''); try { await authApi.reset(token, v.newPassword); setDone(true); setTimeout(() => nav('/login'), 1800); } catch (e) { setTop(e.message); } };
  return (
    <AuthCard title="Choose a new password">
      <Seo title="Reset password" noindex />
      {done ? <Banner kind="success" title="Password updated"><CheckCircle2 className="mr-1 inline h-4 w-4" aria-hidden />Redirecting to login...</Banner> : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3" noValidate>
          {top && <Banner kind="danger">{top}</Banner>}
          <div><Input label="New password" type="password" autoComplete="new-password" required error={errors.newPassword?.message} {...register('newPassword')} /><StrengthMeter value={watch('newPassword')} /></div>
          <Input label="Confirm password" type="password" autoComplete="new-password" required error={errors.confirm?.message} {...register('confirm')} />
          <Button type="submit" loading={isSubmitting} className="w-full">Update password</Button>
        </form>)}
    </AuthCard>
  );
}
