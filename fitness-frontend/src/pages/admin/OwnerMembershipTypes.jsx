import { useState, useEffect, useCallback } from "react";
import { ownerApi } from "../../api/owner";
import { Modal, Field, ModalFooter, INPUT_CLS as INPUT } from "./OwnerStaff";

function emptyForm() {
  return { name: "", duration_days: "", visit_limit: "", price: "", description: "", is_active: true };
}

export default function OwnerMembershipTypes() {
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
    try { setTypes((await ownerApi.listMembershipTypes()).data.data ?? []); }
    catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  function openAdd() { setForm(emptyForm()); setError(null); setModal({ mode: "add" }); }
  function openEdit(t) {
    setForm({
      name: t.name ?? "", duration_days: t.duration_days ?? "",
      visit_limit: t.visit_limit ?? "", price: t.price ?? "",
      description: t.description ?? "", is_active: !!t.is_active,
    });
    setError(null);
    setModal({ mode: "edit", id: t.id });
  }
  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  async function handleSave() {
    if (!form.name.trim())    { setError("Введите название"); return; }
    if (!form.price)          { setError("Введите цену"); return; }
    if (!form.duration_days)  { setError("Введите срок действия"); return; }
    setSaving(true); setError(null);
    try {
      if (modal.mode === "add") await ownerApi.storeMembershipType(form);
      else                      await ownerApi.updateMembershipType(modal.id, form);
      setModal(null); load();
    } catch (err) {
      const msg  = err.response?.data?.message;
      const errs = err.response?.data?.errors;
      setError(msg ?? (errs ? Object.values(errs).flat().join("; ") : "Ошибка сохранения"));
    } finally { setSaving(false); }
  }

  async function handleDelete() {
    setDeleting(true);
    try { await ownerApi.destroyMembershipType(deleteId); setDeleteId(null); load(); }
    catch (err) { alert(err.response?.data?.message ?? "Ошибка удаления"); }
    finally { setDeleting(false); }
  }

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-4xl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Тарифные планы</h1>
          <p className="text-xs text-zinc-400 mt-0.5">Создание, редактирование и деактивация абонементов</p>
        </div>
        <button onClick={openAdd} className="px-4 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-sm font-medium rounded-lg hover:opacity-80 transition-opacity">
          + Добавить тариф
        </button>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-x-auto">
        {loading ? (
          <div className="p-8 text-center text-sm text-zinc-400">Загрузка...</div>
        ) : types.length === 0 ? (
          <div className="p-8 text-center text-sm text-zinc-400">Тарифы не найдены</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-zinc-400 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
                <th className="text-left px-4 py-2.5 font-normal">Название</th>
                <th className="text-left px-4 py-2.5 font-normal">Цена</th>
                <th className="text-left px-4 py-2.5 font-normal">Срок</th>
                <th className="text-left px-4 py-2.5 font-normal">Посещений</th>
                <th className="text-left px-4 py-2.5 font-normal">Статус</th>
                <th className="text-right px-4 py-2.5 font-normal">Действия</th>
              </tr>
            </thead>
            <tbody>
              {types.map((t, i) => (
                <tr key={t.id} className={`border-b border-zinc-50 dark:border-zinc-800 last:border-0 ${i % 2 ? "bg-zinc-50/40 dark:bg-zinc-800/10" : ""}`}>
                  <td className="px-4 py-3">
                    <div className="font-medium text-zinc-900 dark:text-zinc-100">{t.name}</div>
                    {t.description && <div className="text-xs text-zinc-400 mt-0.5 truncate max-w-[200px]">{t.description}</div>}
                  </td>
                  <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300 font-medium">{Number(t.price).toLocaleString("ru-RU")} ₽</td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{t.duration_days} дн.</td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{t.visit_limit ?? "∞"}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${t.is_active ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400" : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"}`}>
                      {t.is_active ? "Активен" : "Неактивен"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => openEdit(t)} className="text-xs px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors">
                        Изменить
                      </button>
                      <button onClick={() => setDeleteId(t.id)} className="text-xs px-3 py-1.5 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors">
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
        <Modal title={modal.mode === "add" ? "Добавить тариф" : "Редактировать тариф"} onClose={() => setModal(null)}>
          <div className="space-y-3">
            <Field label="Название *">
              <input value={form.name} onChange={e => set("name", e.target.value)} className={INPUT} placeholder="Безлимитный на месяц" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Цена (₽) *">
                <input value={form.price} onChange={e => set("price", e.target.value)} type="number" min="0" className={INPUT} placeholder="3000" />
              </Field>
              <Field label="Срок действия (дней) *">
                <input value={form.duration_days} onChange={e => set("duration_days", e.target.value)} type="number" min="1" className={INPUT} placeholder="30" />
              </Field>
            </div>
            <Field label="Лимит посещений (пусто — безлимит)">
              <input value={form.visit_limit} onChange={e => set("visit_limit", e.target.value)} type="number" min="0" className={INPUT} placeholder="12" />
            </Field>
            <Field label="Описание">
              <textarea value={form.description} onChange={e => set("description", e.target.value)} rows={2} className={`${INPUT} resize-none`} placeholder="Краткое описание тарифа" />
            </Field>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer text-sm text-zinc-700 dark:text-zinc-300 select-none">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={e => set("is_active", e.target.checked)}
                  className="w-4 h-4 rounded accent-zinc-900 dark:accent-zinc-100"
                />
                Активен (доступен для продажи)
              </label>
            </div>
            {error && <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">{error}</p>}
          </div>
          <ModalFooter onCancel={() => setModal(null)} onConfirm={handleSave} loading={saving} />
        </Modal>
      )}

      {deleteId && (
        <Modal title="Удалить тариф?" onClose={() => setDeleteId(null)}>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Если на тариф есть активные абонементы — он будет деактивирован, иначе удалён полностью.
          </p>
          <ModalFooter onCancel={() => setDeleteId(null)} onConfirm={handleDelete} loading={deleting} confirmLabel="Удалить" danger />
        </Modal>
      )}
    </div>
  );
}
