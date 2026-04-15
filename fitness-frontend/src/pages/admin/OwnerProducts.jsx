import { useState, useEffect, useCallback } from "react";
import { productsApi } from "../../api/products";

// ── Style helpers ──────────────────────────────────────────────────────

const CAT_COLOR_PALETTE = [
  "bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400",
  "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400",
  "bg-violet-100 text-violet-700 dark:bg-violet-900/20 dark:text-violet-400",
  "bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400",
  "bg-rose-100 text-rose-700 dark:bg-rose-900/20 dark:text-rose-400",
  "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/20 dark:text-cyan-400",
  "bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400",
];

function catColor(idx) {
  return CAT_COLOR_PALETTE[idx % CAT_COLOR_PALETTE.length];
}

const INPUT = "w-full px-3 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 outline-none focus:border-zinc-900 dark:focus:border-zinc-100";
const LABEL = "block text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-1";

function fmt(n) { return Number(n ?? 0).toLocaleString("ru-RU"); }

function emptyProductForm(defaultCatSlug = "") {
  return { name: "", category: defaultCatSlug, price: "", stock_quantity: "", description: "", is_active: true };
}

function emptyCatForm() {
  return { name: "", slug: "", is_returnable: true, icon: "" };
}


function StockBadge({ qty }) {
  if (qty === 0) return <span className="text-xs px-2 py-0.5 rounded font-medium bg-red-100 text-red-600">Нет в наличии</span>;
  if (qty <= 5)  return <span className="text-xs px-2 py-0.5 rounded font-medium bg-amber-100 text-amber-700">Мало: {qty} шт.</span>;
  return <span className="text-xs px-2 py-0.5 rounded font-medium bg-emerald-100 text-emerald-700">{qty} шт.</span>;
}

// ── CategorySection ────────────────────────────────────────────────────

