/* eslint-disable react-refresh/only-export-components, react-hooks/set-state-in-effect */
import { useState, useEffect, useCallback } from "react";
import { authApi } from "../api/auth";
import { AuthContext } from "./core";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("user");
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState(true);

  // ── При старте проверяем токен ────────────────────
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setTimeout(() => setLoading(false), 0);
      return;
    }
    authApi
      .me()
      .then((res) => {
        const u = res.data.user;
        setUser(u);
        localStorage.setItem("user", JSON.stringify(u));
      })
      .catch(() => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  // ── Login ─────────────────────────────────────────
  const login = useCallback(async (login, password) => {
    const res = await authApi.login({ login, password });
    const { token, user: u } = res.data;
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(u));
    setUser(u);
    return u;
  }, []);

  // ── Register ──────────────────────────────────────
  const register = useCallback(async (data) => {
    const res = await authApi.register(data);
    const { token, user: u } = res.data;
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(u));
    setUser(u);
    return u;
  }, []);

  // ── Logout ────────────────────────────────────────
  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // ignore
    }
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
  }, []);

  // ── Хелперы ролей ────────────────────────────────
  const hasRole = useCallback(
    (role) => {
      if (!user?.roles) return false;
      return user.roles.includes(role);
    },
    [user]
  );

  const primaryRole = user?.roles?.[0] ?? null;

  return (
    <AuthContext.Provider
      value={{ user, loading, login, register, logout, hasRole, primaryRole }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// useAuth вынесен в src/context/useAuth.js для совместимости с fast-refresh
