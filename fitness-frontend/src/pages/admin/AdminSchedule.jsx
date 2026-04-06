import { useState, useEffect, useCallback } from "react";
import { scheduleApi } from "../../api/schedule";

const STATUS_MAP = {
  scheduled:   { label: "Запланировано", cls: "bg-blue-100 text-blue-700" },
  in_progress: { label: "Идёт",         cls: "bg-amber-100 text-amber-700" },
  completed:   { label: "Завершено",    cls: "bg-emerald-100 text-emerald-700" },
  cancelled:   { label: "Отменено",     cls: "bg-red-100 text-red-600" },
};

export default function AdminSchedule() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  const fetchSessions = useCallback(() => {
    setLoading(true);
    const params = {};
    if (date) params.date = date;
    scheduleApi
      .list(params)
      .then((res) => setSessions(res.data.data))
      .finally(() => setLoading(false));
  }, [date]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  async function handleCancel(id) {
    if (!confirm("Отменить занятие? Все записи будут отменены.")) return;
    await scheduleApi.cancel(id);
    fetchSessions();
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Расписание</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="px-4 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg text-sm font-medium hover:opacity-80"
        >
          + Новое занятие
        </button>
      </div>

      <input
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        className="px-3 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 outline-none"
      />
      {date && (
        <button onClick={() => setDate("")} className="ml-2 text-xs text-zinc-400 hover:text-zinc-700">
          Сбросить
        </button>
      )}

      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800">
        {loading ? (
          <div className="p-8 text-center text-sm text-zinc-400">Загрузка...</div>
        ) : sessions.length === 0 ? (
          <div className="p-8 text-center text-sm text-zinc-400">Занятий не найдено</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-zinc-400 border-b border-zinc-100 dark:border-zinc-800">
                <th className="text-left px-5 py-2.5 font-normal">Занятие</th>
                <th className="text-left px-5 py-2.5 font-normal">Тип</th>
                <th className="text-left px-5 py-2.5 font-normal">Дата</th>
                <th className="text-left px-5 py-2.5 font-normal">Время</th>
                <th className="text-left px-5 py-2.5 font-normal">Тренер</th>
                <th className="text-left px-5 py-2.5 font-normal">Зал</th>
                <th className="text-left px-5 py-2.5 font-normal">Места</th>
                <th className="text-left px-5 py-2.5 font-normal">Статус</th>
                <th className="px-5 py-2.5 font-normal"></th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((s, i) => {
                const st = STATUS_MAP[s.status] ?? { label: s.status, cls: "bg-zinc-100 text-zinc-600" };
                return (
                  <tr key={s.id} className={`border-b border-zinc-50 dark:border-zinc-800 last:border-0 ${i % 2 ? "bg-zinc-50/50 dark:bg-zinc-800/20" : ""}`}>
                    <td className="px-5 py-3 text-zinc-800 dark:text-zinc-200 font-medium">
                      {s.name ?? (s.type === "personal" ? "Персональная" : "—")}
                    </td>
                    <td className="px-5 py-3 text-zinc-500">{s.type === "group" ? "Групповое" : "Персональное"}</td>
                    <td className="px-5 py-3 text-zinc-500">{s.date}</td>
                    <td className="px-5 py-3 text-zinc-500">{s.time_start}–{s.time_end}</td>
                    <td className="px-5 py-3 text-zinc-500">{s.trainer?.full_name ?? "—"}</td>
                    <td className="px-5 py-3 text-zinc-500">{s.hall ? `Зал ${s.hall.number}` : "—"}</td>
                    <td className="px-5 py-3 text-zinc-500">
                      {s.type === "group" ? `${s.registered ?? 0}/${s.max_participants}` : "—"}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${st.cls}`}>{st.label}</span>
                    </td>
                    <td className="px-5 py-3">
                      {s.status === "scheduled" && (
                        <button onClick={() => handleCancel(s.id)} className="text-xs text-red-500 hover:underline">
                          Отменить
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {showCreate && (
        <CreateSessionModal
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            fetchSessions();
          }}
        />
      )}
    </div>
  );
}

function CreateSessionModal({ onClose, onCreated }) {
  const [halls, setHalls] = useState([]);
  const [trainers, setTrainers] = useState([]);
  const [form, setForm] = useState({
    type: "group",
    name: "",
    starts_at: "",
    ends_at: "",
    hall_id: "",
    trainer_id: "",
    max_participants: 15,
    difficulty_level: "Начальный",
    client_id: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    scheduleApi.halls().then((r) => setHalls(r.data.data));
    scheduleApi.trainers().then((r) => setTrainers(r.data.data));
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const data = { ...form };
      if (data.hall_id) data.hall_id = Number(data.hall_id);
      if (data.trainer_id) data.trainer_id = Number(data.trainer_id);
      if (data.client_id) data.client_id = Number(data.client_id);
      data.max_participants = Number(data.max_participants);
      await scheduleApi.create(data);
      onCreated();
    } catch (err) {
      setError(err.response?.data?.message || "Ошибка создания");
    } finally {
      setLoading(false);
    }
  }

  function set(field) {
    return (e) => setForm({ ...form, [field]: e.target.value });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6 w-full max-w-md max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Новое занятие</h2>
        {error && <div className="text-sm text-red-500 mb-3">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Тип</label>
            <select value={form.type} onChange={set("type")} className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100">
              <option value="group">Групповое</option>
              <option value="personal">Персональное</option>
            </select>
          </div>

          {form.type === "group" && (
            <>
              <InputField label="Название" required value={form.name} onChange={set("name")} />
              <InputField label="Макс. участников" type="number" value={form.max_participants} onChange={set("max_participants")} />
              <div>
                <label className="block text-xs text-zinc-500 mb-1">Уровень</label>
                <select value={form.difficulty_level} onChange={set("difficulty_level")} className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100">
                  <option>Начальный</option>
                  <option>Средний</option>
                  <option>Высокий</option>
                </select>
              </div>
            </>
          )}

          {form.type === "personal" && (
            <InputField label="ID клиента" type="number" required value={form.client_id} onChange={set("client_id")} />
          )}

          <InputField label="Начало (дата и время)" type="datetime-local" required value={form.starts_at} onChange={set("starts_at")} />
          <InputField label="Окончание" type="datetime-local" required value={form.ends_at} onChange={set("ends_at")} />

          <div>
            <label className="block text-xs text-zinc-500 mb-1">Зал</label>
            <select value={form.hall_id} onChange={set("hall_id")} className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100">
              <option value="">— Не выбран —</option>
              {halls.map((h) => (
                <option key={h.id} value={h.id}>Зал {h.number} ({h.type}, {h.capacity} мест)</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-zinc-500 mb-1">Тренер</label>
            <select value={form.trainer_id} onChange={set("trainer_id")} className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100">
              <option value="">— Не выбран —</option>
              {trainers.map((t) => (
                <option key={t.id} value={t.id}>{t.full_name} ({t.specialization})</option>
              ))}
            </select>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={loading} className="flex-1 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg text-sm font-medium hover:opacity-80 disabled:opacity-50">
              {loading ? "Создание..." : "Создать"}
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

function InputField({ label, ...props }) {
  return (
    <div>
      <label className="block text-xs text-zinc-500 mb-1">{label}</label>
      <input className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 outline-none focus:border-zinc-400" {...props} />
    </div>
  );
}
