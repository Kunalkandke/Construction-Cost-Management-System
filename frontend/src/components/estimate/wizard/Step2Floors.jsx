import toast from 'react-hot-toast';
import { Tile, TileGroup } from '../../ui/Tile';
import { useWizardStore } from '../../../store/wizardStore';
import { FLOOR_HELP } from '../../../lib/constants';

function Levels({ n }) {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      {Array.from({ length: n }, (_, i) => <rect key={i} x="5" y={17 - i * 5} width="14" height="4" rx="1" />)}
    </svg>
  );
}

export function Step2Floors({ meta }) {
  const { floors, structureType, set } = useWizardStore();
  const pick = (f) => {
    const patch = { floors: f.code };
    const st = meta.structureTypes.find((s) => s.code === structureType);
    if (st && f.floorCount > st.maxFloorCount) { patch.structureType = 'RCC_FRAME'; toast(`${st.name} allows at most ${st.maxFloorCount} floors, so RCC frame was selected.`, { icon: 'i' }); }
    if (f.code === 'G') patch.bhkMode = 'WHOLE_HOUSE';
    set(patch);
  };
  return (
    <div>
      <h2 className="text-2xl font-extrabold">How many floors?</h2>
      <p className="mb-5 text-ink-500">G means ground floor only. G+1 adds one upper floor, G+2 adds two.</p>
      <TileGroup label="Floors" className="grid gap-3 sm:grid-cols-3">
        {meta.floorOptions.map((f) => (
          <Tile key={f.code} title={f.code} helper={FLOOR_HELP[f.code]} selected={floors === f.code} onSelect={() => pick(f)}
            icon={() => <Levels n={f.floorCount} />} />
        ))}
      </TileGroup>
    </div>
  );
}
