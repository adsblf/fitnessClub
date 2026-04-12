import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/useAuth";
import { bookingsApi } from "../../api/bookings";
import { TZ } from "../../lib/tz";

const BOOKING_STATUS_MAP = {
  pending:    { label: "Ожидает подтверждения", cls: "bg-amber-100 text-amber-700", icon: "⏳" },
  confirmed:  { label: "Подтверждено", cls: "bg-emerald-100 text-emerald-700", icon: "✓" },
  rejected:   { label: "Отклонена", cls: "bg-red-100 text-red-600", icon: "✕" },
  cancelled:  { label: "Отменено", cls: "bg-zinc-100 text-zinc-500", icon: "✕" },
  completed:  { label: "Завершено", cls: "bg-blue-100 text-blue-700", icon: "✓" },
};

const LEVEL_COLOR = {
  "Начальный":   "bg-emerald-100 text-emerald-700",
  "Средний":     "bg-amber-100 text-amber-700",
  "Высокий":     "bg-red-100 text-red-600",
  "Продвинутый": "bg-red-100 text-red-600",
};

const SESSION_TYPE_MAP = {
  group: "Групповая",
  personal: "Персональная",
};

function BookingCard({ booking, onAction }) {
  const startDate = new Date(booking.datetime_start);
  const endDate = new Date(booking.datetime_end);
  const now = new Date();

  const isUpcoming = startDate > now;
  const isCompleted = endDate < now && booking.status === "completed";
  const isCancelled = booking.status === "cancelled" || booking.status === "rejected";

  const dateStr = startDate.toLocaleDateString("ru-RU", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: TZ,
  });

  const timeStr = `${booking.time_start}–${booking.time_end}`;

  return (
    <div className={`bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5 flex flex-col gap-4 hover:shadow-md transition-shadow ${
      isCancelled ? "opacity-75" : ""
    }`}>
      {/* Заголовок с типом и статусом */}
      <div className="flex justify-between items-start gap-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm">
              {booking.session_name || "Персональная тренировка"}
            </h3>
            {booking.difficulty_level && (
              <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                LEVEL_COLOR[booking.difficulty_level] ?? "bg-zinc-100 text-zinc-600"
              }`}>
                {booking.difficulty_level}
              </span>
            )}
          </div>
          <div className="text-xs text-zinc-500">
            {SESSION_TYPE_MAP[booking.session_type] || "Тренировка"}
          </div>
        </div>
        <div className={`text-xs px-3 py-1.5 rounded-lg font-medium inline-flex whitespace-nowrap ${
          BOOKING_STATUS_MAP[booking.status]?.cls ?? "bg-zinc-100 text-zinc-600"
        }`}>
          {BOOKING_STATUS_MAP[booking.status]?.icon} {BOOKING_STATUS_MAP[booking.status]?.label}
        </div>
      </div>

      {/* Основная информация */}
      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
          <span className="text-base">📅</span>
          <span>{dateStr}</span>
        </div>
        <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
          <span className="text-base">🕐</span>
          <span>{timeStr}</span>
        </div>
        {booking.trainer_name && (
          <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
            <span className="text-base">🏋️</span>
            <span>Тренер: {booking.trainer_name}</span>
          </div>
        )}
        {booking.hall && (
          <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
            <span className="text-base">🏢</span>
            <span>Зал {booking.hall.number}</span>
          </div>
        )}
        {booking.duration && (
          <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
            <span className="text-base">⏱️</span>
            <span>{booking.duration} минут</span>
          </div>
        )}
      </div>

      {/* Информация о месте (для групповых) */}
      {booking.session_type === "group" && booking.max_participants && (
        <div className="bg-zinc-50 dark:bg-zinc-800 rounded-lg p-3">
          <div className="flex justify-between items-center text-xs text-zinc-600 dark:text-zinc-400 mb-2">
            <span>Место в группе</span>
            <span className="font-medium">{booking.registered}/{booking.max_participants}</span>
          </div>
          <div className="h-2 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 transition-all"
              style={{ width: `${(booking.registered / booking.max_participants) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Примечания или описание */}
      {booking.notes && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/30 rounded-lg p-3">
          <div className="text-xs text-blue-600 dark:text-blue-400 font-medium mb-1">Примечание:</div>
          <div className="text-xs text-blue-700 dark:text-blue-300">{booking.notes}</div>
        </div>
      )}

      {/* Кнопки действия */}
      <div className="flex gap-2 mt-auto pt-2">
        {isUpcoming && booking.status === "confirmed" && (
          <button
            onClick={() => onAction("cancel", booking.id)}
            className="flex-1 px-3 py-2 text-xs font-medium text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/30 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
          >
            Отменить запись
          </button>
        )}
        <button
          onClick={() => onAction("view", booking.id)}
          className="flex-1 px-3 py-2 text-xs font-medium text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
        >
          Подробнее
        </button>
      </div>
    </div>
  );
}

