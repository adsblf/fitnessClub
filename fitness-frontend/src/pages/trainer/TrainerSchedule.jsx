import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "../../context/useAuth";
import { visitsApi } from "../../api/visits";
import { scheduleApi } from "../../api/schedule";
import SessionVisitBlock from "../../components/SessionVisitBlock";

export default function TrainerSchedule() {
  const { user } = useAuth();
  const myTrainerId = user.person_id ?? user.id;

  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [subTab, setSubTab] = useState("current"); // 'current' | 'archive'
  const autoCompleteDoneRef = useRef(false);

  const fetchSessions = useCallback(() => {
    setLoading(true);
    visitsApi
      .sessionsWithVisits({ trainer_id: myTrainerId, per_page: 1000 })
      .then((r) => {
        // Исключаем отменённые занятия
        setSessions(r.data.data.filter((s) => s.status !== "cancelled"));
      })
      .finally(() => setLoading(false));
  }, [myTrainerId]);

  useEffect(() => {
    // Один раз авто-завершаем просроченные занятия, затем загружаем список
    if (!autoCompleteDoneRef.current) {
      autoCompleteDoneRef.current = true;
      scheduleApi
        .autoComplete()
        .catch(() => {})
        .finally(() => fetchSessions());
    } else {
      fetchSessions();
    }
  }, [fetchSessions]);

  const now = new Date();

  // Предстоящие/текущие: архивное время ещё не наступило (ends_at + 1 час)
  const upcomingSessions = sessions
    .filter((s) => new Date(s.ends_at).getTime() + 3_600_000 > now.getTime())
    .sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at));

  // Архив: прошло больше часа с момента завершения
  const archiveSessions = sessions
    .filter((s) => new Date(s.ends_at).getTime() + 3_600_000 <= now.getTime())
    .sort((a, b) => new Date(b.starts_at) - new Date(a.starts_at));

  const displayed = subTab === "current" ? upcomingSessions : archiveSessions;

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Моё расписание</h1>

      {/* Подвкладки */}
      <div className="flex gap-0 border-b border-zinc-200 dark:border-zinc-800">
        <TabBtn active={subTab === "current"} onClick={() => setSubTab("current")}>
          📅 Предстоящие и текущие
          {upcomingSessions.length > 0 && (
            <span className="ml-1.5 px-1.5 py-0.5 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 rounded text-xs font-medium">
              {upcomingSessions.length}
            </span>
          )}
        </TabBtn>
        <TabBtn active={subTab === "archive"} onClick={() => setSubTab("archive")}>
          📦 Архив
          {archiveSessions.length > 0 && (
            <span className="ml-1.5 px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 rounded text-xs font-medium">
              {archiveSessions.length}
            </span>
          )}
        </TabBtn>
      </div>

      {loading ? (
        <div className="py-10 text-center text-sm text-zinc-400">Загрузка...</div>
      ) : displayed.length === 0 ? (
        <div className="py-10 text-center text-sm text-zinc-400">
          {subTab === "current" ? "Нет предстоящих занятий" : "Нет архивных занятий"}
        </div>
      ) : (
        <div className="space-y-4">
          {displayed.map((s) => (
            <SessionVisitBlock key={s.id} session={s} onUpdated={fetchSessions} />
          ))}
        </div>
      )}
    </div>
  );
}

function TabBtn({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
        active
          ? "border-zinc-900 dark:border-zinc-100 text-zinc-900 dark:text-zinc-100"
          : "border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
      }`}
    >
      {children}
    </button>
  );
}
