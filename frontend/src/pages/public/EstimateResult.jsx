import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Seo } from '../../components/layout/Seo';
import { EstimateView } from '../../components/estimate/EstimateView';
import { Button } from '../../components/ui/Button';
import { EmptyState, ErrorState, PageSkeleton } from '../../components/ui/Feedback';
import { GlassCard } from '../../components/ui/GlassCard';
import { useAuth } from '../../hooks/useAuth';
import { useEstimate } from '../../hooks/useEstimate';
import { useUiStore } from '../../store/uiStore';
import { useWizardStore } from '../../store/wizardStore';
import { estimatesApi } from '../../api/estimates';
import { refreshInputs } from '../../lib/inputs';
import { Calculator } from 'lucide-react';

// /estimate/result: a saved estimate (?id=) or the guest's in-memory result
export default function EstimateResult() {
  const [params, setParams] = useSearchParams();
  const id = params.get('id');
  return id ? <SavedResult id={id} /> : <MemoryResult autosave={params.get('autosave') === '1'} clearAutosave={() => setParams({}, { replace: true })} />;
}

function SavedResult({ id }) {
  const { data, isLoading, error, refetch } = useEstimate(id);
  const qc = useQueryClient();
  const [switching, setSwitching] = useState(null);
  const [regen, setRegen] = useState(false);
  if (isLoading) return <PageSkeleton />;
  if (error) return <div className="container-page py-10"><GlassCard><ErrorState error={error} onRetry={refetch} /></GlassCard></div>;
  const rerun = async (inputs, tier) => {
    try { setSwitching(tier || null); setRegen(!tier); await estimatesApi.patch(id, { inputs: refreshInputs({ ...inputs, ...(tier ? { qualityTier: tier } : {}) }), mode: data.mode }); await qc.invalidateQueries({ queryKey: ['estimate', id] }); qc.invalidateQueries({ queryKey: ['ai', id] }); toast.success('Estimate recalculated'); } finally { setSwitching(null); setRegen(false); }
  };
  return (
    <div className="container-page py-8"><Seo title="Your estimate" noindex />
      <EstimateView result={data.results} estimate={data} variant="saved" isAuthed switching={switching} regenerating={regen}
        onSwitchTier={(t) => rerun(data.results.inputs, t)} onRegenerate={() => rerun(data.results.inputs)} />
    </div>
  );
}

function MemoryResult({ autosave, clearAutosave }) {
  const nav = useNavigate();
  const { isAuthed } = useAuth();
  const { lastResult, setLastResult } = useUiStore();
  const wiz = useWizardStore();
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [switching, setSwitching] = useState(null);
  const [failed, setFailed] = useState(null);
  const ran = useRef(false);

  // Page refresh loses the in-memory result: rebuild it from the (persisted) wizard answers
  useEffect(() => {
    if (lastResult || ran.current || !wiz.houseType || !wiz.builtUpAreaSqm) return;
    ran.current = true;
    const input = wiz.toInput();
    estimatesApi.calculate(input, wiz.mode).then((result) => setLastResult({ result, input, mode: wiz.mode })).catch(setFailed);
  }, [lastResult]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = async () => {
    if (!isAuthed) { nav('/login?next=' + encodeURIComponent('/estimate/result?autosave=1')); return; }
    setSaving(true);
    try {
      const w = useWizardStore.getState();
      const saved = await estimatesApi.create(lastResult.input, { title: w.title || undefined, mode: lastResult.mode });
      qc.invalidateQueries({ queryKey: ['estimates'] });
      toast.success('Estimate saved to your account');
      nav(`/estimate/result?id=${saved.id}`, { replace: true });
    } catch (e) { toast.error(e.message); } finally { setSaving(false); }
  };
  // after login the guest result is saved automatically (wizard state preserved)
  useEffect(() => { if (autosave && isAuthed && lastResult && !saving) { clearAutosave(); save(); } }, [autosave, isAuthed, lastResult]); // eslint-disable-line react-hooks/exhaustive-deps

  const switchTier = async (tier) => {
    setSwitching(tier);
    try { const input = { ...lastResult.input, qualityTier: tier }; const result = await estimatesApi.calculate(input, lastResult.mode); wiz.set({ qualityTier: tier }); setLastResult({ result, input, mode: lastResult.mode }); } finally { setSwitching(null); }
  };

  if (failed) return <div className="container-page py-10"><GlassCard><ErrorState error={failed} onRetry={() => { ran.current = false; setFailed(null); }} /></GlassCard></div>;
  if (!lastResult) {
    if (wiz.houseType && wiz.builtUpAreaSqm) return <PageSkeleton />;
    return <div className="container-page py-12"><GlassCard><EmptyState icon={Calculator} title="No estimate yet" action={<Link to="/estimate"><Button>Start an estimate</Button></Link>}>Answer a few questions to generate your estimate.</EmptyState></GlassCard></div>;
  }
  return (
    <div className="container-page py-8"><Seo title="Your estimate" noindex />
      <EstimateView result={lastResult.result} variant="result" isAuthed={isAuthed} onSave={save} saving={saving} switching={switching} onSwitchTier={switchTier} />
    </div>
  );
}
