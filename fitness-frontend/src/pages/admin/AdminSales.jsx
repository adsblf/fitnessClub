import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { dashboardApi } from "../../api/dashboard";
import { productsApi } from "../../api/products";
import { clientsApi } from "../../api/clients";

// ── Helpers ────────────────────────────────────────────────────────────

function fmt(n) { return Number(n ?? 0).toLocaleString("ru-RU"); }
function fmtMoney(n) { return fmt(n) + " ₽"; }
function fmtDateTime(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
function today() { return new Date().toISOString().slice(0, 10); }
function monthStart() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}
function prevMonthRange() {
  const d    = new Date();
  const from = new Date(d.getFullYear(), d.getMonth() - 1, 1).toISOString().slice(0, 10);
  const to   = new Date(d.getFullYear(), d.getMonth(), 0).toISOString().slice(0, 10);
  return { from, to };
}

const METHOD_LABELS = {
  online_sbp:    "СБП",
  card_terminal: "Карта",
  cash:          "Наличные",
  bank_transfer: "Перевод",
};

const CAT_COLOR_PALETTE = [
  "bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400",
  "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400",
  "bg-violet-100 text-violet-700 dark:bg-violet-900/20 dark:text-violet-400",
  "bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400",
  "bg-rose-100 text-rose-700 dark:bg-rose-900/20 dark:text-rose-400",
  "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/20 dark:text-cyan-400",
];

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
      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${active ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"}`}
    >{children}</button>
  );
}

// ── ClientSearch ───────────────────────────────────────────────────────

