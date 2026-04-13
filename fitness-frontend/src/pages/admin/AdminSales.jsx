import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { dashboardApi } from "../../api/dashboard";
import { clientsApi } from "../../api/clients";

// ── Helpers ────────────────────────────────────────────────────────────

function fmt(n) {
  return Number(n ?? 0).toLocaleString("ru-RU");
}

function fmtDateTime(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("ru-RU", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function monthStart() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

function prevMonthRange() {
  const d = new Date();
  const from = new Date(d.getFullYear(), d.getMonth() - 1, 1).toISOString().slice(0, 10);
  const to   = new Date(d.getFullYear(), d.getMonth(), 0).toISOString().slice(0, 10);
  return { from, to };
}

const METHOD_LABELS = {
  online_sbp:     "СБП",
  card_terminal:  "Карта",
  cash:           "Наличные",
  bank_transfer:  "Перевод",
};

// ── Sub-components ─────────────────────────────────────────────────────

function StatCard({ label, value, sub, accent }) {
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5">
      <div className="text-xs text-zinc-400 mb-1">{label}</div>
      <div className={`text-2xl font-semibold ${accent ?? "text-zinc-900 dark:text-zinc-100"}`}>{value}</div>
      {sub && <div className="text-xs text-zinc-400 mt-1">{sub}</div>}
    </div>
  );
}

function QuickFilterBtn({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
        active
          ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900"
          : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
      }`}
    >
      {children}
    </button>
  );
}

// ── ClientSearch autocomplete ──────────────────────────────────────────

function ClientSearch({ value, onChange }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState("");
  const timerRef = useRef(null);

  useEffect(() => {
    if (!value) { setSelectedLabel(""); setQuery(""); }
  }, [value]);

  function handleInput(e) {
    const q = e.target.value;
    setQuery(q);
    setSelectedLabel("");
    onChange(null);
    if (!q.trim()) { setResults([]); setOpen(false); return; }
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      try {
        const res = await clientsApi.search(q);
        setResults(res.data.data ?? []);
        setOpen(true);
      } catch { setResults([]); }
    }, 250);
  }

  function select(c) {
    setSelectedLabel(c.full_name);
    setQuery(c.full_name);
    onChange(c.id);
    setOpen(false);
    setResults([]);
  }

  function clear() {
    setQuery("");
    setSelectedLabel("");
    onChange(null);
    setResults([]);
    setOpen(false);
  }

  return (
    <div className="relative">
      <input
        value={selectedLabel || query}
        onChange={handleInput}
        onFocus={() => results.length > 0 && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Поиск клиента…"
        className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 outline-none focus:border-zinc-900 dark:focus:border-zinc-100 pr-8"
      />
      {(query || selectedLabel) && (
        <button
          onClick={clear}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 text-lg leading-none"
        >
          ×
        </button>
      )}
      {open && results.length > 0 && (
        <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-lg overflow-hidden max-h-48 overflow-y-auto">
          {results.map(c => (
            <button
              key={c.id}
              onMouseDown={() => select(c)}
              className="w-full text-left px-3 py-2 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100"
            >
              {c.full_name}
              {c.email && <span className="text-xs text-zinc-400 ml-2">{c.email}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────

export default function AdminSales() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Init from URL params (for deep linking from dashboard)
  const initFrom  = searchParams.get("date_from") ?? "";
  const initTo    = searchParams.get("date_to")   ?? "";
  const initQuick = searchParams.get("quick")     ?? "all";

  const [dateFrom, setDateFrom]   = useState(initFrom);
  const [dateTo, setDateTo]       = useState(initTo);
  const [quickFilter, setQuick]   = useState(initQuick); // today | month | prev_month | all
  const [clientId, setClientId]   = useState(null);
  const [view, setView]           = useState("transactions"); // transactions | clients
  const [page, setPage]           = useState(1);

  const [data, setData]       = useState([]);
  const [meta, setMeta]       = useState(null);
  const [summary, setSummary] = useState(null);
  const [topClients, setTopClients] = useState([]);
  const [loading, setLoading] = useState(false);

  // Derive from+to from quickFilter
  const effectiveFrom = quickFilter === "today"      ? today()
                      : quickFilter === "month"      ? monthStart()
                      : quickFilter === "prev_month" ? prevMonthRange().from
                      : dateFrom;

  const effectiveTo   = quickFilter === "today"      ? today()
                      : quickFilter === "prev_month" ? prevMonthRange().to
                      : dateTo;

  const load = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const params = { view, page: p, per_page: 25 };
      if (effectiveFrom) params.date_from = effectiveFrom;
      if (effectiveTo)   params.date_to   = effectiveTo;
      if (clientId)      params.client_id = clientId;

      const res = await dashboardApi.sales(params);
      setData(res.data.data ?? []);
      setMeta(res.data.meta ?? null);
      setSummary(res.data.summary ?? null);
      setTopClients(res.data.top_clients ?? []);
      setPage(p);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [view, effectiveFrom, effectiveTo, clientId]);

  useEffect(() => { load(1); }, [load]);

  function applyQuick(q) {
    setQuick(q);
    setDateFrom("");
    setDateTo("");
  }

  function handleDateFrom(v) {
    setDateFrom(v);
    setQuick("custom");
  }

  function handleDateTo(v) {
    setDateTo(v);
    setQuick("custom");
  }

  const totalPages = meta?.last_page ?? 1;

  return (
    <div className="p-6 space-y-5 max-w-7xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate("/admin")}
          className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 text-sm"
        >
          ← Дашборд
        </button>
        <div>
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">История продаж</h1>
          <p className="text-xs text-zinc-400 mt-0.5">Все успешные платежи по абонементам</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 space-y-3">
        {/* Quick range */}
        <div className="flex flex-wrap gap-2">
          <QuickFilterBtn active={quickFilter === "today"}      onClick={() => applyQuick("today")}>Сегодня</QuickFilterBtn>
          <QuickFilterBtn active={quickFilter === "month"}      onClick={() => applyQuick("month")}>Текущий месяц</QuickFilterBtn>
          <QuickFilterBtn active={quickFilter === "prev_month"} onClick={() => applyQuick("prev_month")}>Прошлый месяц</QuickFilterBtn>
          <QuickFilterBtn active={quickFilter === "all"}        onClick={() => applyQuick("all")}>Всё время</QuickFilterBtn>
        </div>

        {/* Manual date range + client search */}
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs text-zinc-400 mb-1">С</label>
            <input
              type="date"
              value={quickFilter === "custom" ? dateFrom : (effectiveFrom ?? "")}
              onChange={e => handleDateFrom(e.target.value)}
              className="px-3 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 outline-none focus:border-zinc-900 dark:focus:border-zinc-100"
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">По</label>
            <input
              type="date"
              value={quickFilter === "custom" ? dateTo : (effectiveTo ?? "")}
              onChange={e => handleDateTo(e.target.value)}
              className="px-3 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 outline-none focus:border-zinc-900 dark:focus:border-zinc-100"
            />
          </div>
          <div className="min-w-[220px]">
            <label className="block text-xs text-zinc-400 mb-1">Клиент</label>
            <ClientSearch value={clientId} onChange={setClientId} />
          </div>
        </div>
      </div>

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard
            label="Итого выручка"
            value={`${fmt(summary.total_amount)} ₽`}
            accent="text-emerald-600 dark:text-emerald-400"
          />
          <StatCard
            label="Количество продаж"
            value={fmt(summary.total_count)}
            sub="успешных платежей"
          />
          <StatCard
            label="Средний чек"
            value={`${fmt(summary.avg_amount)} ₽`}
          />
        </div>
      )}

      {/* View toggle + top clients */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Top clients sidebar */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 lg:col-span-1 h-fit">
          <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-3">Топ клиентов</div>
          {topClients.length === 0 ? (
            <div className="text-xs text-zinc-400">Нет данных</div>
          ) : (
            <div className="space-y-2">
              {topClients.map((c, i) => (
                <button
                  key={c.client_id}
                  onClick={() => setClientId(c.client_id)}
                  className="w-full text-left flex items-center gap-2 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-lg px-2 py-1.5 transition-colors group"
                >
                  <span className="text-xs text-zinc-400 w-4 shrink-0">#{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-zinc-800 dark:text-zinc-200 truncate group-hover:text-zinc-900 dark:group-hover:text-zinc-100">
                      {c.client_name}
                    </div>
                    <div className="text-xs text-zinc-400">{c.sales_count} покупок</div>
                  </div>
                  <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 shrink-0">
                    {fmt(c.total_amount)} ₽
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Main table */}
        <div className="lg:col-span-3 space-y-3">
          {/* View toggle */}
          <div className="flex items-center justify-between">
            <div className="flex bg-zinc-100 dark:bg-zinc-800 rounded-lg p-0.5 gap-0.5">
              {[
                { v: "transactions", label: "Транзакции" },
                { v: "clients",      label: "По клиентам" },
              ].map(({ v, label }) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    view === v
                      ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-sm"
                      : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            {meta && (
              <div className="text-xs text-zinc-400">
                {fmt(meta.total)} записей
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
            {loading ? (
              <div className="p-8 text-center text-sm text-zinc-400">Загрузка...</div>
            ) : data.length === 0 ? (
              <div className="p-8 text-center text-sm text-zinc-400">Нет данных за выбранный период</div>
            ) : view === "transactions" ? (
              <TransactionsTable data={data} />
            ) : (
              <ClientsTable data={data} />
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex gap-1 justify-center">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button
                  key={p}
                  onClick={() => load(p)}
                  className={`w-8 h-8 rounded text-sm font-medium transition-colors ${
                    p === page
                      ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900"
                      : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Transactions table ─────────────────────────────────────────────────

function TransactionsTable({ data }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-zinc-400 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
            <th className="text-left px-4 py-2.5 font-normal">Дата и время</th>
            <th className="text-left px-4 py-2.5 font-normal">Клиент</th>
            <th className="text-left px-4 py-2.5 font-normal">Абонемент</th>
            <th className="text-left px-4 py-2.5 font-normal">Способ оплаты</th>
            <th className="text-left px-4 py-2.5 font-normal">Промокод</th>
            <th className="text-right px-4 py-2.5 font-normal">Сумма</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => (
            <tr
              key={row.id}
              className={`border-b border-zinc-50 dark:border-zinc-800 last:border-0 ${idx % 2 ? "bg-zinc-50/40 dark:bg-zinc-800/10" : ""}`}
            >
              <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400 whitespace-nowrap text-xs">
                {fmtDateTime(row.paid_at)}
              </td>
              <td className="px-4 py-3 text-zinc-900 dark:text-zinc-100 font-medium">
                {row.client_name}
              </td>
              <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">
                <div>{row.membership_type}</div>
                {row.membership_number && (
                  <div className="text-xs text-zinc-400">{row.membership_number}</div>
                )}
              </td>
              <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400">
                {METHOD_LABELS[row.payment_method] ?? row.payment_method ?? "—"}
              </td>
              <td className="px-4 py-3">
                {row.promo_code ? (
                  <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 rounded text-xs font-mono">
                    {row.promo_code}
                  </span>
                ) : (
                  <span className="text-zinc-300 dark:text-zinc-600">—</span>
                )}
              </td>
              <td className="px-4 py-3 text-right font-semibold text-zinc-900 dark:text-zinc-100 whitespace-nowrap">
                {fmt(row.amount)} ₽
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Clients aggregated table ───────────────────────────────────────────

function ClientsTable({ data }) {
  const max = data[0]?.total_amount ?? 1;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-zinc-400 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
            <th className="text-left px-4 py-2.5 font-normal w-8">#</th>
            <th className="text-left px-4 py-2.5 font-normal">Клиент</th>
            <th className="text-left px-4 py-2.5 font-normal">Покупок</th>
            <th className="text-left px-4 py-2.5 font-normal">Средний чек</th>
            <th className="text-left px-4 py-2.5 font-normal">Последняя покупка</th>
            <th className="text-right px-4 py-2.5 font-normal">Итого</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => {
            const pct = Math.round((row.total_amount / max) * 100);
            return (
              <tr
                key={row.client_id}
                className={`border-b border-zinc-50 dark:border-zinc-800 last:border-0 ${idx % 2 ? "bg-zinc-50/40 dark:bg-zinc-800/10" : ""}`}
              >
                <td className="px-4 py-3 text-zinc-400 text-xs">{idx + 1}</td>
                <td className="px-4 py-3">
                  <div className="font-medium text-zinc-900 dark:text-zinc-100">{row.client_name}</div>
                  <div className="mt-1 h-1 bg-zinc-100 dark:bg-zinc-800 rounded-full w-32 overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </td>
                <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">{row.sales_count}</td>
                <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400">{fmt(row.avg_amount)} ₽</td>
                <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400 text-xs whitespace-nowrap">
                  {fmtDateTime(row.last_purchase)}
                </td>
                <td className="px-4 py-3 text-right font-semibold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                  {fmt(row.total_amount)} ₽
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
