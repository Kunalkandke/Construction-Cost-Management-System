import { useState } from 'react';
import { ClipboardCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { GlassCard } from '../ui/GlassCard';
import { Button } from '../ui/Button';
import { Input, NumberInput, Select, Textarea } from '../ui/Form';
import { estimatesApi } from '../../api/estimates';

export function ActualsForm({ estimateId, categories }) {
  const [f, setF] = useState({ category: categories[0]?.key || '', actualAmount: null, completedOn: '', notes: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submit = async (e) => {
    e.preventDefault();
    if (f.actualAmount === null) { setError('Enter the actual amount'); return; }
    setBusy(true); setError('');
    try {
      await estimatesApi.addActual(estimateId, { category: f.category, actualAmount: f.actualAmount, ...(f.completedOn ? { completedOn: f.completedOn } : {}), ...(f.notes ? { notes: f.notes } : {}) });
      toast.success('Thank you! Your actual cost will help improve accuracy once verified.');
      setF({ ...f, actualAmount: null, notes: '' });
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };
  return (
    <GlassCard strong>
      <div className="mb-3 flex items-center gap-2"><ClipboardCheck className="h-5 w-5 text-brand-600" aria-hidden /><h3 className="font-bold">Completed this project? Share your actual costs</h3></div>
      <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2" noValidate>
        <Select label="Category" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} options={categories.map((c) => ({ value: c.key, label: c.label }))} />
        <NumberInput label="Actual amount" group value={f.actualAmount} onChange={(n) => setF({ ...f, actualAmount: n })} suffix="INR" error={error} />
        <Input label="Completed on" type="date" value={f.completedOn} onChange={(e) => setF({ ...f, completedOn: e.target.value })} />
        <Textarea label="Notes (optional)" rows={2} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} maxLength={1000} />
        <div className="sm:col-span-2"><Button type="submit" loading={busy}>Submit actual cost</Button></div>
      </form>
    </GlassCard>
  );
}
