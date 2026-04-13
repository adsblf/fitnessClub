import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { dashboardApi } from "../../api/dashboard";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";

// ── Палитра ──────────────────────────────────────────────────────────────
const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

const PIE_STATUS_COLORS = {
  active:    "#10b981",
  frozen:    "#3b82f6",
  expired:   "#f59e0b",
  cancelled: "#ef4444",
};

const PIE_STATUS_LABELS = {
  active:    "Активные",
  frozen:    "Заморожены",
  expired:   "Истёкшие",
  cancelled: "Отменены",
};

// ── Вспомогательные компоненты ─────────────────────────────────────────

function fmt(n) {
  return Number(n).toLocaleString("ru-RU");
}

function delta(current, previous) {
  if (!previous || previous === 0) return null;
  const pct = Math.round(((current - previous) / previous) * 100);
  return pct;
}

function DeltaBadge({ pct }) {
  if (pct === null || pct === undefined) return null;
  const positive = pct >= 0;
  return (
    <span
      className={`text-xs font-medium px-1.5 py-0.5 rounded ${
        positive
          ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300"
          : "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300"
      }`}
    >
      {positive ? "↑" : "↓"} {Math.abs(pct)}%
    </span>
  );
}

function StatCard({ label, value, sub, accent, badge, onClick }) {
  return (
    <div
      onClick={onClick}
      className={`bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5 ${
        onClick ? "cursor-pointer hover:border-zinc-300 dark:hover:border-zinc-700 transition" : ""
      }`}
    >
      <div className="text-xs text-zinc-400 mb-1">{label}</div>
      <div className={`text-2xl font-semibold flex items-baseline gap-2 ${accent ?? "text-zinc-900 dark:text-zinc-100"}`}>
        {value}
        {badge !== undefined && <DeltaBadge pct={badge} />}
      </div>
      {sub && <div className="text-xs text-zinc-400 mt-1">{sub}</div>}
    </div>
  );
}

function SectionTitle({ children }) {
  return (
    <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mt-2">
      {children}
    </h2>
  );
}

function ChartCard({ title, children, className = "" }) {
  return (
    <div className={`bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5 ${className}`}>
      {title && <div className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-4">{title}</div>}
      {children}
    </div>
  );
}

// ── Кастомный тултип ──────────────────────────────────────────────────
function CustomTooltip({ active, payload, label, formatter }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-lg px-3 py-2 text-xs">
      <div className="text-zinc-500 mb-1">{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color }} className="font-medium">
          {formatter ? formatter(p.value) : p.value}
        </div>
      ))}
    </div>
  );
}

function fmtDateShort(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}

