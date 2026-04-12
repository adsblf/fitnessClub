import { useState } from "react";
import { visitsApi } from "../api/visits";
import ClientSearchAutocomplete from "./ClientSearchAutocomplete";

export default function QuickCheckIn() {
  const [selectedClient, setSelectedClient] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const handleQuickCheckIn = async () => {
    if (!selectedClient) {
      setError("Выберите клиента");
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
      // Добавляем клиента без привязки к тренировке (session_id = null)
      // Это просто свободное посещение в тренажёрном зале
      await visitsApi.create({
        client_id: selectedClient.person_id,
        session_id: null,  // Нет привязки к тренировке
        status: "visited",
      });

      setSuccess(
        `✓ ${selectedClient.full_name} добавлен (остаток: ${selectedClient.remaining_visits - 1})`
      );

      // Сбросить форму
      setSelectedClient(null);

      // Очистить сообщение через 3 секунды
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.response?.data?.message || "Ошибка при добавлении");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6 max-w-md">
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
          ✓ Регистрация посещения
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
          {/* Поиск клиента */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Введите имя клиента
            </label>
            <ClientSearchAutocomplete
              onSelect={setSelectedClient}
              placeholder="Поиск по ФИО..."
            />

            {selectedClient && (
              <div className="mt-3 p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
                <div className="font-medium text-emerald-900 dark:text-emerald-100">
                  ✓ {selectedClient.full_name}
                </div>
                <div className="text-sm text-emerald-700 dark:text-emerald-300 mt-1">
                  {selectedClient.remaining_visits} визитов на {selectedClient.active_membership.type}
                </div>
              </div>
            )}
          </div>

          {/* Кнопка регистрации */}
          <button
            onClick={handleQuickCheckIn}
            disabled={submitting || !selectedClient}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-zinc-400 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors text-base"
          >
            {submitting ? "Добавление..." : "✓ Добавить посещение"}
          </button>
        </div>
      </div>

      {/* Справка */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 p-4">
        <div className="text-sm text-blue-800 dark:text-blue-300">
          <strong>💡 Как это работает:</strong> Клиент просто пришел в зал - выбираем его и кликаем кнопку. Визит добавится для статистики, визиты на абонементе пересчитаются.
        </div>
      </div>
    </div>
  );
}