function FilterBar({ filters, onFilterChange }) {
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {/* Фильтр по статусу */}
        <div>
          <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wide block mb-2">
            Статус
          </label>
          <select
            value={filters.status}
            onChange={(e) => onFilterChange("status", e.target.value)}
            className="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100"
          >
            <option value="">Все статусы</option>
            <option value="pending">Ожидает подтверждения</option>
            <option value="confirmed">Подтверждено</option>
            <option value="rejected">Отклонена</option>
            <option value="cancelled">Отменено</option>
            <option value="completed">Завершено</option>
          </select>
        </div>

        {/* Фильтр по периоду */}
        <div>
          <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wide block mb-2">
            Период
          </label>
          <select
            value={filters.period}
            onChange={(e) => onFilterChange("period", e.target.value)}
            className="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100"
          >
            <option value="">Все</option>
            <option value="upcoming">Предстоящие</option>
            <option value="past">Прошедшие</option>
            <option value="today">Сегодня</option>
            <option value="week">На неделю</option>
            <option value="month">На месяц</option>
          </select>
        </div>

        {/* Фильтр по типу */}
        <div>
          <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wide block mb-2">
            Тип
          </label>
          <select
            value={filters.type}
            onChange={(e) => onFilterChange("type", e.target.value)}
            className="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100"
          >
            <option value="">Все типы</option>
            <option value="group">Групповые</option>
            <option value="personal">Персональные</option>
          </select>
        </div>

        {/* Поиск */}
        <div>
          <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wide block mb-2">
            Поиск
          </label>
          <input
            type="text"
            placeholder="Тренер, занятие..."
            value={filters.search}
            onChange={(e) => onFilterChange("search", e.target.value)}
            className="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100"
          />
        </div>
      </div>

      {/* Кнопка очистки фильтров */}
      {Object.values(filters).some(v => v) && (
        <button
          onClick={() => onFilterChange("reset", true)}
          className="text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
        >
          ✕ Очистить фильтры
        </button>
      )}
    </div>
  );
}

