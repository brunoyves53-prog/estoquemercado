import { useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Package, ShoppingCart, ArrowDownToLine, Bell, History, Plus } from 'lucide-react';

const navItems = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/estoque', icon: Package, label: 'Estoque' },
  { path: '/compras', icon: ShoppingCart, label: 'Compras' },
  { path: '/retiradas', icon: ArrowDownToLine, label: 'Retiradas' },
  { path: '/alertas', icon: Bell, label: 'Alertas' },
  { path: '/cadastro', icon: Plus, label: 'Cadastro' },
  { path: '/historico', icon: History, label: 'Histórico' },
];

export default function MobileNav() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="mobile-nav">
      <div className="flex items-center justify-around px-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`mobile-nav-item ${isActive ? 'active' : ''}`}
            >
              <item.icon size={20} strokeWidth={isActive ? 2.5 : 1.5} />
              <span className="font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
