import { useState, useEffect, useCallback } from "react";
import { clientsApi } from "../../api/clients";
import ClientDetailModal from "../../components/ClientDetailModal";

const PHONE_REGEX = /^\+7-\d{3}-\d{3}-\d{4}$/;
const SERIES_REGEX = /^\d{4}$/;
const NUMBER_REGEX = /^\d{6}$/;
const DEPT_REGEX = /^\d{3}-\d{3}$/;

function StatusBadge({ status }) {
  const map = {
    active:   "bg-emerald-100 text-emerald-700",
    inactive: "bg-zinc-100 text-zinc-500",
    blocked:  "bg-red-100 text-red-600",
  };
  const labels = { active: "Активен", inactive: "Неактивен", blocked: "Заблокирован" };
  return (
      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${map[status] ?? "bg-zinc-100 text-zinc-600"}`}>
      {labels[status] ?? status}
    </span>
  );
}

export default function AdminClients() {
  const [clients, setClients] = useState([]);
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, total: 0 });
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedId, setSelectedId] = useState(null);

  const fetchClients = useCallback(
      (page = 1) => {
        setLoading(true);
        clientsApi
            .list({ search, page, per_page: 15 })
            .then((res) => {
              setClients(res.data.data);
              setMeta(res.data.meta);
            })
            .finally(() => setLoading(false));
      },
      [search]
  );

  useEffect(() => {
    const t = setTimeout(() => fetchClients(1), 300);
    return () => clearTimeout(t);
  }, [fetchClients]);

  return (
      <div className="p-6 space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Клиенты</h1>
          <button
              onClick={() => setShowCreate(true)}
              className="px-4 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg text-sm font-medium hover:opacity-80 transition-opacity"
          >
            + Новый клиент
          </button>
        </div>

        <input
            type="text"
            placeholder="Поиск по ФИО, телефону, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full max-w-md px-3 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 outline-none focus:border-zinc-400"
        />

        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800">
          {loading ? (
              <div className="p-8 text-center text-sm text-zinc-400">Загрузка...</div>
          ) : clients.length === 0 ? (
              <div className="p-8 text-center text-sm text-zinc-400">Клиенты не найдены</div>
          ) : (
              <table className="w-full text-sm">
                <thead>
                <tr className="text-xs text-zinc-400 border-b border-zinc-100 dark:border-zinc-800">
                  <th className="text-left px-5 py-2.5 font-normal">ФИО</th>
                  <th className="text-left px-5 py-2.5 font-normal">Email</th>
                  <th className="text-left px-5 py-2.5 font-normal">Телефон</th>
                  <th className="text-left px-5 py-2.5 font-normal">Абонемент</th>
                  <th className="text-left px-5 py-2.5 font-normal">Остаток</th>
                  <th className="text-left px-5 py-2.5 font-normal">Статус</th>
                </tr>
                </thead>
                <tbody>
                {clients.map((c, i) => (
                    <tr
                        key={c.id}
                        onClick={() => setSelectedId(c.id)}
                        className={`border-b border-zinc-50 dark:border-zinc-800 last:border-0 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50 ${
                            i % 2 === 0 ? "" : "bg-zinc-50/50 dark:bg-zinc-800/20"
                        }`}
                    >
                      <td className="px-5 py-3 text-zinc-800 dark:text-zinc-200 font-medium">{c.full_name}</td>
                      <td className="px-5 py-3 text-zinc-500">{c.email}</td>
                      <td className="px-5 py-3 text-zinc-500">{c.phone ?? "—"}</td>
                      <td className="px-5 py-3 text-zinc-700 dark:text-zinc-300">{c.membership?.type ?? "—"}</td>
                      <td className="px-5 py-3 text-zinc-500">{c.remaining_visits ?? "—"}</td>
                      <td className="px-5 py-3"><StatusBadge status={c.status} /></td>
                    </tr>
                ))}
                </tbody>
              </table>
          )}

          {meta.last_page > 1 && (
              <div className="flex justify-center gap-2 p-4 border-t border-zinc-100 dark:border-zinc-800">
                {Array.from({ length: meta.last_page }, (_, i) => (
                    <button
                        key={i + 1}
                        onClick={() => fetchClients(i + 1)}
                        className={`px-3 py-1 rounded text-xs ${
                            meta.current_page === i + 1
                                ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                                : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                        }`}
                    >
                      {i + 1}
                    </button>
                ))}
              </div>
          )}
        </div>

        {showCreate && (
            <CreateClientModal
                onClose={() => setShowCreate(false)}
                onCreated={() => {
                  setShowCreate(false);
                  fetchClients(1);
                }}
            />
        )}

        {selectedId && (
            <ClientDetailModal
                clientId={selectedId}
                onClose={() => setSelectedId(null)}
                onDeleted={() => {
                  setSelectedId(null);
                  fetchClients(meta.current_page);
                }}
            />
        )}
      </div>
  );
}

// ── Модалка создания клиента ────────────────────────
function CreateClientModal({ onClose, onCreated }) {
  const [form, setForm] = useState({
    full_name: "",
    login: "",
    email: "",
    phone: "",
    birth_date: "",
    password: "password",
    passport_series: "",
    passport_number: "",
    passport_issued_at: "",
    passport_issued_by: "",
    passport_department_code: "",
    registration_address: "",
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState(null);

  function set(field) {
    return (v) => setForm({ ...form, [field]: v });
  }

  function validate() {
    const e = {};

    if (!form.full_name.trim()) e.full_name = "Укажите ФИО";
    // Email обязателен и должен быть корректным
    if (!form.email || !form.email.trim()) {
      e.email = "Укажите email";
    } else {
      const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!EMAIL_REGEX.test(form.email)) e.email = "Неверный формат email";
    }
    // Login — опционально, но не должен содержать пробелы
    if (form.login && /\s/.test(form.login)) {
      e.login = "Логин не должен содержать пробелов";
    }

    // Телефон — обязателен и должен соответствовать формату
    if (!form.phone || !form.phone.trim()) {
      e.phone = "Укажите телефон";
    } else if (!PHONE_REGEX.test(form.phone)) {
      e.phone = "Формат: +7-nnn-nnn-nnnn";
    }

    // Дата рождения — обязательна и не в будущем
    if (!form.birth_date) {
      e.birth_date = "Укажите дату рождения";
    } else if (form.birth_date > new Date().toISOString().split("T")[0]) {
      e.birth_date = "Дата не может быть в будущем";
    }

    // Паспорт — все поля либо пустые, либо валидные.
    // Невалидные значения отвергаем по отдельности.
    if (form.passport_series && !SERIES_REGEX.test(form.passport_series)) {
      e.passport_series = "Серия — ровно 4 цифры";
    }
    if (form.passport_number && !NUMBER_REGEX.test(form.passport_number)) {
      e.passport_number = "Номер — ровно 6 цифр";
    }
    if (form.passport_department_code && !DEPT_REGEX.test(form.passport_department_code)) {
      e.passport_department_code = "Формат: nnn-nnn";
    }
    if (form.passport_issued_at && form.passport_issued_at > new Date().toISOString().split("T")[0]) {
      e.passport_issued_at = "Дата не может быть в будущем";
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setServerError(null);
    if (!validate()) return;

    setLoading(true);
    try {
      // Чистим пустые строки
      const payload = Object.fromEntries(
          Object.entries(form).filter(([, v]) => v !== "" && v != null)
      );
      await clientsApi.create(payload);
      onCreated();
    } catch (err) {
      const data = err.response?.data;
      if (data?.errors) {
        // Преобразуем массивы Laravel в простые строки
        setErrors(
            Object.fromEntries(
                Object.entries(data.errors).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v])
            )
        );
      } else {
        setServerError(data?.message || "Ошибка создания");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
        <div
            className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
        >
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Новый клиент</h2>

          {serverError && <div className="text-sm text-red-500 mb-3">{serverError}</div>}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Основные данные */}
            <div className="space-y-3">
              <div className="text-xs uppercase tracking-wide text-zinc-400">Основное</div>
              <Field label="ФИО *" error={errors.full_name}>
                <input className="input" required value={form.full_name} onChange={(e) => set("full_name")(e.target.value)} placeholder="Иванов Иван Иванович" />
              </Field>
              <Field label="Email *" error={errors.email}>
                <input type="email" required className="input" value={form.email} onChange={(e) => set("email")(e.target.value)} placeholder="ivan@example.ru" />
              </Field>
              <Field label="Логин" error={errors.login}>
                <input type="text" className="input" value={form.login} onChange={(e) => set("login")(e.target.value)} placeholder="client123" />
              </Field>
              <Field label="Телефон *" error={errors.phone} hint="+7-nnn-nnn-nnnn">
                <input className="input" required value={form.phone} onChange={(e) => set("phone")(e.target.value)} placeholder="+7-900-123-45-67" />
              </Field>
              <Field label="Дата рождения *" error={errors.birth_date}>
                <input type="date" className="input" required value={form.birth_date} onChange={(e) => set("birth_date")(e.target.value)} />
              </Field>
            </div>

            {/* Паспорт */}
            <div className="space-y-3 pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <div className="text-xs uppercase tracking-wide text-zinc-400 pt-3">
                Паспортные данные{" "}
                <span className="text-zinc-400 normal-case font-normal">(необязательные)</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Серия" error={errors.passport_series} hint="4 цифры">
                  <input className="input" maxLength={4} value={form.passport_series} onChange={(e) => set("passport_series")(e.target.value.replace(/\D/g, ""))} placeholder="1234" />
                </Field>
                <Field label="Номер" error={errors.passport_number} hint="6 цифр">
                  <input className="input" maxLength={6} value={form.passport_number} onChange={(e) => set("passport_number")(e.target.value.replace(/\D/g, ""))} placeholder="567890" />
                </Field>
              </div>
              <Field label="Дата выдачи" error={errors.passport_issued_at}>
                <input type="date" className="input" value={form.passport_issued_at} onChange={(e) => set("passport_issued_at")(e.target.value)} />
              </Field>
              <Field label="Кем выдан" error={errors.passport_issued_by}>
                <input className="input" value={form.passport_issued_by} onChange={(e) => set("passport_issued_by")(e.target.value)} placeholder="ОУФМС России по г. Москве по р-ну ..." />
              </Field>
              <Field label="Код подразделения" error={errors.passport_department_code} hint="nnn-nnn">
                <input className="input" maxLength={7} value={form.passport_department_code} onChange={(e) => set("passport_department_code")(e.target.value)} placeholder="770-001" />
              </Field>
              <Field label="Адрес регистрации" error={errors.registration_address}>
                <input className="input" value={form.registration_address} onChange={(e) => set("registration_address")(e.target.value)} placeholder="г. Москва, ул. ..." />
              </Field>
            </div>

            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={loading} className="flex-1 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg text-sm font-medium hover:opacity-80 disabled:opacity-50">
                {loading ? "Создание..." : "Создать"}
              </button>
              <button type="button" onClick={onClose} className="px-4 py-2 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800">
                Отмена
              </button>
            </div>
          </form>
        </div>
      </div>
  );
}

function Field({ label, error, hint, children }) {
  return (
      <div>
        <label className="block text-xs text-zinc-500 mb-1">{label}</label>
        <div className="[&_.input]:w-full [&_.input]:px-3 [&_.input]:py-2 [&_.input]:text-sm [&_.input]:rounded-lg [&_.input]:border [&_.input]:border-zinc-200 dark:[&_.input]:border-zinc-700 [&_.input]:bg-zinc-50 dark:[&_.input]:bg-zinc-800 [&_.input]:text-zinc-900 dark:[&_.input]:text-zinc-100 [&_.input]:outline-none [&_.input]:focus:border-zinc-400">
          {children}
        </div>
        {error ? (
            <p className="text-xs text-red-500 mt-1">{error}</p>
        ) : hint ? (
            <p className="text-xs text-zinc-400 mt-1">{hint}</p>
        ) : null}
      </div>
  );
}
