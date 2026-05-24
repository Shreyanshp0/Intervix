import { BriefcaseBusiness, Bot, LayoutDashboard, LogOut, UserRound } from 'lucide-react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';

const navItems = [
  { label: 'Overview', to: '/candidate/dashboard', icon: LayoutDashboard },
  { label: 'Profile', to: '/candidate/profile', icon: UserRound },
  { label: 'Interview Lab', to: '/candidate/interview/setup', icon: Bot }
];

const CandidatePortalLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  return (
    <div className="min-h-screen bg-background text-gray-100">
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.14),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(99,102,241,0.18),transparent_35%)]" />
      <div className="relative mx-auto flex min-h-screen max-w-[1600px]">
        <aside className="hidden w-80 border-r border-white/10 bg-slate-950/70 px-6 py-8 backdrop-blur-xl lg:block">
          <Link to="/candidate/dashboard" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/20 text-primary">
              <BriefcaseBusiness size={22} />
            </div>
            <div>
              <div className="text-lg font-semibold text-white">Intervix Candidate</div>
              <div className="text-xs uppercase tracking-[0.28em] text-gray-500">Talent Portal</div>
            </div>
          </Link>

          <div className="mt-10 rounded-3xl border border-white/10 bg-white/5 p-5">
            <div className="text-sm text-gray-400">Signed in as</div>
            <div className="mt-2 text-lg font-semibold text-white">{user?.name}</div>
            <div className="text-sm text-primary capitalize">{user?.role}</div>
          </div>

          <nav className="mt-8 space-y-2">
            {navItems.map((item) => {
              const active = location.pathname.startsWith(item.to);
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`flex items-center gap-3 rounded-2xl px-4 py-3 transition ${active ? 'bg-primary text-white shadow-[0_18px_40px_rgba(99,102,241,0.2)]' : 'text-gray-300 hover:bg-white/5 hover:text-white'}`}
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

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
                <div className="text-xs uppercase tracking-[0.28em] text-gray-500">Candidate ecosystem</div>
                <h1 className="mt-1 text-2xl font-semibold text-white">Build a recruiter-ready profile and practice with AI</h1>
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

export default CandidatePortalLayout;
