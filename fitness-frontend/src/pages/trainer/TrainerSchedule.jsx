import { useState, useEffect } from "react";
import { useAuth } from "../../context/useAuth";
import { scheduleApi } from "../../api/schedule";
import { bookingsApi } from "../../api/bookings";
import { visitsApi } from "../../api/visits";

export default function TrainerSchedule() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);

  useEffect(() => {
    scheduleApi
      .list({ trainer_id: user.id })
      .then((r) => setSessions(r.data.data))
      .finally(() => setLoading(false));
  }, [user.id]);

  async function openBookings(session) {
    setSelectedSession(session);
    setBookingsLoading(true);
    try {
      const r = await bookingsApi.sessionBookings(session.id);
      setBookings(r.data.data);
    } finally {
      setBookingsLoading(false);
    }
  }

  async function handleMarkVisit(clientId, sessionId) {
    try {
      await visitsApi.create({ client_id: clientId, session_id: sessionId });
      alert("Посещение зарегистрировано, посещение списано с абонемента");
      openBookings(selectedSession);
    } catch (err) {
      alert(err.response?.data?.message || "Ошибка");
    }
  }

  if (loading) return <div className="p-6 text-sm text-zinc-400">Загрузка...</div>;

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Моё расписание</h1>

      {sessions.length === 0 ? (
        <div className="text-sm text-zinc-400">Занятий не найдено</div>
      ) : (
        <div className="space-y-3">
          {sessions.map((s) => (
            <div
              key={s.id}
              onClick={() => openBookings(s)}
              className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 cursor-pointer hover:shadow-sm transition-shadow"
            >
              <div className="flex justify-between items-center">
                <div>
                  <div className="font-medium text-sm text-zinc-900 dark:text-zinc-100">
                    {s.name ?? "Персональная"} — {s.date}
                  </div>
                  <div className="text-xs text-zinc-400 mt-0.5">
                    {s.time_start}–{s.time_end} · Зал {s.hall?.number}
                    {s.type === "group" && ` · ${s.registered}/${s.max_participants} записано`}
                  </div>
                </div>
                <span className="text-xs text-zinc-400">Подробнее →</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Модалка списка клиентов */}
      {selectedSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setSelectedSession(null)}>
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
              {selectedSession.name ?? "Персональная"}
            </h2>
            <p className="text-xs text-zinc-400 mb-4">
              {selectedSession.date} · {selectedSession.time_start}–{selectedSession.time_end}
            </p>

            {bookingsLoading ? (
              <div className="text-sm text-zinc-400">Загрузка...</div>
            ) : bookings.length === 0 ? (
              <div className="text-sm text-zinc-400">Нет записей</div>
            ) : (
              <div className="space-y-2">
                {bookings.map((b) => (
                  <div key={b.id} className="flex items-center justify-between bg-zinc-50 dark:bg-zinc-800 rounded-lg p-3">
                    <div>
                      <div className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{b.client_name}</div>
                      <div className="text-xs text-zinc-400 capitalize">{b.status}</div>
                    </div>
                    {(b.status === "booked" || b.status === "confirmed") && (
                      <button
                        onClick={() => handleMarkVisit(b.client_id, selectedSession.id)}
                        className="text-xs px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-lg font-medium hover:bg-emerald-200 transition-colors"
                      >
                        Отметить посещение
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={() => setSelectedSession(null)}
              className="mt-4 w-full py-2 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-600 dark:text-zinc-400"
            >
              Закрыть
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
