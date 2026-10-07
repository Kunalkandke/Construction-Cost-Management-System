import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Home, LogOut, Menu, ShieldCheck, User as UserIcon, LayoutDashboard } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../ui/Button';
import { Drawer } from '../ui/Overlay';

export const Logo = ({ light = false }) => (
  <Link to="/" className="flex items-center gap-2 font-display text-lg font-extrabold" aria-label="CCMS home">
    <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-700 text-white"><Home className="h-5 w-5" aria-hidden /></span>
    <span className={light ? 'text-white' : 'text-brand-700'}>CCMS</span>
  </Link>
);

const LINKS = [['/how-it-works', 'How it works'], ['/budget-planner', 'Budget planner'], ['/faq', 'FAQ'], ['/contact', 'Contact']];
const linkCls = ({ isActive }) => `rounded-lg px-3 py-2 text-sm font-semibold ${isActive ? 'text-brand-700' : 'text-ink-700 hover:text-brand-700'}`;

export function Navbar() {
  const { status, user, isAdmin, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const nav = useNavigate();
  const out = async () => { await logout(); setOpen(false); nav('/'); };
  const AuthButtons = ({ stacked }) => (
    <div className={`flex ${stacked ? 'flex-col' : 'items-center'} gap-2`}>
      {status === 'authed' ? (
        <>
          <Link to="/dashboard" onClick={() => setOpen(false)}><Button variant="ghost" size="sm" icon={LayoutDashboard} className="w-full">Dashboard</Button></Link>
          {isAdmin && <Link to="/admin" onClick={() => setOpen(false)}><Button variant="ghost" size="sm" icon={ShieldCheck} className="w-full">Admin</Button></Link>}
          <Link to="/profile" onClick={() => setOpen(false)}><Button variant="ghost" size="sm" icon={UserIcon} className="w-full">{user?.name?.split(' ')[0]}</Button></Link>
          <Button variant="secondary" size="sm" icon={LogOut} onClick={out}>Log out</Button>
        </>
      ) : (
        <>
          <Link to="/login" onClick={() => setOpen(false)}><Button variant="ghost" size="sm" className="w-full">Login</Button></Link>
          <Link to="/estimate" onClick={() => setOpen(false)}><Button size="sm" className="w-full">Get Estimate</Button></Link>
        </>
      )}
    </div>
  );
  return (
    <header className="glass-nav sticky top-0 z-40">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Logo />
        <nav aria-label="Main" className="hidden items-center gap-1 lg:flex">{LINKS.map(([to, label]) => <NavLink key={to} to={to} className={linkCls}>{label}</NavLink>)}</nav>
        <div className="hidden lg:block"><AuthButtons /></div>
        <button type="button" className="rounded-xl p-2 lg:hidden" aria-label="Open menu" onClick={() => setOpen(true)}><Menu className="h-6 w-6" /></button>
      </div>
      <Drawer open={open} onClose={() => setOpen(false)} title="Menu" side="left" width="max-w-xs">
        <nav aria-label="Mobile" className="flex flex-col gap-1">
          {LINKS.map(([to, label]) => <NavLink key={to} to={to} onClick={() => setOpen(false)} className={(s) => `${linkCls(s)} min-h-[44px] flex items-center`}>{label}</NavLink>)}
          <hr className="my-3 border-ink-300/60" />
          <AuthButtons stacked />
        </nav>
      </Drawer>
    </header>
  );
}
