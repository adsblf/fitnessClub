import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    password: "",
    password_confirmation: "",
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  function set(field) {
    return (e) => setForm({ ...form, [field]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErrors({});

    if (form.password !== form.password_confirmation) {
      setErrors({ password_confirmation: "Пароли не совпадают" });
      return;
    }

    setLoading(true);
    try {
      await register(form);
      navigate("/client", { replace: true });
    } catch (err) {
      const data = err.response?.data;
      if (data?.errors) {
        setErrors(data.errors);
      } else {
        setErrors({ general: data?.message || "Ошибка регистрации" });
      }
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
          <p className="text-sm text-zinc-400 mt-1">Регистрация</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6 space-y-4"
        >
          {errors.general && (
            <div className="text-sm text-red-600 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">
              {errors.general}
            </div>
          )}

          <Field label="ФИО" error={errors.full_name}>
            <input
              required
              value={form.full_name}
              onChange={set("full_name")}
              className="input"
              placeholder="Иванов Иван Петрович"
            />
          </Field>

          <Field label="Email" error={errors.email}>
            <input
              type="email"
              required
              value={form.email}
              onChange={set("email")}
              className="input"
              placeholder="ivan@example.com"
            />
          </Field>

          <Field label="Телефон" error={errors.phone}>
            <input
              value={form.phone}
              onChange={set("phone")}
              className="input"
              placeholder="+7-900-000-00-00"
            />
          </Field>

          <Field label="Пароль" error={errors.password}>
            <input
              type="password"
              required
              minLength={6}
              value={form.password}
              onChange={set("password")}
              className="input"
              placeholder="Минимум 6 символов"
            />
          </Field>

          <Field label="Подтверждение пароля" error={errors.password_confirmation}>
            <input
              type="password"
              required
              value={form.password_confirmation}
              onChange={set("password_confirmation")}
              className="input"
              placeholder="Повторите пароль"
            />
          </Field>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg text-sm font-medium hover:opacity-80 disabled:opacity-50 transition-opacity"
          >
            {loading ? "Регистрация..." : "Зарегистрироваться"}
          </button>

          <p className="text-center text-xs text-zinc-400">
            Есть аккаунт?{" "}
            <Link to="/login" className="text-zinc-700 dark:text-zinc-300 hover:underline">
              Войти
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}

function Field({ label, error, children }) {
  return (
    <div>
      <label className="block text-xs text-zinc-500 mb-1.5">{label}</label>
      <div
        className="[&_.input]:w-full [&_.input]:px-3 [&_.input]:py-2 [&_.input]:text-sm [&_.input]:rounded-lg [&_.input]:border [&_.input]:border-zinc-200 dark:[&_.input]:border-zinc-700 [&_.input]:bg-zinc-50 dark:[&_.input]:bg-zinc-800 [&_.input]:text-zinc-900 dark:[&_.input]:text-zinc-100 [&_.input]:outline-none [&_.input]:focus:border-zinc-400 dark:[&_.input]:focus:border-zinc-500 [&_.input]:transition-colors"
      >
        {children}
      </div>
      {error && (
        <p className="text-xs text-red-500 mt-1">
          {Array.isArray(error) ? error[0] : error}
        </p>
      )}
    </div>
  );
}
