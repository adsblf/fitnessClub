import { useState, useEffect, useCallback, useRef } from "react";
import { productsApi } from "../../api/products";
import { paymentsApi } from "../../api/payments";

const METHOD_LABELS = {
  cash:          "💵 Наличные",
  card_terminal: "💳 Карта",
  online_sbp:    "📱 СБП",
};

function fmt(n) { return Number(n ?? 0).toLocaleString("ru-RU"); }
function fmtMoney(n) { return fmt(n) + " ₽"; }

// ── ProductCard ────────────────────────────────────────────────────────

function ProductCard({ product, catMap, catColor, cartQty, onAdd }) {
  const outOfStock = product.stock_quantity === 0;
  const remaining  = product.stock_quantity - (cartQty ?? 0);
  const cat        = catMap[product.category];
  const color      = catColor(product.category);

  return (
    <div
      onClick={() => !outOfStock && remaining > 0 && onAdd(product)}
      className={`bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 flex flex-col gap-2 transition-all select-none ${
        outOfStock || remaining <= 0
          ? "opacity-50 cursor-not-allowed"
          : "cursor-pointer hover:border-zinc-400 dark:hover:border-zinc-600 hover:shadow-sm active:scale-98"
      }`}
    >
      <div className="flex justify-between items-start gap-2">
        <span className={`text-xs px-2 py-0.5 rounded font-medium ${color}`}>
          {cat?.icon} {cat?.name ?? product.category}
        </span>
        {cartQty > 0 && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-semibold">×{cartQty}</span>
        )}
      </div>
      <div className="font-medium text-sm text-zinc-900 dark:text-zinc-100 leading-tight">{product.name}</div>
      {product.description && <p className="text-xs text-zinc-400 line-clamp-2">{product.description}</p>}
      <div className="flex justify-between items-center mt-auto pt-1">
        <span className="font-semibold text-zinc-900 dark:text-zinc-100">{fmtMoney(product.price)}</span>
        {outOfStock || remaining <= 0 ? (
          <span className="text-xs text-red-500 font-medium">{outOfStock ? "Товар закончился" : "Добавлено максимум"}</span>
        ) : (
          <span className="text-xs text-zinc-400">Склад: {remaining} шт.</span>
        )}
      </div>
    </div>
  );
}

// ── CartPanel ──────────────────────────────────────────────────────────

