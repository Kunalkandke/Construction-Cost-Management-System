import { Tile, TileGroup } from '../../ui/Tile';
import { useWizardStore } from '../../../store/wizardStore';
import { iconFor } from '../../../lib/icons';

export function Step1HouseType({ meta }) {
  const { houseType, set } = useWizardStore();
  const pick = (h) => {
    const defaults = (h.template?.defaultAddons || []).map((code) => ({ code }));
    set({ houseType: h.code, addons: defaults, ...(h.code === 'FLAT' ? { floors: 'G', structureType: 'RCC_FRAME' } : {}) });
  };
  return (
    <div>
      <h2 className="text-2xl font-extrabold">What are you building?</h2>
      <p className="mb-5 text-ink-500">Choose the type of home. Bungalows come with compound wall, gate and landscaping pre-selected.</p>
      <TileGroup label="House type" className="grid gap-3 sm:grid-cols-2">
        {meta.houseTypes.map((h) => <Tile key={h.code} icon={iconFor(h.icon)} title={h.name} helper={h.description} selected={houseType === h.code} onSelect={() => pick(h)} />)}
      </TileGroup>
    </div>
  );
}
