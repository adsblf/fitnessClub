import { useState, useEffect, useCallback } from "react";
import { membershipsApi } from "../../api/memberships";
import { clientsApi } from "../../api/clients";
import SearchableSelect from "../../components/ui/SearchableSelect";
import ClientDetailModal from "../../components/ClientDetailModal";

const STATUS = {
  active:    { label: "Активный",    cls: "bg-emerald-100 text-emerald-700" },
  frozen:    { label: "Заморожен",   cls: "bg-blue-100 text-blue-700" },
  expired:   { label: "Истёк",       cls: "bg-zinc-100 text-zinc-500" },
  cancelled: { label: "Аннулирован", cls: "bg-red-100 text-red-600" },
};

export default function AdminMemberships() {
  const [memberships, setMemberships] = useState([]);
  const [meta, setMeta] = useState({});
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [credentials, setCredentials] = useState(null);
  const [selectedClientId, setSelectedClientId] = useState(null);

  const fetch = useCallback(
      (page = 1) => {
        setLoading(true);
        const params = { page, per_page: 15 };
        if (statusFilter) params.status = statusFilter;
        if (search.trim()) params.search = search.trim();
        membershipsApi
            .list(params)
            .then((r) => {
              setMemberships(r.data.data);
              setMeta(r.data.meta);
            })
            .finally(() => setLoading(false));
      },
      [statusFilter, search]
  );

  // Дебаунс на поиск
  useEffect(() => {
    const t = setTimeout(() => fetch(1), 300);
    return () => clearTimeout(t);
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

  async function handleCancel(id) {
    if (!confirm("Аннулировать абонемент? Это действие необратимо.")) return;
    try {
      await membershipsApi.cancel(id);
      fetch(meta.current_page);
    } catch (err) {
      alert(err.response?.data?.message || "Ошибка");
    }
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

        {/* Поиск + фильтры */}
        <div className="flex gap-3 items-center flex-wrap">
          <input
              type="text"
              placeholder="Поиск по ФИО клиента..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full max-w-sm px-3 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 outline-none focus:border-zinc-400"
          />
          <div className="flex gap-2">
            {["", "active", "frozen", "expired", "cancelled"].map((v) => (
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
                      <tr
                          key={m.id}
                          className={`border-b border-zinc-50 dark:border-zinc-800 last:border-0 ${
                              i % 2 ? "bg-zinc-50/50 dark:bg-zinc-800/20" : ""
                          }`}
                      >
                        <td className="px-5 py-3 text-zinc-500 font-mono text-xs">{m.membership_number}</td>
                        <td className="px-5 py-3">
                          <button
                              onClick={() => setSelectedClientId(m.client_id)}
                              className="text-zinc-800 dark:text-zinc-200 font-medium hover:text-blue-600 dark:hover:text-blue-400 hover:underline transition-colors text-left"
                          >
                            {m.client_name}
                          </button>
                        </td>
                        <td className="px-5 py-3 text-zinc-500">{m.type?.name}</td>
                        <td className="px-5 py-3 text-zinc-500 text-xs">
                          {m.start_date} — {m.end_date}
                        </td>
                        <td className="px-5 py-3 text-zinc-500">{m.remaining_visits}</td>
                        <td className="px-5 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${st.cls}`}>
                        {st.label}
                      </span>
                          {m.frozen_until && (
                              <span className="ml-1 text-xs text-zinc-400">до {m.frozen_until}</span>
                          )}
                        </td>
                        <td className="px-5 py-3 text-right space-x-3 whitespace-nowrap">
                          {m.status === "active" && (
                              <>
                                <button onClick={() => handleFreeze(m.id)} className="text-xs text-blue-600 hover:underline">
                                  Заморозить
                                </button>
                                <button onClick={() => handleCancel(m.id)} className="text-xs text-red-500 hover:underline">
                                  Аннулировать
                                </button>
                              </>
                          )}
                          {m.status === "frozen" && (
                              <>
                                <button onClick={() => handleUnfreeze(m.id)} className="text-xs text-emerald-600 hover:underline">
                                  Разморозить
                                </button>
                                <button onClick={() => handleCancel(m.id)} className="text-xs text-red-500 hover:underline">
                                  Аннулировать
                                </button>
                              </>
                          )}
                        </td>
                      </tr>
                  );
                })}
                </tbody>
              </table>
          )}

          {meta.last_page > 1 && (
              <div className="flex justify-center gap-2 p-4 border-t border-zinc-100 dark:border-zinc-800">
                {Array.from({ length: meta.last_page }, (_, i) => (
                    <button
                        key={i + 1}
                        onClick={() => fetch(i + 1)}
                        className={`px-3 py-1 rounded text-xs ${
                            meta.current_page === i + 1
                                ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                                : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                        }`}
                    >
                      {i + 1}
                    </button>
                ))}
              </div>
          )}
        </div>

        {showCreate && (
            <CreateMembershipModal
                onClose={() => setShowCreate(false)}
                onCreated={(creds) => {
                  setShowCreate(false);
                  if (creds) setCredentials(creds);
                  fetch(1);
                }}
            />
        )}

        {credentials && (
            <CredentialsModal credentials={credentials} onClose={() => setCredentials(null)} />
        )}

        {selectedClientId && (
            <ClientDetailModal
                clientId={selectedClientId}
                onClose={() => setSelectedClientId(null)}
            />
        )}
      </div>
  );
}

