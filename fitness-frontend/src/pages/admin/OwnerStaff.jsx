import { useState, useEffect, useCallback } from "react";
import { ownerApi } from "../../api/owner";

const ROLE_LABELS = { admin: "Администратор", trainer: "Тренер" };
const ROLE_COLORS = {
  admin:   "bg-violet-100 text-violet-700 dark:bg-violet-900/20 dark:text-violet-400",
  trainer: "bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400",
};

const INPUT = "w-full px-3 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 outline-none focus:border-zinc-900 dark:focus:border-zinc-100";

function emptyForm(role = "admin") {
  return { role, full_name: "", email: "", phone: "", password: "", position: "", specialization: "", description: "" };
}

export default function OwnerStaff() {
  const [staff, setStaff]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [modal, setModal]       = useState(null);
  const [form, setForm]         = useState(emptyForm());
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [search, setSearch]     = useState("");
  const [roleFilter, setRole]   = useState("all");

  const load = useCallback(async () => {
    setLoading(true);
    try { setStaff((await ownerApi.listStaff()).data.data ?? []); }
    catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  function openAdd() { setForm(emptyForm("admin")); setError(null); setModal({ mode: "add" }); }

  function openEdit(s) {
    setForm({
      role: s.role, full_name: s.full_name ?? "", email: s.email ?? "",
      phone: s.phone ?? "", password: "", position: s.position ?? "",
      specialization: s.specialization ?? "", description: s.description ?? "",
    });
    setError(null);
    setModal({ mode: "edit", id: s.id });
  }

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  async function handleSave() {
    if (!form.full_name.trim()) { setError("Введите ФИО"); return; }
    setSaving(true); setError(null);
    try {
      const payload = { ...form };
      if (!payload.password) delete payload.password;
      if (payload.role !== "admin")   delete payload.position;
      if (payload.role !== "trainer") { delete payload.specialization; delete payload.description; }
      if (modal.mode === "add") await ownerApi.storeStaff(payload);
      else                      await ownerApi.updateStaff(modal.id, payload);
      setModal(null); load();
    } catch (err) {
      const msg  = err.response?.data?.message;
      const errs = err.response?.data?.errors;
      setError(msg ?? (errs ? Object.values(errs).flat().join("; ") : "Ошибка сохранения"));
    } finally { setSaving(false); }
  }

  async function handleDelete() {
    setDeleting(true);
    try { await ownerApi.destroyStaff(deleteId); setDeleteId(null); load(); }
    catch (err) { alert(err.response?.data?.message ?? "Ошибка удаления"); }
    finally { setDeleting(false); }
  }

  const filtered = staff.filter(s => {
    const q = search.toLowerCase();
    return (!q || (s.full_name ?? "").toLowerCase().includes(q) || (s.email ?? "").toLowerCase().includes(q))
      && (roleFilter === "all" || s.role === roleFilter);
  });

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-5xl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Персонал</h1>
          <p className="text-xs text-zinc-400 mt-0.5">Администраторы и тренеры</p>
        </div>
        <button onClick={openAdd} className="px-4 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-sm font-medium rounded-lg hover:opacity-80 transition-opacity">
          + Добавить сотрудника
        </button>
      </div>

      <div className="flex gap-3 flex-wrap">
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Поиск по имени или email…"
          className="px-3 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 outline-none w-full sm:w-64"
        />
        <div className="flex bg-zinc-100 dark:bg-zinc-800 rounded-lg p-0.5 gap-0.5">
          {[["all","Все"],["admin","Администраторы"],["trainer","Тренеры"]].map(([v, l]) => (
            <button key={v} onClick={() => setRole(v)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${roleFilter === v ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-sm" : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"}`}
            >{l}</button>
          ))}
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-x-auto">
        {loading ? (
          <div className="p-8 text-center text-sm text-zinc-400">Загрузка...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-zinc-400">Сотрудники не найдены</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-zinc-400 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
                <th className="text-left px-4 py-2.5 font-normal">Сотрудник</th>
                <th className="text-left px-4 py-2.5 font-normal">Роль</th>
                <th className="text-left px-4 py-2.5 font-normal">Контакты</th>
                <th className="text-left px-4 py-2.5 font-normal">Доп. информация</th>
                <th className="text-right px-4 py-2.5 font-normal">Действия</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s, i) => (
                <tr key={s.id} className={`border-b border-zinc-50 dark:border-zinc-800 last:border-0 ${i % 2 ? "bg-zinc-50/40 dark:bg-zinc-800/10" : ""}`}>
                  <td className="px-4 py-3">
                    <div className="font-medium text-zinc-900 dark:text-zinc-100">{s.full_name ?? "—"}</div>
                    <div className="text-xs text-zinc-400 mt-0.5">{s.login}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${ROLE_COLORS[s.role] ?? "bg-zinc-100 text-zinc-500"}`}>
                      {ROLE_LABELS[s.role] ?? s.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                    <div>{s.email ?? "—"}</div>
                    {s.phone && <div className="text-xs text-zinc-400">{s.phone}</div>}
                  </td>
                  <td className="px-4 py-3 text-xs text-zinc-500 dark:text-zinc-400">
                    {s.position       && <div>Должность: {s.position}</div>}
                    {s.specialization && <div>Специализация: {s.specialization}</div>}
                    {s.description    && <div className="truncate max-w-[180px]">{s.description}</div>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => openEdit(s)} className="text-xs px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors">
                        Изменить
                      </button>
                      <button onClick={() => setDeleteId(s.id)} className="text-xs px-3 py-1.5 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors">
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
        <Modal title={modal.mode === "add" ? "Добавить сотрудника" : "Редактировать сотрудника"} onClose={() => setModal(null)}>
          <div className="space-y-3">
            {modal.mode === "add" && (
              <Field label="Роль">
                <select value={form.role} onChange={e => set("role", e.target.value)} className={INPUT}>
                  <option value="admin">Администратор</option>
                  <option value="trainer">Тренер</option>
                </select>
              </Field>
            )}
            <Field label="ФИО *">
              <input value={form.full_name} onChange={e => set("full_name", e.target.value)} className={INPUT} placeholder="Иванов Иван Иванович" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Email">
                <input value={form.email} onChange={e => set("email", e.target.value)} type="email" className={INPUT} placeholder="mail@example.com" />
              </Field>
              <Field label="Телефон">
                <input value={form.phone} onChange={e => set("phone", e.target.value)} className={INPUT} placeholder="+7 900 000-00-00" />
              </Field>
            </div>
            <Field label={modal.mode === "add" ? "Пароль (пусто — авто)" : "Новый пароль (пусто — без изменений)"}>
              <input value={form.password} onChange={e => set("password", e.target.value)} type="password" className={INPUT} placeholder="••••••" />
            </Field>
            {form.role === "admin" && (
              <Field label="Должность">
                <input value={form.position} onChange={e => set("position", e.target.value)} className={INPUT} placeholder="Старший администратор" />
              </Field>
            )}
            {form.role === "trainer" && (
              <>
                <Field label="Специализация">
                  <input value={form.specialization} onChange={e => set("specialization", e.target.value)} className={INPUT} placeholder="Йога, пилатес" />
                </Field>
                <Field label="Описание">
                  <textarea value={form.description} onChange={e => set("description", e.target.value)} rows={3} className={`${INPUT} resize-none`} placeholder="Биография тренера" />
                </Field>
              </>
            )}
            {error && <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">{error}</p>}
          </div>
          <ModalFooter onCancel={() => setModal(null)} onConfirm={handleSave} loading={saving} />
        </Modal>
      )}

      {deleteId && (
        <Modal title="Удалить сотрудника?" onClose={() => setDeleteId(null)}>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">Учётная запись будет удалена без возможности восстановления.</p>
          <ModalFooter onCancel={() => setDeleteId(null)} onConfirm={handleDelete} loading={deleting} confirmLabel="Удалить" danger />
        </Modal>
      )}
    </div>
  );
}

// ── Shared UI ───────────────────────────────────────────────────────────

export function Modal({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6 w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">{title}</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-xl leading-none w-7 h-7 flex items-center justify-center">×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs text-zinc-500 mb-1">{label}</label>
      {children}
    </div>
  );
}

export function ModalFooter({ onCancel, onConfirm, loading, confirmLabel = "Сохранить", danger = false }) {
  return (
    <div className="flex gap-2 justify-end mt-5">
      <button onClick={onCancel} className="px-4 py-2 text-sm rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 transition-colors">
        Отмена
      </button>
      <button onClick={onConfirm} disabled={loading}
        className={`px-4 py-2 text-sm rounded-lg font-medium hover:opacity-80 transition-opacity disabled:opacity-50 ${danger ? "bg-red-600 text-white" : "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"}`}
      >
        {loading ? "Сохранение…" : confirmLabel}
      </button>
    </div>
  );
}

export const INPUT_CLS = INPUT;
