import { NavLink, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  ClipboardList,
  FileText,
  LayoutDashboard,
  LogOut,
  Users,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function AppLayout() {
  const {
    user,
    me,
    logout,
    workspaceOwnerId,
    setWorkspaceOwnerId,
    currentWorkspace,
    isOwner,
  } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const nav = [
    { to: '/', label: 'Projects', icon: ClipboardList },
    { to: '/summary', label: 'Summary', icon: LayoutDashboard },
    ...(isOwner
      ? [{ to: '/daily-report', label: 'Daily Report', icon: FileText }]
      : []),
    ...(isOwner
      ? [{ to: '/people', label: 'People', icon: Users }]
      : []),
  ];

  if (!isOwner && location.pathname.startsWith('/daily-report')) {
    return <Navigate to="/" replace />;
  }
  if (!isOwner && location.pathname.startsWith('/people')) {
    return <Navigate to="/" replace />;
  }

  const brandName = currentWorkspace?.isOwn
    ? user?.name || 'My'
    : currentWorkspace?.ownerName || 'Workspace';

  const brandTitle = currentWorkspace?.isOwn
    ? /s$/i.test(brandName)
      ? `${brandName}' Tasks`
      : `${brandName}'s Tasks`
    : brandName;

  const roleLabel = currentWorkspace?.role || '';

  return (
    <div className="min-h-screen">
      <header className="border-b border-line/80 bg-white/70 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-6">
            <div>
              <p className="font-display text-xl font-semibold tracking-tight text-pine-deep">
                {brandTitle}
                {!currentWorkspace?.isOwn && roleLabel ? (
                  <span className="ml-2 align-middle text-sm font-medium text-slate-ink/70">
                    · {roleLabel}
                  </span>
                ) : null}
              </p>
              <p className="text-xs text-slate-ink/70">
                {currentWorkspace?.isOwn
                  ? 'Your workspace'
                  : `Signed in as ${user?.name}`}
              </p>
            </div>
            <nav className="hidden items-center gap-1 md:flex">
              {nav.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) =>
                    `flex items-center gap-2 rounded-md px-3 py-2 text-sm transition ${
                      isActive
                        ? 'bg-pine text-white'
                        : 'text-slate-ink hover:bg-mist'
                    }`
                  }
                >
                  <item.icon size={16} />
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {me && me.workspaces.length > 1 && (
              <select
                className="rounded-md border border-line bg-white px-3 py-2 text-sm"
                value={workspaceOwnerId ?? ''}
                onChange={(e) => setWorkspaceOwnerId(e.target.value)}
              >
                {me.workspaces.map((w) => (
                  <option key={w.ownerId} value={w.ownerId}>
                    {w.isOwn
                      ? `My dashboard (${w.ownerName})`
                      : `${w.ownerName} · ${w.role}`}
                  </option>
                ))}
              </select>
            )}
            <button
              type="button"
              onClick={() => {
                logout();
                navigate('/login');
              }}
              className="inline-flex items-center gap-2 rounded-md border border-line bg-white px-3 py-2 text-sm hover:bg-fog"
            >
              <LogOut size={16} />
              Logout
            </button>
          </div>
        </div>

        <nav className="flex gap-1 overflow-x-auto px-4 pb-3 md:hidden">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm ${
                  isActive ? 'bg-pine text-white' : 'bg-white text-slate-ink'
                }`
              }
            >
              <item.icon size={14} />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6">
        <Outlet />
      </main>
    </div>
  );
}
