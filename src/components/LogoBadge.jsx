import { useSettings } from '../contexts/SettingsContext';

// The shop's profile-picture logo, shown as a circular badge. Pulls the
// live logo URL from Settings (editable in the Admin Settings tab), falling
// back to the bundled default image.
export default function LogoBadge({ size = 40, className = '' }) {
  const ctx = useSettings();
  const src = ctx?.settings?.logo_url || '/logo-circle.png';
  return (
    <img
      src={src}
      alt="Rainora logo"
      className={`rounded-full object-cover shrink-0 ${className}`}
      style={{ width: size, height: size }}
    />
  );
}
