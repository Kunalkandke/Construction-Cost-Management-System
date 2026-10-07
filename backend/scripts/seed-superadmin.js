// Creates (or promotes) the initial super admin from SUPERADMIN_EMAIL / SUPERADMIN_PASSWORD. Run once after the SQL seeds.
import bcrypt from 'bcryptjs';
import { env } from '../src/config/env.js';
import { supabase } from '../src/config/supabase.js';
import { passwordSchema } from '../src/modules/auth/auth.schema.js';

const email = env.SUPERADMIN_EMAIL?.toLowerCase();
const password = env.SUPERADMIN_PASSWORD;
if (!email || !password) { console.error('Set SUPERADMIN_EMAIL and SUPERADMIN_PASSWORD in .env'); process.exit(1); }
const check = passwordSchema.safeParse(password);
if (!check.success) { console.error(`SUPERADMIN_PASSWORD rejected: ${check.error.issues.map((i) => i.message).join('; ')}`); process.exit(1); }

const password_hash = await bcrypt.hash(password, env.BCRYPT_ROUNDS);
const { data: existing } = await supabase.from('users').select('id').eq('email', email).maybeSingle();
if (existing) {
  const { error } = await supabase.from('users').update({ role: 'super_admin', status: 'active', password_hash, deleted_at: null, failed_login_count: 0, locked_until: null }).eq('id', existing.id);
  if (error) { console.error(error.message); process.exit(1); }
  console.log(`Updated existing user ${email} to super_admin (password reset).`);
} else {
  const { error } = await supabase.from('users').insert({ name: 'Super Admin', email, password_hash, role: 'super_admin' });
  if (error) { console.error(error.message); process.exit(1); }
  console.log(`Created super admin ${email}. Log in and change the password.`);
}
process.exit(0);
