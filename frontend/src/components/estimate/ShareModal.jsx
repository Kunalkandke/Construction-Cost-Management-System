import { useState } from 'react';
import { Copy, Link2Off } from 'lucide-react';
import toast from 'react-hot-toast';
import { Modal } from '../ui/Overlay';
import { Button } from '../ui/Button';
import { estimatesApi } from '../../api/estimates';
import { useEstimateMutations } from '../../hooks/useEstimate';

export function ShareModal({ open, onClose, estimate }) {
  const [token, setToken] = useState(estimate?.shareToken || null);
  const [busy, setBusy] = useState(false);
  const { unshare } = useEstimateMutations();
  const link = token ? `${window.location.origin}/shared/${token}` : '';
  const create = async () => { setBusy(true); try { const r = await estimatesApi.share(estimate.id); setToken(r.shareToken); } finally { setBusy(false); } };
  const copy = async () => { await navigator.clipboard.writeText(link); toast.success('Link copied'); };
  const revoke = async () => { await unshare.mutateAsync(estimate.id); setToken(null); };
  return (
    <Modal open={open} onClose={onClose} title="Share this estimate" size="sm">
      <p className="mb-3 text-sm text-ink-700">Anyone with the link can view a read-only copy. Personal details are never shown. You can revoke the link at any time.</p>
      {token ? (
        <div className="space-y-3">
          <input readOnly value={link} aria-label="Share link" className="glass-input" onFocus={(e) => e.target.select()} />
          <div className="flex flex-wrap gap-2"><Button icon={Copy} onClick={copy}>Copy link</Button><Button variant="danger" icon={Link2Off} onClick={revoke} loading={unshare.isPending}>Revoke link</Button></div>
        </div>
      ) : <Button onClick={create} loading={busy}>Create share link</Button>}
    </Modal>
  );
}
