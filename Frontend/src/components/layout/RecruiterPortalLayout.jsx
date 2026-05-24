import { Building2, LayoutDashboard, LogOut, Settings2, Users2 } from 'lucide-react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';

const navItems = [
  { label: 'Overview', to: '/recruiter/dashboard', icon: LayoutDashboard },
  { label: 'Company Profile', to: '/recruiter/company', icon: Building2 }
];

const RecruiterPortalLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  return (
    <div className="min-h-screen bg-background text-gray-100">
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_top_right,rgba(20,184,166,0.14),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(14,165,233,0.16),transparent_35%)]" />
      <div className="relative mx-auto flex min-h-screen max-w-[1600px]">
        <aside className="hidden w-80 border-r border-white/10 bg-slate-950/70 px-6 py-8 backdrop-blur-xl lg:block">
          <Link to="/recruiter/dashboard" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent/20 text-accent">
              <Users2 size={22} />
            </div>
            <div>
              <div className="text-lg font-semibold text-white">Intervix Recruiter</div>
              <div className="text-xs uppercase tracking-[0.28em] text-gray-500">Hiring Workspace</div>
            </div>
          </Link>

          <div className="mt-10 rounded-3xl border border-white/10 bg-white/5 p-5">
            <div className="text-sm text-gray-400">Workspace owner</div>
            <div className="mt-2 text-lg font-semibold text-white">{user?.name}</div>
            <div className="text-sm text-accent capitalize">{user?.role}</div>
          </div>

          <nav className="mt-8 space-y-2">
            {navItems.map((item) => {
              const active = location.pathname.startsWith(item.to);
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`flex items-center gap-3 rounded-2xl px-4 py-3 transition ${active ? 'bg-accent text-slate-950 shadow-[0_18px_40px_rgba(56,189,248,0.18)]' : 'text-gray-300 hover:bg-white/5 hover:text-white'}`}
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="mt-8 rounded-3xl border border-white/10 bg-slate-900/80 p-5">
            <div className="flex items-center gap-2 text-white">
              <Settings2 size={18} className="text-accent" />
              <span className="font-medium">Recruiter mode</span>
            </div>
            <p className="mt-3 text-sm leading-6 text-gray-400">
              Keep your company profile current so your hiring surface stays polished for candidates and internal teams.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              logout();
              navigate('/login');
            }}
            className="mt-8 flex w-full items-center gap-3 rounded-2xl border border-red-500/20 px-4 py-3 text-red-300 transition hover:bg-red-500/10"
          >
            <LogOut size={18} />
            <span>Log out</span>
          </button>
        </aside>

        <main className="flex-1">
          <header className="border-b border-white/10 bg-slate-950/60 px-5 py-4 backdrop-blur-xl lg:px-10">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="text-xs uppercase tracking-[0.28em] text-gray-500">Recruiter ecosystem</div>
                <h1 className="mt-1 text-2xl font-semibold text-white">Operate a structured hiring portal for your team</h1>
              </div>
              <div className="flex flex-wrap gap-2 lg:hidden">
                {navItems.map((item) => (
                  <Link key={item.to} to={item.to} className="rounded-full border border-white/10 px-4 py-2 text-sm text-gray-300">
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          </header>

          <div className="px-5 py-6 lg:px-10 lg:py-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default RecruiterPortalLayout;