export default function Bookings() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: "",
    period: "",
    type: "",
    search: "",
  });

  useEffect(() => {
    if (!user) return;
    loadBookings();
  }, [user]);

  function loadBookings() {
    setLoading(true);
    bookingsApi
      .getClientBookings(user.id)
      .then((res) => {
        setBookings(res.data.data || []);
      })
      .catch(() => {
        setBookings([]);
      })
      .finally(() => setLoading(false));
  }

  function getFilteredBookings() {
    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const weekEnd = new Date(today);
    weekEnd.setDate(weekEnd.getDate() + 7);
    const monthEnd = new Date(today);
    monthEnd.setMonth(monthEnd.getMonth() + 1);

    let filtered = bookings;

    // Фильтр по статусу
    if (filters.status) {
      filtered = filtered.filter(b => b.status === filters.status);
    }

    // Фильтр по периоду
    if (filters.period) {
      filtered = filtered.filter(b => {
        const startDate = new Date(b.datetime_start);
        switch (filters.period) {
          case "upcoming":
            return startDate > now;
          case "past":
            return startDate < now;
          case "today":
            return startDate >= today && startDate < tomorrow;
          case "week":
            return startDate >= today && startDate < weekEnd;
          case "month":
            return startDate >= today && startDate < monthEnd;
          default:
            return true;
        }
      });
    }

    // Фильтр по типу
    if (filters.type) {
      filtered = filtered.filter(b => b.session_type === filters.type);
    }

    // Поиск
    if (filters.search) {
      const q = filters.search.toLowerCase();
      filtered = filtered.filter(b =>
        (b.session_name?.toLowerCase().includes(q)) ||
        (b.trainer_name?.toLowerCase().includes(q))
      );
    }

    // Сортировка: предстоящие в начале
    return filtered.sort((a, b) => {
      const aUpcoming = new Date(a.datetime_start) > now ? 1 : 0;
      const bUpcoming = new Date(b.datetime_start) > now ? 1 : 0;
      if (aUpcoming !== bUpcoming) return bUpcoming - aUpcoming;
      return new Date(a.datetime_start) - new Date(b.datetime_start);
    });
  }

  function handleFilterChange(key, value) {
    if (key === "reset") {
      setFilters({ status: "", period: "", type: "", search: "" });
    } else {
      setFilters(prev => ({ ...prev, [key]: value }));
    }
  }

  function handleAction(action, bookingId) {
    if (action === "cancel") {
      if (confirm("Вы уверены, что хотите отменить запись?")) {
        bookingsApi
          .cancel(bookingId)
          .then(() => {
            loadBookings();
          })
          .catch(() => {
            alert("Ошибка при отмене записи");
          });
      }
    } else if (action === "view") {
      const booking = bookings.find(b => b.id === bookingId);
      navigate(`/client/schedule/book/${booking?.session_id}`, { state: { booking } });
    }
  }

  const filteredBookings = getFilteredBookings();

  const stats = {
    total: bookings.length,
    upcoming: bookings.filter(b => new Date(b.datetime_start) > new Date()).length,
    confirmed: bookings.filter(b => b.status === "confirmed").length,
    pending: bookings.filter(b => b.status === "pending").length,
  };

  return (
    <div className="p-6 space-y-6">
      {/* Заголовок */}
      <div>
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Мои записи</h1>
        <p className="text-sm text-zinc-400 mt-0.5">Управляйте вашими записями на тренировки</p>
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-zinc-50 dark:bg-zinc-800 rounded-lg p-4 border border-zinc-200 dark:border-zinc-700">
          <div className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wide mb-1">Всего записей</div>
          <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{stats.total}</div>
        </div>
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800/30">
          <div className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide mb-1">Предстоящих</div>
          <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">{stats.upcoming}</div>
        </div>
        <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-4 border border-emerald-200 dark:border-emerald-800/30">
          <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide mb-1">Подтверждено</div>
          <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{stats.confirmed}</div>
        </div>
        <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4 border border-amber-200 dark:border-amber-800/30">
          <div className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wide mb-1">Ожидают подтверждения</div>
          <div className="text-2xl font-bold text-amber-700 dark:text-amber-300">{stats.pending}</div>
        </div>
      </div>

      {/* Фильтры */}
      <FilterBar filters={filters} onFilterChange={handleFilterChange} />

      {/* Записи */}
      {loading ? (
        <div className="text-center py-12">
          <p className="text-sm text-zinc-400">Загрузка записей...</p>
        </div>
      ) : filteredBookings.length === 0 ? (
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-12 text-center">
          <p className="text-sm text-zinc-400 mb-4">
            {bookings.length === 0
              ? "У вас пока нет записей на тренировки"
              : "По вашим фильтрам ничего не найдено"}
          </p>
          <button
            onClick={() => navigate("/client/schedule")}
            className="px-4 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg text-sm font-medium hover:opacity-80 transition-opacity"
          >
            Найти тренировки
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredBookings.map((booking) => (
            <BookingCard
              key={booking.id}
              booking={booking}
              onAction={handleAction}
            />
          ))}
        </div>
      )}
    </div>
  );
}

