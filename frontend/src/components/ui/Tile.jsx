import { Check } from 'lucide-react';

// Selection card: role=radio inside a TileGroup (role=radiogroup) with arrow-key navigation.
export function Tile({ icon: Icon, title, helper, selected, disabled, onSelect, children, compact = false, badge }) {
  return (
    <button type="button" role="radio" aria-checked={selected} aria-disabled={disabled || undefined} disabled={disabled} tabIndex={selected || selected === undefined ? 0 : -1} onClick={onSelect}
      className={`relative flex w-full gap-3 rounded-2xl border p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-50 ${compact ? 'items-center' : 'flex-col sm:items-start'} ${selected ? 'border-brand-500 bg-brand-50/90 ring-2 ring-brand-500/30' : 'border-white/70 bg-white/60 hover:bg-white/90'}`}>
      {selected && <span className="absolute right-3 top-3 grid h-6 w-6 place-items-center rounded-full bg-brand-600 text-white"><Check className="h-4 w-4" aria-hidden /></span>}
      {Icon && <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${selected ? 'bg-brand-600 text-white' : 'bg-brand-50 text-brand-600'}`}><Icon className="h-6 w-6" strokeWidth={1.75} aria-hidden /></span>}
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2 font-display text-[17px] font-bold text-ink-900">{title}{badge}</span>
        {helper && <span className="mt-0.5 block text-sm text-ink-500">{helper}</span>}
        {children}
      </span>
    </button>
  );
}

export function TileGroup({ label, className = '', children }) {
  const onKey = (e) => {
    if (!['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown'].includes(e.key)) return;
    const items = [...e.currentTarget.querySelectorAll('[role="radio"]:not(:disabled)')];
    const i = items.indexOf(document.activeElement);
    if (i < 0) return;
    e.preventDefault();
    const next = items[(i + (e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length];
    next.focus(); next.click();
  };
  return <div role="radiogroup" aria-label={label} onKeyDown={onKey} className={className}>{children}</div>;
}
