import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Seo } from '../../components/layout/Seo';
import { EstimateView } from '../../components/estimate/EstimateView';
import { ErrorState, PageSkeleton } from '../../components/ui/Feedback';
import { GlassCard } from '../../components/ui/GlassCard';
import { useEstimate } from '../../hooks/useEstimate';
import { estimatesApi } from '../../api/estimates';
import { refreshInputs } from '../../lib/inputs';

export default function EstimateDetail() {
  const { id } = useParams();
  const { data, isLoading, error, refetch } = useEstimate(id);
  const qc = useQueryClient();
  const [switching, setSwitching] = useState(null);
  const [regen, setRegen] = useState(false);
  if (isLoading) return <PageSkeleton />;
  if (error) return <div className="container-page py-10"><GlassCard><ErrorState error={error.status === 404 ? { message: 'This estimate does not exist or is not yours.' } : error} onRetry={error.status === 404 ? undefined : refetch} /></GlassCard></div>;
  const rerun = async (tier) => {
    try {
      setSwitching(tier || null); setRegen(!tier);
      await estimatesApi.patch(id, { inputs: refreshInputs({ ...data.results.inputs, ...(tier ? { qualityTier: tier } : {}) }), mode: data.mode });
      await qc.invalidateQueries({ queryKey: ['estimate', id] }); qc.invalidateQueries({ queryKey: ['estimates'] }); qc.invalidateQueries({ queryKey: ['ai', id] });
      toast.success(tier ? `Switched to ${tier.toLowerCase()} tier` : 'Recalculated with the latest rates');
    } finally { setSwitching(null); setRegen(false); }
  };
  return (
    <div className="container-page py-8"><Seo title={data.title} noindex />
      <EstimateView result={data.results} estimate={data} variant="saved" isAuthed switching={switching} regenerating={regen} onSwitchTier={rerun} onRegenerate={() => rerun()} />
    </div>
  );
}
