import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import supabase from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import Logo from '../components/Logo';
import LogoBadge from '../components/LogoBadge';
import AdminSidebar from '../components/admin/AdminSidebar';
import AdminOverview from '../components/admin/AdminOverview';
import AdminProducts from '../components/admin/AdminProducts';
import AdminHomepageSections from '../components/admin/AdminHomepageSections';
import AdminReviews from '../components/admin/AdminReviews';
import AdminOrders from '../components/admin/AdminOrders';
import AdminCustomers from '../components/admin/AdminCustomers';
import AdminSettings from '../components/admin/AdminSettings';

export default function AdminDashboard() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const getInitialTab = () => {
    const urlTab = searchParams.get('tab');
    if (urlTab) return urlTab;
    try {
      return localStorage.getItem('rainora_admin_tab') || 'dashboard';
    } catch {
      return 'dashboard';
    }
  };

  const [tab, setTabState] = useState(getInitialTab);

  const setTab = (newTab) => {
    setTabState(newTab);
    setSearchParams(newTab === 'dashboard' ? {} : { tab: newTab });
    try {
      localStorage.setItem('rainora_admin_tab', newTab);
    } catch {}
  };

  useEffect(() => {
    const urlTab = searchParams.get('tab') || 'dashboard';
    if (urlTab !== tab) {
      setTabState(urlTab);
    }
  }, [searchParams]);

  const handleLogout = async () => {
    try {
      localStorage.removeItem('rainora_admin_tab');
    } catch {}
    await supabase.auth.signOut();
    window.location.href = '/admin/login';
  };

  const renderTab = () => {
    switch (tab) {
      case 'products':
        return <AdminProducts />;
      case 'offers':
      case 'sections':
        return <AdminHomepageSections initialTab={tab === 'offers' ? 'offers' : 'sections'} />;
      case 'reviews':
        return <AdminReviews />;
      case 'orders':
        return <AdminOrders />;
      case 'customers':
        return <AdminCustomers />;
      case 'settings':
        return <AdminSettings />;

      default:
        return <AdminOverview onNavigate={setTab} />;
    }
  };

  return (
    <div className="min-h-screen bg-black flex flex-col">
      <header className="border-b border-white/10 px-5 md:px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <LogoBadge size={30} />
          <Logo textClass="text-xl" />
          <span className="text-neutral-500 text-xs ml-1 uppercase tracking-widest">Admin</span>
        </div>
        <span className="text-neutral-500 text-xs hidden sm:block">{user?.email}</span>
      </header>

      <div className="flex flex-col md:flex-row flex-1">
        <AdminSidebar active={tab} onChange={setTab} onLogout={handleLogout} />
        <main className="flex-1 px-5 md:px-8 py-8 max-w-6xl w-full mx-auto">{renderTab()}</main>
      </div>
    </div>
  );
}
