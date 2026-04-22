import { Link, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function NavItem({ to, label, icon, active }) {
  return (
    <Link
      to={to}
      className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-lg font-medium transition ${
        active
          ? "bg-indigo-50 text-indigo-600"
          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
      }`}
    >
      <span className="text-2xl">{icon}</span>
      <span>{label}</span>
    </Link>
  );
}

export default function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();

  const nav = [
    ["/", "Dashboard", "◫"],
    ["/face-scan", "Face Scan", "⌘"],
    ["/personnel", "Student", "◔"],
    ["/attendance-log", "Attendance Log", "◷"],
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="grid min-h-screen grid-cols-[280px_1fr]">
        <aside className="flex flex-col justify-between border-r border-slate-200 bg-white px-6 py-8">
          <div>
            <div className="mb-10 flex items-center gap-4">
              <div className="grid h-14 w-14 place-items-center rounded-2xl bg-indigo-600 text-2xl font-bold text-white shadow-sm">
                ⌁
              </div>
              <div>
                <h1 className="text-4xl font-extrabold tracking-tight">FaceGuard</h1>
              </div>
            </div>

            <nav className="space-y-2">
              {nav.map(([path, label, icon]) => (
                <NavItem
                  key={path}
                  to={path}
                  label={label}
                  icon={icon}
                  active={location.pathname === path}
                />
              ))}
            </nav>
          </div>

          <div className="space-y-4 border-t border-slate-200 pt-6">
            <div className="flex items-center gap-4">
              <div className="grid h-14 w-14 place-items-center rounded-full bg-linear-to-br from-violet-500 to-indigo-600 text-lg font-bold text-white">
                {(user?.fullName || user?.email || "U").slice(0, 2).toUpperCase()}
              </div>

              <div className="min-w-0">
                <div className="truncate text-2xl font-semibold">
                  {user?.fullName || user?.email || "User"}
                </div>
                <div className="mt-1 inline-flex rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold capitalize text-slate-700">
                  {user?.role || "guest"}
                </div>
              </div>
            </div>

            <button
              onClick={logout}
              className="w-full rounded-2xl bg-red-500 px-4 py-3 text-lg font-semibold text-white transition hover:bg-red-600"
            >
              Logout
            </button>
          </div>
        </aside>

        <main className="p-8 xl:p-10">
          <Outlet />
        </main>
      </div>
    </div>
  );
}