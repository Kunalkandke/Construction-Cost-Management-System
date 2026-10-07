import { Toggle, NumberInput } from '../../ui/Form';
import { GlassCard } from '../../ui/GlassCard';
import { Badge, Hint } from '../../ui/Feedback';
import { useWizardStore } from '../../../store/wizardStore';

export function Step5Addons({ meta }) {
  const w = useWizardStore();
  const gstEnabled = meta.settings.gstEnabled;
  const selected = (code) => w.addons.find((a) => a.code === code);
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div><h2 className="text-2xl font-extrabold">Optional add-ons</h2><p className="text-ink-500">Everything here is optional. Waterproofing is recommended in monsoon regions.</p></div>
        <Badge tone="brand">{w.addons.length} selected</Badge>
      </div>
      <ul className="space-y-3">
        {meta.addons.map((a) => {
          const sel = selected(a.code);
          return (
            <li key={a.code}>
              <GlassCard strong padding="p-4">
                <Toggle checked={Boolean(sel)} onChange={() => w.toggleAddon(a.code)} label={<>{a.label} {a.recommended && <Badge tone="success">Recommended</Badge>}</>} description={`${a.hint || ''} (${a.unit})`} />
                {sel && a.allowsPct && <NumberInput fieldClass="mt-2 max-w-xs" label="Percent of built-up area to cover" suffix="%" value={sel.pct ?? null} onChange={(n) => w.patchAddon(a.code, { pct: n === null ? undefined : Math.min(100, n) })} />}
                {sel && a.allowsQty && <NumberInput fieldClass="mt-2 max-w-xs" label={`Quantity override (${a.unit}), optional`} suffix={a.unit} value={sel.qty ?? null} onChange={(n) => w.patchAddon(a.code, { qty: n === null ? undefined : n })} hint="Leave empty to let us size it." />}
                {sel && a.code === 'ADD_COMPOUND_WALL' && <NumberInput fieldClass="mt-2 max-w-xs" label="Plot area (sqm), optional" suffix="sqm" value={w.plotAreaSqm} onChange={(n) => w.set({ plotAreaSqm: n })} hint="Helps size the compound wall." />}
              </GlassCard>
            </li>
          );
        })}
      </ul>
      <GlassCard strong padding="p-4" className="space-y-1">
        <Toggle checked={w.includeSoftCosts} onChange={(v) => w.set({ includeSoftCosts: v })} label={<>Include professional and statutory fees <Hint tip={`Architect, structural engineer and approval fees, about ${meta.settings.softCostPercent}% of the subtotal.`}>info</Hint></>} description="Architect, engineer, permissions" />
        {gstEnabled && <Toggle checked={w.includeGst} onChange={(v) => w.set({ includeGst: v })} label="Include GST" description={`${meta.settings.gstPercent}% on works`} />}
      </GlassCard>
    </div>
  );
}
