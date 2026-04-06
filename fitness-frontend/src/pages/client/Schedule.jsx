import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { scheduleApi } from "../../api/schedule";

const LEVEL_COLOR = {
  "Начальный":   "bg-emerald-100 text-emerald-700",
  "Средний":     "bg-amber-100 text-amber-700",
  "Высокий":     "bg-red-100 text-red-600",
  "Продвинутый": "bg-red-100 text-red-600",
};

function dayTabs(n = 7) {
  const days = [];
  const now = new Date();
  for (let i = 0; i < n; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() + i);
    days.push(d.toISOString().split("T")[0]);
  }
  return days;
}

function ClassCard({ session, onBook }) {
  const isGroup = session.type === "group";
  const free = isGroup ? session.available_slots : null;
  const isFull = isGroup && free === 0;
  const fillPct = isGroup
      ? Math.round((session.registered / session.max_participants) * 100)
      : 0;

  return (
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5 flex flex-col gap-3 hover:shadow-sm transition-shadow">
        <div className="flex justify-between items-start gap-2">
          <div>
            <div className="font-medium text-zinc-900 dark:text-zinc-100 text-sm">
              {session.name ?? "Персональная тренировка"}
            </div>
            <div className="text-xs text-zinc-400 mt-0.5">{session.trainer?.full_name ?? "—"}</div>
          </div>
          {session.difficulty_level && (
              <span className={`text-xs px-2 py-0.5 rounded font-medium shrink-0 ${LEVEL_COLOR[session.difficulty_level] ?? "bg-zinc-100 text-zinc-600"}`}>
            {session.difficulty_level}
          </span>
          )}
        </div>

        <div className="flex gap-4 text-xs text-zinc-500">
          <span>{session.time_start}–{session.time_end} · {session.duration} мин</span>
          {session.hall && <span>Зал {session.hall.number}</span>}
        </div>

        {isGroup && (
            <div>
              <div className="flex justify-between text-xs text-zinc-400 mb-1">
                <span>Записано: {session.registered}/{session.max_participants}</span>
                <span className={isFull ? "text-red-500" : free <= 3 ? "text-amber-500" : "text-emerald-600"}>
              {isFull ? "Мест нет" : `Свободно: ${free}`}
            </span>
              </div>
              <div className="h-1 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                <div
                    className={`h-full rounded-full transition-all ${
                        fillPct >= 100 ? "bg-red-400" : fillPct >= 80 ? "bg-amber-400" : "bg-emerald-500"
                    }`}
                    style={{ width: `${fillPct}%` }}
                />
              </div>
            </div>
        )}

        {isGroup && (
            <button
                disabled={isFull}
                onClick={() => onBook(session)}
                className={`mt-auto pt-1 text-sm font-medium transition-opacity ${
                    isFull ? "text-zinc-300 dark:text-zinc-600 cursor-not-allowed" : "text-zinc-900 dark:text-zinc-100 hover:opacity-60"
                }`}
            >
              {isFull ? "Нет мест" : "Записаться →"}
            </button>
        )}
      </div>
  );
}

export default function Schedule() {
  const navigate = useNavigate();
  const [dates] = useState(() => dayTabs(7));
  const [activeDate, setActiveDate] = useState(dates[0]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    scheduleApi
        .list({ date: activeDate })
        .then((r) => setSessions(r.data.data))
        .finally(() => setLoading(false));
  }, [activeDate]);

  function handleBook(session) {
    navigate(`/client/schedule/book/${session.id}`, { state: { session } });
  }

  return (
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Расписание занятий</h1>
          <p className="text-sm text-zinc-400 mt-0.5">Выберите дату и запишитесь на тренировку</p>
        </div>

        <div className="flex gap-2 flex-wrap">
          {dates.map((d) => {
            const dt = new Date(d);
            return (
                <button
                    key={d}
                    onClick={() => setActiveDate(d)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        d === activeDate
                            ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900"
                            : "bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-zinc-400"
                    }`}
                >
                  {dt.toLocaleDateString("ru-RU", { weekday: "short", day: "numeric", month: "short" })}
                </button>
            );
          })}
        </div>

        {loading ? (
            <div className="text-sm text-zinc-400 text-center py-12">Загрузка расписания...</div>
        ) : sessions.length === 0 ? (
            <div className="text-sm text-zinc-400 text-center py-12">Занятий на эту дату нет</div>
        ) : (
            <div className="grid grid-cols-2 gap-4">
              {sessions.map((s) => (
                  <ClassCard key={s.id} session={s} onBook={handleBook} />
              ))}
            </div>
        )}
      </div>
  );
}
