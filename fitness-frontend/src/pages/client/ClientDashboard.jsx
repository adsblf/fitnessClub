import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/useAuth";
import { clientsApi } from "../../api/clients";
import { bookingsApi } from "../../api/bookings";

const BOOKING_STATUS_MAP = {
  pending:    { label: "Ожидает подтверждения администратором", cls: "bg-amber-100 text-amber-700", icon: "⏳" },
  confirmed:  { label: "Подтверждено",    cls: "bg-emerald-100 text-emerald-700", icon: "✓" },
  rejected:   { label: "Отклонена администратором", cls: "bg-red-100 text-red-600", icon: "✕" },
  cancelled:  { label: "Отменено",        cls: "bg-zinc-100 text-zinc-500", icon: "✕" },
  completed:  { label: "Завершено",       cls: "bg-blue-100 text-blue-700", icon: "✓" },
};

const MEMBERSHIP_STATUS_MAP = {
  active:     { label: "Активный",   cls: "bg-emerald-100 text-emerald-700" },
  expired:    { label: "Истёк",      cls: "bg-zinc-100 text-zinc-500" },
  frozen:     { label: "Заморожен",  cls: "bg-blue-100 text-blue-700" },
  cancelled:  { label: "Отменён",    cls: "bg-red-100 text-red-600" },
};

function BookingStatusBadge({ status }) {
  const s = BOOKING_STATUS_MAP[status] ?? { label: status, cls: "bg-zinc-100 text-zinc-600", icon: "•" };
  return (
    <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-medium ${s.cls}`}>
      {s.icon} {s.label}
    </span>
  );
}

function StatusBadge({ status }) {
  const map = {
    booked:    { label: "Забронировано", cls: "bg-blue-100 text-blue-700" },
    confirmed: { label: "Подтверждено",  cls: "bg-emerald-100 text-emerald-700" },
    cancelled: { label: "Отменено",      cls: "bg-zinc-100 text-zinc-500" },
    visited:   { label: "Посещено",      cls: "bg-emerald-100 text-emerald-700" },
    no_show:   { label: "Неявка",        cls: "bg-red-100 text-red-600" },
  };
  const s = map[status] ?? { label: status, cls: "bg-zinc-100 text-zinc-600" };
  return <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${s.cls}`}>{s.label}</span>;
}

