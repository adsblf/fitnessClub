import { useState } from "react";
import { visitsApi } from "../api/visits";
import ClientSearchAutocomplete from "./ClientSearchAutocomplete";
import { TZ } from "../lib/tz";

const STATUS_MAP = {
  visited:   { label: "Посещено",  cls: "bg-emerald-100 text-emerald-700" },
  no_show:   { label: "Неявка",    cls: "bg-red-100 text-red-600" },
  late:      { label: "Опоздание", cls: "bg-amber-100 text-amber-700" },
  confirmed: { label: "Записан",   cls: "bg-blue-100 text-blue-700" },
  pending:   { label: "Ожидание",  cls: "bg-zinc-100 text-zinc-500" },
};

const ACTION_BTNS = [
  { status: "visited", icon: "✓", label: "Посещено",  active: "bg-emerald-500 text-white", idle: "hover:bg-emerald-50 hover:text-emerald-700" },
  { status: "late",    icon: "⏱", label: "Опоздание", active: "bg-amber-400 text-white",   idle: "hover:bg-amber-50 hover:text-amber-700" },
  { status: "no_show", icon: "✕", label: "Неявка",    active: "bg-red-500 text-white",     idle: "hover:bg-red-50 hover:text-red-600" },
];

/**
 * editingState:
 *   'idle'    – тренировка началась, но редактирование ещё не открывалось → большая зелёная кнопка
 *   'editing' – редактирование открыто → кнопки ✓/⏱/✕ + "Закончить редактирование"
 *   'done'    – сохранено → маленькая серая кнопка "Редактировать"
 */