function ClientSearch({ onChange }) {
  const [query, setQuery]       = useState("");
  const [results, setResults]   = useState([]);
  const [open, setOpen]         = useState(false);
  const [selectedLabel, setSelectedLabel] = useState("");
  const timerRef = useRef(null);


  function handleInput(e) {
    const q = e.target.value;
    setQuery(q); setSelectedLabel(""); onChange(null);
    if (!q.trim()) { setResults([]); setOpen(false); return; }
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      try { const res = await clientsApi.search(q); setResults(res.data.data ?? []); setOpen(true); }
      catch { setResults([]); }
    }, 250);
  }

  function select(c) { setSelectedLabel(c.full_name); setQuery(c.full_name); onChange(c.id); setOpen(false); setResults([]); }
  function clear() { setQuery(""); setSelectedLabel(""); onChange(null); setResults([]); setOpen(false); }

  return (
    <div className="relative">
      <input value={selectedLabel || query} onChange={handleInput} onFocus={() => results.length > 0 && setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 150)} placeholder="Поиск клиента…" className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 outline-none focus:border-zinc-900 dark:focus:border-zinc-100 pr-8" />
      {(query || selectedLabel) && <button onClick={clear} className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 text-lg leading-none">×</button>}
      {open && results.length > 0 && (
        <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-lg overflow-hidden max-h-48 overflow-y-auto">
          {results.map(c => (
            <button key={c.id} onMouseDown={() => select(c)} className="w-full text-left px-3 py-2 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100">
              {c.full_name}{c.email && <span className="text-xs text-zinc-400 ml-2">{c.email}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Memberships tab ────────────────────────────────────────────────────

function MembershipsTab({ dateFrom, dateTo }) {
  const [clientId, setClientId]   = useState(null);
  const [view, setView]           = useState("transactions");
  const [page, setPage]           = useState(1);
  const [data, setData]           = useState([]);
  const [meta, setMeta]           = useState(null);
  const [summary, setSummary]     = useState(null);
  const [topClients, setTopClients] = useState([]);
  const [loading, setLoading]     = useState(false);

  const load = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const params = { view, page: p, per_page: 25 };
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo)   params.date_to   = dateTo;
      if (clientId) params.client_id = clientId;
      const res = await dashboardApi.sales(params);
      setData(res.data.data ?? []);
      setMeta(res.data.meta ?? null);
      setSummary(res.data.summary ?? null);
      setTopClients(res.data.top_clients ?? []);
      setPage(p);
    } catch { /* suppress */ }
    finally { setLoading(false); }
  }, [view, dateFrom, dateTo, clientId]);

  useEffect(() => { load(1); }, [load]);

  const totalPages = meta?.last_page ?? 1;

  return (
    <div className="space-y-4">
      {/* Summary */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard label="Итого выручка" value={fmtMoney(summary.total_amount)} accent="text-emerald-600 dark:text-emerald-400" />
          <StatCard label="Кол-во продаж"  value={fmt(summary.total_count)} sub="успешных платежей" />
          <StatCard label="Средний чек"    value={fmtMoney(summary.avg_amount)} />
        </div>
      )}

      {/* Client filter */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4">
        <div className="max-w-xs">
          <label className="block text-xs text-zinc-400 mb-1">Клиент</label>
          <ClientSearch value={clientId} onChange={v => { setClientId(v); }} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Top clients */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 lg:col-span-1 h-fit">
          <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-3">Топ клиентов</div>
          {topClients.length === 0 ? (
            <div className="text-xs text-zinc-400">Нет данных</div>
          ) : (
            <div className="space-y-2">
              {topClients.map((c, i) => (
                <button key={c.client_id} onClick={() => setClientId(c.client_id)} className="w-full text-left flex items-center gap-2 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-lg px-2 py-1.5 transition-colors group">
                  <span className="text-xs text-zinc-400 w-4 shrink-0">#{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-zinc-800 dark:text-zinc-200 truncate">{c.client_name}</div>
                    <div className="text-xs text-zinc-400">{c.sales_count} покупок</div>
                  </div>
                  <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 shrink-0">{fmt(c.total_amount)} ₽</div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Table */}
        <div className="lg:col-span-3 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex bg-zinc-100 dark:bg-zinc-800 rounded-lg p-0.5 gap-0.5">
              {[{ v: "transactions", label: "Транзакции" }, { v: "clients", label: "По клиентам" }].map(({ v, label }) => (
                <button key={v} onClick={() => setView(v)} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${view === v ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-sm" : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"}`}>{label}</button>
              ))}
            </div>
            {meta && <div className="text-xs text-zinc-400">{fmt(meta.total)} записей</div>}
          </div>

          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-x-auto">
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

          {totalPages > 1 && (
            <div className="flex gap-1 justify-center">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button key={p} onClick={() => load(p)} className={`w-8 h-8 rounded text-sm font-medium transition-colors ${p === page ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900" : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"}`}>{p}</button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TransactionsTable({ data }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-xs text-zinc-400 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
          <th className="text-left px-4 py-2.5 font-normal">Дата</th>
          <th className="text-left px-4 py-2.5 font-normal">Клиент</th>
          <th className="text-left px-4 py-2.5 font-normal">Абонемент</th>
          <th className="text-left px-4 py-2.5 font-normal">Оплата</th>
          <th className="text-left px-4 py-2.5 font-normal">Промокод</th>
          <th className="text-right px-4 py-2.5 font-normal">Сумма</th>
        </tr>
      </thead>
      <tbody>
        {data.map((row, idx) => (
          <tr key={row.id} className={`border-b border-zinc-50 dark:border-zinc-800 last:border-0 ${idx % 2 ? "bg-zinc-50/40 dark:bg-zinc-800/10" : ""}`}>
            <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400 whitespace-nowrap text-xs">{fmtDateTime(row.paid_at)}</td>
            <td className="px-4 py-3 text-zinc-900 dark:text-zinc-100 font-medium">{row.client_name}</td>
            <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">
              <div>{row.membership_type}</div>
              {row.membership_number && <div className="text-xs text-zinc-400">{row.membership_number}</div>}
            </td>
            <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400">{METHOD_LABELS[row.payment_method] ?? row.payment_method ?? "—"}</td>
            <td className="px-4 py-3">
              {row.promo_code ? (
                <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 rounded text-xs font-mono">{row.promo_code}</span>
              ) : <span className="text-zinc-300 dark:text-zinc-600">—</span>}
            </td>
            <td className="px-4 py-3 text-right font-semibold text-zinc-900 dark:text-zinc-100 whitespace-nowrap">{fmt(row.amount)} ₽</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ClientsTable({ data }) {
  const max = data[0]?.total_amount ?? 1;
  return (
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
            <tr key={row.client_id} className={`border-b border-zinc-50 dark:border-zinc-800 last:border-0 ${idx % 2 ? "bg-zinc-50/40 dark:bg-zinc-800/10" : ""}`}>
              <td className="px-4 py-3 text-zinc-400 text-xs">{idx + 1}</td>
              <td className="px-4 py-3">
                <div className="font-medium text-zinc-900 dark:text-zinc-100">{row.client_name}</div>
                <div className="mt-1 h-1 bg-zinc-100 dark:bg-zinc-800 rounded-full w-32 overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pct}%` }} />
                </div>
              </td>
              <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">{row.sales_count}</td>
              <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400">{fmt(row.avg_amount)} ₽</td>
              <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400 text-xs whitespace-nowrap">{fmtDateTime(row.last_purchase)}</td>
              <td className="px-4 py-3 text-right font-semibold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">{fmt(row.total_amount)} ₽</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

// ── Products tab ───────────────────────────────────────────────────────

function ProductSaleRow({ sale, catMap, catColorFn, onRefund }) {
  const [expanded, setExpanded]   = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [refundItems, setRefundItems] = useState({}); // { item_id: quantity }
  const [loading, setLoading]     = useState(false);

  // Initialise refund items selection with all returnable items
  useEffect(() => {
    if (expanded && sale.can_refund) {
      const init = {};
      sale.items.forEach(i => {
        if (i.is_returnable && i.available_to_refund > 0) {
          init[i.id] = i.available_to_refund;
        }
      });
      setRefundItems(init);
    }
  }, [expanded, sale]);

  const selectedItems = Object.entries(refundItems).filter(([, qty]) => qty > 0);
  const refundTotal   = selectedItems.reduce((s, [id, qty]) => {
    const item = sale.items.find(i => i.id === Number(id));
    return s + (item ? item.unit_price * qty : 0);
  }, 0);

  async function handleRefund() {
    setLoading(true);
    try {
      const items = selectedItems.map(([id, quantity]) => ({ item_id: Number(id), quantity }));
      await onRefund(sale.id, items.length === sale.items.filter(i => i.is_returnable && i.available_to_refund > 0).length ? null : items);
      setConfirming(false);
    } catch (err) {
      alert(err.response?.data?.message ?? "Ошибка при оформлении возврата");
    } finally { setLoading(false); }
  }

  const daysLeft = sale.can_refund
    ? Math.max(0, 14 - Math.floor((Date.now() - new Date(sale.paid_at)) / 86400000))
    : 0;

  return (
    <>
      <tr
        onClick={() => setExpanded(e => !e)}
        className="cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors border-b border-zinc-100 dark:border-zinc-800 last:border-0"
      >
        <td className="px-4 py-3 text-xs text-zinc-500 dark:text-zinc-400 whitespace-nowrap">{fmtDateTime(sale.paid_at)}</td>
        <td className="px-4 py-3 font-mono text-xs text-zinc-600 dark:text-zinc-400">{sale.transaction_id}</td>
        <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300 whitespace-nowrap">{METHOD_LABELS[sale.payment_method] ?? sale.payment_method}</td>
        <td className="px-4 py-3 text-right font-semibold text-zinc-900 dark:text-zinc-100 whitespace-nowrap">{fmtMoney(sale.total_amount)}</td>
        <td className="px-4 py-3 text-center whitespace-nowrap">
          {sale.has_refund
            ? <span className="text-xs px-2 py-0.5 rounded font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">Возврат</span>
            : sale.can_refund
              ? <span className="text-xs text-zinc-400">{daysLeft} дн.</span>
              : <span className="text-xs text-zinc-300 dark:text-zinc-600">—</span>
          }
        </td>
        <td className="px-4 py-3 text-center text-zinc-400 text-xs select-none">{expanded ? "▲" : "▼"}</td>
      </tr>

      {expanded && (
        <tr className="bg-zinc-50/50 dark:bg-zinc-800/20">
          <td colSpan={6} className="px-4 pb-4 pt-3 border-b border-zinc-100 dark:border-zinc-800">
            <div className="space-y-3">
              {/* Items */}
              <div className="space-y-2">
                {sale.items?.map((item) => {
                  const catC     = catColorFn(item.product_category);
                  const isSelected = !!refundItems[item.id];
                  const canSelect  = item.is_returnable && item.available_to_refund > 0 && sale.can_refund;

                  return (
                    <div key={item.id} className={`flex items-center gap-3 rounded-lg p-2.5 ${canSelect ? "bg-white dark:bg-zinc-800/60" : ""}`}>
                      {canSelect && !confirming && (
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={e => setRefundItems(prev => ({ ...prev, [item.id]: e.target.checked ? item.available_to_refund : 0 }))}
                          className="accent-zinc-900 w-4 h-4 shrink-0"
                        />
                      )}
                      <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
                        <span className={`text-xs px-1.5 py-0.5 rounded ${catC}`}>
                          {catMap[item.product_category]?.icon}
                        </span>
                        <span className="text-sm text-zinc-700 dark:text-zinc-300 truncate">
                          {item.product_name} ×{item.quantity}
                        </span>
                        {!item.is_returnable && <span className="text-xs text-zinc-400 italic">без возврата</span>}
                        {item.is_returnable && item.refunded_quantity > 0 && (
                          <span className="text-xs text-amber-600">возвращено {item.refunded_quantity}/{item.quantity}</span>
                        )}
                        {item.is_returnable && item.available_to_refund === 0 && item.refunded_quantity > 0 && (
                          <span className="text-xs px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded">Возвращено</span>
                        )}
                      </div>
                      {canSelect && isSelected && !confirming && item.available_to_refund > 1 && (
                        <div className="flex items-center gap-1 shrink-0">
                          <button onClick={() => setRefundItems(prev => ({ ...prev, [item.id]: Math.max(1, (prev[item.id] ?? 1) - 1) }))} className="w-5 h-5 rounded bg-zinc-200 dark:bg-zinc-700 text-xs flex items-center justify-center">−</button>
                          <span className="text-xs w-4 text-center font-medium">{refundItems[item.id] ?? item.available_to_refund}</span>
                          <button onClick={() => setRefundItems(prev => ({ ...prev, [item.id]: Math.min(item.available_to_refund, (prev[item.id] ?? 1) + 1) }))} className="w-5 h-5 rounded bg-zinc-200 dark:bg-zinc-700 text-xs flex items-center justify-center">+</button>
                        </div>
                      )}
                      <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200 shrink-0">{fmtMoney(item.subtotal)}</span>
                    </div>
                  );
                })}
              </div>

              {/* Refund controls */}
              {sale.can_refund && !confirming && selectedItems.length > 0 && (
                <button
                  onClick={() => setConfirming(true)}
                  className="text-sm font-medium text-amber-600 border border-amber-200 dark:border-amber-800/30 px-3 py-1.5 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-900/10 transition-colors"
                >
                  Вернуть выбранное · {fmtMoney(refundTotal)}
                </button>
              )}

              {confirming && (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/30 rounded-lg p-3 space-y-2">
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    Оформить возврат на сумму <strong>{fmtMoney(refundTotal)}</strong>? Это действие нельзя отменить.
                  </p>
                  <div className="flex gap-2">
                    <button onClick={() => setConfirming(false)} className="px-3 py-1.5 text-xs font-medium rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">Отмена</button>
                    <button onClick={handleRefund} disabled={loading} className="px-3 py-1.5 text-xs font-medium rounded-lg bg-amber-600 text-white hover:opacity-80 transition-opacity disabled:opacity-50">
                      {loading ? "…" : "Подтвердить возврат"}
                    </button>
                  </div>
                </div>
              )}

              {sale.has_refund && !sale.can_refund && (
                <p className="text-xs text-zinc-400 bg-zinc-50 dark:bg-zinc-800 rounded-lg px-3 py-2">Все доступные товары возвращены.</p>
              )}
              {!sale.can_refund && !sale.has_refund && (
                <p className="text-xs text-zinc-400 bg-zinc-50 dark:bg-zinc-800 rounded-lg px-3 py-2">
                  {!sale.is_refundable ? "Возврат недоступен: все товары в чеке без возврата." : "Срок возврата (14 дней) истёк."}
                </p>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function ProductsTab({ dateFrom, dateTo }) {
  const [sales, setSales]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage]     = useState(1);
  const [meta, setMeta]     = useState(null);
  const [summary, setSummary] = useState(null);
  const [categories, setCategories] = useState([]);

  const catMap    = Object.fromEntries(categories.map(c => [c.slug, c]));
  const catColorFn = (slug) => {
    const idx = categories.findIndex(c => c.slug === slug);
    return CAT_COLOR_PALETTE[(idx < 0 ? 0 : idx) % CAT_COLOR_PALETTE.length];
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [salesRes, catRes] = await Promise.all([
        productsApi.listSales({ page, date_from: dateFrom || undefined, date_to: dateTo || undefined }),
        productsApi.list(),
      ]);
      setSales(salesRes.data.data ?? []);
      setMeta(salesRes.data.meta);
      setSummary(salesRes.data.summary);
      setCategories(catRes.data.categories ?? []);
    } catch { /* suppress */ }
    finally { setLoading(false); }
  }, [page, dateFrom, dateTo]);

  useEffect(() => { load(); }, [load]);

  async function handleRefund(saleId, items) {
    await productsApi.refundSale(saleId, items);
    load();
  }

  return (
    <div className="space-y-4">
      {summary && (
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Выручка (net)" value={fmtMoney(summary.total_amount)} accent="text-emerald-600 dark:text-emerald-400" />
          <StatCard label="Продаж"        value={fmt(summary.total_count)} />
        </div>
      )}

      {loading ? (
        <div className="text-sm text-zinc-400 text-center py-10">Загрузка…</div>
      ) : sales.length === 0 ? (
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-12 text-center">
          <p className="text-sm text-zinc-400">Продажи не найдены</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-zinc-400 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
                <th className="text-left px-4 py-2.5 font-normal">Дата</th>
                <th className="text-left px-4 py-2.5 font-normal">Чек</th>
                <th className="text-left px-4 py-2.5 font-normal">Оплата</th>
                <th className="text-right px-4 py-2.5 font-normal">Сумма</th>
                <th className="text-center px-4 py-2.5 font-normal">Статус</th>
                <th className="w-8"></th>
              </tr>
            </thead>
            <tbody>
              {sales.map(s => (
                <ProductSaleRow key={s.id} sale={s} catMap={catMap} catColorFn={catColorFn} onRefund={handleRefund} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {meta && meta.last_page > 1 && (
        <div className="flex justify-center gap-2">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1.5 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 disabled:opacity-40 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">‹ Назад</button>
          <span className="px-3 py-1.5 text-sm text-zinc-500">{page} / {meta.last_page}</span>
          <button onClick={() => setPage(p => Math.min(meta.last_page, p + 1))} disabled={page === meta.last_page} className="px-3 py-1.5 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 disabled:opacity-40 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">Вперёд ›</button>
        </div>
      )}
    </div>
  );
}

// ── All tab ────────────────────────────────────────────────────────────

function AllTab({ dateFrom, dateTo }) {
  const [memSummary, setMemSummary] = useState(null);
  const [prodSummary, setProdSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [memRes, prodRes] = await Promise.all([
        dashboardApi.sales({ per_page: 1, ...(dateFrom ? { date_from: dateFrom } : {}), ...(dateTo ? { date_to: dateTo } : {}) }),
        productsApi.listSales({ per_page: 1, ...(dateFrom ? { date_from: dateFrom } : {}), ...(dateTo ? { date_to: dateTo } : {}) }),
      ]);
      setMemSummary(memRes.data.summary ?? null);
      setProdSummary(prodRes.data.summary ?? null);
    } catch { /* suppress */ }
    finally { setLoading(false); }
  }, [dateFrom, dateTo]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="text-sm text-zinc-400 text-center py-10">Загрузка…</div>;

  const memTotal  = memSummary?.total_amount ?? 0;
  const prodTotal = prodSummary?.total_amount ?? 0;
  const total     = memTotal + prodTotal;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard label="Общий денежный поток" value={fmtMoney(total)} accent="text-emerald-600 dark:text-emerald-400" sub="абонементы + товары" />
        <StatCard label="Абонементы"           value={fmtMoney(memTotal)} />
        <StatCard label="Товары и услуги"       value={fmtMoney(prodTotal)} />
      </div>

      {total !== 0 && (
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 space-y-3">
          <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Распределение по категориям</div>
          {[
            { label: "Абонементы",    amount: memTotal,  color: "bg-emerald-500" },
            { label: "Товары/услуги", amount: prodTotal, color: "bg-blue-500" },
          ].map(row => {
            const pct = total !== 0 ? Math.round(Math.abs(row.amount) / Math.abs(total) * 100) : 0;
            return (
              <div key={row.label} className="flex items-center gap-3">
                <div className="w-28 text-xs text-zinc-600 dark:text-zinc-400 shrink-0">{row.label}</div>
                <div className="flex-1 h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <div className={`h-full ${row.color} rounded-full`} style={{ width: `${pct}%` }} />
                </div>
                <div className="text-xs font-medium text-zinc-700 dark:text-zinc-300 w-20 text-right shrink-0">{fmtMoney(row.amount)}</div>
              </div>
            );
          })}
        </div>
      )}

      <p className="text-xs text-zinc-400 text-center">
        Для детальной истории используйте вкладки «Абонементы» и «Товары»
      </p>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────

export default function AdminSales() {
  const [searchParams] = useSearchParams();
  const navigate       = useNavigate();

  const initQuick = searchParams.get("quick") ?? "all";
  const initFrom  = searchParams.get("date_from") ?? "";
  const initTo    = searchParams.get("date_to")   ?? "";

  const [quickFilter, setQuick] = useState(initQuick);
  const [dateFrom, setDateFrom] = useState(initFrom);
  const [dateTo, setDateTo]     = useState(initTo);
  const [activeTab, setActiveTab] = useState("all"); // all | memberships | products

  const effectiveFrom = quickFilter === "today"      ? today()
                      : quickFilter === "month"      ? monthStart()
                      : quickFilter === "prev_month" ? prevMonthRange().from
                      : dateFrom;
  const effectiveTo   = quickFilter === "today"      ? today()
                      : quickFilter === "prev_month" ? prevMonthRange().to
                      : dateTo;

  function applyQuick(q) { setQuick(q); setDateFrom(""); setDateTo(""); }

  const TABS = [
    { key: "all",         label: "Все" },
    { key: "memberships", label: "Абонементы" },
    { key: "products",    label: "Товары" },
  ];

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-7xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate("/admin")} className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 text-sm">← Дашборд</button>
        <div>
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">История продаж</h1>
          <p className="text-xs text-zinc-400 mt-0.5">Абонементы, товары и услуги</p>
        </div>
      </div>

      {/* Date filters */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 space-y-3">
        <div className="flex flex-wrap gap-2">
          <QuickFilterBtn active={quickFilter === "today"}      onClick={() => applyQuick("today")}>Сегодня</QuickFilterBtn>
          <QuickFilterBtn active={quickFilter === "month"}      onClick={() => applyQuick("month")}>Текущий месяц</QuickFilterBtn>
          <QuickFilterBtn active={quickFilter === "prev_month"} onClick={() => applyQuick("prev_month")}>Прошлый месяц</QuickFilterBtn>
          <QuickFilterBtn active={quickFilter === "all"}        onClick={() => applyQuick("all")}>Всё время</QuickFilterBtn>
        </div>
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs text-zinc-400 mb-1">С</label>
            <input type="date" value={quickFilter === "custom" ? dateFrom : (effectiveFrom ?? "")} onChange={e => { setDateFrom(e.target.value); setQuick("custom"); }} className="px-3 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 outline-none" />
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">По</label>
            <input type="date" value={quickFilter === "custom" ? dateTo : (effectiveTo ?? "")} onChange={e => { setDateTo(e.target.value); setQuick("custom"); }} className="px-3 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 outline-none" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-zinc-100 dark:bg-zinc-800 rounded-xl p-1 gap-1">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === t.key ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-sm" : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "all"         && <AllTab         dateFrom={effectiveFrom} dateTo={effectiveTo} />}
      {activeTab === "memberships" && <MembershipsTab dateFrom={effectiveFrom} dateTo={effectiveTo} />}
      {activeTab === "products"    && <ProductsTab    dateFrom={effectiveFrom} dateTo={effectiveTo} />}
    </div>
  );
}