function CartPanel({ cart, onQtyChange, onRemove, onCheckout, processing }) {
  const total  = cart.reduce((s, i) => s + i.product.price * i.quantity, 0);
  const [method, setMethod] = useState("cash");

  if (cart.length === 0) {
    return (
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6 flex flex-col items-center justify-center gap-3 min-h-40">
        <span className="text-3xl">🛒</span>
        <p className="text-sm text-zinc-400 text-center">Выберите товары из каталога слева</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 flex flex-col overflow-hidden">
      <div className="px-4 py-3 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center">
        <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Корзина</span>
        <span className="text-xs text-zinc-400">{cart.length} позиций</span>
      </div>

      <div className="flex-1 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800 max-h-80">
        {cart.map(item => (
          <div key={item.product.id} className="px-4 py-3 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-zinc-800 dark:text-zinc-200 truncate">{item.product.name}</div>
              <div className="text-xs text-zinc-400">{fmtMoney(item.product.price)} × {item.quantity} = {fmtMoney(item.product.price * item.quantity)}</div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button onClick={() => onQtyChange(item.product.id, item.quantity - 1)} className="w-6 h-6 rounded bg-zinc-100 dark:bg-zinc-700 text-sm font-bold hover:bg-zinc-200 dark:hover:bg-zinc-600 flex items-center justify-center">−</button>
              <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
              <button onClick={() => onQtyChange(item.product.id, item.quantity + 1)} disabled={item.quantity >= item.product.stock_quantity} className="w-6 h-6 rounded bg-zinc-100 dark:bg-zinc-700 text-sm font-bold hover:bg-zinc-200 dark:hover:bg-zinc-600 flex items-center justify-center disabled:opacity-40">+</button>
              <button onClick={() => onRemove(item.product.id)} className="ml-1 text-zinc-400 hover:text-red-500 text-xs">✕</button>
            </div>
          </div>
        ))}
      </div>

      <div className="px-4 py-3 border-t border-zinc-100 dark:border-zinc-800 space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Итого:</span>
          <span className="text-lg font-bold text-zinc-900 dark:text-zinc-100">{fmtMoney(total)}</span>
        </div>

        <div>
          <div className="text-xs text-zinc-400 mb-1.5 font-medium uppercase tracking-wide">Способ оплаты</div>
          <div className="grid grid-cols-3 gap-1.5">
            {Object.entries(METHOD_LABELS).map(([val, lbl]) => (
              <button
                key={val}
                onClick={() => setMethod(val)}
                className={`py-1.5 rounded-lg text-xs font-medium transition-colors ${method === val ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"}`}
              >
                {lbl}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={() => onCheckout(method)}
          disabled={processing}
          className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
        >
          {processing ? "Оформление…" : `Оформить продажу · ${fmtMoney(total)}`}
        </button>
      </div>
    </div>
  );
}

// ── ReceiptModal ───────────────────────────────────────────────────────

function ReceiptModal({ sale, onClose }) {
  if (!sale) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
        <div className="text-center space-y-1">
          <div className="text-3xl">✅</div>
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Продажа оформлена</h2>
          <p className="text-xs text-zinc-400">{sale.transaction_id}</p>
        </div>

        <div className="bg-zinc-50 dark:bg-zinc-800 rounded-xl p-4 space-y-2.5">
          {sale.items.map((item, i) => (
            <div key={i} className="flex justify-between text-sm">
              <span className="text-zinc-700 dark:text-zinc-300">{item.product_name} ×{item.quantity}</span>
              <span className="font-medium text-zinc-900 dark:text-zinc-100">{fmtMoney(item.subtotal)}</span>
            </div>
          ))}
          <div className="border-t border-zinc-200 dark:border-zinc-700 pt-2 flex justify-between">
            <span className="font-semibold text-zinc-700 dark:text-zinc-300">Итого</span>
            <span className="font-bold text-zinc-900 dark:text-zinc-100 text-base">{fmtMoney(sale.total_amount)}</span>
          </div>
        </div>

        <div className="text-sm text-zinc-500 flex justify-between">
          <span>Способ оплаты:</span>
          <span className="font-medium text-zinc-700 dark:text-zinc-300">{METHOD_LABELS[sale.payment_method]}</span>
        </div>
        {!sale.is_refundable && (
          <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-lg p-2.5">
            ⚠️ Возврат по этому чеку недоступен (категории без возврата)
          </p>
        )}

        <button onClick={onClose} className="w-full py-2.5 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg text-sm font-semibold hover:opacity-80 transition-opacity">
          Готово
        </button>
      </div>
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────

const CAT_COLOR_PALETTE = [
  "bg-blue-100 text-blue-700",
  "bg-emerald-100 text-emerald-700",
  "bg-violet-100 text-violet-700",
  "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-700",
  "bg-cyan-100 text-cyan-700",
  "bg-orange-100 text-orange-700",
];

export default function AdminProductSales() {
  const [products, setProducts]       = useState([]);
  const [categories, setCategories]   = useState([]);
  const [loading, setLoading]         = useState(true);
  const [cart, setCart]               = useState([]);
  const [catFilter, setCatFilter]     = useState("all");
  const [search, setSearch]           = useState("");
  const [processing, setProcessing]   = useState(false);
  const [receipt, setReceipt]         = useState(null);
  const [acquiring, setAcquiring]     = useState(null); // { paymentId }
  const [acquiringError, setAcquiringError] = useState(null);
  const pollRef = useRef(null);

  const catMap    = Object.fromEntries(categories.map(c => [c.slug, c]));
  const catColorFn = useCallback((slug) => {
    const idx = categories.findIndex(c => c.slug === slug);
    return CAT_COLOR_PALETTE[(idx < 0 ? 0 : idx) % CAT_COLOR_PALETTE.length];
  }, [categories]);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await productsApi.list();
      setProducts(res.data.data ?? []);
      setCategories(res.data.categories ?? []);
    } catch { /* suppress */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadProducts(); }, [loadProducts]);

  function addToCart(product) {
    setCart(prev => {
      const existing = prev.find(i => i.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock_quantity) return prev;
        return prev.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { product, quantity: 1 }];
    });
  }

  function changeQty(productId, newQty) {
    if (newQty < 1) { removeFromCart(productId); return; }
    setCart(prev => prev.map(i => i.product.id === productId ? { ...i, quantity: newQty } : i));
  }

  function removeFromCart(productId) {
    setCart(prev => prev.filter(i => i.product.id !== productId));
  }

  async function handleCheckout(method) {
    if (cart.length === 0) return;
    setProcessing(true);
    try {
      const res = await productsApi.createSale({
        payment_method: method,
        items: cart.map(i => ({ product_id: i.product.id, quantity: i.quantity })),
      });
      if (res.data.redirect_url) {
        window.open(res.data.redirect_url, "_blank", "noopener,noreferrer");
        setAcquiring({ paymentId: res.data.payment.id });
        setAcquiringError(null);
        setCart([]);
        setProcessing(false);
        return;
      }
      setReceipt(res.data.data);
      setCart([]);
      loadProducts();
    } catch (err) {
      alert(err.response?.data?.message ?? "Ошибка при оформлении продажи");
    } finally { setProcessing(false); }
  }

  // Поллинг статуса эквайринга
  useEffect(() => {
    if (!acquiring?.paymentId) return;
    async function poll() {
      try {
        const r = await paymentsApi.status(acquiring.paymentId);
        const st = r.data.data.status;
        if (st === "success") {
          setAcquiring(null);
          loadProducts();
          return;
        }
        if (st === "cancelled") {
          setAcquiringError("Оплата была отменена в эмуляторе");
          setAcquiring(null);
          loadProducts();
          return;
        }
        pollRef.current = setTimeout(poll, 1500);
      } catch { pollRef.current = setTimeout(poll, 2000); }
    }
    poll();
    return () => { if (pollRef.current) clearTimeout(pollRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [acquiring?.paymentId]);

  const cartQtyMap = Object.fromEntries(cart.map(i => [i.product.id, i.quantity]));

  const filtered = products.filter(p => {
    const q = search.toLowerCase();
    return (catFilter === "all" || p.category === catFilter)
      && (!q || p.name.toLowerCase().includes(q));
  });

  return (
    <div className="p-4 sm:p-6 space-y-5">
      <div>
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Магазин</h1>
        <p className="text-sm text-zinc-400 mt-0.5">Продажа товаров и услуг клиентам</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Catalogue */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex flex-wrap gap-2">
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Поиск товара…"
              className="px-3 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 outline-none focus:border-zinc-900 dark:focus:border-zinc-100 w-48"
            />
            <button
              onClick={() => setCatFilter("all")}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${catFilter === "all" ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"}`}
            >
              Все
            </button>
            {categories.map(cat => (
              <button
                key={cat.slug}
                onClick={() => setCatFilter(cat.slug)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${catFilter === cat.slug ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"}`}
              >
                {cat.icon} {cat.name}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="text-sm text-zinc-400 py-10 text-center">Загрузка товаров…</div>
          ) : filtered.length === 0 ? (
            <div className="text-sm text-zinc-400 py-10 text-center">Товары не найдены</div>
          ) : (
            <div className="grid grid-cols-2 xl:grid-cols-3 gap-3">
              {filtered.map(p => (
                <ProductCard
                  key={p.id}
                  product={p}
                  catMap={catMap}
                  catColor={catColorFn}
                  cartQty={cartQtyMap[p.id] ?? 0}
                  onAdd={addToCart}
                />
              ))}
            </div>
          )}
        </div>

        {/* Cart */}
        <div>
          <CartPanel
            cart={cart}
            onQtyChange={changeQty}
            onRemove={removeFromCart}
            onCheckout={handleCheckout}
            processing={processing}
          />
        </div>
      </div>

      {receipt && <ReceiptModal sale={receipt} onClose={() => setReceipt(null)} />}

      {/* Ожидание эквайринга */}
      {acquiring && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6 w-full max-w-md text-center space-y-4">
            <div className="w-14 h-14 border-4 border-zinc-200 dark:border-zinc-700 border-t-zinc-900 dark:border-t-zinc-100 rounded-full animate-spin mx-auto" />
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Ожидание оплаты</h2>
            <p className="text-sm text-zinc-500">
              Платёжная страница открылась в новой вкладке.<br />
              Завершите оплату там — эта вкладка обновится автоматически.
            </p>
            {acquiringError && <p className="text-sm text-red-500">{acquiringError}</p>}
            <button
              onClick={() => { if (pollRef.current) clearTimeout(pollRef.current); setAcquiring(null); }}
              className="text-xs text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
            >
              Закрыть
            </button>
          </div>
        </div>
      )}

      {/* Уведомление об отмене */}
      {acquiringError && !acquiring && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6 w-full max-w-sm text-center space-y-4">
            <div className="text-3xl">❌</div>
            <p className="text-sm text-zinc-700 dark:text-zinc-300">{acquiringError}</p>
            <button onClick={() => setAcquiringError(null)} className="px-4 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg text-sm font-medium">Ок</button>
          </div>
        </div>
      )}
    </div>
  );
}
