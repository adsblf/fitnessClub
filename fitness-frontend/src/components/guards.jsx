import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/useAuth";

/**
 * Требует авторизации. Если не залогинен — редирект на /login.
 */
export function RequireAuth() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-sm text-zinc-400">Загрузка...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

/**
 * Требует одну из указанных ролей.
 * Использование: <Route element={<RequireRole roles={["admin","owner"]} />}>
 */
export function RequireRole({ roles }) {
  const { user, hasRole, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-sm text-zinc-400">Загрузка...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const allowed = roles.some((r) => hasRole(r));
  if (!allowed) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}

/**
 * Если уже залогинен — перекидывает в кабинет по роли.
 */
export function GuestOnly() {
  const { user, loading, primaryRole } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-sm text-zinc-400">Загрузка...</div>
      </div>
    );
  }

  if (user) {
    const dest =
      primaryRole === "admin" || primaryRole === "owner"
        ? "/admin"
        : primaryRole === "trainer"
        ? "/trainer"
        : "/client";
    return <Navigate to={dest} replace />;
  }

  return <Outlet />;
}
