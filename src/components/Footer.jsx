import { Facebook, Instagram, Phone, MapPin } from 'lucide-react';
import Logo from './Logo';
import LogoBadge from './LogoBadge';
import { useSettings } from '../contexts/SettingsContext';

export default function Footer() {
  const { settings } = useSettings();

  return (
    <footer id="contact" className="bg-black border-t border-white/10 pt-16 pb-8 px-5 md:px-8">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-10">
        <div>
          <div className="flex items-center gap-2.5">
            <LogoBadge size={36} />
            <Logo textClass="text-2xl" />
          </div>
          <p className="text-neutral-500 text-sm mt-4 leading-relaxed max-w-xs">
            Export-quality men's fashion &mdash; branded denim, shirts, polos &amp; tees, sourced and
            curated for the modern man.
          </p>
        </div>

        <div>
          <h4 className="text-white uppercase text-xs tracking-widest mb-4">Visit Us</h4>
          <div className="flex gap-2 text-neutral-400 text-sm">
            <MapPin size={16} className="shrink-0 mt-0.5 text-orange-500" />
            <p>{settings.address}</p>
          </div>
          <div className="flex gap-2 text-neutral-400 text-sm mt-3">
            <Phone size={16} className="shrink-0 mt-0.5 text-orange-500" />
            <a href={`tel:+${settings.whatsapp}`} className="hover:text-orange-500">
              {settings.phone} (Call / WhatsApp)
            </a>
          </div>
        </div>

        <div>
          <h4 className="text-white uppercase text-xs tracking-widest mb-4">Follow Us</h4>
          <div className="flex gap-4">
            <a
              href={settings.facebook}
              target="_blank"
              rel="noreferrer"
              className="w-10 h-10 rounded-full border border-white/15 flex items-center justify-center text-white hover:border-orange-500 hover:text-orange-500 transition-colors"
            >
              <Facebook size={18} />
            </a>
            <a
              href={settings.instagram}
              target="_blank"
              rel="noreferrer"
              className="w-10 h-10 rounded-full border border-white/15 flex items-center justify-center text-white hover:border-orange-500 hover:text-orange-500 transition-colors"
            >
              <Instagram size={18} />
            </a>
          </div>
          <a href="/admin/login" className="block text-neutral-700 hover:text-neutral-500 text-xs mt-8">
            Admin
          </a>
        </div>
      </div>
      <div className="max-w-7xl mx-auto border-t border-white/5 mt-10 pt-6 text-center text-neutral-600 text-xs">
        &copy; {new Date().getFullYear()} {settings.shop_name || 'RAINORA'}. All rights reserved.
      </div>
    </footer>
  );
}
