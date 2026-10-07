import { useMeta } from '../../hooks/useMeta';
import { useUiStore } from '../../store/uiStore';
import { Banner } from '../ui/Feedback';

// Announcements (dismissible per session) + the illustrative-rates banner while rates are unverified.
export function GlobalBanners() {
  const { data } = useMeta();
  const { dismissedBanners, dismiss } = useUiStore();
  const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
  if (!data && !offline) return null;
  return (
    <div className="container-page space-y-2 pt-3">
      {offline && <Banner kind="danger" title="You are offline">Some features will not work until your connection returns.</Banner>}
      {data && data.settings.ratesVerified === false && (
        <Banner kind="warning" title="Illustrative rates">{data.settings.disclaimerText || 'Rates are illustrative. Verify against the current SSR.'}</Banner>
      )}
      {data?.announcements?.filter((a) => !dismissedBanners[a.id]).map((a) => (
        <Banner key={a.id} kind={a.kind} title={a.title} onDismiss={() => dismiss(a.id)}>{a.body}</Banner>
      ))}
    </div>
  );
}