export default function SessionVisitBlock({ session, onUpdated }) {
  // Если у любого участника уже записано посещение — показываем «отмечено»
  const [editingState, setEditingState] = useState(() =>
    session.participants?.some((p) => p.visit_id != null) ? "done" : "idle"
  );
  // Промежуточные статусы: { [client_id]: 'visited' | 'no_show' | 'late' | 'confirmed' | … }
  const [localStatuses, setLocalStatuses] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  // Форма добавления клиента
  const [showAddClient, setShowAddClient] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [addStatus, setAddStatus] = useState("visited");
  const [addingClient, setAddingClient] = useState(false);
  const [addError, setAddError] = useState(null);

  /* ── Форматирование ──────────────────────────────── */
  const fmt = (dt, opts) => new Date(dt).toLocaleString("ru-RU", { ...opts, timeZone: TZ });
  const startTime = fmt(session.starts_at, { hour: "2-digit", minute: "2-digit" });
  const endTime   = fmt(session.ends_at,   { hour: "2-digit", minute: "2-digit" });
  const dateStr   = fmt(session.starts_at, { day: "2-digit", month: "2-digit", year: "numeric" });

  /* ── Открыть режим редактирования ───────────────── */
  const startEditing = () => {
    const init = {};
    effectiveParticipants.forEach((p) => { init[p.client_id] = p.status; });
    setLocalStatuses(init);
    setEditingState("editing");
    setShowAddClient(false);
    setSaveError(null);
  };

  /* ── Изменить статус участника локально ─────────── */
  const setClientStatus = (clientId, status) => {
    setLocalStatuses((prev) => ({ ...prev, [clientId]: status }));
  };

  /* ── Сохранить всё и закрыть редактирование ──────── */
  const handleFinishEditing = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const toSave = effectiveParticipants.filter((p) => {
        const ns = localStatuses[p.client_id];
        return ns && ns !== p.status && ["visited", "no_show", "late"].includes(ns);
      });

      for (const participant of toSave) {
        const newStatus = localStatuses[participant.client_id];
        if (participant.visit_id) {
          // Визит уже существует — обновляем статус без списания с абонемента
          await visitsApi.update(participant.visit_id, { status: newStatus });
        } else {
          // Визита ещё нет — создаём (списывает 1 посещение с абонемента)
          await visitsApi.create({
            client_id: participant.client_id,
            session_id: session.id,
            status: newStatus,
          });
        }
      }

      setEditingState("done");
      onUpdated();
    } catch (err) {
      setSaveError(err.response?.data?.message || "Ошибка при сохранении");
    } finally {
      setSaving(false);
    }
  };

  /* ── Добавить нового клиента ─────────────────────── */
  const handleAddClient = async () => {
    if (!selectedClient) { setAddError("Выберите клиента"); return; }
    if (!selectedClient.active_membership) { setAddError("У клиента нет активного абонемента"); return; }
    setAddingClient(true);
    setAddError(null);
    try {
      await visitsApi.create({
        client_id: selectedClient.person_id,
        session_id: session.id,
        status: addStatus,
      });
      setShowAddClient(false);
      setSelectedClient(null);
      setAddStatus("visited");
      onUpdated();
    } catch (err) {
      setAddError(err.response?.data?.message || "Ошибка при добавлении");
    } finally {
      setAddingClient(false);
    }
  };

  // Для персональных занятий — добавляем клиента в список участников если его ещё нет
  const effectiveParticipants = (() => {
    if (session.type !== 'personal' || !session.personal_client) return session.participants;
    const already = session.participants.some(p => p.client_id === session.personal_client.id);
    if (already) return session.participants;
    return [
      { client_id: session.personal_client.id, client_name: session.personal_client.full_name, status: 'confirmed', visit_id: null },
      ...session.participants,
    ];
  })();

  const hasAnyVisit = effectiveParticipants.some((p) => p.visit_id != null);
  const isSessionStarted = session.is_editable; // now >= starts_at (server-side)
  const showActionCol = editingState === "editing";

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden">

      {/* ── Заголовок ──────────────────────────────── */}
      <div className="bg-gradient-to-r from-zinc-50 to-zinc-100 dark:from-zinc-800 dark:to-zinc-900 px-5 py-4 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              {session.session_name}
            </h3>
            <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              <span>📅 {dateStr}</span>
              <span>🕐 {startTime} – {endTime}</span>
              <span>🏢 {session.hall_name}</span>
              <span>👨‍🏫 {session.trainer_name}</span>
            </div>
          </div>
          <div className="shrink-0">
            {!isSessionStarted ? (
              <span className="inline-flex px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">⏳ Ожидание начала</span>
            ) : editingState === "editing" ? (
              <span className="inline-flex px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium">✏️ Идёт заполнение</span>
            ) : (editingState === "done" || hasAnyVisit) ? (
              <span className="inline-flex px-3 py-1 bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400 rounded-full text-xs font-medium">✓ Посещаемость отмечена</span>
            ) : (
              <span className="inline-flex px-3 py-1 bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500 rounded-full text-xs font-medium">Не заполнено</span>
            )}
          </div>
        </div>
      </div>

      {/* ── Таблица участников ──────────────────────── */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-zinc-400 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
              <th className="text-left px-5 py-2.5 font-normal">ФИО</th>
              <th className="text-left px-5 py-2.5 font-normal">Статус</th>
              {showActionCol && <th className="text-center px-5 py-2.5 font-normal">Действие</th>}
            </tr>
          </thead>
          <tbody>
            {effectiveParticipants.length === 0 ? (
              <tr>
                <td colSpan={showActionCol ? 3 : 2} className="px-5 py-4 text-center text-zinc-400">Нет записей</td>
              </tr>
            ) : (
              effectiveParticipants.map((participant, idx) => {
                const displayStatus = editingState === "editing"
                  ? (localStatuses[participant.client_id] ?? participant.status)
                  : participant.status;
                const stInfo = STATUS_MAP[displayStatus] ?? { label: displayStatus, cls: "bg-zinc-100 text-zinc-600" };
                return (
                  <tr
                    key={participant.client_id}
                    className={`border-b border-zinc-50 dark:border-zinc-800 last:border-0 ${idx % 2 ? "bg-zinc-50/50 dark:bg-zinc-800/20" : ""}`}
                  >
                    <td className="px-5 py-3 font-medium text-zinc-800 dark:text-zinc-200">
                      {participant.client_name}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${stInfo.cls}`}>
                        {stInfo.label}
                      </span>
                    </td>
                    {showActionCol && (
                      <td className="px-5 py-3">
                        <div className="flex justify-center gap-1.5">
                          {ACTION_BTNS.map(({ status, icon, label, active, idle }) => {
                            const isCurrent = (localStatuses[participant.client_id] ?? participant.status) === status;
                            return (
                              <button
                                key={status}
                                onClick={() => setClientStatus(participant.client_id, status)}
                                title={label}
                                className={`w-8 h-8 rounded flex items-center justify-center text-sm font-semibold transition-colors ${
                                  isCurrent
                                    ? active
                                    : `bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 ${idle}`
                                }`}
                              >
                                {icon}
                              </button>
                            );
                          })}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ── Панель действий внизу ───────────────────── */}
      {isSessionStarted && (
        <div className="px-5 py-3 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">

          {/* Первое открытие — большая зелёная кнопка */}
          {editingState === "idle" && (
            <div className="flex justify-end">
              <button
                onClick={startEditing}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-lg text-xs font-semibold transition-colors shadow-sm"
              >
                ✓ Начать отметку посещаемости
              </button>
            </div>
          )}

          {/* Режим редактирования */}
          {editingState === "editing" && (
            <div className="space-y-3">
              {saveError && <p className="text-sm text-red-500">{saveError}</p>}

              {!showAddClient ? (
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowAddClient(true)}
                    className="flex-1 py-2 text-sm font-medium text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 flex items-center justify-center gap-1"
                  >
                    + Добавить клиента
                  </button>
                  <button
                    onClick={handleFinishEditing}
                    disabled={saving}
                    className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    {saving ? "Сохранение…" : "✓ Закончить редактирование"}
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {addError && <p className="text-sm text-red-500">{addError}</p>}
                  <ClientSearchAutocomplete onSelect={setSelectedClient} placeholder="Поиск клиента…" />
                  <div>
                    <label className="block text-xs text-zinc-500 mb-1">Статус</label>
                    <select
                      value={addStatus}
                      onChange={(e) => setAddStatus(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 outline-none"
                    >
                      <option value="visited">Посещено</option>
                      <option value="late">Опоздание</option>
                      <option value="no_show">Неявка</option>
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleAddClient}
                      disabled={addingClient || !selectedClient}
                      className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium disabled:opacity-50"
                    >
                      {addingClient ? "Добавление…" : "Добавить"}
                    </button>
                    <button
                      onClick={() => { setShowAddClient(false); setSelectedClient(null); setAddStatus("visited"); setAddError(null); }}
                      className="flex-1 py-2 bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 text-zinc-900 dark:text-zinc-100 rounded-lg text-sm font-medium"
                    >
                      Отмена
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Редактирование завершено — маленькая неакцентная кнопка */}
          {editingState === "done" && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-400">Данные сохранены</span>
              <button
                onClick={startEditing}
                className="px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-600 text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                Редактировать
              </button>
            </div>
          )}

        </div>
      )}
    </div>
  );
}

