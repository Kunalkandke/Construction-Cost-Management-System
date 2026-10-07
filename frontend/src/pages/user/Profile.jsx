import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import { LogOut } from 'lucide-react';
import { Seo } from '../../components/layout/Seo';
import { GlassCard } from '../../components/ui/GlassCard';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Form';
import { Banner } from '../../components/ui/Feedback';
import { ConfirmDialog } from '../../components/ui/Overlay';
import { useAuth } from '../../hooks/useAuth';
import { useAuthStore } from '../../store/authStore';
import { authApi } from '../../api/auth';
import { metaApi } from '../../api/meta';
import { changePasswordSchema, profileSchema } from '../../lib/validators';

export default function Profile() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const [delOpen, setDelOpen] = useState(false);
  const [pwErr, setPwErr] = useState('');
  const p = useForm({ resolver: zodResolver(profileSchema), defaultValues: { name: user?.name || '', phone: user?.phone || '' } });
  const c = useForm({ resolver: zodResolver(changePasswordSchema) });
  const saveProfile = async (v) => { try { useAuthStore.getState().setUser(await authApi.patchMe({ name: v.name, phone: v.phone || null })); toast.success('Profile updated'); } catch (e) { toast.error(e.message); } };
  const savePw = async (v) => {
    setPwErr('');
    try { await authApi.changePassword({ currentPassword: v.currentPassword, newPassword: v.newPassword }); toast.success('Password changed. Other devices were signed out.'); c.reset(); }
    catch (e) { (e.details || []).forEach((d) => c.setError(d.path, { message: d.message })); if (!e.details?.length) setPwErr(e.message); }
  };
  const requestDelete = async () => {
    try { await metaApi.contact({ name: user.name, email: user.email, subject: 'Account deletion request', message: `Please delete my account (${user.email}) and associated data.` }); toast.success('Request sent. We will confirm by email.'); setDelOpen(false); } catch (e) { toast.error(e.message); }
  };
  return (
    <div className="container-page max-w-2xl space-y-5 py-8"><Seo title="Profile" noindex />
      <h1 className="text-3xl font-extrabold">Your profile</h1>
      <GlassCard strong><h2 className="mb-3 text-lg font-bold">Details</h2>
        <form onSubmit={p.handleSubmit(saveProfile)} className="space-y-3" noValidate>
          <Input label="Email" value={user?.email || ''} disabled readOnly hint="Email cannot be changed." />
          <Input label="Name" required error={p.formState.errors.name?.message} {...p.register('name')} />
          <Input label="Phone" type="tel" error={p.formState.errors.phone?.message} {...p.register('phone')} />
          <Button type="submit" loading={p.formState.isSubmitting}>Save changes</Button>
        </form></GlassCard>
      <GlassCard strong><h2 className="mb-3 text-lg font-bold">Change password</h2>
        <form onSubmit={c.handleSubmit(savePw)} className="space-y-3" noValidate>
          {pwErr && <Banner kind="danger">{pwErr}</Banner>}
          <Input label="Current password" type="password" autoComplete="current-password" error={c.formState.errors.currentPassword?.message} {...c.register('currentPassword')} />
          <Input label="New password" type="password" autoComplete="new-password" error={c.formState.errors.newPassword?.message} {...c.register('newPassword')} />
          <Input label="Confirm new password" type="password" autoComplete="new-password" error={c.formState.errors.confirm?.message} {...c.register('confirm')} />
          <Button type="submit" loading={c.formState.isSubmitting}>Change password</Button>
        </form></GlassCard>
      <GlassCard strong><h2 className="mb-1 text-lg font-bold">Sessions</h2><p className="mb-3 text-sm text-ink-500">Signed in on this device. You can sign out everywhere, including other browsers.</p>
        <Button variant="secondary" icon={LogOut} onClick={async () => { await logout(true); nav('/login'); }}>Log out of all devices</Button></GlassCard>
      <GlassCard strong><h2 className="mb-1 text-lg font-bold text-danger">Delete account</h2><p className="mb-3 text-sm text-ink-500">Send a deletion request. We will remove your account and detach your estimates.</p>
        <Button variant="danger" onClick={() => setDelOpen(true)}>Request account deletion</Button></GlassCard>
      <ConfirmDialog open={delOpen} onClose={() => setDelOpen(false)} onConfirm={requestDelete} danger requireWord="delete" title="Request account deletion" confirmLabel="Send request" message="This sends a deletion request to our team. It cannot be undone once processed." />
    </div>
  );
}