// ── Главный компонент ──────────────────────────────────────────────────
export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [visitsPeriod, setVisitsPeriod] = useState(30); // 7 | 30
  const [revenuePeriod, setRevenuePeriod] = useState(30);

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

  // Срезы данных для графиков
  const visitsSlice = (stats.visits_per_day ?? []).slice(-(visitsPeriod));
  const revenueSlice = (stats.revenue_per_day ?? []).slice(-(revenuePeriod));

  const visitsDelta = delta(stats.visits_today, Math.round(
    (stats.visits_per_day ?? []).slice(-7).reduce((s, d) => s + d.count, 0) / 7
  ));

  const revenueDelta = delta(stats.revenue_month, stats.revenue_last_month);
  const clientsDelta = delta(stats.total_clients, stats.total_clients - stats.new_clients_month);

  const totalMembershipStatuses = (stats.membership_status_breakdown ?? []).reduce((s, i) => s + i.count, 0);

  return (
    <div className="p-6 space-y-6">
      {/* Заголовок */}
      <div>
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Дашборд</h1>
        <p className="text-sm text-zinc-400 mt-0.5">Сегодня, {today}</p>
      </div>

      {/* ── Ключевые метрики ───────────────────────────────────── */}
      <SectionTitle>Ключевые показатели</SectionTitle>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Выручка за месяц"
          value={`${fmt(stats.revenue_month)} ₽`}
          sub={`Прошлый месяц: ${fmt(stats.revenue_last_month)} ₽`}
          badge={revenueDelta}
          onClick={() => navigate("/admin/sales?quick=month")}
        />
        <StatCard
          label="Выручка сегодня"
          value={`${fmt(stats.revenue_today)} ₽`}
          onClick={() => navigate("/admin/sales?quick=today")}
        />
        <StatCard
          label="Посещений сегодня"
          value={stats.visits_today}
          sub={`За прошлый месяц: ${fmt(stats.visits_last_month)}`}
        />
        <StatCard
          label="Всего клиентов"
          value={fmt(stats.total_clients)}
          sub={`+${stats.new_clients_month} за месяц`}
          badge={clientsDelta}
        />
        <StatCard
          label="Активных абонементов"
          value={stats.active_memberships}
        />
        <StatCard
          label="Занятий сегодня"
          value={stats.upcoming_sessions_today}
          sub="Запланировано / идёт"
        />
        <StatCard
          label="Записей на сегодня"
          value={stats.bookings_today}
          sub="Подтверждённые"
        />
        <StatCard
          label="Ожидает подтверждения"
          value={stats.pending_bookings_count}
          accent={stats.pending_bookings_count > 0 ? "text-amber-600 dark:text-amber-500 font-bold" : ""}
          sub={stats.pending_bookings_count > 0 ? "Нужно обработать" : "Все обработаны"}
          onClick={() => navigate("/admin/pending-bookings")}
        />
      </div>

      {/* ── Графики посещений и выручки ──────────────────────── */}
      <SectionTitle>Динамика</SectionTitle>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Посещения */}
        <ChartCard
          title={
            <div className="flex items-center justify-between">
              <span>Посещения</span>
              <PeriodSwitch value={visitsPeriod} onChange={setVisitsPeriod} />
            </div>
          }
        >
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={visitsSlice} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="visitsGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: "#94a3b8" }}
                tickFormatter={fmtDateShort}
                interval={visitsPeriod > 14 ? Math.floor(visitsSlice.length / 6) : "preserveStartEnd"}
              />
              <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="count"
                stroke="#10b981"
                strokeWidth={2}
                fill="url(#visitsGrad)"
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Выручка */}
        <ChartCard
          title={
            <div className="flex items-center justify-between">
              <span>Выручка, ₽</span>
              <PeriodSwitch value={revenuePeriod} onChange={setRevenuePeriod} />
            </div>
          }
        >
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={revenueSlice} margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: "#94a3b8" }}
                tickFormatter={fmtDateShort}
                interval={revenuePeriod > 14 ? Math.floor(revenueSlice.length / 6) : "preserveStartEnd"}
              />
              <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} tickFormatter={(v) => fmt(v)} />
              <Tooltip content={<CustomTooltip formatter={(v) => `${fmt(v)} ₽`} />} />
              <Area
                type="monotone"
                dataKey="amount"
                stroke="#3b82f6"
                strokeWidth={2}
                fill="url(#revGrad)"
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* ── Новые клиенты ───────────────────────────────────── */}
      <ChartCard title="Новые клиенты (30 дней)">
        <ResponsiveContainer width="100%" height={160}>
          <BarChart
            data={(stats.new_clients_per_day ?? []).slice(-30)}
            margin={{ top: 0, right: 0, left: -20, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: "#94a3b8" }}
              tickFormatter={fmtDateShort}
              interval={Math.floor(((stats.new_clients_per_day ?? []).length) / 6)}
            />
            <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} allowDecimals={false} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="count" fill="#8b5cf6" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* ── Абонементы и типы ─────────────────────────────── */}
      <SectionTitle>Абонементы</SectionTitle>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Статусы абонементов — пирог */}
        <ChartCard title="Статусы абонементов" className="flex flex-col">
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={(stats.membership_status_breakdown ?? []).filter((d) => d.count > 0)}
                dataKey="count"
                nameKey="status"
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={80}
                paddingAngle={2}
              >
                {(stats.membership_status_breakdown ?? []).map((entry, i) => (
                  <Cell
                    key={entry.status}
                    fill={PIE_STATUS_COLORS[entry.status] ?? COLORS[i]}
                  />
                ))}
              </Pie>
              <Tooltip
                formatter={(value, name) => [value, PIE_STATUS_LABELS[name] ?? name]}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-3 justify-center mt-1">
            {(stats.membership_status_breakdown ?? []).map((d) => (
              <div key={d.status} className="flex items-center gap-1.5 text-xs text-zinc-500">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ background: PIE_STATUS_COLORS[d.status] }}
                />
                {PIE_STATUS_LABELS[d.status] ?? d.status}: <strong className="text-zinc-700 dark:text-zinc-300">{d.count}</strong>
              </div>
            ))}
          </div>
        </ChartCard>

        {/* Тип абонементов — bar */}
        <ChartCard title="Активные по типам" className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart
              layout="vertical"
              data={stats.membership_type_breakdown ?? []}
              margin={{ top: 0, right: 20, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: "#94a3b8" }} allowDecimals={false} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 12, fill: "#94a3b8" }} width={110} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" fill="#10b981" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* ── Посещения по типам ────────────────────────────── */}
      <SectionTitle>Посещения</SectionTitle>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ChartCard title="Посещения по типам (всего)">
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={(stats.visits_by_type ?? []).filter((d) => d.count > 0)}
                dataKey="count"
                nameKey="type"
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={80}
                paddingAngle={2}
              >
                {(stats.visits_by_type ?? []).map((entry, i) => (
                  <Cell key={entry.type} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-3 justify-center mt-1">
            {(stats.visits_by_type ?? []).map((d, i) => (
              <div key={d.type} className="flex items-center gap-1.5 text-xs text-zinc-500">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                {d.type}: <strong className="text-zinc-700 dark:text-zinc-300">{d.count}</strong>
              </div>
            ))}
          </div>
        </ChartCard>

        {/* Топ занятий */}
        <ChartCard title="Топ занятий за месяц" className="lg:col-span-2">
          {(stats.top_sessions_attendance ?? []).length === 0 ? (
            <p className="text-sm text-zinc-400">Нет данных за текущий месяц</p>
          ) : (
            <div className="space-y-2">
              {(stats.top_sessions_attendance ?? []).map((s, i) => (
                <div key={i} className="space-y-0.5">
                  <div className="flex justify-between text-xs text-zinc-500">
                    <span className="font-medium text-zinc-700 dark:text-zinc-300 truncate max-w-[60%]">
                      {s.name}
                    </span>
                    <span>
                      {s.visits} чел.{s.capacity > 0 ? ` / ${s.capacity}` : ""}{" "}
                      {s.percent > 0 && (
                        <span className="text-zinc-400">({s.percent}%)</span>
                      )}
                    </span>
                  </div>
                  <div className="h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: s.capacity > 0 ? `${Math.min(s.percent, 100)}%` : "100%",
                        background: COLORS[i % COLORS.length],
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </ChartCard>
      </div>

      {/* ── Топ тренеров ──────────────────────────────────── */}
      <SectionTitle>Тренеры</SectionTitle>
      <ChartCard title="Топ тренеров по завершённым занятиям (месяц)">
        {(stats.top_trainers ?? []).length === 0 ? (
          <p className="text-sm text-zinc-400">Нет данных</p>
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart
              layout="vertical"
              data={stats.top_trainers}
              margin={{ top: 0, right: 20, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: "#94a3b8" }} allowDecimals={false} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 12, fill: "#94a3b8" }} width={140} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="sessions_count" name="Занятий" fill="#f59e0b" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>
    </div>
  );
}

// ── Переключатель периода ─────────────────────────────────────────────
function PeriodSwitch({ value, onChange }) {
  return (
    <div className="flex gap-1">
      {[7, 30].map((p) => (
        <button
          key={p}
          onClick={() => onChange(p)}
          className={`text-xs px-2 py-0.5 rounded transition-colors ${
            value === p
              ? "bg-zinc-100 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200 font-medium"
              : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
          }`}
        >
          {p}д
        </button>
      ))}
    </div>
  );
}

