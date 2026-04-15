import { useState, useEffect, useCallback, useRef } from "react";
import { scheduleApi } from "../../api/schedule";
import ClientSearchAutocomplete from "../../components/ClientSearchAutocomplete";

// Возвращает true, если занятие s пересекается по времени с [startsAt, endsAt]
function timeOverlap(s, startsAt, endsAt, excludeId = null) {
  if (s.id === excludeId) return false;
  if (s.status === "cancelled") return false;
  const sStart = new Date(s.starts_at.replace(" ", "T"));
  const sEnd   = new Date(s.ends_at.replace(" ", "T"));
  const nStart = new Date(startsAt);
  const nEnd   = new Date(endsAt);
  return sStart < nEnd && sEnd > nStart;
}

// Рассчитывает стоимость сессии по ставке тренера
function calcSessionCost(trainer, startsAt, endsAt) {
  if (!trainer?.hourly_rate || !startsAt || !endsAt) return 0;
  const diffMs = new Date(endsAt) - new Date(startsAt);
  if (diffMs <= 0) return 0;
  const hours = diffMs / 3600000;
  return Math.round(Number(trainer.hourly_rate) * hours * 100) / 100;
}

const STATUS_MAP = {
  scheduled:   { label: "Запланировано", cls: "bg-blue-100 text-blue-700" },
  in_progress: { label: "Идёт",         cls: "bg-amber-100 text-amber-700" },
  completed:   { label: "Завершено",    cls: "bg-emerald-100 text-emerald-700" },
  cancelled:   { label: "Отменено",     cls: "bg-red-100 text-red-600" },
};

