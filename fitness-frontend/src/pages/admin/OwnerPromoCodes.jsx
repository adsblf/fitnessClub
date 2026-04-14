import { useState, useEffect, useCallback } from "react";
import { ownerApi } from "../../api/owner";
import { Modal, Field, ModalFooter, INPUT_CLS as INPUT } from "./OwnerStaff";

function emptyForm() {
  return {
    code: "", discount_type: "percent", discount_value: "",
    starts_at: "", ends_at: "", max_uses: "",
    is_active: true, membership_type_ids: [],
  };
}

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("ru-RU");
}

export default function OwnerPromoCodes() {
  const [promos, setPromos]     = useState([]);
  const [types, setTypes]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [modal, setModal]       = useState(null);
  const [form, setForm]         = useState(emptyForm());
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, t] = await Promise.all([ownerApi.listPromoCodes(), ownerApi.listMembershipTypes()]);
      setPromos(p.data.data ?? []);
      setTypes(t.data.data ?? []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  function openAdd() { setForm(emptyForm()); setError(null); setModal({ mode: "add" }); }
  function openEdit(p) {
    setForm({
      code:                p.code ?? "",
      discount_type:       p.discount_type ?? "percent",
      discount_value:      p.discount_value ?? "",
      starts_at:           p.starts_at ? p.starts_at.slice(0, 10) : "",
      ends_at:             p.ends_at   ? p.ends_at.slice(0, 10)   : "",
      max_uses:            p.max_uses ?? "",
      is_active:           !!p.is_active,
      membership_type_ids: (p.membership_types ?? []).map(t => t.id),
    });
    setError(null);
    setModal({ mode: "edit", id: p.id });
  }
  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  function toggleType(id) {
    setForm(f => ({
      ...f,
      membership_type_ids: f.membership_type_ids.includes(id)
        ? f.membership_type_ids.filter(x => x !== id)
        : [...f.membership_type_ids, id],
    }));
  }

  async function handleSave() {
    if (!form.code.trim())      { setError("Введите код промокода"); return; }
    if (!form.discount_value)   { setError("Введите размер скидки"); return; }
    setSaving(true); setError(null);
    try {
      if (modal.mode === "add") await ownerApi.storePromoCode(form);
      else                      await ownerApi.updatePromoCode(modal.id, form);
      setModal(null); load();
    } catch (err) {
      const msg  = err.response?.data?.message;
      const errs = err.response?.data?.errors;
      setError(msg ?? (errs ? Object.values(errs).flat().join("; ") : "Ошибка сохранения"));
    } finally { setSaving(false); }
  }

  async function handleDelete() {
    setDeleting(true);
    try { await ownerApi.destroyPromoCode(deleteId); setDeleteId(null); load(); }
    catch (err) { alert(err.response?.data?.message ?? "Ошибка удаления"); }
    finally { setDeleting(false); }
  }

  function isCurrentlyValid(p) {
    if (!p.is_active) return false;
    const now = Date.now();
    if (p.starts_at && new Date(p.starts_at) > now) return false;
    if (p.ends_at   && new Date(p.ends_at)   < now) return false;
    if (p.max_uses  && p.used_count >= p.max_uses)  return false;
    return true;
  }

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-5xl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Промокоды</h1>
          <p className="text-xs text-zinc-400 mt-0.5">Управление скидочными кодами и ограничениями по тарифам</p>
        </div>
        <button onClick={openAdd} className="px-4 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-sm font-medium rounded-lg hover:opacity-80 transition-opacity">
          + Добавить промокод
        </button>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-x-auto">
        {loading ? (
          <div className="p-8 text-center text-sm text-zinc-400">Загрузка...</div>
        ) : promos.length === 0 ? (
          <div className="p-8 text-center text-sm text-zinc-400">Промокоды не найдены</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-zinc-400 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
                <th className="text-left px-4 py-2.5 font-normal">Код</th>
                <th className="text-left px-4 py-2.5 font-normal">Скидка</th>
                <th className="text-left px-4 py-2.5 font-normal">Период</th>
                <th className="text-left px-4 py-2.5 font-normal">Использований</th>
                <th className="text-left px-4 py-2.5 font-normal">Тарифы</th>
                <th className="text-left px-4 py-2.5 font-normal">Статус</th>
                <th className="text-right px-4 py-2.5 font-normal">Действия</th>
              </tr>
            </thead>
            <tbody>
              {promos.map((p, i) => (
                <tr key={p.id} className={`border-b border-zinc-50 dark:border-zinc-800 last:border-0 ${i % 2 ? "bg-zinc-50/40 dark:bg-zinc-800/10" : ""}`}>
                  <td className="px-4 py-3">
                    <span className="font-mono font-semibold text-zinc-900 dark:text-zinc-100 tracking-wide">{p.code}</span>
                  </td>
                  <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300 font-medium">
                    {p.discount_type === "percent" ? `${p.discount_value}%` : `${Number(p.discount_value).toLocaleString("ru-RU")} ₽`}
                  </td>
                  <td className="px-4 py-3 text-xs text-zinc-500 dark:text-zinc-400">
                    {p.starts_at ? fmtDate(p.starts_at) : "∞"} — {p.ends_at ? fmtDate(p.ends_at) : "∞"}
                  </td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                    {p.used_count ?? 0}{p.max_uses ? ` / ${p.max_uses}` : ""}
                  </td>
                  <td className="px-4 py-3">
                    {(!p.membership_types || p.membership_types.length === 0) ? (
                      <span className="text-xs text-zinc-400">Все тарифы</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {p.membership_types.map(t => (
                          <span key={t.id} className="inline-flex px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-xs">{t.name}</span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${isCurrentlyValid(p) ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400" : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"}`}>
                      {isCurrentlyValid(p) ? "Активен" : "Неактивен"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => openEdit(p)} className="text-xs px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors">
                        Изменить
                      </button>
                      <button onClick={() => setDeleteId(p.id)} className="text-xs px-3 py-1.5 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors">
                        Удалить
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <Modal title={modal.mode === "add" ? "Добавить промокод" : "Редактировать промокод"} onClose={() => setModal(null)}>
          <div className="space-y-3">
            <Field label="Код *">
              <input value={form.code} onChange={e => set("code", e.target.value.toUpperCase())} className={INPUT} placeholder="SUMMER20" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Тип скидки">
                <select value={form.discount_type} onChange={e => set("discount_type", e.target.value)} className={INPUT}>
                  <option value="percent">Процент (%)</option>
                  <option value="fixed">Фиксированная (₽)</option>
                </select>
              </Field>
              <Field label="Размер скидки *">
                <input value={form.discount_value} onChange={e => set("discount_value", e.target.value)} type="number" min="0" className={INPUT} placeholder={form.discount_type === "percent" ? "20" : "500"} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Дата начала">
                <input value={form.starts_at} onChange={e => set("starts_at", e.target.value)} type="date" className={INPUT} />
              </Field>
              <Field label="Дата окончания">
                <input value={form.ends_at} onChange={e => set("ends_at", e.target.value)} type="date" className={INPUT} />
              </Field>
            </div>
            <Field label="Макс. использований (пусто — без ограничений)">
              <input value={form.max_uses} onChange={e => set("max_uses", e.target.value)} type="number" min="1" className={INPUT} placeholder="100" />
            </Field>

            {/* Membership type restrictions */}
            <div>
              <label className="block text-xs text-zinc-500 mb-2">
                Действует на тарифы{" "}
                <span className="text-zinc-400">(пусто = все тарифы)</span>
              </label>
              <div className="grid grid-cols-2 gap-1.5 max-h-36 overflow-y-auto p-1">
                {types.map(t => (
                  <label key={t.id} className={`flex items-center gap-2 px-2.5 py-2 rounded-lg cursor-pointer border text-sm transition-colors ${
                    form.membership_type_ids.includes(t.id)
                      ? "border-zinc-900 dark:border-zinc-100 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                      : "border-zinc-100 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                  }`}>
                    <input
                      type="checkbox"
                      checked={form.membership_type_ids.includes(t.id)}
                      onChange={() => toggleType(t.id)}
                      className="w-3.5 h-3.5 rounded accent-zinc-900 dark:accent-zinc-100"
                    />
                    <span className="truncate">{t.name}</span>
                  </label>
                ))}
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer text-sm text-zinc-700 dark:text-zinc-300 select-none">
              <input type="checkbox" checked={form.is_active} onChange={e => set("is_active", e.target.checked)} className="w-4 h-4 rounded accent-zinc-900 dark:accent-zinc-100" />
              Промокод активен
            </label>
            {error && <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">{error}</p>}
          </div>
          <ModalFooter onCancel={() => setModal(null)} onConfirm={handleSave} loading={saving} />
        </Modal>
      )}

      {deleteId && (
        <Modal title="Удалить промокод?" onClose={() => setDeleteId(null)}>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">Промокод будет удалён без возможности восстановления.</p>
          <ModalFooter onCancel={() => setDeleteId(null)} onConfirm={handleDelete} loading={deleting} confirmLabel="Удалить" danger />
        </Modal>
      )}
    </div>
  );
}
