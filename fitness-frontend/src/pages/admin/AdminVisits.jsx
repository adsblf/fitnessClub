import { useState, useEffect, useCallback } from "react";
import { visitsApi } from "../../api/visits";
import { scheduleApi } from "../../api/schedule";
import SessionVisitBlock from "../../components/SessionVisitBlock";
import QuickCheckIn from "../../components/QuickCheckIn";
import { todayStr, daysAgoStr, firstOfMonthStr } from "../../lib/tz";

export default function AdminVisits() {
  const [activeTab, setActiveTab] = useState("group"); // 'group', 'personal', 'checkin'

  // Актуализируем статусы занятий при загрузке страницы и каждые 30 минут
  useEffect(() => {
    scheduleApi.autoComplete().catch(() => {});
    const id = setInterval(() => scheduleApi.autoComplete().catch(() => {}), 30 * 60_000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          Посещения
        </h1>
      </div>

      {/* Вкладки */}
      <div className="flex gap-2 border-b border-zinc-200 dark:border-zinc-800 overflow-x-auto">
        <button
          onClick={() => setActiveTab("group")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "group"
              ? "border-zinc-900 dark:border-zinc-100 text-zinc-900 dark:text-zinc-100"
              : "border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
          }`}
        >
          👥 Групповые тренировки
        </button>
        <button
          onClick={() => setActiveTab("personal")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "personal"
              ? "border-zinc-900 dark:border-zinc-100 text-zinc-900 dark:text-zinc-100"
              : "border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
          }`}
        >
          👤 Персональные тренировки
        </button>
        <button
          onClick={() => setActiveTab("checkin")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "checkin"
              ? "border-zinc-900 dark:border-zinc-100 text-zinc-900 dark:text-zinc-100"
              : "border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
          }`}
        >
          ✓ Быстрая регистрация
        </button>
      </div>

      {/* Содержимое вкладок */}
      {activeTab === "group" && <GroupSessionsTab />}
      {activeTab === "personal" && <PersonalSessionsTab />}
      {activeTab === "checkin" && <QuickCheckIn />}
    </div>
  );
}

function GroupSessionsTab() {
  const [sessions, setSessions] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [subTab, setSubTab] = useState("current"); // 'current' или 'archive'
  const [tick, setTick] = useState(0); // обновляет фильтр каждую минуту

  // Автообновление: перезагружаем данные каждые 60 секунд
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  const fetch = useCallback(
    () => {
      setLoading(true);
      const params = { per_page: 1000 };
      if (fromDate) params.from_date = fromDate;
      if (toDate) params.to_date = toDate;

      visitsApi
        .sessionsWithVisits(params)
        .then((r) => {
          // Фильтруем только групповые тренировки и исключаем отменённые
          const groupSessions = r.data.data.filter(s =>
            s.type === 'group' && s.status !== 'cancelled'
          );
          setSessions(groupSessions);
        })
        .catch((err) => {
          console.error("Ошибка при загрузке сессий:", err);
          setSessions([]);
        })
        .finally(() => setLoading(false));
    },
    [fromDate, toDate]
  );

  useEffect(() => {
    fetch();
  }, [fetch, tick]); // tick triggers refetch every 60s

  useEffect(() => { setPage(1); }, [subTab]);

  // Фильтруем сессии по архиву/текущим на основе серверного статуса
  const PAGE_SIZE = 25;
  const filteredSessions = sessions.filter(session =>
    subTab === "current"
      ? session.status !== "completed"
      : session.status === "completed"
  );
  const totalPages = Math.ceil(filteredSessions.length / PAGE_SIZE);
  const paginatedSessions = filteredSessions.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const setTodayRange = () => {
    const today = todayStr();
    setFromDate(today);
    setToDate(today);
  };

  const setWeekRange = () => {
    setFromDate(daysAgoStr(7));
    setToDate(todayStr());
  };

  const setMonthRange = () => {
    setFromDate(firstOfMonthStr());
    setToDate(todayStr());
  };

  const resetFilters = () => {
    setFromDate("");
    setToDate("");
  };

  return (
    <div className="space-y-4">
      {/* Подвкладки */}
      <div className="flex gap-1 border-b border-zinc-200 dark:border-zinc-800 overflow-x-auto">
        <button
          onClick={() => setSubTab("current")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            subTab === "current"
              ? "border-zinc-900 dark:border-zinc-100 text-zinc-900 dark:text-zinc-100"
              : "border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
          }`}
        >
          📅 Текущие и предстоящие
        </button>
        <button
          onClick={() => setSubTab("archive")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            subTab === "archive"
              ? "border-zinc-900 dark:border-zinc-100 text-zinc-900 dark:text-zinc-100"
              : "border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
          }`}
        >
          📦 Архив
        </button>
      </div>

      {/* Фильтры */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 space-y-3">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs text-zinc-500 mb-1">От</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="px-3 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-500 mb-1">До</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="px-3 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 outline-none"
            />
          </div>

          <button
            onClick={setTodayRange}
            className="px-3 py-2 text-sm rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700"
          >
            Сегодня
          </button>
          <button
            onClick={setWeekRange}
            className="px-3 py-2 text-sm rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700"
          >
            Неделя
          </button>
          <button
            onClick={setMonthRange}
            className="px-3 py-2 text-sm rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700"
          >
            Месяц
          </button>

          {(fromDate || toDate) && (
            <button
              onClick={resetFilters}
              className="px-3 py-2 text-sm text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
            >
              Сбросить
            </button>
          )}
        </div>
      </div>

      {/* Список сессий */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-8 text-zinc-400">Загрузка...</div>
        ) : filteredSessions.length === 0 ? (
          <div className="text-center py-8 text-zinc-400">
            {subTab === "current"
              ? "Нет предстоящих групповых тренировок"
              : "Архив групповых тренировок пуст"}
          </div>
        ) : (
          paginatedSessions.map((session) => (
            <SessionVisitBlock
              key={session.id}
              session={session}
              onUpdated={fetch}
            />
          ))
        )}
      </div>

      {/* Пагинация */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 p-4">
          {Array.from({ length: totalPages }, (_, i) => (
            <button
              key={i + 1}
              onClick={() => setPage(i + 1)}
              className={`px-3 py-1 rounded text-xs ${
                page === i + 1
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
  );
}

function PersonalSessionsTab() {
  const [sessions, setSessions] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [subTab, setSubTab] = useState("current"); // 'current' или 'archive'
  const [tick, setTick] = useState(0); // обновляет фильтр каждую минуту

  // Авто-обновление: перезагружаем данные каждые 60 секунд
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  const fetch = useCallback(
    () => {
      setLoading(true);
      const params = { per_page: 1000 };
      if (fromDate) params.from_date = fromDate;
      if (toDate) params.to_date = toDate;

      visitsApi
        .sessionsWithVisits(params)
        .then((r) => {
          // Фильтруем только персональные тренировки и исключаем отменённые
          const personalSessions = r.data.data.filter(s =>
            s.type === 'personal' && s.status !== 'cancelled'
          );
          setSessions(personalSessions);
        })
        .catch((err) => {
          console.error("Ошибка при загрузке сессий:", err);
          setSessions([]);
        })
        .finally(() => setLoading(false));
    },
    [fromDate, toDate]
  );

  useEffect(() => {
    fetch();
  }, [fetch, tick]); // tick triggers refetch every 60s

  useEffect(() => { setPage(1); }, [subTab]);

  // Фильтруем сессии по архиву/текущим на основе серверного статуса
  const PAGE_SIZE = 25;
  const filteredSessions = sessions.filter(session =>
    subTab === "current"
      ? session.status !== "completed"
      : session.status === "completed"
  );
  const totalPages = Math.ceil(filteredSessions.length / PAGE_SIZE);
  const paginatedSessions = filteredSessions.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const setTodayRange = () => {
    const today = todayStr();
    setFromDate(today);
    setToDate(today);
  };

  const setWeekRange = () => {
    setFromDate(daysAgoStr(7));
    setToDate(todayStr());
  };

  const setMonthRange = () => {
    setFromDate(firstOfMonthStr());
    setToDate(todayStr());
  };

  const resetFilters = () => {
    setFromDate("");
    setToDate("");
  };

  return (
    <div className="space-y-4">
      {/* Подвкладки */}
      <div className="flex gap-1 border-b border-zinc-200 dark:border-zinc-800 overflow-x-auto">
        <button
          onClick={() => setSubTab("current")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            subTab === "current"
              ? "border-zinc-900 dark:border-zinc-100 text-zinc-900 dark:text-zinc-100"
              : "border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
          }`}
        >
          📅 Текущие и предстоящие
        </button>
        <button
          onClick={() => setSubTab("archive")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            subTab === "archive"
              ? "border-zinc-900 dark:border-zinc-100 text-zinc-900 dark:text-zinc-100"
              : "border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
          }`}
        >
          📦 Архив
        </button>
      </div>

      {/* Фильтры */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 space-y-3">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs text-zinc-500 mb-1">От</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="px-3 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-500 mb-1">До</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="px-3 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 outline-none"
            />
          </div>

          <button
            onClick={setTodayRange}
            className="px-3 py-2 text-sm rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700"
          >
            Сегодня
          </button>
          <button
            onClick={setWeekRange}
            className="px-3 py-2 text-sm rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700"
          >
            Неделя
          </button>
          <button
            onClick={setMonthRange}
            className="px-3 py-2 text-sm rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700"
          >
            Месяц
          </button>

          {(fromDate || toDate) && (
            <button
              onClick={resetFilters}
              className="px-3 py-2 text-sm text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
            >
              Сбросить
            </button>
          )}
        </div>
      </div>

      {/* Список сессий */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-8 text-zinc-400">Загрузка...</div>
        ) : filteredSessions.length === 0 ? (
          <div className="text-center py-8 text-zinc-400">
            {subTab === "current"
              ? "Нет предстоящих персональных тренировок"
              : "Архив персональных тренировок пуст"}
          </div>
        ) : (
          paginatedSessions.map((session) => (
            <SessionVisitBlock
              key={session.id}
              session={session}
              onUpdated={fetch}
            />
          ))
        )}
      </div>

      {/* Пагинация */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 p-4">
          {Array.from({ length: totalPages }, (_, i) => (
            <button
              key={i + 1}
              onClick={() => setPage(i + 1)}
              className={`px-3 py-1 rounded text-xs ${
                page === i + 1
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
  );
}
