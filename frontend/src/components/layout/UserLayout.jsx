import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, Calculator, UserCircle, Wallet, FileText } from 'lucide-react';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { GlobalBanners } from './Banners';

const ITEMS = [['/dashboard', 'Overview', LayoutDashboard], ['/estimates', 'My estimates', FileText], ['/estimate', 'New estimate', Calculator], ['/budget-planner', 'Budget planner', Wallet], ['/profile', 'Profile', UserCircle]];

export function UserLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2">Skip to content</a>
      <Navbar />
      <GlobalBanners />
      <div className="container-page mt-4">
        <nav aria-label="Account" className="flex gap-1 overflow-x-auto rounded-xl bg-white/50 p-1 ring-1 ring-white/70">
          {ITEMS.map(([to, label, Icon]) => (
            <NavLink key={to} to={to} end className={({ isActive }) => `inline-flex min-h-[40px] items-center gap-2 whitespace-nowrap rounded-lg px-3 text-sm font-semibold ${isActive ? 'bg-brand-600 text-white' : 'text-ink-700 hover:bg-brand-50'}`}>
              <Icon className="h-4 w-4" aria-hidden />{label}
            </NavLink>
          ))}
        </nav>
      </div>
      <main id="main" className="flex-1"><Outlet /></main>
      <Footer />
    </div>
  );
}
