import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { LayoutDashboard, Users, BarChart3, LogOut, Settings, User } from 'lucide-react';
import { motion } from 'framer-motion';

const SidebarItem = ({ icon: Icon, label, to, active }) => (
  <Link to={to} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${active ? 'bg-primary/20 text-primary border border-primary/30 shadow-[0_0_15px_rgba(99,102,241,0.15)]' : 'text-gray-400 hover:text-gray-100 hover:bg-surfaceHighlight'}`}>
    <Icon size={20} className={active ? 'text-primary' : ''} />
    <span className="font-medium">{label}</span>
  </Link>
);

const DashboardLayout = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isRecruiter = user?.role === 'recruiter';

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <motion.aside 
        initial={{ x: -250 }}
        animate={{ x: 0 }}
        className="w-64 glass-panel border-r border-white/5 flex flex-col relative z-10"
      >
        <div className="p-6">
          <Link to="/" className="text-2xl font-bold tracking-tighter flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <span className="text-white text-lg">I</span>
            </div>
            Intervix<span className="text-primary">.ai</span>
          </Link>
        </div>

        <div className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4 px-2">Menu</div>
          
          <SidebarItem 
            icon={LayoutDashboard} 
            label="Dashboard" 
            to={isRecruiter ? '/recruiter' : '/dashboard'} 
            active={location.pathname === '/dashboard' || location.pathname === '/recruiter'} 
          />
          
          {isRecruiter && (
            <SidebarItem 
              icon={Users} 
              label="Candidates" 
              to="/candidates" 
              active={location.pathname === '/candidates'} 
            />
          )}

          <SidebarItem 
            icon={BarChart3} 
            label="Analytics" 
            to="/analytics" 
            active={location.pathname === '/analytics'} 
          />
        </div>

        <div className="p-4 border-t border-white/5 space-y-2">
          <SidebarItem icon={Settings} label="Settings" to="/settings" active={false} />
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <LogOut size={20} />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </motion.aside>

      {/* Main Content Area */}
      <main className="flex-1 relative overflow-y-auto overflow-x-hidden">
        {/* Ambient background glow */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-secondary/10 rounded-full blur-[120px] pointer-events-none" />
        
        {/* Topbar inside dashboard */}
        <header className="h-20 glass-panel border-b border-white/5 flex items-center justify-between px-8 sticky top-0 z-20">
          <h1 className="text-xl font-semibold capitalize">
            {location.pathname.replace('/', '') || 'Dashboard'}
          </h1>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 bg-surfaceHighlight px-4 py-2 rounded-full border border-white/5">
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-primary to-accent flex items-center justify-center">
                <User size={16} />
              </div>
              <div className="text-sm">
                <p className="font-medium">{user?.name || 'User'}</p>
                <p className="text-xs text-gray-400 capitalize">{user?.role || 'Role'}</p>
              </div>
            </div>
          </div>
        </header>

        <div className="p-8 relative z-10">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;
