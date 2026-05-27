import { BriefcaseBusiness, Bot, LayoutDashboard, LogOut, UserRound, Workflow, SearchCheck, TrendingUp, Award } from 'lucide-react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import Avatar from '../common/Avatar';
import NotificationDropdown from '../common/NotificationDropdown';

const navItems = [
  { label: 'Overview', to: '/candidate/dashboard', icon: LayoutDashboard },
  { label: 'AI Analytics', to: '/candidate/analytics', icon: TrendingUp },
  { label: 'Prep Hub', to: '/candidate/prep', icon: Award },
  { label: 'Job Feed', to: '/candidate/jobs', icon: SearchCheck },
  { label: 'Applications', to: '/candidate/applications', icon: Workflow },
  { label: 'Profile', to: '/candidate/profile', icon: UserRound },
  { label: 'Interview Lab', to: '/candidate/interview/setup', icon: Bot }
];

const CandidatePortalLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  return (
    <div className="min-h-screen bg-[#070A13] text-gray-100 flex overflow-hidden select-none">
      {/* Ambient glows */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-secondary/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Main Sidebar Wrapper */}
      <div className="relative mx-auto flex w-full max-w-[1600px] h-screen overflow-hidden">
        
        {/* Unified Premium Sidebar */}
        <aside className="hidden lg:flex w-72 border-r border-white/5 bg-[#090F1C]/80 backdrop-blur-xl px-5 py-6 flex-col justify-between flex-shrink-0 z-10">
          
          <div className="space-y-6">
            {/* Logo */}
            <Link to="/candidate/dashboard" className="flex items-center gap-3.5 px-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 text-primary shadow-[0_0_15px_rgba(99,102,241,0.25)]">
                <BriefcaseBusiness size={20} />
              </div>
              <div>
                <div className="text-sm font-bold text-white tracking-tight">Intervix</div>
                <div className="text-[9px] uppercase tracking-[0.25em] font-semibold text-gray-500 mt-0.5">Candidate Hub</div>
              </div>
            </Link>

            {/* Navigation items */}
            <nav className="space-y-1.5 pt-4">
              <div className="text-[9px] font-bold uppercase tracking-[0.2em] text-gray-500 mb-3 px-3">Ecosystem Menu</div>
              {navItems.map((item) => {
                const active = location.pathname.startsWith(item.to);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={`flex items-center gap-3.5 rounded-xl px-3.5 py-2.5 text-xs font-semibold transition-all duration-200 ${
                      active 
                        ? 'bg-primary/10 border border-primary/20 text-white shadow-[0_0_12px_rgba(99,102,241,0.15)]' 
                        : 'text-gray-400 border border-transparent hover:bg-white/[0.02] hover:text-white'
                    }`}
                  >
                    <Icon size={14} className={active ? 'text-primary' : 'text-gray-500'} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* User profiles & Logout */}
          <div className="space-y-4 pt-6 border-t border-white/5">
            <div className="flex items-center gap-3 p-2 bg-white/[0.01] border border-white/5 rounded-2xl">
              <Avatar name={user?.name || 'Candidate'} size="sm" />
              <div className="min-w-0">
                <div className="text-xs font-bold text-white truncate">{user?.name}</div>
                <div className="text-[9px] uppercase font-bold text-primary mt-0.5">{user?.role}</div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                logout();
                navigate('/login');
              }}
              className="flex w-full items-center gap-3 rounded-xl border border-red-500/20 px-3.5 py-2.5 text-xs font-semibold text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <LogOut size={14} />
              <span>Sign Out</span>
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col min-h-0 overflow-y-auto">
          {/* Unified Header */}
          <header className="relative border-b border-white/5 bg-[#090F1C]/40 backdrop-blur-xl px-8 py-5 flex items-center justify-between z-40 flex-shrink-0">
            <div>
              <div className="text-[9px] uppercase tracking-[0.2em] font-bold text-gray-500">Candidate Workspace</div>
              <h1 className="mt-1 text-base font-bold text-white">Refine profiles & practice coding with real-time AI</h1>
            </div>
            
            {/* Header Actions */}
            <div className="flex items-center gap-4">
              <NotificationDropdown />
              
              {/* Mobile Nav links */}
              <div className="flex gap-1.5 lg:hidden max-sm:hidden">
                {navItems.slice(0, 3).map((item) => (
                  <Link 
                    key={item.to} 
                    to={item.to} 
                    className="rounded-lg border border-white/5 bg-white/[0.02] px-3 py-1.5 text-[11px] font-bold text-gray-300 hover:text-white"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          </header>

          {/* Subpages Container */}
          <div className="flex-1 px-8 py-6 relative z-10 custom-scrollbar">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default CandidatePortalLayout;
