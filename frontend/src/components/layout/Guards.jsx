import { Link, Navigate, Outlet, useLocation } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { PageSkeleton, EmptyState } from '../ui/Feedback';
import { Button } from '../ui/Button';

// Guards wait for the initial refresh attempt: a skeleton, never a flash of the login page.
export function RequireAuth() {
  const { status } = useAuth();
  const loc = useLocation();
  if (status === 'loading') return <PageSkeleton />;
  if (status !== 'authed') return <Navigate to={`/login?next=${encodeURIComponent(loc.pathname + loc.search)}`} replace />;
  return <Outlet />;
}

export function RequireRole({ roles }) {
  const { status, user } = useAuth();
  const loc = useLocation();
  if (status === 'loading') return <PageSkeleton />;
  if (status !== 'authed') return <Navigate to={`/login?next=${encodeURIComponent(loc.pathname + loc.search)}`} replace />;
  if (!roles.includes(user.role)) return <ForbiddenPage />;
  return <Outlet />;
}

export function GuestOnly() {
  const { status } = useAuth();
  const next = new URLSearchParams(useLocation().search).get('next');
  if (status === 'loading') return <PageSkeleton />;
  if (status === 'authed') return <Navigate to={next && next.startsWith('/') ? next : '/dashboard'} replace />;
  return <Outlet />;
}

export function ForbiddenPage() {
  return (
    <div className="container-page py-16">
      <EmptyState icon={ShieldAlert} title="403 - Access denied" action={<Link to="/"><Button>Go home</Button></Link>}>You do not have permission to view this page.</EmptyState>
    </div>
  );
}
