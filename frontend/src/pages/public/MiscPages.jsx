import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Compass } from 'lucide-react';
import { Seo } from '../../components/layout/Seo';
import { Button } from '../../components/ui/Button';
import { EmptyState, ErrorState, PageSkeleton } from '../../components/ui/Feedback';
import { GlassCard } from '../../components/ui/GlassCard';
import { EstimateView } from '../../components/estimate/EstimateView';
import { estimatesApi } from '../../api/estimates';

export function NotFoundPage() {
  return (
    <div className="container-page py-16"><Seo title="Page not found" noindex />
      <GlassCard><EmptyState icon={Compass} title="404 - Page not found" action={<Link to="/"><Button>Go home</Button></Link>}>The page you are looking for does not exist or was moved.</EmptyState></GlassCard></div>
  );
}

export function SharedEstimatePage() {
  const { token } = useParams();
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['shared', token], queryFn: () => estimatesApi.shared(token), retry: false });
  if (isLoading) return <PageSkeleton />;
  if (error) return <div className="container-page py-12"><GlassCard><ErrorState error={error.status === 404 ? { message: 'This shared link is no longer available. The owner may have revoked it.' } : error} onRetry={error.status === 404 ? undefined : refetch} title="Cannot open this estimate" /></GlassCard></div>;
  return (
    <div className="container-page py-8"><Seo title={data.title} noindex />
      <p className="mb-3 text-sm text-ink-500">Read-only shared estimate</p>
      <EstimateView result={data.results} variant="shared" title={data.title} />
    </div>
  );
}
