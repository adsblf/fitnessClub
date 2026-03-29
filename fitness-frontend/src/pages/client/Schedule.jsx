import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { scheduleClasses, clientBookedClassIds } from "../../data/mock";

const LEVEL_COLOR = {
  "Начинающий":  "bg-emerald-100 text-emerald-700",
  "Средний":     "bg-amber-100 text-amber-700",
  "Продвинутый": "bg-red-100 text-red-600",
};

// Уникальные даты из моков
const allDates = [...new Set(scheduleClasses.map((c) => c.date))].sort();

function ClassCard({ cls, isBooked, onBook }) {
  const free = cls.capacity - cls.booked;
  const isFull = free === 0;
  const fillPct = Math.round((cls.booked / cls.capacity) * 100);

  return (
    <div className={`bg-white dark:bg-zinc-900 rounded-xl border p-5 flex flex-col gap-3 transition-shadow hover:shadow-sm ${
      isBooked ? "border-emerald-300 dark:border-emerald-700" : "border-zinc-200 dark:border-zinc-800"
    }`}>
      {/* Шапка */}
      <div className="flex justify-between items-start gap-2">
        <div>
          <div className="font-medium text-zinc-900 dark:text-zinc-100 text-sm">{cls.name}</div>
          <div className="text-xs text-zinc-400 mt-0.5">{cls.trainer}</div>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded font-medium shrink-0 ${LEVEL_COLOR[cls.level]}`}>
          {cls.level}
        </span>
      </div>

      {/* Детали */}
      <div className="flex gap-4 text-xs text-zinc-500">
        <span>🕐 {cls.time} · {cls.duration} мин</span>
        <span>📍 {cls.hall}</span>
      </div>

      {/* Описание */}
      <p className="text-xs text-zinc-400 leading-relaxed line-clamp-2">{cls.description}</p>

      {/* Заполненность */}
      <div>
        <div className="flex justify-between text-xs text-zinc-400 mb-1">
          <span>Записано: {cls.booked} / {cls.capacity}</span>
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

      {/* Кнопка */}
      {isBooked ? (
        <div className="mt-auto pt-1 flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
          <span>✓</span> Вы записаны
        </div>
      ) : (
        <button
          disabled={isFull}
          onClick={() => onBook(cls)}
          className={`mt-auto pt-1 text-sm font-medium transition-opacity ${
            isFull
              ? "text-zinc-300 dark:text-zinc-600 cursor-not-allowed"
              : "text-zinc-900 dark:text-zinc-100 hover:opacity-60"
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
  const [activeDate, setActiveDate] = useState(allDates[0]);
  const [bookedIds, setBookedIds] = useState(new Set(clientBookedClassIds));

  const filtered = scheduleClasses.filter((c) => c.date === activeDate);

  function handleBook(cls) {
    // Переходим на страницу подтверждения, передаём id через state
    navigate(`/client/schedule/book/${cls.id}`, { state: { cls } });
  }

  return (
    <div className="p-6 space-y-6">
      {/* Заголовок */}
      <div>
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Расписание занятий</h1>
        <p className="text-sm text-zinc-400 mt-0.5">Выберите дату и запишитесь на тренировку</p>
      </div>

      {/* Табы дат */}
      <div className="flex gap-2 flex-wrap">
        {allDates.map((date) => {
          const d = new Date(date);
          const isActive = date === activeDate;
          return (
            <button
              key={date}
              onClick={() => setActiveDate(date)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900"
                  : "bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-zinc-400"
              }`}
            >
              {d.toLocaleDateString("ru-RU", { weekday: "short", day: "numeric", month: "short" })}
            </button>
          );
        })}
      </div>

      {/* Карточки занятий */}
      {filtered.length === 0 ? (
        <div className="text-sm text-zinc-400 text-center py-12">Занятий на эту дату нет</div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {filtered.map((cls) => (
            <ClassCard
              key={cls.id}
              cls={cls}
              isBooked={bookedIds.has(cls.id)}
              onBook={handleBook}
            />
          ))}
        </div>
      )}
    </div>
  );
}
