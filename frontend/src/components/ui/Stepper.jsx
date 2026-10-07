import { Check } from 'lucide-react';

// steps: [{ id, label, skipped }]. Only completed steps are clickable.
export function Stepper({ steps, current, onStep }) {
  const visible = steps.filter((s) => !s.skipped);
  const idx = visible.findIndex((s) => s.id === current);
  return (
    <nav aria-label="Estimate steps">
      <div className="sm:hidden">
        <p className="mb-1 text-sm font-semibold text-brand-700">Step {idx + 1} of {visible.length}: {visible[idx]?.label}</p>
        <div className="h-2 overflow-hidden rounded-full bg-ink-300/50" role="progressbar" aria-valuemin={1} aria-valuemax={visible.length} aria-valuenow={idx + 1}>
          <div className="h-full rounded-full bg-brand-600 transition-all" style={{ width: `${((idx + 1) / visible.length) * 100}%` }} />
        </div>
      </div>
      <ol className="hidden items-center sm:flex">
        {visible.map((s, i) => {
          const done = i < idx; const active = i === idx;
          return (
            <li key={s.id} className="flex flex-1 items-center last:flex-none" aria-current={active ? 'step' : undefined}>
              <button type="button" disabled={!done} onClick={() => onStep(s.id)} className="group flex flex-col items-center gap-1 disabled:cursor-default">
                <span className={`grid h-9 w-9 place-items-center rounded-full text-sm font-bold transition ${done ? 'bg-brand-600 text-white' : active ? 'bg-accent-500 text-white ring-4 ring-accent-200' : 'bg-white/80 text-ink-500 ring-1 ring-ink-300'}`}>
                  {done ? <Check className="h-4 w-4" aria-hidden /> : i + 1}
                </span>
                <span className={`text-xs font-medium ${active ? 'text-ink-900' : 'text-ink-500'}`}>{s.label}</span>
              </button>
              {i < visible.length - 1 && <span className={`mx-2 mb-5 h-0.5 flex-1 rounded ${done ? 'bg-brand-600' : 'bg-ink-300'}`} aria-hidden />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
