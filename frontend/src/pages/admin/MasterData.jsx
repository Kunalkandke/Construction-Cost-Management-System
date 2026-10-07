import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Seo } from '../../components/layout/Seo';
import { GlassCard } from '../../components/ui/GlassCard';
import { Button } from '../../components/ui/Button';
import { Textarea } from '../../components/ui/Form';
import { Badge, Banner } from '../../components/ui/Feedback';
import { Tabs } from '../../components/ui/Tabs';
import { adminApi } from '../../api/admin';
import { useAuth } from '../../hooks/useAuth';
import { formatNumber } from '../../lib/format';
import { PageHeader, ResourceEditor, useAct } from './adminKit';

const num = (key, header) => ({ key, header, align: 'right', render: (r) => formatNumber(r[key], 4).replace(/\.?0+$/, '') });
const yes = (key) => (r) => (r[key] ? <Badge tone="success">Active</Badge> : <Badge tone="neutral">Inactive</Badge>);
const n = (name, label, extra = {}) => ({ name, label, type: 'number', ...extra });
const t = (name, label, extra = {}) => ({ name, label, type: 'text', ...extra });
const j = (name, label, extra = {}) => ({ name, label, type: 'json', ...extra });
const b = (name, label, extra = {}) => ({ name, label, type: 'bool', ...extra });

const TABS = {
  norms: { label: 'Consumption norms', path: '/norms', noun: 'norm', canCreate: true, canDelete: 'super',
    columns: [{ key: 'key', header: 'Key' }, { key: 'category', header: 'Category' }, { key: 'unit', header: 'Unit' }, num('basic', 'Basic'), num('standard', 'Standard'), num('premium', 'Premium'), { key: 'version', header: 'Ver.', align: 'right' }, { key: 'description', header: 'Meaning' }],
    fields: [t('key', 'Key', { createOnly: true, hint: 'UPPER_SNAKE_CASE' }), t('category', 'Category'), t('description', 'Description', { optional: true }), t('unit', 'Unit', { optional: true }), n('basic', 'Basic'), n('standard', 'Standard'), n('premium', 'Premium'), t('notes', 'Notes', { optional: true })] },
  bhk: { label: 'BHK table', path: '/bhk-configs', noun: 'BHK configuration', canCreate: true,
    columns: [{ key: 'bhk', header: 'BHK' }, { key: 'bedrooms', header: 'Bed', align: 'right' }, { key: 'bathrooms', header: 'Bath', align: 'right' }, { key: 'electricalPoints', header: 'Points', align: 'right' }, { key: 'doors', header: 'Doors', align: 'right' }, { key: 'windows', header: 'Windows', align: 'right' }, { key: 'persons', header: 'Persons', align: 'right' }, { key: 'typicalMinSqm', header: 'Min sqm', align: 'right' }, { key: 'typicalMaxSqm', header: 'Max sqm', align: 'right' }],
    fields: [n('bhk', 'BHK (1-5)', { createOnly: true }), ...['bedrooms', 'halls', 'kitchens', 'bathrooms', 'balconies', 'electricalPoints', 'doors', 'windows', 'persons'].map((k) => n(k, k.replace(/([A-Z])/g, ' $1'))), n('typicalMinSqm', 'Typical minimum area / floor (sqm)'), n('typicalMaxSqm', 'Typical maximum area / floor (sqm)')] },
  tiers: { label: 'Quality tiers', path: '/quality-tiers', noun: 'tier',
    columns: [{ key: 'code', header: 'Code' }, { key: 'name', header: 'Name' }, { key: 'steelKgPerSqm', header: 'Steel kg/sqm', align: 'right' }, { key: 'benchmarkMinPerSqft', header: 'Bench. min', align: 'right' }, { key: 'benchmarkMaxPerSqft', header: 'Bench. max', align: 'right' }, { key: 'multipliers', header: 'Multipliers', render: (r) => <code className="text-xs">{Object.entries(r.multipliers || {}).map(([k, v]) => `${k.slice(0, 3)} ${v}`).join(' ')}</code> }],
    fields: [t('name', 'Name'), t('description', 'Description', { optional: true }), j('multipliers', 'Multipliers (structure, finishing, electrical, plumbing, openings: 0.5 to 2)'), n('steelKgPerSqm', 'Steel (kg per sqm)'), n('benchmarkMinPerSqft', 'Benchmark minimum (Rs/sqft)'), n('benchmarkMaxPerSqft', 'Benchmark maximum (Rs/sqft)')] },
  structure: { label: 'Structure types', path: '/structure-types', noun: 'structure type',
    columns: [{ key: 'code', header: 'Code' }, { key: 'name', header: 'Name' }, { key: 'maxFloorCount', header: 'Max floors', align: 'right' }, { key: 'costMultiplier', header: 'Cost multiplier', align: 'right' }, { key: 'normOverrides', header: 'Norm overrides', render: (r) => <code className="text-xs">{JSON.stringify(r.normOverrides)}</code> }],
    fields: [t('name', 'Name'), n('maxFloorCount', 'Maximum floors'), n('costMultiplier', 'Cost multiplier (0.5 to 2)'), j('normOverrides', 'Norm overrides (multiplicative factors, e.g. {"N_RCC_SUPER": 0.8, "steelKg": 0.85})')] },
  house: { label: 'House types', path: '/house-types', noun: 'house type', canCreate: true, canDelete: true,
    columns: [{ key: 'code', header: 'Code' }, { key: 'name', header: 'Name' }, { key: 'sortOrder', header: 'Order', align: 'right' }, { key: 'isActive', header: 'Status', render: yes('isActive') }, { key: 'template', header: 'Template', render: (r) => <code className="text-xs">{`foundation ${r.template?.includeFoundationShare}, septic ${r.template?.includeSeptic ? 'Y' : 'N'}`}</code> }],
    fields: [t('code', 'Code', { createOnly: true }), t('name', 'Name'), t('description', 'Description', { optional: true }), t('icon', 'Icon (Home, Rows3, Building2, Landmark)', { optional: true }), n('sortOrder', 'Sort order'), b('isActive', 'Active', { default: true }),
      j('template', 'Template flags (includeFoundationShare 0-1, includeCompoundWall, includeSeptic, includeOverheadTank, includeStaircase, commonAreaLoad, defaultAddons[])', { default: { includeFoundationShare: 1, includeCompoundWall: false, includeSeptic: true, includeOverheadTank: true, includeStaircase: true, commonAreaLoad: 1, defaultAddons: [] } })] },
  floors: { label: 'Floor options', path: '/floor-options', noun: 'floor option', canCreate: true, canDelete: true,
    columns: [{ key: 'code', header: 'Code' }, { key: 'floorCount', header: 'Floors', align: 'right' }, { key: 'floorFactorFoundation', header: 'Foundation factor', align: 'right' }, { key: 'isActive', header: 'Status', render: yes('isActive') }],
    fields: [t('code', 'Code (G, G+1, G+2)', { createOnly: true }), n('floorCount', 'Floor count (1-3)'), n('floorFactorFoundation', 'Foundation factor'), b('isActive', 'Active', { default: true })] },
  locations: { label: 'Locations', path: '/locations', noun: 'location', canCreate: true, canDelete: true,
    columns: [{ key: 'displayName', header: 'Name' }, { key: 'district', header: 'District' }, { key: 'costIndex', header: 'Cost index', align: 'right' }, { key: 'leadLiftFactor', header: 'Lead/lift', align: 'right' }, { key: 'isActive', header: 'Status', render: yes('isActive') }],
    fields: [t('state', 'State', { default: 'Maharashtra' }), t('district', 'District'), t('taluka', 'Taluka', { optional: true }), t('displayName', 'Display name'), n('costIndex', 'Cost index (0.70 to 1.50)'), n('leadLiftFactor', 'Lead/lift factor (0.80 to 1.50)'), b('isActive', 'Active', { default: true })] },
  coeff: { label: 'Material coefficients', path: '/material-coefficients', noun: 'coefficient', canCreate: true, canDelete: true,
    columns: [{ key: 'itemCode', header: 'Item code' }, { key: 'material', header: 'Material' }, num('perUnit', 'Per unit')],
    fields: [t('itemCode', 'Item code', { createOnly: true }), { name: 'material', label: 'Material', type: 'select', createOnly: true, default: 'cement_bag', options: ['cement_bag', 'sand_cum', 'aggregate_cum', 'brick_no', 'steel_kg', 'tile_sqm', 'paint_litre'].map((v) => ({ value: v, label: v })) }, n('perUnit', 'Quantity per unit of the item')] },
};