export default function AdminSchedule() {
  const [sessions, setSessions] = useState([]);
  const [halls, setHalls] = useState([]);
  const [trainers, setTrainers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState({
    date: "",
    trainer_id: "",
    hall_id: "",
    sort_slots: "",
    hide_cancelled: true,
  });

  const [showCreate, setShowCreate] = useState(false);
  const [editSession, setEditSession] = useState(null);
  // Флаг: авто-завершение уже запущено один раз за время жизни этой вкладки
  const autoCompleteDoneRef = useRef(false);

  // Загрузка справочников
  useEffect(() => {
    scheduleApi.halls().then((r) => setHalls(r.data.data));
    scheduleApi.trainers().then((r) => setTrainers(r.data.data));
  }, []);

  const fetchSessions = useCallback(() => {
    setLoading(true);
    const params = {};
    if (filters.date) params.date = filters.date;
    if (filters.trainer_id) params.trainer_id = filters.trainer_id;
    if (filters.hall_id) params.hall_id = filters.hall_id;
    if (filters.sort_slots) params.sort_slots = filters.sort_slots;

    // При первом обращении к расписанию завершаем все просроченные занятия,
    // после чего грузим обновлённый список.
    if (!autoCompleteDoneRef.current) {
      autoCompleteDoneRef.current = true;
      scheduleApi
        .autoComplete()
        .catch(() => {})
        .finally(() => {
          scheduleApi
            .list(params)
            .then((r) => setSessions(r.data.data))
            .finally(() => setLoading(false));
        });
    } else {
      scheduleApi
        .list(params)
        .then((r) => setSessions(r.data.data))
        .finally(() => setLoading(false));
    }
  }, [filters]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  async function handleCancel(id) {
    if (!confirm("Отменить занятие? Все записи будут отменены.")) return;
    await scheduleApi.cancel(id);
    fetchSessions();
  }

  function set(field) {
    return (e) => setFilters({ ...filters, [field]: e.target.value });
  }

  const filtersActive =
      filters.date || filters.trainer_id || filters.hall_id || filters.sort_slots || !filters.hide_cancelled;

  // Применить hide_cancelled на стороне клиента (данные уже загружены)
  const visibleSessions = filters.hide_cancelled
    ? sessions.filter((s) => s.status !== "cancelled")
    : sessions;

  return (
      <div className="p-4 sm:p-6 space-y-4">
        <div className="flex flex-wrap justify-between items-center gap-3">
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Расписание</h1>
          <button
              onClick={() => setShowCreate(true)}
              className="px-4 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg text-sm font-medium hover:opacity-80"
          >
            + Новое занятие
          </button>
        </div>

        {/* Фильтры */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Дата</label>
              <input
                  type="date"
                  value={filters.date}
                  onChange={set("date")}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs text-zinc-500 mb-1">Тренер</label>
              <select
                  value={filters.trainer_id}
                  onChange={set("trainer_id")}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
              >
                <option value="">Все тренеры</option>
                {trainers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.full_name}
                    </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-zinc-500 mb-1">Зал</label>
              <select
                  value={filters.hall_id}
                  onChange={set("hall_id")}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
              >
                <option value="">Все залы</option>
                {halls.map((h) => (
                    <option key={h.id} value={h.id}>
                      Зал {h.number} ({h.type})
                    </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-zinc-500 mb-1">Свободные места</label>
              <select
                  value={filters.sort_slots}
                  onChange={set("sort_slots")}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
              >
                <option value="">Без сортировки</option>
                <option value="desc">Больше → меньше</option>
                <option value="asc">Меньше → больше</option>
              </select>
            </div>
          </div>

          {filtersActive && (
              <button
                  onClick={() => setFilters({ date: "", trainer_id: "", hall_id: "", sort_slots: "", hide_cancelled: true })}
                  className="mt-3 text-xs text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
              >
                Сбросить все фильтры
              </button>
          )}

          {/* Скрыть отменённые */}
          <label className="mt-3 flex items-center gap-2 cursor-pointer select-none w-fit">
            <input
              type="checkbox"
              checked={filters.hide_cancelled}
              onChange={(e) => setFilters({ ...filters, hide_cancelled: e.target.checked })}
              className="w-4 h-4 rounded border-zinc-300 accent-zinc-700"
            />
            <span className="text-xs text-zinc-500">Скрыть отменённые</span>
          </label>
        </div>

        {/* Таблица */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-x-auto">
          {loading ? (
              <div className="p-8 text-center text-sm text-zinc-400">Загрузка...</div>
          ) : visibleSessions.length === 0 ? (
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
                  <th className="text-left px-5 py-2.5 font-normal">Свободно / Клиент</th>
                  <th className="text-left px-5 py-2.5 font-normal">Статус</th>
                  <th className="px-5 py-2.5 font-normal"></th>
                </tr>
                </thead>
                <tbody>
                {visibleSessions.map((s, i) => {
                  const st = STATUS_MAP[s.status] ?? { label: s.status, cls: "bg-zinc-100 text-zinc-600" };
                  const isGroup = s.type === "group";
                  return (
                      <tr
                          key={s.id}
                          className={`border-b border-zinc-50 dark:border-zinc-800 last:border-0 ${
                              i % 2 ? "bg-zinc-50/50 dark:bg-zinc-800/20" : ""
                          }`}
                      >
                        <td className="px-5 py-3 text-zinc-800 dark:text-zinc-200 font-medium">
                          {s.name ?? (s.type === "personal" ? "Персональная" : "—")}
                        </td>
                        <td className="px-5 py-3 text-zinc-500">
                          {isGroup ? "Групповое" : "Персональное"}
                        </td>
                        <td className="px-5 py-3 text-zinc-500">{s.date}</td>
                        <td className="px-5 py-3 text-zinc-500">
                          {s.time_start}–{s.time_end}
                        </td>
                        <td className="px-5 py-3 text-zinc-500">{s.trainer?.full_name ?? "—"}</td>
                        <td className="px-5 py-3 text-zinc-500">{s.hall ? `Зал ${s.hall.number}` : "—"}</td>
                        <td className="px-5 py-3 text-zinc-500">
                          {isGroup ? (
                              <span
                                  className={
                                    s.available_slots === 0
                                        ? "text-red-500 font-medium"
                                        : s.available_slots <= 3
                                            ? "text-amber-500 font-medium"
                                            : "text-emerald-600 font-medium"
                                  }
                              >
                          {s.registered}/{s.max_participants}
                        </span>
                          ) : (
                              s.client?.full_name ?? "—"
                          )}
                        </td>
                        <td className="px-5 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${st.cls}`}>
                        {st.label}
                      </span>
                        </td>
                        <td className="px-5 py-3">
                          {s.status === "scheduled" && (
                              <div className="flex items-center gap-3">
                                <button
                                    onClick={() => setEditSession(s)}
                                    className="text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:underline"
                                >
                                  Редактировать
                                </button>
                                <button onClick={() => handleCancel(s.id)} className="text-xs text-red-500 hover:underline">
                                  Отменить
                                </button>
                              </div>
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
                halls={halls}
                trainers={trainers}
                onClose={() => setShowCreate(false)}
                onCreated={() => {
                  setShowCreate(false);
                  fetchSessions();
                }}
            />
        )}

        {editSession && (
            <EditSessionModal
                session={editSession}
                halls={halls}
                trainers={trainers}
                onClose={() => setEditSession(null)}
                onSaved={() => {
                  setEditSession(null);
                  fetchSessions();
                }}
            />
        )}
      </div>
  );
}

// ── Модалка создания занятия ───────────────────────
function CreateSessionModal({ halls, trainers, onClose, onCreated }) {
  const [form, setForm] = useState({
    type: "group",
    name: "",
    starts_at: "",
    ends_at: "",
    hall_id: "",
    trainer_id: "",
    max_participants: 15,
    difficulty_level: "Начальный",
    payment_method: "cash",
  });
  const [selectedClient, setSelectedClient] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [conflicts, setConflicts] = useState([]);

  // Проверка конфликтов по залу, тренеру и клиенту в реальном времени
  useEffect(() => {
    if (!form.starts_at || !form.ends_at) {
      setConflicts([]);
      return;
    }
    const date = form.starts_at.slice(0, 10);
    scheduleApi
      .list({ date })
      .then((r) => {
        const msgs = [];
        r.data.data.forEach((s) => {
          if (!timeOverlap(s, form.starts_at, form.ends_at)) return;
          if (form.hall_id && s.hall?.id === Number(form.hall_id)) {
            msgs.push(`⚠ Зал ${s.hall.number} занят ${s.time_start}–${s.time_end} (${s.name ?? "Персональная"})`);
          }
          if (form.trainer_id && s.trainer?.id === Number(form.trainer_id)) {
            msgs.push(`⚠ Тренер занят ${s.time_start}–${s.time_end} (${s.name ?? "Персональная"})`);
          }
          if (selectedClient && s.type === "personal" && s.client?.id === selectedClient.person_id) {
            msgs.push(`⚠ Клиент уже записан на персональную тренировку ${s.time_start}–${s.time_end}`);
          }
        });
        setConflicts(msgs);
      })
      .catch(() => {});
  }, [form.starts_at, form.ends_at, form.hall_id, form.trainer_id, selectedClient]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (form.type === "personal" && !selectedClient) {
      setError("Выберите клиента");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = { ...form };
      if (data.hall_id) data.hall_id = Number(data.hall_id);
      if (data.trainer_id) data.trainer_id = Number(data.trainer_id);
      if (form.type === "personal") {
        data.client_id = selectedClient.person_id;
      }
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
        <div
            className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6 w-full max-w-md max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
        >
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Новое занятие</h2>
          {error && <div className="text-sm text-red-500 mb-3">{error}</div>}
          {conflicts.length > 0 && (
            <div className="mb-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg space-y-1">
              {conflicts.map((c, i) => (
                <div key={i} className="text-xs text-amber-800 dark:text-amber-300">{c}</div>
              ))}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Тип</label>
              <select
                  value={form.type}
                  onChange={set("type")}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
              >
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
                    <select
                        value={form.difficulty_level}
                        onChange={set("difficulty_level")}
                        className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                    >
                      <option>Начальный</option>
                      <option>Средний</option>
                      <option>Высокий</option>
                    </select>
                  </div>
                </>
            )}

            {form.type === "personal" && (
              <>
                <div>
                  <label className="block text-xs text-zinc-500 mb-1">Клиент</label>
                  <ClientSearchAutocomplete
                    onSelect={setSelectedClient}
                    placeholder="Поиск по ФИО..."
                  />
                  {selectedClient && (
                    <div className="mt-2 px-3 py-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800 text-sm">
                      <span className="font-medium text-emerald-900 dark:text-emerald-100">{selectedClient.full_name}</span>
                      {selectedClient.active_membership && (
                        <span className="ml-2 text-xs text-emerald-600 dark:text-emerald-400">
                          {selectedClient.remaining_visits} визитов
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Стоимость и способ оплаты */}
                {(() => {
                  const trainer = trainers.find(t => t.id === Number(form.trainer_id));
                  const cost = calcSessionCost(trainer, form.starts_at, form.ends_at);
                  return (
                    <div className="p-3 bg-zinc-50 dark:bg-zinc-800 rounded-lg space-y-2.5">
                      {trainer?.hourly_rate ? (
                        <div className="flex justify-between text-sm">
                          <span className="text-zinc-500">Стоимость ({trainer.hourly_rate} ₽/ч)</span>
                          <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                            {cost > 0 ? `${cost.toLocaleString("ru-RU")} ₽` : "—"}
                          </span>
                        </div>
                      ) : (
                        <div className="text-xs text-zinc-400">Ставка тренера не задана — стоимость: 0 ₽</div>
                      )}
                      <div>
                        <label className="block text-xs text-zinc-500 mb-1">Способ оплаты</label>
                        <select
                          value={form.payment_method}
                          onChange={set("payment_method")}
                          className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100"
                        >
                          <option value="balance">Баланс клиента</option>
                          <option value="cash">Наличные</option>
                          <option value="card_terminal">Терминал</option>
                          <option value="online_sbp">СБП</option>
                        </select>
                      </div>
                    </div>
                  );
                })()}
              </>
            )}

            <InputField label="Начало (дата и время)" type="datetime-local" required value={form.starts_at} onChange={set("starts_at")} />
            <InputField label="Окончание" type="datetime-local" required value={form.ends_at} onChange={set("ends_at")} />

            <div>
              <label className="block text-xs text-zinc-500 mb-1">Зал</label>
              <select
                  value={form.hall_id}
                  onChange={set("hall_id")}
                  className={`w-full px-3 py-2 text-sm rounded-lg border bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 ${
                    conflicts.some((c) => c.includes("Зал"))
                      ? "border-amber-400 dark:border-amber-600"
                      : "border-zinc-200 dark:border-zinc-700"
                  }`}
              >
                <option value="">— Не выбран —</option>
                {halls.map((h) => (
                    <option key={h.id} value={h.id}>
                      Зал {h.number} ({h.type}, {h.capacity} мест)
                    </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-zinc-500 mb-1">Тренер</label>
              <select
                  value={form.trainer_id}
                  onChange={set("trainer_id")}
                  className={`w-full px-3 py-2 text-sm rounded-lg border bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 ${
                    conflicts.some((c) => c.includes("Тренер"))
                      ? "border-amber-400 dark:border-amber-600"
                      : "border-zinc-200 dark:border-zinc-700"
                  }`}
              >
                <option value="">— Не выбран —</option>
                {trainers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.full_name} ({t.specialization})
                    </option>
                ))}
              </select>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg text-sm font-medium hover:opacity-80 disabled:opacity-50"
              >
                {loading ? "Создание..." : "Создать"}
              </button>
              <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-600 dark:text-zinc-400"
              >
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
        <input
            className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 outline-none focus:border-zinc-400"
            {...props}
        />
      </div>
  );
}

// ── Модалка редактирования занятия ────────────────
function EditSessionModal({ session, halls, trainers, onClose, onSaved }) {
  const toDateTimeLocal = (dt) => dt ? dt.slice(0, 16).replace(' ', 'T') : '';

  const [form, setForm] = useState({
    name:             session.name ?? '',
    starts_at:        toDateTimeLocal(session.starts_at),
    ends_at:          toDateTimeLocal(session.ends_at),
    hall_id:          session.hall?.id ?? '',
    trainer_id:       session.trainer?.id ?? '',
    max_participants: session.max_participants ?? '',
    difficulty_level: session.difficulty_level ?? 'Начальный',
    notes:            session.notes ?? '',
  });
  // Для персонального занятия — текущий клиент и возможность менять
  const [selectedClient, setSelectedClient] = useState(
    session.client ? { person_id: session.client.id, full_name: session.client.full_name } : null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [conflicts, setConflicts] = useState([]);

  // Проверка конфликтов по залу и тренеру в реальном времени
  useEffect(() => {
    if (!form.starts_at || !form.ends_at) {
      setConflicts([]);
      return;
    }
    const date = form.starts_at.slice(0, 10);
    scheduleApi
      .list({ date })
      .then((r) => {
        const msgs = [];
        r.data.data.forEach((s) => {
          if (!timeOverlap(s, form.starts_at, form.ends_at, session.id)) return;
          if (form.hall_id && s.hall?.id === Number(form.hall_id)) {
            msgs.push(`⚠ Зал ${s.hall.number} занят ${s.time_start}–${s.time_end} (${s.name ?? 'Персональная'})`);
          }
          if (form.trainer_id && s.trainer?.id === Number(form.trainer_id)) {
            msgs.push(`⚠ Тренер занят ${s.time_start}–${s.time_end} (${s.name ?? 'Персональная'})`);
          }
          if (selectedClient && s.type === 'personal' && s.client?.id === selectedClient.person_id) {
            msgs.push(`⚠ Клиент уже записан на персональную тренировку ${s.time_start}–${s.time_end}`);
          }
        });
        setConflicts(msgs);
      })
      .catch(() => {});
  }, [form.starts_at, form.ends_at, form.hall_id, form.trainer_id, selectedClient, session.id]);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const data = {};
      if (form.starts_at)         data.starts_at        = form.starts_at;
      if (form.ends_at)           data.ends_at          = form.ends_at;
      if (form.hall_id !== '')    data.hall_id          = Number(form.hall_id);
      if (form.trainer_id !== '') data.trainer_id       = Number(form.trainer_id);
      data.notes = form.notes;
      if (session.type === 'group') {
        if (form.name)             data.name             = form.name;
        if (form.max_participants) data.max_participants = Number(form.max_participants);
        if (form.difficulty_level) data.difficulty_level = form.difficulty_level;
      }
      if (session.type === 'personal' && selectedClient) {
        data.client_id = selectedClient.person_id;
      }
      await scheduleApi.update(session.id, data);
      onSaved();
    } catch (err) {
      setError(err.response?.data?.message || 'Ошибка сохранения');
    } finally {
      setLoading(false);
    }
  }

  function set(field) {
    return (e) => setForm({ ...form, [field]: e.target.value });
  }

  return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
        <div
            className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6 w-full max-w-md max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
        >
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-1">Редактировать занятие</h2>
          <p className="text-xs text-zinc-400 mb-4">
            {session.type === 'group' ? 'Групповое' : 'Персональное'} · {session.date}
          </p>
          {error && <div className="text-sm text-red-500 mb-3">{error}</div>}
          {conflicts.length > 0 && (
            <div className="mb-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg space-y-1">
              {conflicts.map((c, i) => (
                <div key={i} className="text-xs text-amber-800 dark:text-amber-300">{c}</div>
              ))}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            {session.type === 'group' && (
                <>
                  <InputField label="Название" value={form.name} onChange={set('name')} />
                  <InputField label="Макс. участников" type="number" min="1" value={form.max_participants} onChange={set('max_participants')} />
                  <div>
                    <label className="block text-xs text-zinc-500 mb-1">Уровень</label>
                    <select
                        value={form.difficulty_level}
                        onChange={set('difficulty_level')}
                        className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                    >
                      <option>Начальный</option>
                      <option>Средний</option>
                      <option>Высокий</option>
                    </select>
                  </div>
                </>
            )}

            {session.type === 'personal' && (
              <div>
                <label className="block text-xs text-zinc-500 mb-1">Клиент</label>
                <ClientSearchAutocomplete
                  onSelect={setSelectedClient}
                  placeholder="Поиск по ФИО..."
                />
                {selectedClient && (
                  <div className="mt-2 px-3 py-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800 text-sm">
                    <span className="font-medium text-emerald-900 dark:text-emerald-100">{selectedClient.full_name}</span>
                    {selectedClient.remaining_visits !== undefined && (
                      <span className="ml-2 text-xs text-emerald-600 dark:text-emerald-400">
                        {selectedClient.remaining_visits} визитов
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}

            <InputField label="Начало" type="datetime-local" value={form.starts_at} onChange={set('starts_at')} />
            <InputField label="Окончание" type="datetime-local" value={form.ends_at} onChange={set('ends_at')} />

            <div>
              <label className="block text-xs text-zinc-500 mb-1">Зал</label>
              <select
                  value={form.hall_id}
                  onChange={set('hall_id')}
                  className={`w-full px-3 py-2 text-sm rounded-lg border bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 ${
                    conflicts.some((c) => c.includes('Зал'))
                      ? 'border-amber-400 dark:border-amber-600'
                      : 'border-zinc-200 dark:border-zinc-700'
                  }`}
              >
                <option value="">— Не выбран —</option>
                {halls.map((h) => (
                    <option key={h.id} value={h.id}>Зал {h.number} ({h.type}, {h.capacity} мест)</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-zinc-500 mb-1">Тренер</label>
              <select
                  value={form.trainer_id}
                  onChange={set('trainer_id')}
                  className={`w-full px-3 py-2 text-sm rounded-lg border bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 ${
                    conflicts.some((c) => c.includes('Тренер'))
                      ? 'border-amber-400 dark:border-amber-600'
                      : 'border-zinc-200 dark:border-zinc-700'
                  }`}
              >
                <option value="">— Не выбран —</option>
                {trainers.map((t) => (
                    <option key={t.id} value={t.id}>{t.full_name} ({t.specialization})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-zinc-500 mb-1">Заметки</label>
              <textarea
                  value={form.notes}
                  onChange={set('notes')}
                  rows={2}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 outline-none focus:border-zinc-400 resize-none"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg text-sm font-medium hover:opacity-80 disabled:opacity-50"
              >
                {loading ? 'Сохранение...' : 'Сохранить'}
              </button>
              <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-600 dark:text-zinc-400"
              >
                Отмена
              </button>
            </div>
          </form>
        </div>
      </div>
  );
}
