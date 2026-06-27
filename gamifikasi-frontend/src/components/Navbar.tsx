import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import {
  MapPin,
  LayoutDashboard,
  Users,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { useState } from 'react';
import type { UserRole } from '@/types';
import logoUrl from '@/assets/logo.png';

interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
  roles: UserRole[];
}

const NAV_ITEMS: NavItem[] = [
  { to: '/kelompok', label: 'Kelompok', icon: <Users size={18} />, roles: ['admin'] },
  { to: '/agenda', label: 'Agenda', icon: <LayoutDashboard size={18} />, roles: ['admin'] },
  { to: '/peta', label: 'Peta', icon: <MapPin size={18} />, roles: ['admin', 'worker', 'peserta'] },
];

export function Navbar() {
  const { user, logout } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const visibleItems = NAV_ITEMS.filter((item) =>
    user ? item.roles.includes(user.role) : false,
  );

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  let homeLink = '/login';
  if (user) {
    if (user.role === 'peserta' || user.role === 'worker') {
      homeLink = '/peta';
    } else {
      homeLink = '/kelompok';
    }
  }

  return (
    <nav className="bg-white border-b border-border sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to={homeLink} className="flex items-center gap-2.5">
            <img src={logoUrl} alt="Gamifikasi DWH" className="w-9 h-9" />
            <span className="font-bold text-lg text-primary-dark">Gamifikasi DWH</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            {visibleItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  location.pathname === item.to
                    ? 'bg-primary/10 text-primary-dark'
                    : 'text-text-secondary hover:bg-surface-hover hover:text-text'
                }`}
              >
                {item.icon}
                {item.label}
              </Link>
            ))}
          </div>

          {/* User info */}
          <div className="hidden md:flex items-center gap-3">
            {user && (
              <>
                <div className="text-right">
                  <p className="text-sm font-medium text-text">{user.nama}</p>
                  <p className="text-xs text-text-muted capitalize">{user.role}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-2 rounded-lg text-text-muted hover:bg-danger-50 hover:text-danger transition-colors"
                  title="Logout"
                >
                  <LogOut size={18} />
                </button>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2 rounded-lg hover:bg-surface-hover text-text-secondary"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-border bg-white">
          <div className="px-4 py-3 space-y-1">
            {user && (
              <div className="pb-2 mb-2 border-b border-border-light">
                <p className="text-sm font-medium text-text">{user.nama}</p>
                <p className="text-xs text-text-muted capitalize">{user.role}</p>
              </div>
            )}
            {visibleItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  location.pathname === item.to
                    ? 'bg-primary/10 text-primary-dark'
                    : 'text-text-secondary'
                }`}
              >
                {item.icon}
                {item.label}
              </Link>
            ))}
            {user && (
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-danger hover:bg-danger-50 transition-colors"
              >
                <LogOut size={18} />
                Logout
              </button>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
