import { Outlet, NavLink } from 'react-router-dom';
import { LayoutDashboard, History, Settings, Calculator } from 'lucide-react';
import { useWork } from '../context/WorkContext';

export default function Layout() {
  const { t } = useWork();
  return (
    <div className="app-shell">
      <main className="main-content" style={{ flex: 1, paddingBottom: '80px', display: 'flex', flexDirection: 'column' }}>
        <Outlet />
      </main>
      
      <nav className="bottom-nav">
        <NavLink to="/" className={({ isActive }: { isActive: boolean }) => `nav-item ${isActive ? 'active' : ''}`}>
          <LayoutDashboard size={24} />
          <span>{t('dashboard')}</span>
        </NavLink>
        <NavLink to="/history" className={({ isActive }: { isActive: boolean }) => `nav-item ${isActive ? 'active' : ''}`}>
          <History size={24} />
          <span>{t('history')}</span>
        </NavLink>
        <NavLink to="/calculator" className={({ isActive }: { isActive: boolean }) => `nav-item ${isActive ? 'active' : ''}`}>
          <Calculator size={24} />
          <span>{t('calculator')}</span>
        </NavLink>
        <NavLink to="/settings" className={({ isActive }: { isActive: boolean }) => `nav-item ${isActive ? 'active' : ''}`}>
          <Settings size={24} />
          <span>{t('settings')}</span>
        </NavLink>
      </nav>
    </div>
  );
}
