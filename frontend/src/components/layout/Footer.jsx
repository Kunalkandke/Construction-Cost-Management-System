import { Link } from 'react-router-dom';
import { useMeta } from '../../hooks/useMeta';
import { PUBLIC_DISCLAIMER } from '../../lib/constants';
import { Logo } from './Navbar';

export function Footer() {
  const { data } = useMeta();
  return (
    <footer className="mt-16 border-t border-white/60 bg-white/50 backdrop-blur">
      <div className="container-page grid gap-8 py-10 md:grid-cols-4">
        <div className="md:col-span-2">
          <Logo />
          <p className="mt-3 max-w-md text-sm text-ink-500">{data?.settings?.disclaimerText || PUBLIC_DISCLAIMER}</p>
        </div>
        <nav aria-label="Product" className="text-sm"><h2 className="mb-2 font-bold">Product</h2><ul className="space-y-1 text-ink-700">
          <li><Link to="/estimate">Start estimate</Link></li><li><Link to="/budget-planner">Budget planner</Link></li><li><Link to="/how-it-works">How it works</Link></li><li><Link to="/faq">FAQ</Link></li></ul></nav>
        <nav aria-label="Legal" className="text-sm"><h2 className="mb-2 font-bold">Company</h2><ul className="space-y-1 text-ink-700">
          <li><Link to="/contact">Contact</Link></li><li><Link to="/terms">Terms</Link></li><li><Link to="/privacy">Privacy</Link></li><li><Link to="/disclaimer">Disclaimer</Link></li></ul></nav>
      </div>
      <div className="border-t border-white/60 py-4 text-center text-xs text-ink-500">
        {data?.settings?.footerCreditText || 'Built as MIT CSN Minor Project'} &middot; &copy; {new Date().getFullYear()} CCMS
      </div>
    </footer>
  );
}
