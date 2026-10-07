import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { estimatesApi } from '../api/estimates';

export const useEstimates = (params) => useQuery({ queryKey: ['estimates', params], queryFn: () => estimatesApi.list(params), placeholderData: (p) => p });
export const useEstimate = (id) => useQuery({ queryKey: ['estimate', id], queryFn: () => estimatesApi.get(id), enabled: Boolean(id) });

export function useEstimateMutations() {
  const qc = useQueryClient();
  const refresh = (id) => { qc.invalidateQueries({ queryKey: ['estimates'] }); if (id) qc.invalidateQueries({ queryKey: ['estimate', id] }); };
  return {
    patch: useMutation({ mutationFn: ({ id, body }) => estimatesApi.patch(id, body), onSuccess: (_, v) => { refresh(v.id); toast.success('Estimate updated'); } }),
    remove: useMutation({ mutationFn: (id) => estimatesApi.remove(id), onSuccess: () => { refresh(); toast.success('Estimate deleted'); } }),
    duplicate: useMutation({ mutationFn: (id) => estimatesApi.duplicate(id), onSuccess: () => { refresh(); toast.success('Estimate duplicated'); } }),
    unshare: useMutation({ mutationFn: (id) => estimatesApi.unshare(id), onSuccess: (_, id) => { refresh(id); toast.success('Share link revoked'); } }),
  };
}
