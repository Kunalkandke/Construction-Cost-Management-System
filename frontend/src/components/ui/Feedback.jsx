import { AlertTriangle, CheckCircle2, Info, Loader2, RefreshCw, X, Inbox, HelpCircle } from 'lucide-react';
import { Button } from './Button';

const TONES = {
  neutral: 'bg-ink-100 text-ink-700 ring-ink-300', brand: 'bg-brand-50 text-brand-700 ring-brand-100', accent: 'bg-accent-50 text-accent-600 ring-accent-200',
  success: 'bg-success-50 text-success ring-green-200', warning: 'bg-warning-50 text-warning ring-amber-200', danger: 'bg-danger-50 text-danger ring-red-200', info: 'bg-info-50 text-info ring-sky-200',
};
export const Badge = ({ tone = 'neutral', icon: Icon, children, className = '' }) => (
  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${TONES[tone]} ${className}`}>{Icon && <Icon className="h-3 w-3" aria-hidden />}{children}</span>
);

const BANNER = { info: ['bg-info-50 text-sky-900 border-sky-200', Info], warning: ['bg-warning-50 text-amber-900 border-amber-200', AlertTriangle], success: ['bg-success-50 text-green-900 border-green-200', CheckCircle2], danger: ['bg-danger-50 text-red-900 border-red-200', AlertTriangle] };
export function Banner({ kind = 'info', title, children, onDismiss, className = '' }) {
  const [cls, Icon] = BANNER[kind] || BANNER.info;
  return (
    <div role={kind === 'danger' || kind === 'warning' ? 'alert' : 'status'} className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${cls} ${className}`}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <div className="min-w-0 flex-1">{title && <p className="font-semibold">{title}</p>}<div>{children}</div></div>
      {onDismiss && <button type="button" onClick={onDismiss} aria-label="Dismiss" className="rounded p-1 hover:bg-black/5"><X className="h-4 w-4" /></button>}
    </div>
  );
}

export const Skeleton = ({ className = 'h-6 w-full' }) => <div className={`skeleton ${className}`} aria-hidden />;
export const Spinner = ({ className = 'h-5 w-5' }) => <Loader2 className={`animate-spin text-brand-600 ${className}`} aria-label="Loading" />;
export const PageSkeleton = () => (
  <div className="container-page space-y-4 py-10" role="status" aria-label="Loading page">
    <Skeleton className="h-10 w-1/3" /><Skeleton className="h-40 w-full" /><Skeleton className="h-40 w-full" />
  </div>
);

export function EmptyState({ icon: Icon = Inbox, title, children, action }) {
  return (
    <div className="flex flex-col items-center gap-3 px-4 py-12 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-50 text-brand-600"><Icon className="h-7 w-7" strokeWidth={1.5} aria-hidden /></span>
      <h3 className="text-lg font-bold">{title}</h3>
      {children && <p className="max-w-md text-sm text-ink-500">{children}</p>}
      {action}
    </div>
  );
}
export function ErrorState({ error, onRetry, title = 'Something went wrong' }) {
  return (
    <div role="alert" className="flex flex-col items-center gap-3 px-4 py-12 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-danger-50 text-danger"><AlertTriangle className="h-7 w-7" aria-hidden /></span>
      <h3 className="text-lg font-bold">{title}</h3>
      <p className="max-w-md text-sm text-ink-500">{error?.message || 'Please try again.'}</p>
      {onRetry && <Button variant="secondary" icon={RefreshCw} onClick={onRetry}>Retry</Button>}
    </div>
  );
}

export function KpiCard({ label, value, hint, icon: Icon, accent = false, children }) {
  return (
    <div className="glass p-5">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-ink-500">{label}</p>
        {Icon && <Icon className="h-5 w-5 text-brand-500" strokeWidth={1.75} aria-hidden />}
      </div>
      <p className={`num mt-1 font-display text-2xl sm:text-3xl ${accent ? 'text-accent-600' : 'text-ink-900'}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-ink-500">{hint}</p>}
      {children}
    </div>
  );
}

// Glossary tooltip: hover or keyboard focus
export function Term({ children, tip }) {
  return (
    <span className="group relative inline-flex items-center gap-0.5">
      <span className="border-b border-dotted border-ink-500">{children}</span>
      <button type="button" aria-label={`What is ${children}?`} className="rounded-full text-ink-500"><HelpCircle className="h-3.5 w-3.5" aria-hidden /></button>
      <span role="tooltip" className="pointer-events-none invisible absolute bottom-full left-1/2 z-30 mb-1 w-56 -translate-x-1/2 rounded-lg bg-ink-900 px-3 py-2 text-xs font-normal text-white opacity-0 shadow-lg transition group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">{tip}</span>
    </span>
  );
}
export const Hint = Term;
