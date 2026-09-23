import {
  LayoutDashboard,
  Package,
  LayoutGrid,
  ClipboardList,
  MessageSquare,
  Users,
  Settings as SettingsIcon,
  LogOut,
} from 'lucide-react';

const TABS = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'products', label: 'Products', icon: Package },
  { key: 'sections', label: 'Homepage Sections', icon: LayoutGrid },
  { key: 'reviews', label: 'Reviews', icon: MessageSquare },
  { key: 'orders', label: 'Orders', icon: ClipboardList },
  { key: 'customers', label: 'Customers', icon: Users },
  { key: 'settings', label: 'Settings', icon: SettingsIcon },
];


export default function AdminSidebar({ active, onChange, onLogout }) {
  return (
    <aside className="w-full md:w-56 shrink-0 border-b md:border-b-0 md:border-r border-white/10 bg-neutral-950">
      <nav className="flex md:flex-col overflow-x-auto md:overflow-visible px-2 md:px-3 py-3 md:py-6 gap-1">
        {TABS.map((t) => {
          const Icon = t.icon;
          const isActive = active === t.key;
          return (
            <button
              key={t.key}
              onClick={() => onChange(t.key)}
              className={`flex items-center gap-2.5 px-3 py-2.5 text-sm whitespace-nowrap transition-colors ${
                isActive
                  ? 'bg-orange-500 text-black font-semibold'
                  : 'text-neutral-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon size={16} />
              {t.label}
            </button>
          );
        })}
        <button
          onClick={onLogout}
          className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-neutral-500 hover:text-red-400 md:mt-4 whitespace-nowrap"
        >
          <LogOut size={16} /> Logout
        </button>
      </nav>
    </aside>
  );
}
