import { useState, useEffect, useCallback } from "react";
import { clientsApi } from "../../api/clients";

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
  const [selected, setSelected] = useState(null);

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

      {/* Поиск */}
      <input
        type="text"
        placeholder="Поиск по ФИО, телефону, email..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full max-w-md px-3 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 outline-none focus:border-zinc-400"
      />

      {/* Таблица */}
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
                  onClick={() => setSelected(c)}
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

        {/* Пагинация */}
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

      {/* Модалка создания */}
      {showCreate && (
        <CreateClientModal
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            fetchClients(1);
          }}
        />
      )}

      {/* Модалка деталей */}
      {selected && (
        <ClientDetailModal
          client={selected}
          onClose={() => setSelected(null)}
          onUpdated={() => {
            setSelected(null);
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
    email: "",
    phone: "",
    birth_date: "",
    password: "password",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await clientsApi.create(form);
      onCreated();
    } catch (err) {
      setError(err.response?.data?.message || "Ошибка создания");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Новый клиент</h2>

        {error && <div className="text-sm text-red-500 mb-3">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-3">
          <Input label="ФИО" required value={form.full_name} onChange={(v) => setForm({ ...form, full_name: v })} />
          <Input label="Email" type="email" required value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
          <Input label="Телефон" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
          <Input label="Дата рождения" type="date" value={form.birth_date} onChange={(v) => setForm({ ...form, birth_date: v })} />

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

// ── Модалка деталей клиента ─────────────────────────
function ClientDetailModal({ client, onClose, onUpdated }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    clientsApi.get(client.id).then((res) => {
      setDetail(res.data.data);
      setLoading(false);
    });
  }, [client.id]);

  async function handleDelete() {
    if (!confirm("Удалить клиента? Это действие необратимо.")) return;
    await clientsApi.delete(client.id);
    onUpdated();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {loading ? (
          <div className="text-sm text-zinc-400">Загрузка...</div>
        ) : (
          <>
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">{detail.full_name}</h2>
                <p className="text-xs text-zinc-400 mt-0.5">{detail.email} · {detail.phone ?? "нет телефона"}</p>
              </div>
              <StatusBadge status={detail.status} />
            </div>

            {detail.membership && (
              <div className="bg-zinc-50 dark:bg-zinc-800 rounded-lg p-3 mb-4">
                <div className="text-xs text-zinc-400 mb-1">Абонемент</div>
                <div className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{detail.membership.type}</div>
                <div className="text-xs text-zinc-500 mt-0.5">
                  Статус: {detail.membership.status} · до {detail.membership.end_date} · остаток: {detail.membership.remaining_visits}
                </div>
              </div>
            )}

            {detail.card && (
              <div className="bg-zinc-50 dark:bg-zinc-800 rounded-lg p-3 mb-4">
                <div className="text-xs text-zinc-400 mb-1">Карточка клиента</div>
                <div className="grid grid-cols-2 gap-2 text-xs text-zinc-600 dark:text-zinc-400">
                  <span>Цель: {detail.card.training_goal}</span>
                  <span>Вес: {detail.card.current_weight} кг</span>
                  <span>Рост: {detail.card.height} см</span>
                  <span>ИМТ: {detail.card.bmi}</span>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 mb-4 text-center">
              <div className="bg-zinc-50 dark:bg-zinc-800 rounded-lg p-3">
                <div className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{detail.total_visits}</div>
                <div className="text-xs text-zinc-400">Посещений</div>
              </div>
              <div className="bg-zinc-50 dark:bg-zinc-800 rounded-lg p-3">
                <div className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{detail.active_bookings}</div>
                <div className="text-xs text-zinc-400">Активных записей</div>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={onClose} className="flex-1 py-2 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800">
                Закрыть
              </button>
              <button onClick={handleDelete} className="px-4 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-950 rounded-lg transition-colors">
                Удалить
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Input({ label, value, onChange, ...props }) {
  return (
    <div>
      <label className="block text-xs text-zinc-500 mb-1">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 outline-none focus:border-zinc-400"
        {...props}
      />
    </div>
  );
}
