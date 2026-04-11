import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/useAuth";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ login: "", password: "" });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const user = await login(form.login, form.password);
      const role = user.roles?.[0];
      if (role === "admin" || role === "owner") navigate("/admin", { replace: true });
      else if (role === "trainer") navigate("/trainer", { replace: true });
      else navigate("/client", { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || "Ошибка входа");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-100 dark:bg-zinc-950 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
            FitClub
          </h1>
          <p className="text-sm text-zinc-400 mt-1">Вход в систему</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6 space-y-4"
        >
          {error && (
            <div className="text-sm text-red-600 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs text-zinc-500 mb-1.5">Логин</label>
            <input
              type="text"
              required
              value={form.login}
              onChange={(e) => setForm({ ...form, login: e.target.value })}
              className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 outline-none focus:border-zinc-400 dark:focus:border-zinc-500 transition-colors"
              placeholder="admin"
            />
          </div>

          <div>
            <label className="block text-xs text-zinc-500 mb-1.5">Пароль</label>
            <input
              type="password"
              required
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 outline-none focus:border-zinc-400 dark:focus:border-zinc-500 transition-colors"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg text-sm font-medium hover:opacity-80 disabled:opacity-50 transition-opacity"
          >
            {loading ? "Вход..." : "Войти"}
          </button>

          <p className="text-center text-xs text-zinc-400">
            Нет аккаунта?{" "}
            <Link to="/register" className="text-zinc-700 dark:text-zinc-300 hover:underline">
              Зарегистрироваться
            </Link>
          </p>
        </form>

        <p className="text-center text-xs text-zinc-400 mt-4">
          Демо: admin / password
        </p>
      </div>
    </div>
  );
}
