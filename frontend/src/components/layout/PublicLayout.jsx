import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { GlobalBanners } from './Banners';

export function PublicLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2">Skip to content</a>
      <Navbar />
      <GlobalBanners />
      <main id="main" className="flex-1"><Outlet /></main>
      <Footer />
    </div>
  );
}
