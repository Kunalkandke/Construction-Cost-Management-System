import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';
import { Toaster } from 'react-hot-toast';
import AppRoutes from './routes';
import { ErrorBoundary } from './components/layout/ErrorBoundary';
import { useAuthBootstrap } from './hooks/useAuth';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: (n, e) => n < 1 && (!e?.status || e.status >= 500), refetchOnWindowFocus: false, staleTime: 30_000 } },
});

function Shell() {
  useAuthBootstrap(); // restore the session once (httpOnly refresh cookie)
  return (
    <>
      {/* soft decorative blobs behind content */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden>
        <div className="absolute -left-24 top-10 h-96 w-96 rounded-full bg-brand-200 opacity-25 blur-3xl" />
        <div className="absolute -right-24 bottom-10 h-96 w-96 rounded-full bg-accent-200 opacity-30 blur-3xl" />
      </div>
      <ErrorBoundary><AppRoutes /></ErrorBoundary>
      <Toaster position="top-center" toastOptions={{ duration: 3500, ariaProps: { role: 'status', 'aria-live': 'polite' } }} />
    </>
  );
}

export default function App() {
  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter><Shell /></BrowserRouter>
      </QueryClientProvider>
    </HelmetProvider>
  );
}
