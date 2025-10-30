import { NavLink, Outlet } from 'react-router-dom';
import { useAdmin } from '../../context/AdminContext.jsx';

const AppLayout = () => {
  const { isAdmin, isChecking, login, logout } = useAdmin();

  const handleAdminLogin = async () => {
    const token = window.prompt('Enter the admin access token');
    if (!token) {
      return;
    }

    try {
      await login(token);
      window.alert('Admin access enabled. Editing actions are now available.');
    } catch (error) {
      window.alert(error.response?.data?.message || 'Invalid admin token.');
    }
  };

  const handleAdminLogout = () => {
    logout();
    window.alert('Admin access disabled. You now have read-only access.');
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">TA Git Commit Tracker</h1>
            <p className="text-sm text-slate-500">Monitor student commit activity at a glance.</p>
          </div>
          <div className="flex items-center gap-3">
            <nav className="flex gap-3 text-sm font-medium text-slate-600">
              <NavLink
                to="/"
                className={({ isActive }) =>
                  `rounded-md border border-transparent px-3 py-1 transition hover:border-slate-300 hover:text-slate-900 ${isActive ? 'bg-slate-900 text-white' : ''}`
                }
              >
                Classes
              </NavLink>
            </nav>
            {isAdmin ? (
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-700">
                  Admin
                </span>
                <button
                  type="button"
                  onClick={handleAdminLogout}
                  disabled={isChecking}
                  className="rounded-md border border-slate-200 px-3 py-1 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Logout
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleAdminLogin}
                disabled={isChecking}
                className="rounded-md border border-slate-200 px-3 py-1 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isChecking ? 'Checking…' : 'Admin Login'}
              </button>
            )}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
};

export default AppLayout;
