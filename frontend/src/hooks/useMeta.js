import { useQuery } from '@tanstack/react-query';
import { metaApi } from '../api/meta';

export const useMeta = () => useQuery({ queryKey: ['meta'], queryFn: metaApi.config, staleTime: 10 * 60 * 1000 });
