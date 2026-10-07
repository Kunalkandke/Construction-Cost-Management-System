import { Tile, TileGroup } from '../../ui/Tile';
import { SegmentedControl } from '../../ui/Form';
import { GlassCard } from '../../ui/GlassCard';
import { Hint } from '../../ui/Feedback';
import { useWizardStore } from '../../../store/wizardStore';

const ROWS = [['bedrooms', 'Bedrooms'], ['halls', 'Hall'], ['kitchens', 'Kitchen'], ['bathrooms', 'Bathrooms'], ['balconies', 'Balconies'], ['electricalPoints', 'Electrical points'], ['doors', 'Doors'], ['windows', 'Windows']];

export function Step3Config({ meta }) {
  const { bhk, bhkMode, floors, houseType, set } = useWizardStore();
  const cfg = meta.bhkConfigs.find((b) => b.bhk === bhk);
  const multi = floors && floors !== 'G' && houseType !== 'FLAT';
  const floorCount = meta.floorOptions.find((f) => f.code === floors)?.floorCount || 1;
  const mult = bhkMode === 'PER_FLOOR' ? floorCount : 1;
  return (
    <div>
      <h2 className="text-2xl font-extrabold">How many bedrooms?</h2>
      <p className="mb-5 text-ink-500">We derive rooms, doors, windows and electrical points from your choice.</p>
      <TileGroup label="BHK" className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {meta.bhkConfigs.map((b) => <Tile key={b.bhk} compact title={`${b.bhk} BHK`} helper={`${b.bedrooms} bedroom${b.bedrooms > 1 ? 's' : ''}`} selected={bhk === b.bhk} onSelect={() => set({ bhk: b.bhk })} />)}
      </TileGroup>
      {multi && (
        <div className="mt-5">
          <SegmentedControl label="Rooms apply to" value={bhkMode} onChange={(v) => set({ bhkMode: v })}
            options={[{ value: 'WHOLE_HOUSE', label: 'Rooms for whole house' }, { value: 'PER_FLOOR', label: 'Rooms per floor' }]} />
          <p className="mt-1 text-xs text-ink-500">
            <Hint tip="Whole house: a 2BHK has 2 bedrooms in total, spread over all floors. Per floor: every floor gets 2 bedrooms.">What is the difference?</Hint>
          </p>
        </div>
      )}
      {cfg && (
        <GlassCard strong className="mt-6" aria-live="polite">
          <h3 className="mb-3 font-bold">Auto-derived for {cfg.bhk} BHK</h3>
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {ROWS.map(([k, label]) => (
              <div key={k}><dt className="text-xs text-ink-500">{label}</dt><dd className="num text-xl">{cfg[k] * mult}</dd></div>
            ))}
          </dl>
        </GlassCard>
      )}
    </div>
  );
}
