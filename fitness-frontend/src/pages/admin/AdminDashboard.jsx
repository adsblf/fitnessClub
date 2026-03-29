import { adminStats, revenueChart, trainerStats, recentVisits } from "../../data/mock";

// ---- маленькие утилиты ----
function fmt(n) {
  return n.toLocaleString("ru-RU");
}

function StatusBadge({ status }) {
  const map = {
    ПОСЕЩЕНО: "bg-emerald-100 text-emerald-700",
    НЕЯВКА:   "bg-red-100 text-red-600",
  };
  return (
    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${map[status] ?? "bg-zinc-100 text-zinc-600"}`}>
      {status}
    </span>
  );
}

// ---- компонент карточки KPI ----
function StatCard({ label, value, sub, accent }) {
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5">
      <div className="text-xs text-zinc-400 mb-1">{label}</div>
      <div className={`text-2xl font-semibold ${accent ?? "text-zinc-900 dark:text-zinc-100"}`}>{value}</div>
      {sub && <div className="text-xs text-zinc-400 mt-1">{sub}</div>}
    </div>
  );
}

// ---- простой бар-чарт через div ----
function BarChart({ data }) {
  const max = Math.max(...data.map((d) => d.amount));
  return (
    <div className="flex items-end gap-2 h-32">
      {data.map((d) => (
        <div key={d.day} className="flex-1 flex flex-col items-center gap-1">
          <div
            className="w-full bg-zinc-900 dark:bg-zinc-100 rounded-t"
            style={{ height: `${(d.amount / max) * 100}%`, minHeight: 4 }}
          />
          <div className="text-xs text-zinc-400">{d.day}</div>
        </div>
      ))}
    </div>
  );
}

// ---- заливка загрузки тренера ----
function FillBar({ value }) {
  const color = value >= 85 ? "bg-emerald-500" : value >= 70 ? "bg-amber-400" : "bg-red-400";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${value}%` }} />
      </div>
      <span className="text-xs text-zinc-500 w-8 text-right">{value}%</span>
    </div>
  );
}

// ================================================================
export default function AdminDashboard() {
  return (
    <div className="p-6 space-y-6">
      {/* Заголовок */}
      <div>
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Дашборд</h1>
        <p className="text-sm text-zinc-400 mt-0.5">Сегодня, 29 марта 2025</p>
      </div>

      {/* KPI карточки */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard
          label="Выручка сегодня"
          value={`${fmt(adminStats.revenueToday)} ₽`}
          sub={`За месяц: ${fmt(adminStats.revenueMonth)} ₽`}
        />
        <StatCard
          label="Посещений сегодня"
          value={adminStats.visitsToday}
          sub="Ожидается ещё 14"
        />
        <StatCard
          label="Активных абонементов"
          value={adminStats.activeMemberships}
          sub={`Новых клиентов за месяц: ${adminStats.newClientsMonth}`}
        />
        <StatCard
          label="Занятий сегодня"
          value={adminStats.upcomingClasses}
          sub="Запланировано"
        />
        <StatCard
          label="Занятость залов"
          value="74%"
          sub="Средняя за неделю"
          accent="text-amber-600"
        />
        <StatCard
          label="Неявки сегодня"
          value="3"
          sub="Из 50 записей"
          accent="text-red-500"
        />
      </div>

      {/* Графики и таблица тренеров */}
      <div className="grid grid-cols-2 gap-4">
        {/* Выручка за неделю */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5">
          <div className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-4">Выручка за 7 дней</div>
          <BarChart data={revenueChart} />
          <div className="flex justify-between mt-2">
            <span className="text-xs text-zinc-400">Мин: {fmt(Math.min(...revenueChart.map(d => d.amount)))} ₽</span>
            <span className="text-xs text-zinc-400">Макс: {fmt(Math.max(...revenueChart.map(d => d.amount)))} ₽</span>
          </div>
        </div>

        {/* Эффективность тренеров */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5">
          <div className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-4">Тренеры — загрузка</div>
          <div className="space-y-4">
            {trainerStats.map((t) => (
              <div key={t.id}>
                <div className="flex justify-between items-baseline mb-1">
                  <span className="text-sm text-zinc-700 dark:text-zinc-300">{t.name}</span>
                  <span className="text-xs text-zinc-400">{t.classes} занятий · {t.clients} кл.</span>
                </div>
                <FillBar value={t.fillRate} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Последние посещения */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800">
        <div className="px-5 py-4 border-b border-zinc-100 dark:border-zinc-800">
          <div className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Последние посещения сегодня</div>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-zinc-400 border-b border-zinc-100 dark:border-zinc-800">
              <th className="text-left px-5 py-2.5 font-normal">Клиент</th>
              <th className="text-left px-5 py-2.5 font-normal">Время</th>
              <th className="text-left px-5 py-2.5 font-normal">Занятие</th>
              <th className="text-left px-5 py-2.5 font-normal">Тренер</th>
              <th className="text-left px-5 py-2.5 font-normal">Статус</th>
            </tr>
          </thead>
          <tbody>
            {recentVisits.map((v, i) => (
              <tr
                key={v.id}
                className={`border-b border-zinc-50 dark:border-zinc-800 last:border-0 ${
                  i % 2 === 0 ? "" : "bg-zinc-50/50 dark:bg-zinc-800/20"
                }`}
              >
                <td className="px-5 py-3 text-zinc-800 dark:text-zinc-200 font-medium">{v.client}</td>
                <td className="px-5 py-3 text-zinc-500">{v.time}</td>
                <td className="px-5 py-3 text-zinc-700 dark:text-zinc-300">{v.class}</td>
                <td className="px-5 py-3 text-zinc-500">{v.trainer}</td>
                <td className="px-5 py-3"><StatusBadge status={v.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
