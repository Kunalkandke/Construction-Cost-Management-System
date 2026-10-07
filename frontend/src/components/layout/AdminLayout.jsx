import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Activity, BarChart3, BookOpen, Bot, ClipboardCheck, Cog, Database, FileText, Layers, LogOut, Menu, PanelLeftClose, PanelLeftOpen, Search, Users, ScrollText, Megaphone } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useUiStore } from '../../store/uiStore';
import { Drawer } from '../ui/Overlay';
import { Logo } from './Navbar';
import { Badge } from '../ui/Feedback';

const MENU = [
  ['Overview', [['/admin', 'Dashboard', BarChart3, true]]],
  ['Manage', [['/admin/users', 'Users', Users], ['/admin/estimates', 'Estimates', FileText], ['/admin/rates', 'Rates', Layers]]],
  ['Engine', [['/admin/norms', 'Norms & master data', Database], ['/admin/ai', 'AI', Bot], ['/admin/actuals', 'Actuals', ClipboardCheck]]],
  ['Site', [['/admin/content', 'Content', Megaphone], ['/admin/audit', 'Audit log', ScrollText], ['/admin/settings', 'Settings', Cog, false, true]]],
];

function SidebarNav({ collapsed, onNavigate }) {
  const { isSuper } = useAuth();
  return (
    <nav aria-label="Admin" className="space-y-4 p-3">
      {MENU.map(([group, items]) => (
        <div key={group}>
          {!collapsed && <p className="mb-1 px-3 text-[11px] font-bold uppercase tracking-wider text-ink-500">{group}</p>}
          <ul className="space-y-0.5">
            {items.filter((i) => !i[4] || isSuper).map(([to, label, Icon, end]) => (
              <li key={to}>
                <NavLink to={to} end={Boolean(end)} onClick={onNavigate} title={collapsed ? label : undefined}
                  className={({ isActive }) => `flex min-h-[44px] items-center gap-3 rounded-xl px-3 text-sm font-semibold ${isActive ? 'bg-brand-600 text-white' : 'text-ink-700 hover:bg-brand-50'}`}>
                  <Icon className="h-5 w-5 shrink-0" strokeWidth={1.75} aria-hidden />{!collapsed && <span>{label}</span>}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}

export function AdminLayout() {
  const { user, logout } = useAuth();
  const { sidebarCollapsed, toggleCollapsed } = useUiStore();
  const [drawer, setDrawer] = useState(false);
  const [q, setQ] = useState('');
  const nav = useNavigate();
  const search = (e) => { e.preventDefault(); if (q.trim()) nav(`/admin/estimates?q=${encodeURIComponent(q.trim())}`); };
  return (
    <div className="flex min-h-screen">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2">Skip to content</a>
      <aside className={`glass sticky top-0 hidden h-screen shrink-0 flex-col rounded-none border-y-0 border-l-0 lg:flex ${sidebarCollapsed ? 'w-[76px]' : 'w-64'}`}>
        <div className="flex h-16 items-center justify-between px-4">{!sidebarCollapsed && <Logo />}
          <button type="button" onClick={toggleCollapsed} aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'} className="rounded-lg p-2 text-ink-500 hover:bg-ink-100">
            {sidebarCollapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}</button></div>
        <div className="flex-1 overflow-y-auto"><SidebarNav collapsed={sidebarCollapsed} /></div>
      </aside>
      <Drawer open={drawer} onClose={() => setDrawer(false)} title="Admin menu" side="left" width="max-w-xs"><SidebarNav onNavigate={() => setDrawer(false)} /></Drawer>
      <div className="min-w-0 flex-1">
        <header className="glass-nav sticky top-0 z-30">
          <div className="container-admin flex h-16 items-center gap-3">
            <button type="button" className="rounded-xl p-2 lg:hidden" aria-label="Open admin menu" onClick={() => setDrawer(true)}><Menu className="h-6 w-6" /></button>
            <form onSubmit={search} role="search" className="relative max-w-md flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500" aria-hidden />
              <input value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search estimates" placeholder="Search estimates..." className="glass-input pl-9" />
            </form>
            <Badge tone={import.meta.env.PROD ? 'success' : 'warning'} icon={Activity}>{import.meta.env.MODE}</Badge>
            <Link to="/" className="hidden text-sm font-semibold text-brand-700 sm:block"><BookOpen className="mr-1 inline h-4 w-4" aria-hidden />Site</Link>
            <span className="hidden text-sm text-ink-700 md:block">{user?.name} <Badge tone="brand">{user?.role}</Badge></span>
            <button type="button" onClick={async () => { await logout(); nav('/login'); }} className="rounded-xl p-2 text-ink-700 hover:bg-ink-100" aria-label="Log out"><LogOut className="h-5 w-5" /></button>
          </div>
        </header>
        <main id="main" className="container-admin py-6"><Outlet /></main>
      </div>
    </div>
  );
}
