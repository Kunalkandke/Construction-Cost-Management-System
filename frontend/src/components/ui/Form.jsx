import { forwardRef, useEffect, useId, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

export function Field({ label, hint, error, id, required, children, className = '' }) {
  return (
    <div className={className}>
      {label && <label htmlFor={id} className="mb-1 block text-sm font-medium text-ink-700">{label}{required && <span className="text-danger" aria-hidden> *</span>}</label>}
      {children}
      {hint && !error && <p id={`${id}-hint`} className="mt-1 text-xs text-ink-500">{hint}</p>}
      {error && <p id={`${id}-err`} role="alert" className="mt-1 text-xs font-medium text-danger">{error}</p>}
    </div>
  );
}
const aria = (id, error, hint) => ({ 'aria-invalid': error ? true : undefined, 'aria-describedby': error ? `${id}-err` : hint ? `${id}-hint` : undefined });

export const Input = forwardRef(function Input({ label, hint, error, suffix, className = '', fieldClass = '', type = 'text', required, ...props }, ref) {
  const id = useId();
  const [show, setShow] = useState(false);
  const isPw = type === 'password';
  return (
    <Field label={label} hint={hint} error={error} id={id} required={required} className={fieldClass}>
      <div className="relative">
        <input ref={ref} id={id} type={isPw && show ? 'text' : type} className={`glass-input ${suffix || isPw ? 'pr-16' : ''} ${error ? 'border-danger' : ''} ${className}`} {...aria(id, error, hint)} {...props} />
        {suffix && <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-ink-500">{suffix}</span>}
        {isPw && (
          <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-ink-500 hover:text-brand-700" aria-label={show ? 'Hide password' : 'Show password'}>
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        )}
      </div>
    </Field>
  );
});

export const Textarea = forwardRef(function Textarea({ label, hint, error, className = '', rows = 4, fieldClass = '', ...props }, ref) {
  const id = useId();
  return (
    <Field label={label} hint={hint} error={error} id={id} className={fieldClass}>
      <textarea ref={ref} id={id} rows={rows} className={`glass-input ${error ? 'border-danger' : ''} ${className}`} {...aria(id, error, hint)} {...props} />
    </Field>
  );
});

export const Select = forwardRef(function Select({ label, hint, error, options, children, placeholder, className = '', fieldClass = '', ...props }, ref) {
  const id = useId();
  return (
    <Field label={label} hint={hint} error={error} id={id} className={fieldClass}>
      <select ref={ref} id={id} className={`glass-input appearance-none bg-[length:1rem] pr-8 ${error ? 'border-danger' : ''} ${className}`} {...aria(id, error, hint)} {...props}>
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options ? options.map((o) => <option key={o.value} value={o.value} disabled={o.disabled}>{o.label}</option>) : children}
      </select>
    </Field>
  );
});

// Controlled numeric input. `group` shows Indian digit grouping while typing (budget fields).
export function NumberInput({ label, hint, error, value, onChange, suffix, group = false, decimal = true, placeholder, className = '', fieldClass = '', ...props }) {
  const id = useId();
  const fmt = (v) => (v === null || v === undefined || Number.isNaN(v) ? '' : group ? new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(v) : String(v));
  const [text, setText] = useState(fmt(value));
  useEffect(() => {
    const parsed = Number(String(text).replace(/,/g, ''));
    if ((value ?? null) !== (Number.isFinite(parsed) && text !== '' ? parsed : null)) setText(fmt(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  const handle = (e) => {
    const raw = e.target.value.replace(/,/g, '');
    if (raw !== '' && !(decimal ? /^\d*\.?\d{0,2}$/ : /^\d*$/).test(raw)) return;
    const n = raw === '' || raw === '.' ? null : Number(raw);
    setText(group && n !== null && !raw.endsWith('.') ? fmt(n) : raw);
    onChange?.(n);
  };
  return (
    <Field label={label} hint={hint} error={error} id={id} className={fieldClass}>
      <div className="relative">
        <input id={id} inputMode={decimal ? 'decimal' : 'numeric'} value={text} onChange={handle} placeholder={placeholder} className={`glass-input tabular ${suffix ? 'pr-16' : ''} ${error ? 'border-danger' : ''} ${className}`} {...aria(id, error, hint)} {...props} />
        {suffix && <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-ink-500">{suffix}</span>}
      </div>
    </Field>
  );
}

export function Toggle({ checked, onChange, label, description, disabled }) {
  return (
    <button type="button" role="switch" aria-checked={checked} disabled={disabled} onClick={() => onChange(!checked)} className="flex min-h-[44px] w-full items-center justify-between gap-3 text-left disabled:opacity-50">
      <span>
        <span className="block text-sm font-medium text-ink-900">{label}</span>
        {description && <span className="block text-xs text-ink-500">{description}</span>}
      </span>
      <span className={`relative h-6 w-11 shrink-0 rounded-full transition ${checked ? 'bg-brand-600' : 'bg-ink-300'}`}>
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${checked ? 'left-[22px]' : 'left-0.5'}`} />
      </span>
    </button>
  );
}

export const Checkbox = forwardRef(function Checkbox({ label, error, ...props }, ref) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="flex min-h-[44px] cursor-pointer items-center gap-2 text-sm text-ink-700">
        <input ref={ref} id={id} type="checkbox" className="h-5 w-5 rounded border-ink-300 text-brand-600" {...props} />
        <span>{label}</span>
      </label>
      {error && <p role="alert" className="text-xs font-medium text-danger">{error}</p>}
    </div>
  );
});

export function SegmentedControl({ options, value, onChange, label, className = '' }) {
  return (
    <div className={className}>
      {label && <p className="mb-1 text-sm font-medium text-ink-700">{label}</p>}
      <div role="radiogroup" aria-label={label} className="inline-flex w-full flex-wrap gap-1 rounded-xl bg-white/60 p-1 ring-1 ring-ink-300/60 sm:w-auto">
        {options.map((o) => (
          <button key={o.value} type="button" role="radio" aria-checked={value === o.value} disabled={o.disabled} title={o.hint} onClick={() => onChange(o.value)}
            className={`min-h-[40px] flex-1 rounded-lg px-3 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${value === o.value ? 'bg-brand-600 text-white shadow' : 'text-ink-700 hover:bg-brand-50'}`}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function Slider({ label, value, onChange, min, max, step = 1, format = (v) => v }) {
  const id = useId();
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm"><label htmlFor={id} className="font-medium text-ink-700">{label}</label><span className="num text-brand-700">{format(value)}</span></div>
      <input id={id} type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="h-2 w-full cursor-pointer accent-brand-600" />
    </div>
  );
}
