import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { SHOP_INFO } from '../lib/constants';

const SettingsContext = createContext(null);

// Falls back to the static SHOP_INFO defaults until /api/settings resolves
// (or if it fails), so Header/Footer/Home never render blank values.
const fallback = {
  logo_url: '/logo-circle.png',
  shop_name: SHOP_INFO.name,
  tagline: SHOP_INFO.tagline,
  facebook: SHOP_INFO.facebook,
  instagram: SHOP_INFO.instagram,
  whatsapp: SHOP_INFO.whatsapp,
  phone: SHOP_INFO.phone,
  address: SHOP_INFO.address,
  offer_banner_title: SHOP_INFO.offerBannerTitle,
  offer_banner_subtitle: SHOP_INFO.offerBannerSubtitle,
};

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(fallback);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((data) => {
        if (data && !data.error) {
          setSettings({ ...fallback, ...data });
        }
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <SettingsContext.Provider value={{ settings, loaded, refresh }}>
      {children}
    </SettingsContext.Provider>
  );
}

export const useSettings = () => useContext(SettingsContext);
