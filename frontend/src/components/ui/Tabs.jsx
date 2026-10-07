import { useId, useState } from 'react';
import { ChevronDown } from 'lucide-react';

export function Tabs({ tabs, value, onChange, className = '' }) {
  const base = useId();
  const onKey = (e) => {
    const i = tabs.findIndex((t) => t.id === value);
    if (e.key === 'ArrowRight') onChange(tabs[(i + 1) % tabs.length].id);
    if (e.key === 'ArrowLeft') onChange(tabs[(i - 1 + tabs.length) % tabs.length].id);
  };
  return (
    <div role="tablist" aria-label="Sections" onKeyDown={onKey} className={`flex gap-1 overflow-x-auto rounded-xl bg-white/50 p-1 ring-1 ring-white/70 ${className}`}>
      {tabs.map((t) => (
        <button key={t.id} id={`${base}-${t.id}`} type="button" role="tab" aria-selected={value === t.id} tabIndex={value === t.id ? 0 : -1} onClick={() => onChange(t.id)}
          className={`min-h-[40px] whitespace-nowrap rounded-lg px-4 text-sm font-semibold transition ${value === t.id ? 'bg-brand-600 text-white shadow' : 'text-ink-700 hover:bg-brand-50'}`}>
          {t.label}
        </button>
      ))}
    </div>
  );
}

export function Accordion({ items, defaultOpen = [], multiple = true }) {
  const [open, setOpen] = useState(defaultOpen);
  const toggle = (id) => setOpen((o) => (o.includes(id) ? o.filter((x) => x !== id) : multiple ? [...o, id] : [id]));
  return (
    <div className="divide-y divide-ink-300/50 overflow-hidden rounded-2xl border border-white/70 bg-white/60">
      {items.map((it) => {
        const isOpen = open.includes(it.id);
        return (
          <div key={it.id}>
            <h3>
              <button type="button" aria-expanded={isOpen} aria-controls={`acc-${it.id}`} onClick={() => toggle(it.id)} className="flex min-h-[52px] w-full items-center justify-between gap-3 px-4 py-3 text-left font-display text-[16px] font-bold">
                <span>{it.title}</span><ChevronDown className={`h-5 w-5 shrink-0 text-ink-500 transition ${isOpen ? 'rotate-180' : ''}`} aria-hidden />
              </button>
            </h3>
            {isOpen && <div id={`acc-${it.id}`} className="px-4 pb-4 text-sm text-ink-700">{it.content}</div>}
          </div>
        );
      })}
    </div>
  );
}
