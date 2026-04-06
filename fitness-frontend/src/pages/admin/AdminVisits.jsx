import { useState, useEffect, useCallback } from "react";
import { visitsApi } from "../../api/visits";

export default function AdminVisits() {
  const [visits, setVisits] = useState([]);
  const [meta, setMeta] = useState({});
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  const fetch = useCallback(
    (page = 1) => {
      setLoading(true);
      const params = { page, per_page: 20 };
      if (date) params.date = date;
      visitsApi
        .list(params)
        .then((r) => {
          setVisits(r.data.data);
          setMeta(r.data.meta);
        })
        .finally(() => setLoading(false));
    },
    [date]
  );

  useEffect(() => {
    fetch(1);
  }, [fetch]);

  const STATUS_MAP = {
    visited:  { label: "Посещено", cls: "bg-emerald-100 text-emerald-700" },
    no_show:  { label: "Неявка",   cls: "bg-red-100 text-red-600" },
    late:     { label: "Опоздание", cls: "bg-amber-100 text-amber-700" },
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Посещения</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="px-4 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg text-sm font-medium hover:opacity-80"
        >
          + Зарегистрировать
        </button>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="px-3 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 outline-none"
        />
        {date && (
          <button onClick={() => setDate("")} className="text-xs text-zinc-400 hover:text-zinc-700">
            Сбросить
          </button>
        )}
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800">
        {loading ? (
          <div className="p-8 text-center text-sm text-zinc-400">Загрузка...</div>
        ) : visits.length === 0 ? (
          <div className="p-8 text-center text-sm text-zinc-400">Посещений не найдено</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-zinc-400 border-b border-zinc-100 dark:border-zinc-800">
                <th className="text-left px-5 py-2.5 font-normal">Клиент</th>
                <th className="text-left px-5 py-2.5 font-normal">Дата и время</th>
                <th className="text-left px-5 py-2.5 font-normal">Занятие</th>
                <th className="text-left px-5 py-2.5 font-normal">Статус</th>
                <th className="text-left px-5 py-2.5 font-normal">Примечание</th>
              </tr>
            </thead>
            <tbody>
              {visits.map((v, i) => {
                const st = STATUS_MAP[v.status] ?? { label: v.status, cls: "bg-zinc-100 text-zinc-600" };
                return (
                  <tr key={v.id} className={`border-b border-zinc-50 dark:border-zinc-800 last:border-0 ${i % 2 ? "bg-zinc-50/50 dark:bg-zinc-800/20" : ""}`}>
                    <td className="px-5 py-3 text-zinc-800 dark:text-zinc-200 font-medium">{v.client_name}</td>
                    <td className="px-5 py-3 text-zinc-500">{v.visited_at}</td>
                    <td className="px-5 py-3 text-zinc-500">{v.session_name}</td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${st.cls}`}>{st.label}</span>
                    </td>
                    <td className="px-5 py-3 text-zinc-400 text-xs">{v.notes ?? "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {meta.last_page > 1 && (
          <div className="flex justify-center gap-2 p-4 border-t border-zinc-100 dark:border-zinc-800">
            {Array.from({ length: meta.last_page }, (_, i) => (
              <button
                key={i + 1}
                onClick={() => fetch(i + 1)}
                className={`px-3 py-1 rounded text-xs ${
                  meta.current_page === i + 1
                    ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                    : "text-zinc-500 hover:bg-zinc-100"
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>
        )}
      </div>

      {showCreate && (
        <CreateVisitModal
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            fetch(1);
          }}
        />
      )}
    </div>
  );
}

function CreateVisitModal({ onClose, onCreated }) {
  const [form, setForm] = useState({
    client_id: "",
    session_id: "",
    status: "visited",
    notes: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const data = { ...form, client_id: Number(form.client_id) };
      if (data.session_id) data.session_id = Number(data.session_id);
      else delete data.session_id;
      if (!data.notes) delete data.notes;
      await visitsApi.create(data);
      onCreated();
    } catch (err) {
      setError(err.response?.data?.message || "Ошибка");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Регистрация посещения</h2>
        {error && <div className="text-sm text-red-500 mb-3">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs text-zinc-500 mb-1">ID клиента</label>
            <input
              type="number"
              required
              value={form.client_id}
              onChange={(e) => setForm({ ...form, client_id: e.target.value })}
              className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 outline-none"
              placeholder="ID клиента из таблицы"
            />
          </div>

          <div>
            <label className="block text-xs text-zinc-500 mb-1">ID занятия (необязательно)</label>
            <input
              type="number"
              value={form.session_id}
              onChange={(e) => setForm({ ...form, session_id: e.target.value })}
              className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 outline-none"
              placeholder="Свободное посещение, если пусто"
            />
          </div>

          <div>
            <label className="block text-xs text-zinc-500 mb-1">Примечание</label>
            <input
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 outline-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={loading} className="flex-1 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg text-sm font-medium hover:opacity-80 disabled:opacity-50">
              {loading ? "Регистрация..." : "Зарегистрировать"}
            </button>
            <button type="button" onClick={onClose} className="px-4 py-2 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-600 dark:text-zinc-400">
              Отмена
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
