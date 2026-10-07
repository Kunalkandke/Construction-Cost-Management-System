// Usage: node scripts/import-rates.js --file rates.csv [--set-id <uuid> | --name "PWD SSR 2026-27" --fy 2026-27 [--effective 2026-04-01] [--verified]] [--commit]
// Without --commit this is a dry run (validation + diff only). Items are imported into a DRAFT set; publish from the admin API.
import fs from 'node:fs';
import { supabase } from '../src/config/supabase.js';
import { importCsv } from '../src/modules/admin/rateItems/rateItems.service.js';

const args = process.argv.slice(2);
const get = (f) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : undefined; };
const has = (f) => args.includes(f);
const file = get('--file');
if (!file) { console.error('Missing --file'); process.exit(1); }
const buffer = fs.readFileSync(file);
const ctx = { actorId: null, ip: 'cli' };
let setId = get('--set-id');

try {
  if (!setId) {
    const name = get('--name'); const fy = get('--fy');
    if (!name || !fy) { console.error('Provide --set-id, or --name and --fy to create a new draft set'); process.exit(1); }
    if (!has('--commit')) { console.log('Dry run on a temporary draft set (will be removed).'); }
    const { data, error } = await supabase.from('rate_sets').insert({ name, fiscal_year: fy, effective_from: get('--effective') || null, is_verified: has('--verified'), status: 'draft', source_label: 'CLI import' }).select('id').single();
    if (error) throw new Error(error.message);
    setId = data.id;
    if (!has('--commit')) {
      const r = await importCsv(ctx, setId, buffer, { dryRun: true });
      await supabase.from('rate_sets').delete().eq('id', setId);
      console.log(JSON.stringify(r, null, 2));
      process.exit(r.summary.errorCount ? 2 : 0);
    }
  }
  const r = await importCsv(ctx, setId, buffer, { dryRun: !has('--commit') });
  console.log(JSON.stringify(r, null, 2));
  if (has('--commit')) console.log(`Imported into draft rate set ${setId}. Review and publish via POST /api/v1/admin/rate-sets/${setId}/publish`);
  process.exit(r.summary.errorCount ? 2 : 0);
} catch (e) {
  console.error('Import failed:', e.message, e.details ? JSON.stringify(e.details.slice(0, 20), null, 2) : '');
  process.exit(1);
}