// ── Модалка оформления абонемента ───────────────────
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
    clientsApi.list({ per_page: 500 }).then((r) => setClients(r.data.data));
  }, []);

  const selectedClient = clients.find((c) => String(c.id) === String(form.client_id));
  const selectedType = types.find((t) => String(t.id) === String(form.membership_type_id));

  // Имеет ли клиент паспорт? Поле has_passport приходит из API,
  // но на /clients (index) его нет — пользуемся косвенным признаком: есть phone+birth_date — нет.
  // Для надёжности — после выбора клиента подгружаем его карточку.
  const [clientHasPassport, setClientHasPassport] = useState(false);
  const [clientCheckLoading, setClientCheckLoading] = useState(false);

  useEffect(() => {
    if (!form.client_id) {
      setClientHasPassport(false);
      return;
    }
    setClientCheckLoading(true);
    clientsApi
        .get(form.client_id)
        .then((r) => setClientHasPassport(!!r.data.data.has_passport))
        .finally(() => setClientCheckLoading(false));
  }, [form.client_id]);

  // Фильтрация типов: если паспорта нет — только разовая (is_trial)
  const allowedTypes = clientHasPassport ? types : types.filter((t) => t.is_trial);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await membershipsApi.create({
        ...form,
        client_id: Number(form.client_id),
        membership_type_id: Number(form.membership_type_id),
      });
      onCreated(res.data.credentials ?? null);
    } catch (err) {
      setError(err.response?.data?.message || "Ошибка");
    } finally {
      setLoading(false);
    }
  }

  return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
        <div
            className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6 w-full max-w-md max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
        >
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Оформить абонемент</h2>
          {error && <div className="text-sm text-red-500 mb-3">{error}</div>}

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Клиент</label>
              <SearchableSelect
                  options={clients.map((c) => ({
                    value: c.id,
                    label: c.full_name,
                    sub: c.email,
                  }))}
                  value={form.client_id}
                  onChange={(v) => setForm({ ...form, client_id: v, membership_type_id: "" })}
                  placeholder="Начните вводить имя..."
                  emptyText="Клиенты не найдены"
              />
            </div>

            {/* Подсказка про паспорт */}
            {form.client_id && !clientCheckLoading && !clientHasPassport && (
                <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-xs text-amber-700 dark:text-amber-400">
                  У клиента не указаны паспортные данные. Доступна только{" "}
                  <strong>разовая тренировка</strong>.
                </div>
            )}

            <div>
              <label className="block text-xs text-zinc-500 mb-1">Тип абонемента</label>
              <select
                  required
                  value={form.membership_type_id}
                  onChange={(e) => setForm({ ...form, membership_type_id: e.target.value })}
                  disabled={!form.client_id || clientCheckLoading}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 disabled:opacity-50"
              >
                <option value="">— Выберите —</option>
                {allowedTypes.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} — {Number(t.price).toLocaleString("ru-RU")} ₽
                    </option>
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
              <select
                  value={form.payment_method}
                  onChange={(e) => setForm({ ...form, payment_method: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
              >
                <option value="cash">Наличные</option>
                <option value="card_terminal">Терминал</option>
                <option value="online_sbp">СБП</option>
              </select>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                  type="submit"
                  disabled={loading || !form.client_id || !form.membership_type_id}
                  className="flex-1 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg text-sm font-medium hover:opacity-80 disabled:opacity-50"
              >
                {loading ? "Оформление..." : "Оформить"}
              </button>
              <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-600 dark:text-zinc-400"
              >
                Отмена
              </button>
            </div>
          </form>
        </div>
      </div>
  );
}

// ── Модалка с учётными данными ───────────────────────
function CredentialsModal({ credentials, onClose }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    const text = `Логин: ${credentials.login}\nПароль: ${credentials.password}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
        <div
            className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
        >
          <div className="text-center mb-4">
            <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-950 rounded-full flex items-center justify-center text-2xl mx-auto mb-3">
              ✓
            </div>
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              Абонемент оформлен
            </h2>
            <p className="text-xs text-zinc-400 mt-1">
              Учётные данные клиента — сохраните и передайте клиенту. Они будут показаны только один раз.
            </p>
          </div>

          <div className="bg-zinc-50 dark:bg-zinc-800 rounded-lg p-4 mb-4 space-y-3 font-mono text-sm">
            <div>
              <div className="text-xs text-zinc-400 mb-0.5">Логин</div>
              <div className="text-zinc-900 dark:text-zinc-100 break-all">{credentials.login}</div>
            </div>
            <div>
              <div className="text-xs text-zinc-400 mb-0.5">Пароль</div>
              <div className="text-zinc-900 dark:text-zinc-100">{credentials.password}</div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
                onClick={copy}
                className="flex-1 py-2 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800"
            >
              {copied ? "Скопировано ✓" : "Скопировать"}
            </button>
            <button
                onClick={onClose}
                className="flex-1 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg text-sm font-medium hover:opacity-80"
            >
              Готово
            </button>
          </div>
        </div>
      </div>
  );
}
