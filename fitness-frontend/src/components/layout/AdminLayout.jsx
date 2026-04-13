import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../../context/useAuth";

const adminNav = [
  { to: "/admin",                   label: "Дашборд",            icon: "📊" },
  { to: "/admin/clients",           label: "Клиенты",            icon: "👥" },
  { to: "/admin/schedule",          label: "Расписание",         icon: "📅" },
  { to: "/admin/memberships",       label: "Абонементы",         icon: "🎫" },
  { to: "/admin/sales",             label: "Продажи",            icon: "💰" },
  { to: "/admin/visits",            label: "Посещения",          icon: "✅" },
  { to: "/admin/pending-bookings",  label: "Ожидающие записи",  icon: "⏳" },
];

const ownerNav = [
  { to: "/admin/owner/staff",             label: "Персонал",    icon: "👤" },
  { to: "/admin/owner/membership-types",  label: "Тарифы",      icon: "📋" },
  { to: "/admin/owner/promo-codes",       label: "Промокоды",   icon: "🏷️" },
];

function NavItem({ to, label, icon, exact = false }) {
  return (
    <NavLink
      to={to}
      end={exact}
      className={({ isActive }) =>
        `flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors ${
          isActive
            ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-medium"
            : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
        }`
      }
    >
      <span className="text-base leading-none">{icon}</span>
      {label}
    </NavLink>
  );
}

export default function AdminLayout() {
  const { user, logout, hasRole } = useAuth();
  const isOwner = hasRole("owner");

  return (
    <div className="flex h-screen bg-zinc-100 dark:bg-zinc-950">
      <aside className="w-56 shrink-0 bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 flex flex-col">
        <div className="px-5 py-5 border-b border-zinc-200 dark:border-zinc-800">
          <div className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">FitClub</div>
          <div className="text-xs text-zinc-400 mt-0.5">{isOwner ? "Панель владельца" : "Панель администратора"}</div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {adminNav.map(item => (
            <NavItem key={item.to} to={item.to} label={item.label} icon={item.icon} exact={item.to === "/admin"} />
          ))}

          {isOwner && (
            <>
              <div className="px-3 pt-4 pb-1 text-[10px] text-zinc-400 uppercase tracking-wide font-medium">
                Управление
              </div>
              {ownerNav.map(item => (
                <NavItem key={item.to} to={item.to} label={item.label} icon={item.icon} />
              ))}
            </>
          )}
        </nav>

        <div className="px-5 py-4 border-t border-zinc-200 dark:border-zinc-800">
          <div className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
            {user?.full_name ?? user?.email}
          </div>
          <div className="text-xs text-zinc-400 capitalize">
            {isOwner ? "Владелец" : "Администратор"}
          </div>
          <button
            onClick={logout}
            className="mt-2 text-xs text-zinc-400 hover:text-red-500 transition-colors"
          >
            Выйти
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