function CategorySection({ categories, onReload }) {
  const [open, setOpen] = useState(false);
  const [catModal, setCatModal] = useState(null); // null | "create" | "edit"
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(emptyCatForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  function openCreate() {
    setForm(emptyCatForm());
    setError(null);
    setCatModal("create");
  }

  function openEdit(cat) {
    setSelected(cat);
    setForm({ name: cat.name, slug: cat.slug, is_returnable: cat.is_returnable, icon: cat.icon ?? "" });
    setError(null);
    setCatModal("edit");
  }

  function handleNameChange(v) {
    setForm(f => ({ ...f, name: v }));
  }

  async function handleSave() {
    if (!form.name.trim()) { setError("Введите название"); return; }
    if (catModal === "create" && !form.slug.trim()) { setError("Введите slug"); return; }
    setSaving(true); setError(null);
    try {
      const payload = {
        name:          form.name.trim(),
        slug:          form.slug.trim(),
        is_returnable: form.is_returnable,
        icon:          form.icon.trim() || null,
      };
      if (catModal === "create") await productsApi.ownerCreateCategory(payload);
      else                       await productsApi.ownerUpdateCategory(selected.id, payload);
      setCatModal(null);
      onReload();
    } catch (err) {
      const errs = err.response?.data?.errors;
      setError(err.response?.data?.message ?? (errs ? Object.values(errs).flat().join("; ") : "Ошибка"));
    } finally { setSaving(false); }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await productsApi.ownerDestroyCategory(deleteId);
      setDeleteId(null);
      onReload();
    } catch (err) {
      alert(err.response?.data?.message ?? "Ошибка удаления");
    } finally { setDeleting(false); }
  }

  return (
    <>
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        <button
          onClick={() => setOpen(o => !o)}
          className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
        >
          <span>🗂️ Категории товаров ({categories.length})</span>
          <span className="text-zinc-400">{open ? "▲" : "▼"}</span>
        </button>

        {open && (
          <div className="px-4 pb-4 space-y-3 border-t border-zinc-100 dark:border-zinc-800 pt-3">
            <div className="flex flex-wrap gap-2">
              {categories.map((cat, idx) => (
                <div
                  key={cat.id}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 group"
                >
                  {cat.icon && <span>{cat.icon}</span>}
                  <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{cat.name}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${catColor(idx)}`}>
                    {cat.is_returnable ? "Возврат ✅" : "Без возврата ❌"}
                  </span>
                  <span className="text-xs text-zinc-400 font-mono">{cat.slug}</span>
                  <button
                    onClick={() => openEdit(cat)}
                    className="opacity-0 group-hover:opacity-100 text-xs text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-all ml-1"
                  >✎</button>
                  <button
                    onClick={() => setDeleteId(cat.id)}
                    className="opacity-0 group-hover:opacity-100 text-xs text-red-400 hover:text-red-600 transition-all"
                  >✕</button>
                </div>
              ))}
              <button
                onClick={openCreate}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-dashed border-zinc-300 dark:border-zinc-600 text-sm text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:border-zinc-400 transition-colors"
              >
                + Новая категория
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Category create/edit modal */}
      {catModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              {catModal === "create" ? "Новая категория" : "Редактировать категорию"}
            </h2>

            <div className="space-y-3">
              <div>
                <label className={LABEL}>Название *</label>
                <input value={form.name} onChange={e => handleNameChange(e.target.value)} className={INPUT} placeholder="Например: Одежда" />
              </div>
              <div>
                <label className={LABEL}>Slug (латинские буквы, цифры, _ -) *</label>
                <input
                  value={form.slug}
                  onChange={e => setForm(f => ({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 50) }))}
                  className={INPUT}
                  placeholder="clothing"
                  disabled={catModal === "edit"}
                />
                {catModal === "edit" && <p className="text-xs text-zinc-400 mt-1">Slug нельзя изменить (он используется в товарах)</p>}
              </div>
              <div>
                <label className={LABEL}>Иконка (эмодзи, необязательно)</label>
                <input value={form.icon} onChange={e => setForm(f => ({ ...f, icon: e.target.value }))} className={INPUT} placeholder="👕" maxLength={10} />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_returnable}
                  onChange={e => setForm(f => ({ ...f, is_returnable: e.target.checked }))}
                  className="accent-zinc-900 w-4 h-4"
                />
                <span className="text-sm text-zinc-700 dark:text-zinc-300">Товары этой категории подлежат возврату</span>
              </label>
              {catModal === "edit" && (
                <p className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-900/20 rounded-lg px-3 py-2">
                  ⚠️ Изменение возвратности обновит флаг у всех товаров этой категории.
                </p>
              )}
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <div className="flex gap-3">
              <button onClick={() => setCatModal(null)} className="flex-1 px-4 py-2 text-sm font-medium rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">Отмена</button>
              <button onClick={handleSave} disabled={saving} className="flex-1 px-4 py-2 text-sm font-medium rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:opacity-80 transition-opacity disabled:opacity-50">
                {saving ? "Сохранение…" : "Сохранить"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Удалить категорию?</h2>
            <p className="text-sm text-zinc-500">Нельзя удалить категорию, в которой есть товары.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="flex-1 px-4 py-2 text-sm font-medium rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">Отмена</button>
              <button onClick={handleDelete} disabled={deleting} className="flex-1 px-4 py-2 text-sm font-medium rounded-lg bg-red-600 text-white hover:opacity-80 transition-opacity disabled:opacity-50">
                {deleting ? "Удаление…" : "Удалить"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ── Main ───────────────────────────────────────────────────────────────

export default function OwnerProducts() {
  const [products, setProducts]       = useState([]);
  const [categories, setCategories]   = useState([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState("");
  const [catFilter, setCatFilter]     = useState("all");
  const [modal, setModal]             = useState(null);
  const [selected, setSelected]       = useState(null);
  const [form, setForm]               = useState({});
  const [restockQty, setRestockQty]   = useState("");
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState(null);
  const [deleteId, setDeleteId]       = useState(null);
  const [deleting, setDeleting]       = useState(false);

  const catMap   = Object.fromEntries(categories.map(c => [c.slug, c]));
  const catIndex = Object.fromEntries(categories.map((c, i) => [c.slug, i]));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [catRes, prodRes] = await Promise.all([
        productsApi.ownerListCategories(),
        productsApi.ownerList(),
      ]);
      setCategories(catRes.data.data ?? []);
      setProducts(prodRes.data.data ?? []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  function openCreate() {
    const defaultSlug = categories[0]?.slug ?? "";
    setForm(emptyProductForm(defaultSlug));
    setError(null);
    setModal("create");
  }

  function openEdit(p) {
    setForm({
      name:           p.name,
      category:       p.category,
      price:          String(p.price),
      stock_quantity: String(p.stock_quantity),
      description:    p.description ?? "",
      is_active:      p.is_active,
    });
    setSelected(p);
    setError(null);
    setModal("edit");
  }

  function openRestock(p) {
    setSelected(p);
    setRestockQty("");
    setError(null);
    setModal("restock");
  }

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  async function handleSave() {
    if (!form.name?.trim()) { setError("Введите название"); return; }
    if (!form.price || isNaN(Number(form.price)) || Number(form.price) < 0) { setError("Укажите корректную цену"); return; }
    if (form.stock_quantity === "" || isNaN(Number(form.stock_quantity)) || Number(form.stock_quantity) < 0) { setError("Укажите количество на складе"); return; }
    setSaving(true); setError(null);
    try {
      const payload = {
        name:           form.name.trim(),
        category:       form.category,
        price:          Number(form.price),
        stock_quantity: Number(form.stock_quantity),
        description:    form.description?.trim() || null,
        is_active:      form.is_active,
      };
      if (modal === "create") await productsApi.ownerCreate(payload);
      else                    await productsApi.ownerUpdate(selected.id, payload);
      setModal(null);
      load();
    } catch (err) {
      const errs = err.response?.data?.errors;
      setError(err.response?.data?.message ?? (errs ? Object.values(errs).flat().join("; ") : "Ошибка сохранения"));
    } finally { setSaving(false); }
  }

  async function handleRestock() {
    const qty = parseInt(restockQty);
    if (!qty || qty < 1) { setError("Введите количество (минимум 1)"); return; }
    setSaving(true); setError(null);
    try {
      await productsApi.ownerRestock(selected.id, qty);
      setModal(null);
      load();
    } catch (err) {
      setError(err.response?.data?.message ?? "Ошибка");
    } finally { setSaving(false); }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await productsApi.ownerDestroy(deleteId);
      setDeleteId(null);
      load();
    } catch (err) {
      alert(err.response?.data?.message ?? "Ошибка удаления");
    } finally { setDeleting(false); }
  }

  const filtered = products.filter(p => {
    const q = search.toLowerCase();
    return (catFilter === "all" || p.category === catFilter)
      && (!q || p.name.toLowerCase().includes(q));
  });

  const stats = {
    total:    products.length,
    active:   products.filter(p => p.is_active).length,
    lowStock: products.filter(p => p.stock_quantity > 0 && p.stock_quantity <= 5).length,
    outStock: products.filter(p => p.stock_quantity === 0).length,
  };

  const selectedCat = catMap[form.category];

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-6xl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Каталог товаров</h1>
          <p className="text-xs text-zinc-400 mt-0.5">Управление ассортиментом и остатками склада</p>
        </div>
        <button
          onClick={openCreate}
          className="px-4 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-sm font-medium rounded-lg hover:opacity-80 transition-opacity"
        >
          + Добавить товар
        </button>
      </div>

      {/* Categories management */}
      <CategorySection categories={categories} onReload={load} />

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Всего позиций", value: stats.total,    accent: "" },
          { label: "Активных",      value: stats.active,   accent: "text-emerald-600" },
          { label: "Мало на складе",value: stats.lowStock, accent: "text-amber-600" },
          { label: "Нет в наличии", value: stats.outStock, accent: "text-red-600" },
        ].map(s => (
          <div key={s.label} className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4">
            <div className="text-xs text-zinc-400 mb-1">{s.label}</div>
            <div className={`text-2xl font-semibold ${s.accent || "text-zinc-900 dark:text-zinc-100"}`}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Поиск по названию…"
          className="px-3 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 outline-none focus:border-zinc-900 dark:focus:border-zinc-100 w-60"
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

      {/* Product grid */}
      {loading ? (
        <div className="text-sm text-zinc-400 py-8 text-center">Загрузка…</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-12 text-center">
          <p className="text-sm text-zinc-400">
            {products.length === 0 ? "Каталог пуст. Добавьте первый товар." : "Ничего не найдено"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(p => {
            const cat = catMap[p.category];
            const idx = catIndex[p.category] ?? 0;
            return (
              <div
                key={p.id}
                className={`bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 flex flex-col gap-3 ${!p.is_active ? "opacity-60" : ""}`}
              >
                <div className="flex justify-between items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-zinc-900 dark:text-zinc-100 truncate">{p.name}</div>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      <span className={`text-xs px-2 py-0.5 rounded font-medium ${catColor(idx)}`}>
                        {cat?.icon} {cat?.name ?? p.category}
                      </span>
                      {!p.is_active && <span className="text-xs px-2 py-0.5 rounded font-medium bg-zinc-100 text-zinc-500">Скрыт</span>}
                      {!p.is_returnable && <span className="text-xs px-2 py-0.5 rounded font-medium bg-orange-100 text-orange-700">Без возврата</span>}
                    </div>
                  </div>
                  <div className="text-base font-semibold text-zinc-900 dark:text-zinc-100 shrink-0">
                    {fmt(p.price)} ₽
                  </div>
                </div>

                {p.description && <p className="text-xs text-zinc-400 line-clamp-2">{p.description}</p>}

                <div className="flex items-center justify-between">
                  <StockBadge qty={p.stock_quantity} />
                  <button
                    onClick={() => openRestock(p)}
                    className="text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors px-2 py-1 rounded border border-zinc-200 dark:border-zinc-700 hover:border-zinc-400"
                  >
                    + Поставка
                  </button>
                </div>

                <div className="flex gap-2 pt-1 border-t border-zinc-100 dark:border-zinc-800">
                  <button
                    onClick={() => openEdit(p)}
                    className="flex-1 text-xs font-medium text-zinc-600 dark:text-zinc-400 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                  >
                    Редактировать
                  </button>
                  <button
                    onClick={() => setDeleteId(p.id)}
                    className="text-xs font-medium text-red-500 py-1.5 px-3 rounded-lg border border-red-100 dark:border-red-900/30 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
                  >
                    Удалить
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Modal */}
      {(modal === "create" || modal === "edit") && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4 overflow-y-auto max-h-[90vh]">
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              {modal === "create" ? "Новый товар" : "Редактировать товар"}
            </h2>

            <div className="space-y-3">
              <div>
                <label className={LABEL}>Название *</label>
                <input value={form.name} onChange={e => set("name", e.target.value)} className={INPUT} placeholder="Например: Шейкер 700 мл" />
              </div>

              <div>
                <label className={LABEL}>Категория *</label>
                {categories.length === 0 ? (
                  <p className="text-xs text-amber-600">Сначала создайте хотя бы одну категорию</p>
                ) : (
                  <select value={form.category} onChange={e => set("category", e.target.value)} className={INPUT}>
                    {categories.map(c => (
                      <option key={c.slug} value={c.slug}>{c.icon} {c.name}</option>
                    ))}
                  </select>
                )}
                <p className="text-xs text-zinc-400 mt-1">
                  Возврат: {selectedCat ? (selectedCat.is_returnable ? "✅ доступен (в течение 14 дней)" : "❌ недоступен") : "—"}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={LABEL}>Цена (₽) *</label>
                  <input type="number" min="0" step="0.01" value={form.price} onChange={e => set("price", e.target.value)} className={INPUT} placeholder="0.00" />
                </div>
                <div>
                  <label className={LABEL}>Кол-во на складе *</label>
                  <input type="number" min="0" step="1" value={form.stock_quantity} onChange={e => set("stock_quantity", e.target.value)} className={INPUT} placeholder="0" />
                </div>
              </div>

              <div>
                <label className={LABEL}>Описание</label>
                <textarea value={form.description} onChange={e => set("description", e.target.value)} rows={2} className={INPUT + " resize-none"} placeholder="Краткое описание (необязательно)" />
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" id="is_active" checked={form.is_active} onChange={e => set("is_active", e.target.checked)} className="accent-zinc-900" />
                <span className="text-sm text-zinc-700 dark:text-zinc-300">Товар активен (отображается в продаже)</span>
              </label>
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <div className="flex gap-3 pt-2">
              <button onClick={() => setModal(null)} className="flex-1 px-4 py-2 text-sm font-medium rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">Отмена</button>
              <button onClick={handleSave} disabled={saving} className="flex-1 px-4 py-2 text-sm font-medium rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:opacity-80 transition-opacity disabled:opacity-50">
                {saving ? "Сохранение…" : "Сохранить"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Restock Modal */}
      {modal === "restock" && selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Принять поставку</h2>
            <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{selected.name}</p>

            <div className="bg-zinc-50 dark:bg-zinc-800 rounded-lg p-3 flex justify-between items-center">
              <span className="text-sm text-zinc-500">Текущий остаток:</span>
              <span className="font-semibold text-zinc-900 dark:text-zinc-100">{selected.stock_quantity} шт.</span>
            </div>

            <div>
              <label className={LABEL}>Добавить единиц *</label>
              <input type="number" min="1" step="1" value={restockQty} onChange={e => setRestockQty(e.target.value)} className={INPUT} placeholder="Введите количество поставки" autoFocus />
              {restockQty && Number(restockQty) > 0 && (
                <p className="text-xs text-emerald-600 mt-1">Новый остаток: {selected.stock_quantity + Number(restockQty)} шт.</p>
              )}
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <div className="flex gap-3">
              <button onClick={() => setModal(null)} className="flex-1 px-4 py-2 text-sm font-medium rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">Отмена</button>
              <button onClick={handleRestock} disabled={saving} className="flex-1 px-4 py-2 text-sm font-medium rounded-lg bg-emerald-600 text-white hover:opacity-80 transition-opacity disabled:opacity-50">
                {saving ? "Сохранение…" : "Оприходовать"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Удалить товар?</h2>
            <p className="text-sm text-zinc-500">Если по товару есть история продаж — он будет скрыт, но не удалён.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="flex-1 px-4 py-2 text-sm font-medium rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">Отмена</button>
              <button onClick={handleDelete} disabled={deleting} className="flex-1 px-4 py-2 text-sm font-medium rounded-lg bg-red-600 text-white hover:opacity-80 transition-opacity disabled:opacity-50">
                {deleting ? "Удаление…" : "Удалить"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