function AddonCatalogue() {
  const { isSuper } = useAuth();
  const { act, busy } = useAct();
  const { data } = useQuery({ queryKey: ['admin', '/settings'], queryFn: () => adminApi.get('/settings') });
  const [text, setText] = useState(null);
  const row = data?.find((s) => s.key === 'addon_catalogue');
  const shown = text ?? JSON.stringify(row?.value ?? [], null, 2);
  const save = async () => { let v; try { v = JSON.parse(shown); } catch { act(() => Promise.reject(new Error('Invalid JSON')), ''); return; } await act(() => adminApi.patch('/settings', { values: { addon_catalogue: v } }), 'Add-on catalogue saved'); setText(null); };
  return (
    <GlassCard strong className="space-y-3"><p className="text-sm text-ink-500">Each add-on needs a matching rate item (same code) in the rate set. Fields: code, label, unit, defaultOn, recommended, allowsQty, allowsPct, hint.</p>
      {!isSuper && <Banner kind="info">Only a super admin can edit the catalogue.</Banner>}
      <Textarea aria-label="Add-on catalogue JSON" rows={18} className="font-mono text-xs" value={shown} onChange={(e) => setText(e.target.value)} readOnly={!isSuper} />
      {isSuper && <Button loading={busy} onClick={save}>Save catalogue</Button>}</GlassCard>
  );
}

export default function MasterData({ initial = 'norms' }) {
  const [tab, setTab] = useState(initial);
  const { isSuper } = useAuth();
  const cfg = TABS[tab];
  return (
    <div><Seo title="Norms and master data" noindex />
      <PageHeader title="Norms and master data" subtitle="Changes apply to NEW calculations immediately and are written to the audit log." />
      <Tabs value={tab} onChange={setTab} className="mb-4" tabs={[...Object.entries(TABS).map(([id, c]) => ({ id, label: c.label })), { id: 'addons', label: 'Add-on catalogue' }]} />
      {tab === 'addons' ? <AddonCatalogue /> : (
        <ResourceEditor key={tab} path={cfg.path} columns={cfg.columns} fields={cfg.fields} canCreate={Boolean(cfg.canCreate)} canDelete={cfg.canDelete === 'super' ? isSuper : Boolean(cfg.canDelete)} noun={cfg.noun} pageSize={50} />
      )}
    </div>
  );
}
