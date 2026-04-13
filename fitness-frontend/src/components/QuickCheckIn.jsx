import { useState, useEffect, useCallback } from "react";
import { visitsApi } from "../api/visits";
import ClientSearchAutocomplete from "./ClientSearchAutocomplete";

export default function QuickCheckIn() {
  const [selectedClient, setSelectedClient] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // ── История посещений ─────────────────────────────
  const [visits, setVisits] = useState([]);
  const [visitsMeta, setVisitsMeta] = useState({});
  const [visitsLoading, setVisitsLoading] = useState(false);
  const [visitsPage, setVisitsPage] = useState(1);

  // Фильтры для истории
  const [filterSearch, setFilterSearch] = useState("");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");

  const loadVisits = useCallback(
    (page = 1) => {
      setVisitsLoading(true);
      const params = { per_page: 20, page };
      if (filterSearch) params.search = filterSearch;
      if (filterFrom) params.from_date = filterFrom;
      if (filterTo) params.to_date = filterTo;

      visitsApi
        .listFree(params)
        .then((r) => {
          setVisits(r.data.data);
          setVisitsMeta(r.data.meta || {});
        })
        .catch(() => setVisits([]))
        .finally(() => setVisitsLoading(false));
    },
    [filterSearch, filterFrom, filterTo]
  );

  useEffect(() => {
    setVisitsPage(1);
    loadVisits(1);
  }, [loadVisits]);

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
      await visitsApi.create({
        client_id: selectedClient.person_id,
        session_id: null,
        status: "visited",
      });

      setSuccess(
        `✓ ${selectedClient.full_name} добавлен (остаток: ${selectedClient.remaining_visits - 1})`
      );
      setSelectedClient(null);
      setTimeout(() => setSuccess(null), 3000);
      loadVisits(1);
    } catch (err) {
      setError(err.response?.data?.message || "Ошибка при добавлении");
    } finally {
      setSubmitting(false);
    }
  };

  const handlePageChange = (p) => {
    setVisitsPage(p);
    loadVisits(p);
  };

  const fmtDate = (iso) => {
    const d = new Date(iso);
    return d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });
  };
  const fmtTime = (iso) => {
    const d = new Date(iso);
    return d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="space-y-4">
      {/* Форма регистрации */}
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

      {/* История свободных посещений */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6">
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
          История посещений
        </h2>

        {/* Фильтры */}
        <div className="flex flex-wrap gap-3 mb-4">
          <input
            type="text"
            placeholder="Поиск по клиенту..."
            value={filterSearch}
            onChange={(e) => setFilterSearch(e.target.value)}
            className="flex-1 min-w-[180px] px-3 py-2 text-sm border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400"
          />
          <div className="flex items-center gap-2">
            <label className="text-xs text-zinc-500 whitespace-nowrap">С</label>
            <input
              type="date"
              value={filterFrom}
              onChange={(e) => setFilterFrom(e.target.value)}
              className="px-3 py-2 text-sm border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-400"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-zinc-500 whitespace-nowrap">По</label>
            <input
              type="date"
              value={filterTo}
              onChange={(e) => setFilterTo(e.target.value)}
              className="px-3 py-2 text-sm border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-400"
            />
          </div>
          {(filterSearch || filterFrom || filterTo) && (
            <button
              onClick={() => {
                setFilterSearch("");
                setFilterFrom("");
                setFilterTo("");
              }}
              className="px-3 py-2 text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 border border-zinc-200 dark:border-zinc-700 rounded-lg transition-colors"
            >
              Сбросить
            </button>
          )}
        </div>

        {visitsLoading ? (
          <div className="text-sm text-zinc-400 py-4">Загрузка...</div>
        ) : visits.length === 0 ? (
          <div className="text-sm text-zinc-400 py-4">Нет посещений</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-100 dark:border-zinc-800">
                    <th className="text-left py-2 pr-4 text-xs font-medium text-zinc-400 uppercase tracking-wide">
                      Клиент
                    </th>
                    <th className="text-left py-2 pr-4 text-xs font-medium text-zinc-400 uppercase tracking-wide">
                      Дата
                    </th>
                    <th className="text-left py-2 text-xs font-medium text-zinc-400 uppercase tracking-wide">
                      Время
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-50 dark:divide-zinc-800/60">
                  {visits.map((v) => (
                    <tr key={v.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors">
                      <td className="py-2.5 pr-4 font-medium text-zinc-900 dark:text-zinc-100">
                        {v.client_name ?? "—"}
                      </td>
                      <td className="py-2.5 pr-4 text-zinc-600 dark:text-zinc-400">
                        {fmtDate(v.visited_at)}
                      </td>
                      <td className="py-2.5 text-zinc-600 dark:text-zinc-400">
                        {fmtTime(v.visited_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Пагинация */}
            {visitsMeta.last_page > 1 && (
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                <span className="text-xs text-zinc-400">
                  Всего: {visitsMeta.total}
                </span>
                <div className="flex gap-1">
                  <button
                    onClick={() => handlePageChange(visitsPage - 1)}
                    disabled={visitsPage === 1}
                    className="px-3 py-1 text-xs border border-zinc-200 dark:border-zinc-700 rounded disabled:opacity-40 hover:border-zinc-400 transition-colors"
                  >
                    ‹
                  </button>
                  <span className="px-3 py-1 text-xs text-zinc-500">
                    {visitsPage} / {visitsMeta.last_page}
                  </span>
                  <button
                    onClick={() => handlePageChange(visitsPage + 1)}
                    disabled={visitsPage === visitsMeta.last_page}
                    className="px-3 py-1 text-xs border border-zinc-200 dark:border-zinc-700 rounded disabled:opacity-40 hover:border-zinc-400 transition-colors"
                  >
                    ›
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

