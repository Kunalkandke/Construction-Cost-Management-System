import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Button } from '../../ui/Button';
import { Badge } from '../../ui/Feedback';
import { useWizardStore } from '../../../store/wizardStore';
import { formatArea } from '../../../lib/format';
import { titleCase } from '../../../lib/format';

export const STEPS = [
  { id: 1, label: 'House' }, { id: 2, label: 'Floors' }, { id: 3, label: 'Rooms' },
  { id: 4, label: 'Details' }, { id: 5, label: 'Add-ons' }, { id: 6, label: 'Review' },
];

export function WizardNav({ onBack, onNext, nextDisabled, nextLabel = 'Next', hideBack, nextLoading }) {
  return (
    <div className="mt-8 flex items-center justify-between gap-3">
      {hideBack ? <span /> : <Button variant="secondary" icon={ArrowLeft} onClick={onBack}>Back</Button>}
      <Button onClick={onNext} disabled={nextDisabled} loading={nextLoading}>{nextLabel}<ArrowRight className="h-4 w-4" aria-hidden /></Button>
    </div>
  );
}

// Live "Your selection" summary chips
export function SelectionSummary({ meta }) {
  const w = useWizardStore();
  const loc = meta?.locations?.find((l) => l.id === w.locationId)?.displayName;
  const items = [
    w.houseType && meta?.houseTypes?.find((h) => h.code === w.houseType)?.name,
    w.floors && w.houseType !== 'FLAT' && w.floors,
    w.bhk && `${w.bhk} BHK`,
    w.builtUpAreaSqm && `${formatArea(w.builtUpAreaSqm)}${w.areaBasis === 'PER_FLOOR' && w.floors && w.floors !== 'G' ? ' / floor' : ''}`,
    w.builtUpAreaSqm && titleCase(w.qualityTier),
    loc,
  ].filter(Boolean);
  return (
    <aside aria-label="Your selection" className="lg:sticky lg:top-24">
      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-500">Your selection</p>
      <div className="flex flex-wrap gap-1.5 lg:flex-col lg:items-start">
        {items.length ? items.map((i) => <Badge key={i} tone="brand">{i}</Badge>) : <span className="text-sm text-ink-500">Nothing chosen yet</span>}
      </div>
    </aside>
  );
}
