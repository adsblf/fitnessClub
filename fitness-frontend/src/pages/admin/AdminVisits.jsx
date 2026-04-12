import { useState, useEffect, useCallback } from "react";
import { visitsApi } from "../../api/visits";
import SessionVisitBlock from "../../components/SessionVisitBlock";
import QuickCheckIn from "../../components/QuickCheckIn";

export default function AdminVisits() {
  const [activeTab, setActiveTab] = useState("group"); // 'group', 'personal', 'checkin'

  return (
    <div className="p-6 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          Посещения
        </h1>
      </div>

      {/* Вкладки */}
      <div className="flex gap-2 border-b border-zinc-200 dark:border-zinc-800">
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
  const [meta, setMeta] = useState({});
  const [loading, setLoading] = useState(true);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const fetch = useCallback(
    (page = 1) => {
      setLoading(true);
      const params = { page, per_page: 20 };
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
          setMeta(r.data.meta);
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
    fetch(1);
  }, [fetch]);

  const setTodayRange = () => {
    const today = new Date().toISOString().split("T")[0];
    setFromDate(today);
    setToDate(today);
  };

  const setWeekRange = () => {
    const today = new Date();
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    setFromDate(weekAgo.toISOString().split("T")[0]);
    setToDate(today.toISOString().split("T")[0]);
  };

  const setMonthRange = () => {
    const today = new Date();
    const monthAgo = new Date(today.getFullYear(), today.getMonth(), 1);
    setFromDate(monthAgo.toISOString().split("T")[0]);
    setToDate(today.toISOString().split("T")[0]);
  };

  const resetFilters = () => {
    setFromDate("");
    setToDate("");
  };

  return (
    <div className="space-y-4">
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
        ) : sessions.length === 0 ? (
          <div className="text-center py-8 text-zinc-400">
            Групповые тренировки не найдены
          </div>
        ) : (
          sessions.map((session) => (
            <SessionVisitBlock
              key={session.id}
              session={session}
              onUpdated={() => fetch(meta.current_page || 1)}
            />
          ))
        )}
      </div>

      {/* Пагинация */}
      {meta.last_page > 1 && (
        <div className="flex justify-center gap-2 p-4">
          {Array.from({ length: meta.last_page }, (_, i) => (
            <button
              key={i + 1}
              onClick={() => fetch(i + 1)}
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
  );
}

function PersonalSessionsTab() {
  const [sessions, setSessions] = useState([]);
  const [meta, setMeta] = useState({});
  const [loading, setLoading] = useState(true);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const fetch = useCallback(
    (page = 1) => {
      setLoading(true);
      const params = { page, per_page: 20 };
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
          setMeta(r.data.meta);
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
    fetch(1);
  }, [fetch]);

  const setTodayRange = () => {
    const today = new Date().toISOString().split("T")[0];
    setFromDate(today);
    setToDate(today);
  };

  const setWeekRange = () => {
    const today = new Date();
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    setFromDate(weekAgo.toISOString().split("T")[0]);
    setToDate(today.toISOString().split("T")[0]);
  };

  const setMonthRange = () => {
    const today = new Date();
    const monthAgo = new Date(today.getFullYear(), today.getMonth(), 1);
    setFromDate(monthAgo.toISOString().split("T")[0]);
    setToDate(today.toISOString().split("T")[0]);
  };

  const resetFilters = () => {
    setFromDate("");
    setToDate("");
  };

  return (
    <div className="space-y-4">
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
        ) : sessions.length === 0 ? (
          <div className="text-center py-8 text-zinc-400">
            Персональные тренировки не найдены
          </div>
        ) : (
          sessions.map((session) => (
            <SessionVisitBlock
              key={session.id}
              session={session}
              onUpdated={() => fetch(meta.current_page || 1)}
            />
          ))
        )}
      </div>

      {/* Пагинация */}
      {meta.last_page > 1 && (
        <div className="flex justify-center gap-2 p-4">
          {Array.from({ length: meta.last_page }, (_, i) => (
            <button
              key={i + 1}
              onClick={() => fetch(i + 1)}
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
  );
}
