import { useState, useEffect } from "react";
import { dashboardApi } from "../../api/dashboard";

function fmt(n) {
  return Number(n).toLocaleString("ru-RU");
}

function StatCard({ label, value, sub, accent }) {
  return (
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5">
        <div className="text-xs text-zinc-400 mb-1">{label}</div>
        <div className={`text-2xl font-semibold ${accent ?? "text-zinc-900 dark:text-zinc-100"}`}>
          {value}
        </div>
        {sub && <div className="text-xs text-zinc-400 mt-1">{sub}</div>}
      </div>
  );
}

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    dashboardApi
        .index()
        .then((res) => setStats(res.data.data))
        .catch((err) => setError(err.response?.data?.message || "Ошибка загрузки"))
        .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
        <div className="p-6">
          <div className="text-sm text-zinc-400">Загрузка дашборда...</div>
        </div>
    );
  }

  if (error) {
    return (
        <div className="p-6">
          <div className="text-sm text-red-500">{error}</div>
        </div>
    );
  }

  const today = new Date().toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Дашборд</h1>
          <p className="text-sm text-zinc-400 mt-0.5">Сегодня, {today}</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
              label="Выручка сегодня"
              value={`${fmt(stats.revenue_today)} ₽`}
              sub={`За месяц: ${fmt(stats.revenue_month)} ₽`}
          />
          <StatCard
              label="Посещений сегодня"
              value={stats.visits_today}
          />
          <StatCard
              label="Активных абонементов"
              value={stats.active_memberships}
          />
          <StatCard
              label="Всего клиентов"
              value={stats.total_clients}
              sub={`Новых за месяц: ${stats.new_clients_month}`}
          />
          <StatCard
              label="Занятий сегодня"
              value={stats.upcoming_sessions_today}
              sub="Запланировано"
          />
          <StatCard
              label="Записей на сегодня"
              value={stats.bookings_today}
          />
        </div>
      </div>
  );
}
