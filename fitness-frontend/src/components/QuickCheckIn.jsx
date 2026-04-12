import { useState, useEffect } from "react";
import { visitsApi } from "../api/visits";
import { clientsApi } from "../api/clients";
import ClientSearchAutocomplete from "./ClientSearchAutocomplete";

export default function QuickCheckIn() {
  const [selectedClient, setSelectedClient] = useState(null);
  const [selectedSession, setSelectedSession] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Загрузить сессии на сегодня
  const loadTodaySessions = async () => {
    setLoading(true);
    setError(null);
    try {
      const today = new Date().toISOString().split("T")[0];
      const response = await visitsApi.sessionsWithVisits({
        from_date: today,
        to_date: today,
        per_page: 100,
      });
      // Только редактируемые сессии (текущие/прошлые)
      const editableSessions = response.data.data.filter(s => s.is_editable);
      setSessions(editableSessions);
    } catch (err) {
      setError("Ошибка при загрузке тренировок");
    } finally {
      setLoading(false);
    }
  };

  // Загрузить сессии при первом рендере
  useEffect(() => {
    loadTodaySessions();
  }, []);

  const handleQuickCheckIn = async () => {
    if (!selectedClient) {
      setError("Выберите клиента");
      return;
    }

    if (!selectedSession) {
      setError("Выберите тренировку");
      return;
    }

    if (!selectedClient.active_membership) {
      setError("У клиента нет активного абонемента");
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      await visitsApi.create({
        client_id: selectedClient.person_id,
        session_id: selectedSession.id,
        status: "visited",
      });

      setSuccess(
        `✓ ${selectedClient.full_name} отмечен присутствующим на "${selectedSession.session_name}"`
      );

      // Сбросить форму
      setSelectedClient(null);
      setSelectedSession(null);

      // Очистить сообщение через 3 секунды
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.response?.data?.message || "Ошибка при регистрации");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6 max-w-2xl">
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
          ✓ Быстрая регистрация посещения
        </h2>

        {error && (
          <div className="mb-4 p-3 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-100 rounded-lg text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-100 rounded-lg text-sm">
            {success}
          </div>
        )}

        <div className="space-y-4">
          {/* Выбор клиента */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              1. Выберите клиента
            </label>
            <ClientSearchAutocomplete
              onSelect={setSelectedClient}
              placeholder="Введите ФИО клиента..."
            />
            {selectedClient && (
              <div className="mt-2 p-3 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
                <div className="font-medium text-zinc-900 dark:text-zinc-100">
                  {selectedClient.full_name}
                </div>
                <div className="text-sm text-zinc-500 dark:text-zinc-400">
                  {selectedClient.phone || "Телефон не указан"}
                </div>
                {selectedClient.active_membership ? (
                  <div className="text-sm text-emerald-600 dark:text-emerald-400 mt-1">
                    ✓ {selectedClient.remaining_visits} визитов на{" "}
                    {selectedClient.active_membership.type}
                  </div>
                ) : (
                  <div className="text-sm text-red-600 dark:text-red-400 mt-1">
                    ✗ Нет активного абонемента
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Выбор тренировки */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              2. Выберите тренировку (сегодня)
            </label>

            {loading ? (
              <div className="text-center py-4 text-zinc-400">Загрузка тренировок...</div>
            ) : sessions.length === 0 ? (
              <div className="text-center py-4 text-zinc-400">
                Сегодня нет текущих/прошлых тренировок
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {sessions.map((session) => (
                  <button
                    key={session.id}
                    onClick={() => setSelectedSession(session)}
                    className={`w-full p-3 rounded-lg text-left transition-colors ${
                      selectedSession?.id === session.id
                        ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                        : "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                    }`}
                  >
                    <div className="font-medium">{session.session_name}</div>
                    <div className="text-xs opacity-80">
                      🕐 {new Date(session.starts_at).toLocaleTimeString("ru-RU", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}{" "}
                      – 🏢 {session.hall_name} – 👨‍🏫 {session.trainer_name}
                    </div>
                    <div className="text-xs opacity-70 mt-1">
                      Участников: {session.participants.length}
                      {session.max_participants && ` / ${session.max_participants}`}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Кнопка регистрации */}
          <div>
            <button
              onClick={handleQuickCheckIn}
              disabled={submitting || !selectedClient || !selectedSession}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-zinc-400 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
            >
              {submitting ? "Регистрация..." : "✓ Зарегистрировать присутствие"}
            </button>
          </div>
        </div>
      </div>

      {/* Справка */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 p-4">
        <div className="text-sm text-blue-800 dark:text-blue-300">
          <strong>💡 Совет:</strong> В пара кликов отметьте клиента, который пришёл на тренировку.
          Визит будет добавлен, абонемент пересчитан автоматически.
        </div>
      </div>

      {/* История сегодняшних регистраций */}
      {sessions.length > 0 && (
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4">
          <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3">
            📊 Тренировки на сегодня
          </h3>
          <div className="space-y-2">
            {sessions.map((session) => (
              <div
                key={session.id}
                className="flex items-center justify-between p-2 bg-zinc-50 dark:bg-zinc-800 rounded text-sm"
              >
                <div>
                  <div className="font-medium text-zinc-900 dark:text-zinc-100">
                    {session.session_name}
                  </div>
                  <div className="text-xs text-zinc-500">
                    🕐 {new Date(session.starts_at).toLocaleTimeString("ru-RU", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-medium text-zinc-900 dark:text-zinc-100">
                    {session.participants.length}
                  </div>
                  <div className="text-xs text-zinc-500">участников</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}



