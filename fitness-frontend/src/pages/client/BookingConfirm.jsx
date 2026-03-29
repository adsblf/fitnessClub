import { useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { scheduleClasses } from "../../data/mock";

const LEVEL_COLOR = {
  "Начинающий":  "bg-emerald-100 text-emerald-700",
  "Средний":     "bg-amber-100 text-amber-700",
  "Продвинутый": "bg-red-100 text-red-600",
};

export default function BookingConfirm() {
  const { id } = useParams();
  const { state } = useLocation();
  const navigate = useNavigate();
  const [status, setStatus] = useState("idle"); // idle | loading | success | error

  // Берём класс из state (если пришли с расписания) или ищем в моках
  const cls = state?.cls ?? scheduleClasses.find((c) => c.id === Number(id));

  if (!cls) {
    return (
      <div className="p-6 text-sm text-zinc-400">Занятие не найдено.{" "}
        <button className="underline" onClick={() => navigate("/client/schedule")}>Назад</button>
      </div>
    );
  }

  const free = cls.capacity - cls.booked;
  const date = new Date(cls.date).toLocaleDateString("ru-RU", {
    weekday: "long", day: "numeric", month: "long",
  });

  function handleConfirm() {
    setStatus("loading");
    // Имитируем запрос к API
    setTimeout(() => setStatus("success"), 1200);
  }

  // ---- Экран успеха ----
  if (status === "success") {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center text-3xl mb-4">✓</div>
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-1">Запись подтверждена!</h2>
        <p className="text-sm text-zinc-400 mb-2">
          Вы записаны на <strong className="text-zinc-700 dark:text-zinc-300">{cls.name}</strong>
        </p>
        <p className="text-sm text-zinc-400 mb-8">
          {date}, {cls.time} · {cls.hall}
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => navigate("/client")}
            className="px-4 py-2 text-sm bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg font-medium hover:opacity-80 transition-opacity"
          >
            На главную
          </button>
          <button
            onClick={() => navigate("/client/schedule")}
            className="px-4 py-2 text-sm border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
          >
            К расписанию
          </button>
        </div>
      </div>
    );
  }

  // ---- Экран подтверждения ----
  return (
    <div className="p-6 max-w-xl">
      {/* Breadcrumb */}
      <button
        onClick={() => navigate(-1)}
        className="text-xs text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 mb-6 flex items-center gap-1"
      >
        ← Назад к расписанию
      </button>

      <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-6">Запись на занятие</h1>

      {/* Карточка занятия */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5 mb-4">
        <div className="flex justify-between items-start mb-4">
          <div>
            <div className="font-semibold text-zinc-900 dark:text-zinc-100">{cls.name}</div>
            <div className="text-sm text-zinc-400 mt-0.5">{cls.trainer}</div>
          </div>
          <span className={`text-xs px-2 py-0.5 rounded font-medium ${LEVEL_COLOR[cls.level]}`}>
            {cls.level}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="bg-zinc-50 dark:bg-zinc-800 rounded-lg p-3">
            <div className="text-xs text-zinc-400 mb-0.5">Дата и время</div>
            <div className="text-zinc-800 dark:text-zinc-200 font-medium capitalize">{date}</div>
            <div className="text-zinc-500">{cls.time} · {cls.duration} мин</div>
          </div>
          <div className="bg-zinc-50 dark:bg-zinc-800 rounded-lg p-3">
            <div className="text-xs text-zinc-400 mb-0.5">Место</div>
            <div className="text-zinc-800 dark:text-zinc-200 font-medium">{cls.hall}</div>
            <div className="text-zinc-500">
              Свободных мест: <span className={free <= 3 ? "text-amber-500 font-medium" : "text-emerald-600 font-medium"}>{free}</span>
            </div>
          </div>
        </div>

        {cls.description && (
          <p className="text-xs text-zinc-400 mt-4 leading-relaxed">{cls.description}</p>
        )}
      </div>

      {/* Блок клиента */}
      <div className="bg-zinc-50 dark:bg-zinc-800 rounded-xl p-4 mb-6 flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-sm font-medium text-zinc-600 dark:text-zinc-300">
          ЕМ
        </div>
        <div>
          <div className="text-sm font-medium text-zinc-800 dark:text-zinc-200">Елена Мишина</div>
          <div className="text-xs text-zinc-400">Абонемент: Безлимитный · действует до 15.08.2025</div>
        </div>
      </div>

      {/* Предупреждение о малом количестве мест */}
      {free <= 3 && free > 0 && (
        <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-3 mb-4 text-xs text-amber-700 dark:text-amber-400">
          ⚠️ Осталось мало мест — запишитесь сейчас, чтобы не потерять возможность.
        </div>
      )}

      {/* Кнопки */}
      <div className="flex gap-3">
        <button
          onClick={handleConfirm}
          disabled={status === "loading"}
          className="flex-1 py-2.5 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg text-sm font-medium hover:opacity-80 disabled:opacity-50 transition-opacity"
        >
          {status === "loading" ? "Записываемся..." : "Подтвердить запись"}
        </button>
        <button
          onClick={() => navigate(-1)}
          disabled={status === "loading"}
          className="px-4 py-2.5 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
        >
          Отмена
        </button>
      </div>
    </div>
  );
}
