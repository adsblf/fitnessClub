import { useState } from "react";
import { visitsApi } from "../api/visits";
import ClientSearchAutocomplete from "./ClientSearchAutocomplete";

const STATUS_MAP = {
  visited: { label: "Посещено", cls: "bg-emerald-100 text-emerald-700" },
  no_show: { label: "Неявка", cls: "bg-red-100 text-red-600" },
  late: { label: "Опоздание", cls: "bg-amber-100 text-amber-700" },
  confirmed: { label: "Записан", cls: "bg-blue-100 text-blue-700" },
  pending: { label: "Ожидание", cls: "bg-gray-100 text-gray-700" },
};

export default function SessionVisitBlock({ session, onUpdated }) {
  const [showAddClient, setShowAddClient] = useState(false);
  const [addingClient, setAddingClient] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState("visited");
  const [error, setError] = useState(null);
  const [selectedClient, setSelectedClient] = useState(null);

  const handleAddClient = async () => {
    if (!selectedClient) {
      setError("Выберите клиента");
      return;
    }

    if (!selectedClient.active_membership) {
      setError("У клиента нет активного абонемента");
      return;
    }

    setAddingClient(true);
    setError(null);

    try {
      await visitsApi.create({
        client_id: selectedClient.person_id,
        session_id: session.id,
        status: selectedStatus,
      });

      setShowAddClient(false);
      setSelectedClient(null);
      setSelectedStatus("visited");
      onUpdated();
    } catch (err) {
      setError(err.response?.data?.message || "Ошибка при добавлении посещения");
    } finally {
      setAddingClient(false);
    }
  };

  const formatTime = (dateTime) => {
    const date = new Date(dateTime);
    return date.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  };

  const formatDate = (dateTime) => {
    const date = new Date(dateTime);
    return date.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });
  };

  const startTime = formatTime(session.starts_at);
  const endTime = formatTime(session.ends_at);
  const dateStr = formatDate(session.starts_at);

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden">
      {/* Заголовок блока */}
      <div className="bg-gradient-to-r from-zinc-50 to-zinc-100 dark:from-zinc-800 dark:to-zinc-900 px-5 py-4 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              {session.session_name}
            </h3>
            <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              <span className="flex items-center gap-1">
                📅 {dateStr}
              </span>
              <span className="flex items-center gap-1">
                🕐 {startTime} – {endTime}
              </span>
              <span className="flex items-center gap-1">
                🏢 {session.hall_name}
              </span>
              <span className="flex items-center gap-1">
                👨‍🏫 {session.trainer_name}
              </span>
            </div>
          </div>
          <div className="text-right">
            {session.is_editable ? (
              <div className="inline-flex px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium">
                ✓ Редактировать можно
              </div>
            ) : (
              <div className="inline-flex px-3 py-1 bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 rounded-full text-xs font-medium">
                Редактирование недоступно
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Список участников */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-zinc-400 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
              <th className="text-left px-5 py-2.5 font-normal">ФИО</th>
              <th className="text-left px-5 py-2.5 font-normal">Телефон</th>
              <th className="text-left px-5 py-2.5 font-normal">Статус</th>
              <th className="text-left px-5 py-2.5 font-normal">Источник</th>
            </tr>
          </thead>
          <tbody>
            {session.participants.length === 0 ? (
              <tr>
                <td colSpan="4" className="px-5 py-4 text-center text-zinc-400">
                  Нет записей
                </td>
              </tr>
            ) : (
              session.participants.map((participant, idx) => {
                const statusInfo = STATUS_MAP[participant.status] || {
                  label: participant.status,
                  cls: "bg-zinc-100 text-zinc-600",
                };
                return (
                  <tr
                    key={`${participant.client_id}-${idx}`}
                    className={`border-b border-zinc-50 dark:border-zinc-800 last:border-0 ${
                      idx % 2 ? "bg-zinc-50/50 dark:bg-zinc-800/20" : ""
                    }`}
                  >
                    <td className="px-5 py-3 text-zinc-800 dark:text-zinc-200 font-medium">
                      {participant.client_name}
                    </td>
                    <td className="px-5 py-3 text-zinc-500 text-xs">—</td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${statusInfo.cls}`}>
                        {statusInfo.label}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-zinc-500 text-xs">
                      {participant.source === "booking" && "Запись"}
                      {participant.source === "manual" && "Добавлено вручную"}
                      {participant.source === "visit" && "Посещение"}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Кнопка добавления клиента (если редактируемо) */}
      {session.is_editable && (
        <div className="px-5 py-3 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
          {!showAddClient ? (
            <button
              onClick={() => setShowAddClient(true)}
              className="text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200 flex items-center gap-2"
            >
              + Добавить клиента
            </button>
          ) : (
            <div className="space-y-3">
              {error && <div className="text-sm text-red-500">{error}</div>}

              <ClientSearchAutocomplete
                onSelect={setSelectedClient}
                placeholder="Поиск клиента..."
              />

              <div>
                <label className="block text-xs text-zinc-500 mb-1">Статус</label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
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
                  {addingClient ? "Добавление..." : "Добавить"}
                </button>
                <button
                  onClick={() => {
                    setShowAddClient(false);
                    setSelectedClient(null);
                    setSelectedStatus("visited");
                    setError(null);
                  }}
                  className="flex-1 py-2 bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 text-zinc-900 dark:text-zinc-100 rounded-lg text-sm font-medium"
                >
                  Отмена
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