export default function ClientDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [visits, setVisits] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      clientsApi.get(user.id),
      clientsApi.visits(user.id),
      bookingsApi.getClientBookings(user.id),
    ])
        .then(([profRes, visRes, bookRes]) => {
          setProfile(profRes.data.data);
          setVisits(visRes.data.data.slice(0, 5));
          setBookings(bookRes.data.data || []);
        })
        .finally(() => setLoading(false));
  }, [user]);

  if (loading) {
    return <div className="p-6 text-sm text-zinc-400">Загрузка...</div>;
  }

  if (!profile) {
    return <div className="p-6 text-sm text-zinc-400">Профиль не найден</div>;
  }

  const m = profile.membership;
  const firstName = profile.full_name?.split(" ")[0] ?? "";

  // Фильтруем ближайшие записи (confirmed, pending, rejected, но не позже чем через 30 дней)
  const now = new Date();
  const upcomingBookings = bookings
    .filter(b => ['confirmed', 'pending', 'rejected'].includes(b.status))
    .filter(b => new Date(b.datetime_start) > now)
    .sort((a, b) => new Date(a.datetime_start) - new Date(b.datetime_start))
    .slice(0, 5);

  // Статистика посещений
  const visitedCount = visits.filter(v => v.status === "visited").length;
  const noShowCount = visits.filter(v => v.status === "no_show").length;
  const visitStats = {
    total: profile.total_visits || 0,
    visited: visitedCount,
    noShow: noShowCount,
  };

  return (
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              Привет, {firstName}!
            </h1>
            <p className="text-sm text-zinc-400 mt-0.5">Всего посещений: {visitStats.total}</p>
          </div>
          <button
              onClick={() => navigate("/client/schedule")}
              className="px-4 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg text-sm font-medium hover:opacity-80 transition-opacity"
          >
            Записаться на занятие
          </button>
        </div>

        {/* Абонемент и карточка клиента */}
        <div className="grid grid-cols-3 gap-4">
          {/* Информация об абонементе */}
          <div className="col-span-1">
            {m ? (
                <div className="bg-gradient-to-br from-zinc-900 to-zinc-800 dark:from-zinc-100 dark:to-zinc-200 text-white dark:text-zinc-900 rounded-xl p-6 flex flex-col gap-4 shadow-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="text-xs opacity-70 mb-1 font-medium uppercase tracking-wide">Абонемент</div>
                      <div className="font-bold text-lg">{m.type}</div>
                    </div>
                    <span className={`text-xs px-3 py-1.5 rounded-full font-semibold ${
                      MEMBERSHIP_STATUS_MAP[m.status]?.cls ?? "bg-white/20 text-white"
                    }`}>
                      {MEMBERSHIP_STATUS_MAP[m.status]?.label ?? m.status}
                    </span>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm opacity-70">Действует до</span>
                      <span className="font-semibold text-base">{m.end_date}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm opacity-70">Осталось посещений</span>
                      <span className="font-bold text-lg text-amber-300">
                        {m.remaining_visits >= 999 ? "Безлимит ∞" : m.remaining_visits}
                      </span>
                    </div>
                  </div>
                </div>
            ) : (
                <div className="bg-zinc-50 dark:bg-zinc-800 rounded-xl p-6 text-center border border-dashed border-zinc-300 dark:border-zinc-700">
                  <p className="text-sm text-zinc-400 mb-3">Нет активного абонемента</p>
                  <button
                      onClick={() => navigate("/client/schedule")}
                      className="px-3 py-1.5 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg text-xs font-medium hover:opacity-80 transition-opacity"
                  >
                    Приобрести абонемент
                  </button>
                </div>
            )}
          </div>

          {/* Карточка клиента */}
          <div className="col-span-2 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5 shadow-sm">
            <div className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-4">Личная информация</div>
            {profile.card ? (
                <div className="grid grid-cols-4 gap-3 text-sm">
                  <div className="bg-zinc-50 dark:bg-zinc-800 rounded-lg p-3">
                    <div className="text-xs text-zinc-400 mb-0.5 font-medium">Цель тренировок</div>
                    <div className="text-zinc-800 dark:text-zinc-200 font-semibold">{profile.card.training_goal}</div>
                  </div>
                  <div className="bg-zinc-50 dark:bg-zinc-800 rounded-lg p-3">
                    <div className="text-xs text-zinc-400 mb-0.5 font-medium">ИМТ</div>
                    <div className="text-zinc-800 dark:text-zinc-200 font-semibold">{profile.card.bmi ?? "—"}</div>
                  </div>
                  <div className="bg-zinc-50 dark:bg-zinc-800 rounded-lg p-3">
                    <div className="text-xs text-zinc-400 mb-0.5 font-medium">Вес</div>
                    <div className="text-zinc-800 dark:text-zinc-200 font-semibold">{profile.card.current_weight} кг</div>
                  </div>
                  <div className="bg-zinc-50 dark:bg-zinc-800 rounded-lg p-3">
                    <div className="text-xs text-zinc-400 mb-0.5 font-medium">Рост</div>
                    <div className="text-zinc-800 dark:text-zinc-200 font-semibold">{profile.card.height} см</div>
                  </div>
                </div>
            ) : (
                <p className="text-sm text-zinc-400">Карточка пока не заполнена</p>
            )}
          </div>
        </div>

        {/* Ближайшие тренировки */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <div className="px-5 py-4 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center">
            <div>
              <div className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Ближайшие тренировки</div>
              <p className="text-xs text-zinc-400 mt-0.5">Ваши записи (подтверждённые, ожидающие подтверждения и отклонённые)</p>
            </div>
            <button
                onClick={() => navigate("/client/bookings")}
                className="px-3 py-1 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
            >
              Все расписание →
            </button>
          </div>
          {upcomingBookings.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-sm text-zinc-400 mb-3">Вы пока не записаны на тренировки</p>
                <button
                    onClick={() => navigate("/client/schedule")}
                    className="px-3 py-1.5 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg text-sm font-medium hover:opacity-80 transition-opacity"
                >
                  Найти тренировки
                </button>
              </div>
          ) : (
              <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {upcomingBookings.map((booking) => {
                  const startDate = new Date(booking.datetime_start);
                  const dateStr = startDate.toLocaleDateString("ru-RU", { weekday: "short", day: "numeric", month: "short" });
                  return (
                      <div key={booking.id} className="px-5 py-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm">
                                {booking.session_name}
                              </h3>
                              <BookingStatusBadge status={booking.status} />
                            </div>
                            <div className="text-xs text-zinc-500 dark:text-zinc-400 space-y-1">
                              <p>📅 {dateStr} • {booking.time_start}–{booking.time_end}</p>
                              <p>🏋️ Тренер: {booking.trainer_name}</p>
                              {booking.hall && <p>🏢 Зал {booking.hall.number}</p>}
                            </div>
                          </div>
                          <button
                              onClick={() => navigate(`/client/schedule/book/${booking.session_id}`, { state: { booking } })}
                              className="px-3 py-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors whitespace-nowrap"
                          >
                            Детали →
                          </button>
                        </div>
                      </div>
                  );
                })}
              </div>
          )}
        </div>

        {/* Статистика посещаемости */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/30 rounded-xl p-5">
            <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide mb-1">Всего посещений</div>
            <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{visitStats.total}</div>
            <p className="text-xs text-emerald-600/70 dark:text-emerald-400/70 mt-2">Текущее количество</p>
          </div>
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/30 rounded-xl p-5">
            <div className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide mb-1">Подтверждённые</div>
            <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">{visitStats.visited}</div>
            <p className="text-xs text-blue-600/70 dark:text-blue-400/70 mt-2">За последние 5 посещений</p>
          </div>
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/30 rounded-xl p-5">
            <div className="text-xs font-semibold text-red-600 dark:text-red-400 uppercase tracking-wide mb-1">Неявки</div>
            <div className="text-2xl font-bold text-red-700 dark:text-red-300">{visitStats.noShow}</div>
            <p className="text-xs text-red-600/70 dark:text-red-400/70 mt-2">За последние 5 посещений</p>
          </div>
        </div>

        {/* История посещений */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <div className="px-5 py-4 border-b border-zinc-100 dark:border-zinc-800">
            <div className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">История последних посещений</div>
          </div>
          {visits.length === 0 ? (
              <div className="p-8 text-center text-sm text-zinc-400">Посещений пока нет</div>
          ) : (
              <table className="w-full text-sm">
                <thead>
                <tr className="text-xs text-zinc-400 border-b border-zinc-100 dark:border-zinc-800">
                  <th className="text-left px-5 py-2.5 font-semibold">Дата</th>
                  <th className="text-left px-5 py-2.5 font-semibold">Занятие</th>
                  <th className="text-left px-5 py-2.5 font-semibold">Статус</th>
                </tr>
                </thead>
                <tbody>
                {visits.map((v, i) => (
                    <tr key={v.id} className={`border-b border-zinc-50 dark:border-zinc-800 last:border-0 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors ${i % 2 ? "bg-zinc-50/30 dark:bg-zinc-800/20" : ""}`}>
                      <td className="px-5 py-3 text-zinc-500 dark:text-zinc-400">{v.visited_at.split(" ")[0]}</td>
                      <td className="px-5 py-3 text-zinc-800 dark:text-zinc-200 font-medium">{v.session_name}</td>
                      <td className="px-5 py-3"><StatusBadge status={v.status} /></td>
                    </tr>
                ))}
                </tbody>
              </table>
          )}
        </div>
      </div>
  );
}
