import { NavLink } from 'react-router-dom';

const ICONS: Record<string, string> = {
  home: 'M4 11l8-7 8 7v9a1 1 0 0 1-1 1h-5v-6h-4v6H5a1 1 0 0 1-1-1z',
  charts: 'M4 20V10M10 20V4M16 20v-8M22 20H2',
  log: 'M5 3h11l3 3v15H5z M9 8h6M9 12h6M9 16h4',
  account: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M4 21c0-4 4-6 8-6s8 2 8 6',
};

const TABS = [
  { to: '/home', label: 'Home', icon: ICONS.home },
  { to: '/charts', label: 'Charts', icon: ICONS.charts },
  { to: '/log', label: 'Log', icon: ICONS.log },
  { to: '/account', label: 'Account', icon: ICONS.account },
];

export default function BottomNav() {
  return (
    <nav className="bottom-nav" aria-label="Primary">
      {TABS.map((t) => (
        <NavLink key={t.to} to={t.to} className={({ isActive }) => `tab${isActive ? ' active' : ''}`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
            <path d={t.icon} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span>{t.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
