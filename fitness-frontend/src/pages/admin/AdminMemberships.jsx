import { useState, useEffect, useCallback } from "react";
import { membershipsApi } from "../../api/memberships";
import { clientsApi } from "../../api/clients";

const STATUS = {
  active:    { label: "Активный",    cls: "bg-emerald-100 text-emerald-700" },
  frozen:    { label: "Заморожен",   cls: "bg-blue-100 text-blue-700" },
  expired:   { label: "Истёк",       cls: "bg-zinc-100 text-zinc-500" },
  cancelled: { label: "Отменён",     cls: "bg-red-100 text-red-600" },
};

export default function AdminMemberships() {
  const [memberships, setMemberships] = useState([]);
  const [meta, setMeta] = useState({});
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  const fetch = useCallback(
    (page = 1) => {
      setLoading(true);
      const params = { page, per_page: 15 };
      if (statusFilter) params.status = statusFilter;
      membershipsApi
        .list(params)
        .then((r) => {
          setMemberships(r.data.data);
          setMeta(r.data.meta);
        })
        .finally(() => setLoading(false));
    },
    [statusFilter]
  );

  useEffect(() => {
    fetch(1);
  }, [fetch]);

  async function handleFreeze(id) {
    const days = prompt("На сколько дней заморозить?", "14");
    if (!days) return;
    await membershipsApi.freeze(id, Number(days));
    fetch(meta.current_page);
  }

  async function handleUnfreeze(id) {
    await membershipsApi.unfreeze(id);
    fetch(meta.current_page);
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Абонементы</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="px-4 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg text-sm font-medium hover:opacity-80"
        >
          + Оформить абонемент
        </button>
      </div>

      <div className="flex gap-2">
        {["", "active", "frozen", "expired"].map((v) => (
          <button
            key={v}
            onClick={() => setStatusFilter(v)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              statusFilter === v
                ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                : "bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400"
            }`}
          >
            {v === "" ? "Все" : STATUS[v]?.label ?? v}
          </button>
        ))}
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800">
        {loading ? (
          <div className="p-8 text-center text-sm text-zinc-400">Загрузка...</div>
        ) : memberships.length === 0 ? (
          <div className="p-8 text-center text-sm text-zinc-400">Абонементы не найдены</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-zinc-400 border-b border-zinc-100 dark:border-zinc-800">
                <th className="text-left px-5 py-2.5 font-normal">Номер</th>
                <th className="text-left px-5 py-2.5 font-normal">Клиент</th>
                <th className="text-left px-5 py-2.5 font-normal">Тип</th>
                <th className="text-left px-5 py-2.5 font-normal">Период</th>
                <th className="text-left px-5 py-2.5 font-normal">Остаток</th>
                <th className="text-left px-5 py-2.5 font-normal">Статус</th>
                <th className="px-5 py-2.5 font-normal"></th>
              </tr>
            </thead>
            <tbody>
              {memberships.map((m, i) => {
                const st = STATUS[m.status] ?? { label: m.status, cls: "bg-zinc-100" };
                return (
                  <tr key={m.id} className={`border-b border-zinc-50 dark:border-zinc-800 last:border-0 ${i % 2 ? "bg-zinc-50/50 dark:bg-zinc-800/20" : ""}`}>
                    <td className="px-5 py-3 text-zinc-500 font-mono text-xs">{m.membership_number}</td>
                    <td className="px-5 py-3 text-zinc-800 dark:text-zinc-200 font-medium">{m.client_name}</td>
                    <td className="px-5 py-3 text-zinc-500">{m.type?.name}</td>
                    <td className="px-5 py-3 text-zinc-500 text-xs">{m.start_date} — {m.end_date}</td>
                    <td className="px-5 py-3 text-zinc-500">{m.remaining_visits}</td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${st.cls}`}>{st.label}</span>
                      {m.frozen_until && <span className="ml-1 text-xs text-zinc-400">до {m.frozen_until}</span>}
                    </td>
                    <td className="px-5 py-3 text-right space-x-2">
                      {m.status === "active" && (
                        <button onClick={() => handleFreeze(m.id)} className="text-xs text-blue-600 hover:underline">
                          Заморозить
                        </button>
                      )}
                      {m.status === "frozen" && (
                        <button onClick={() => handleUnfreeze(m.id)} className="text-xs text-emerald-600 hover:underline">
                          Разморозить
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {showCreate && (
        <CreateMembershipModal
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            fetch(1);
          }}
        />
      )}
    </div>
  );
}

function CreateMembershipModal({ onClose, onCreated }) {
  const [types, setTypes] = useState([]);
  const [clients, setClients] = useState([]);
  const [form, setForm] = useState({
    client_id: "",
    membership_type_id: "",
    promo_code: "",
    payment_method: "cash",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    membershipsApi.types().then((r) => setTypes(r.data.data));
    clientsApi.list({ per_page: 100 }).then((r) => setClients(r.data.data));
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await membershipsApi.create({
        ...form,
        client_id: Number(form.client_id),
        membership_type_id: Number(form.membership_type_id),
      });
      onCreated();
    } catch (err) {
      setError(err.response?.data?.message || "Ошибка");
    } finally {
      setLoading(false);
    }
  }

  const selectedType = types.find((t) => t.id === Number(form.membership_type_id));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Оформить абонемент</h2>
        {error && <div className="text-sm text-red-500 mb-3">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Клиент</label>
            <select required value={form.client_id} onChange={(e) => setForm({ ...form, client_id: e.target.value })} className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100">
              <option value="">— Выберите —</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.full_name} ({c.email})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-zinc-500 mb-1">Тип абонемента</label>
            <select required value={form.membership_type_id} onChange={(e) => setForm({ ...form, membership_type_id: e.target.value })} className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100">
              <option value="">— Выберите —</option>
              {types.map((t) => (
                <option key={t.id} value={t.id}>{t.name} — {Number(t.price).toLocaleString("ru-RU")} ₽</option>
              ))}
            </select>
          </div>

          {selectedType && (
            <div className="bg-zinc-50 dark:bg-zinc-800 rounded-lg p-3 text-xs text-zinc-500">
              {selectedType.description} · {selectedType.visit_limit} посещений · {selectedType.duration_days} дней
            </div>
          )}

          <div>
            <label className="block text-xs text-zinc-500 mb-1">Промокод (необязательно)</label>
            <input
              value={form.promo_code}
              onChange={(e) => setForm({ ...form, promo_code: e.target.value })}
              className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 outline-none"
              placeholder="SUMMER2026"
            />
          </div>

          <div>
            <label className="block text-xs text-zinc-500 mb-1">Способ оплаты</label>
            <select value={form.payment_method} onChange={(e) => setForm({ ...form, payment_method: e.target.value })} className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100">
              <option value="cash">Наличные</option>
              <option value="card_terminal">Терминал</option>
              <option value="online_sbp">СБП</option>
            </select>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={loading} className="flex-1 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg text-sm font-medium hover:opacity-80 disabled:opacity-50">
              {loading ? "Оформление..." : "Оформить"}
            </button>
            <button type="button" onClick={onClose} className="px-4 py-2 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-600 dark:text-zinc-400">
              Отмена
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
