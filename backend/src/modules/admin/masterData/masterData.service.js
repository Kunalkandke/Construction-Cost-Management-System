import { supabase } from '../../../config/supabase.js';
import { makeCrud } from '../crud.js';

export const houseTypes = makeCrud({ table: 'house_types', entity: 'house_type', searchCols: ['code', 'name'], sortable: ['sort_order', 'name', 'created_at'], defaultSort: 'sort_order', ascending: true, removeStrategy: 'deactivate' });
export const floorOptions = makeCrud({ table: 'floor_options', entity: 'floor_option', searchCols: ['code'], sortable: ['floor_count', 'created_at'], defaultSort: 'floor_count', ascending: true, removeStrategy: 'deactivate' });
export const bhkConfigs = makeCrud({ table: 'bhk_configs', entity: 'bhk_config', sortable: ['bhk'], defaultSort: 'bhk', ascending: true, removeStrategy: 'hard' });
export const qualityTiers = makeCrud({ table: 'quality_tiers', entity: 'quality_tier', searchCols: ['code', 'name'], sortable: ['code', 'created_at'] });
export const structureTypes = makeCrud({ table: 'structure_types', entity: 'structure_type', searchCols: ['code', 'name'], sortable: ['code', 'created_at'] });
export const locations = makeCrud({
  table: 'locations', entity: 'location', searchCols: ['display_name', 'district'], sortable: ['display_name', 'district', 'cost_index', 'created_at'], defaultSort: 'display_name', ascending: true,
  // deactivate rather than delete when estimates reference the location
  chooseRemove: async (row) => {
    const { count } = await supabase.from('estimates').select('id', { count: 'exact', head: true }).eq('location_id', row.id);
    return count > 0 ? 'deactivate' : 'hard';
  },
});
export const materialCoefficients = makeCrud({ table: 'material_coefficients', entity: 'material_coefficient', searchCols: ['item_code', 'material'], sortable: ['item_code', 'created_at'], defaultSort: 'item_code', ascending: true, canDeactivate: false });
