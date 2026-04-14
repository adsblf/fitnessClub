import { useState, useEffect, useCallback } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { trainerClientsApi } from "../../api/trainerClients";
import ClientSearchAutocomplete from "../../components/ClientSearchAutocomplete";

// ─── Главная страница ──────────────────────────────────────
export default function TrainerMyClients() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState(null);
  const [search, setSearch] = useState("");

  const fetchClients = useCallback(() => {
    setLoading(true);
    trainerClientsApi
      .list()
      .then((r) => setClients(r.data.data))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  async function handleDetach(clientId, name) {
    if (!confirm(`Открепить клиента «${name}»? Карточка и замеры сохранятся.`)) return;
    await trainerClientsApi.detach(clientId);
    fetchClients();
  }

  const filtered = clients.filter((c) =>
    c.full_name.toLowerCase().includes(search.toLowerCase()) ||
    (c.phone ?? "").includes(search)
  );

  return (
    <div className="p-6 space-y-4">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Мои клиенты</h1>
        <div className="flex gap-2 flex-1 min-w-0 justify-end">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по ФИО или телефону..."
            className="w-56 px-3 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 outline-none focus:border-zinc-400"
          />
          <button
            onClick={() => setShowAdd(true)}
            className="px-4 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg text-sm font-medium hover:opacity-80 shrink-0"
          >
            + Добавить клиента
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-10 text-center text-sm text-zinc-400">Загрузка...</div>
      ) : clients.length === 0 ? (
        <div className="py-10 text-center text-sm text-zinc-400">
          Нет закреплённых клиентов. Нажмите «Добавить клиента».
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-10 text-center text-sm text-zinc-400">Ничего не найдено по запросу.</div>
      ) : (
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-zinc-100 dark:border-zinc-800">
                <th className="text-left px-4 py-2.5 text-xs font-medium text-zinc-400 w-full">Клиент</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-zinc-400 whitespace-nowrap">Статус</th>
                <th className="text-center px-4 py-2.5 text-xs font-medium text-zinc-400 whitespace-nowrap">Занятий</th>
                <th className="text-center px-4 py-2.5 text-xs font-medium text-zinc-400 whitespace-nowrap">Последнее занятие</th>
                <th className="text-center px-4 py-2.5 text-xs font-medium text-zinc-400 whitespace-nowrap">Последний замер</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <ClientRow
                  key={c.id}
                  client={c}
                  onOpen={() => setSelectedClientId(c.id)}
                  onDetach={() => handleDetach(c.id, c.full_name)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showAdd && (
        <AddClientModal
          onClose={() => setShowAdd(false)}
          onAdded={() => {
            setShowAdd(false);
            fetchClients();
          }}
        />
      )}

      {selectedClientId && (
        <ClientDetailModal
          clientId={selectedClientId}
          onClose={() => {
            setSelectedClientId(null);
            fetchClients();
          }}
        />
      )}
    </div>
  );
}

// ─── Строка клиента в таблице ────────────────────────────────
function ClientRow({ client, onOpen, onDetach }) {
  const lastVisit = client.last_my_visit
    ? new Date(client.last_my_visit).toLocaleDateString("ru-RU")
    : "—";
  const lastMeasurement = client.last_measurement
    ? new Date(client.last_measurement).toLocaleDateString("ru-RU")
    : "—";

  return (
    <tr className="border-b last:border-0 border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors">
      {/* Имя + телефон */}
      <td className="px-4 py-3">
        <div className="font-medium text-zinc-900 dark:text-zinc-100">{client.full_name}</div>
        <div className="text-xs text-zinc-400 mt-0.5">{client.phone ?? "—"}</div>
      </td>

      {/* Статус */}
      <td className="px-4 py-3 whitespace-nowrap">
        <span
          className={`text-xs font-medium px-2 py-0.5 rounded ${
            client.status === "active"
              ? "bg-emerald-100 text-emerald-700"
              : "bg-zinc-100 text-zinc-500"
          }`}
        >
          {client.status === "active" ? "Активен" : client.status ?? "—"}
        </span>
      </td>

      {/* Занятий */}
      <td className="px-4 py-3 text-center whitespace-nowrap">
        <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
          {client.my_visits_count ?? "—"}
        </span>
      </td>

      {/* Последнее занятие */}
      <td className="px-4 py-3 text-center whitespace-nowrap">
        <span className="text-sm text-zinc-700 dark:text-zinc-300">{lastVisit}</span>
      </td>

      {/* Последний замер */}
      <td className="px-4 py-3 text-center whitespace-nowrap">
        <span className="text-sm text-zinc-700 dark:text-zinc-300">{lastMeasurement}</span>
      </td>

      {/* Кнопки */}
      <td className="px-4 py-3">
        <div className="flex gap-2 justify-end">
          <button
            onClick={onOpen}
            className="px-3 py-1.5 text-xs bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg font-medium hover:opacity-80"
          >
            Открыть
          </button>
          <button
            onClick={onDetach}
            className="px-3 py-1.5 text-xs border border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:text-red-500 hover:border-red-300 rounded-lg transition-colors"
          >
            Открепить
          </button>
        </div>
      </td>
    </tr>
  );
}

// ─── Модалка добавления клиента ───────────────────────────
function AddClientModal({ onClose, onAdded }) {
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleAdd() {
    if (!selected) { setError("Выберите клиента"); return; }
    setLoading(true);
    setError(null);
    try {
      await trainerClientsApi.attach(selected.person_id);
      onAdded();
    } catch (err) {
      setError(err.response?.data?.message || "Ошибка");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6 w-full max-w-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
          Добавить клиента
        </h2>
        {error && <div className="text-sm text-red-500 mb-3">{error}</div>}
        <ClientSearchAutocomplete onSelect={setSelected} placeholder="Поиск по ФИО..." />
        {selected && (
          <div className="mt-2 px-3 py-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800 text-sm font-medium text-emerald-900 dark:text-emerald-100">
            {selected.full_name}
          </div>
        )}
        <div className="flex gap-3 mt-4">
          <button
            onClick={handleAdd}
            disabled={loading || !selected}
            className="flex-1 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg text-sm font-medium hover:opacity-80 disabled:opacity-50"
          >
            {loading ? "Добавление..." : "Добавить"}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-600 dark:text-zinc-400"
          >
            Отмена
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Модалка детальной карточки клиента ──────────────────
function ClientDetailModal({ clientId, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("card"); // 'card' | 'measurements' | 'chart'

  const fetchDetail = useCallback(() => {
    setLoading(true);
    trainerClientsApi
      .get(clientId)
      .then((r) => setData(r.data.data))
      .finally(() => setLoading(false));
  }, [clientId]);

  useEffect(() => { fetchDetail(); }, [fetchDetail]);

  if (loading || !data) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-10 text-sm text-zinc-400">
          Загрузка...
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 w-full max-w-2xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Шапка */}
        <div className="px-6 pt-5 pb-4 border-b border-zinc-100 dark:border-zinc-800 shrink-0">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                {data.client.full_name}
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                {data.client.phone ?? "Телефон не указан"}
                {data.client.birth_date && ` · ${new Date(data.client.birth_date).toLocaleDateString("ru-RU")}`}
              </p>
            </div>
            <button onClick={onClose} className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 text-xl leading-none">×</button>
          </div>

          {/* Статистика */}
          <div className="grid grid-cols-3 gap-3 mt-4">
            <StatBox label="Занятий со мной" value={data.stats.my_visits_count} />
            <StatBox label="За 30 дней (всего)" value={data.stats.visits_30_days} />
            <StatBox
              label="Последнее занятие"
              value={
                data.stats.last_my_visit
                  ? new Date(data.stats.last_my_visit).toLocaleDateString("ru-RU")
                  : "—"
              }
            />
          </div>
        </div>

        {/* Вкладки */}
        <div className="flex border-b border-zinc-100 dark:border-zinc-800 shrink-0">
          {[
            { key: "card",         label: "Карточка" },
            { key: "measurements", label: "История замеров" },
            { key: "chart",        label: "График" },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                tab === t.key
                  ? "border-zinc-900 dark:border-zinc-100 text-zinc-900 dark:text-zinc-100"
                  : "border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Содержимое вкладки */}
        <div className="overflow-y-auto flex-1 p-6">
          {tab === "card" && (
            <CardTab
              clientId={clientId}
              card={data.card}
              onSaved={fetchDetail}
            />
          )}
          {tab === "measurements" && (
            <MeasurementsTab
              clientId={clientId}
              measurements={data.measurements}
              onChanged={fetchDetail}
            />
          )}
          {tab === "chart" && (
            <ChartTab measurements={data.measurements} />
          )}
        </div>
      </div>
    </div>
  );
}

function StatBox({ label, value }) {
  return (
    <div className="bg-zinc-50 dark:bg-zinc-800 rounded-lg p-3 text-center">
      <div className="text-xs text-zinc-400 mb-1">{label}</div>
      <div className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">{value}</div>
    </div>
  );
}

// ─── Вкладка "Карточка" ───────────────────────────────────
function CardTab({ clientId, card, onSaved }) {
  const [form, setForm] = useState({
    training_goal:     card?.training_goal     ?? "",
    contraindications: card?.contraindications ?? "",
    notes:             card?.notes             ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await trainerClientsApi.upsertCard(clientId, form);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      onSaved();
    } catch (err) {
      setError(err.response?.data?.message || "Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  }

  function set(field) {
    return (e) => { setSaved(false); setForm({ ...form, [field]: e.target.value }); };
  }

  return (
    <form onSubmit={handleSave} className="space-y-4">
      {error && <div className="text-sm text-red-500">{error}</div>}

      <TextAreaField
        label="Цели тренировок"
        value={form.training_goal}
        onChange={set("training_goal")}
        placeholder="Снижение веса, набор мышечной массы, растяжка..."
        rows={3}
      />
      <TextAreaField
        label="Противопоказания"
        value={form.contraindications}
        onChange={set("contraindications")}
        placeholder="Проблемы с суставами, аллергии..."
        rows={3}
      />
      <TextAreaField
        label="Заметки тренера"
        value={form.notes}
        onChange={set("notes")}
        placeholder="Личные наблюдения, рекомендации, программа тренировок..."
        rows={4}
      />

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="px-5 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg text-sm font-medium hover:opacity-80 disabled:opacity-50"
        >
          {saving ? "Сохранение..." : "Сохранить"}
        </button>
        {saved && (
          <span className="text-sm text-emerald-600 dark:text-emerald-400">✓ Сохранено</span>
        )}
      </div>

      {card?.updated_at && (
        <p className="text-xs text-zinc-400">
          Последнее изменение: {new Date(card.updated_at).toLocaleString("ru-RU")}
        </p>
      )}
    </form>
  );
}

function TextAreaField({ label, ...props }) {
  return (
    <div>
      <label className="block text-xs text-zinc-500 mb-1">{label}</label>
      <textarea
        className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 outline-none focus:border-zinc-400 resize-none"
        {...props}
      />
    </div>
  );
}

// ─── Вкладка "История замеров" ────────────────────────────
function MeasurementsTab({ clientId, measurements, onChanged }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    measured_at: new Date().toISOString().slice(0, 10),
    weight: "", height: "", chest: "", waist: "", hips: "", body_fat: "", notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  async function handleAdd(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = { measured_at: form.measured_at };
      if (form.weight)   payload.weight   = parseFloat(form.weight);
      if (form.height)   payload.height   = parseFloat(form.height);
      if (form.chest)    payload.chest    = parseFloat(form.chest);
      if (form.waist)    payload.waist    = parseFloat(form.waist);
      if (form.hips)     payload.hips     = parseFloat(form.hips);
      if (form.body_fat) payload.body_fat = parseFloat(form.body_fat);
      if (form.notes)    payload.notes    = form.notes;
      await trainerClientsApi.addMeasurement(clientId, payload);
      setShowForm(false);
      setForm({ measured_at: new Date().toISOString().slice(0, 10), weight: "", height: "", chest: "", waist: "", hips: "", body_fat: "", notes: "" });
      onChanged();
    } catch (err) {
      setError(err.response?.data?.message || "Ошибка добавления");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!confirm("Удалить замер?")) return;
    await trainerClientsApi.deleteMeasurement(clientId, id);
    onChanged();
  }

  function set(field) {
    return (e) => setForm({ ...form, [field]: e.target.value });
  }

  const sorted = [...measurements].sort(
    (a, b) => new Date(b.measured_at) - new Date(a.measured_at)
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Записей: {measurements.length}
        </span>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="px-3 py-1.5 text-xs bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg font-medium hover:opacity-80"
        >
          {showForm ? "Отмена" : "+ Новый замер"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="bg-zinc-50 dark:bg-zinc-800 rounded-xl p-4 space-y-3">
          <div className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Новый замер</div>
          {error && <div className="text-xs text-red-500">{error}</div>}
          <div className="grid grid-cols-2 gap-3">
            <MiniInput label="Дата" type="date" value={form.measured_at} onChange={set("measured_at")} required />
            <MiniInput label="Вес (кг)" type="number" step="0.1" value={form.weight} onChange={set("weight")} placeholder="70.5" />
            <MiniInput label="Рост (см)" type="number" step="0.1" value={form.height} onChange={set("height")} placeholder="175" />
            <MiniInput label="Грудь (см)" type="number" step="0.1" value={form.chest} onChange={set("chest")} placeholder="90" />
            <MiniInput label="Талия (см)" type="number" step="0.1" value={form.waist} onChange={set("waist")} placeholder="70" />
            <MiniInput label="Бёдра (см)" type="number" step="0.1" value={form.hips} onChange={set("hips")} placeholder="95" />
            <MiniInput label="% жира" type="number" step="0.1" value={form.body_fat} onChange={set("body_fat")} placeholder="18" />
          </div>
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Заметка</label>
            <input
              type="text"
              value={form.notes}
              onChange={set("notes")}
              placeholder="Произвольный комментарий"
              className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-1.5 text-xs bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg font-medium hover:opacity-80 disabled:opacity-50"
          >
            {saving ? "Сохранение..." : "Добавить замер"}
          </button>
        </form>
      )}

      {sorted.length === 0 ? (
        <div className="py-8 text-center text-sm text-zinc-400">Замеры не добавлены</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-zinc-400 border-b border-zinc-100 dark:border-zinc-800">
                <th className="text-left py-2 px-2 font-normal">Дата</th>
                <th className="text-right py-2 px-2 font-normal">Вес</th>
                <th className="text-right py-2 px-2 font-normal">Рост</th>
                <th className="text-right py-2 px-2 font-normal">Грудь</th>
                <th className="text-right py-2 px-2 font-normal">Талия</th>
                <th className="text-right py-2 px-2 font-normal">Бёдра</th>
                <th className="text-right py-2 px-2 font-normal">% жира</th>
                <th className="text-left py-2 px-2 font-normal">Заметка</th>
                <th className="py-2 px-2" />
              </tr>
            </thead>
            <tbody>
              {sorted.map((m, i) => (
                <tr
                  key={m.id}
                  className={`border-b border-zinc-50 dark:border-zinc-800 last:border-0 ${
                    i % 2 ? "bg-zinc-50/50 dark:bg-zinc-800/20" : ""
                  }`}
                >
                  <td className="py-2 px-2 font-medium text-zinc-700 dark:text-zinc-300">
                    {new Date(m.measured_at).toLocaleDateString("ru-RU")}
                  </td>
                  <td className="py-2 px-2 text-right text-zinc-600 dark:text-zinc-400">{m.weight ?? "—"}</td>
                  <td className="py-2 px-2 text-right text-zinc-600 dark:text-zinc-400">{m.height ?? "—"}</td>
                  <td className="py-2 px-2 text-right text-zinc-600 dark:text-zinc-400">{m.chest ?? "—"}</td>
                  <td className="py-2 px-2 text-right text-zinc-600 dark:text-zinc-400">{m.waist ?? "—"}</td>
                  <td className="py-2 px-2 text-right text-zinc-600 dark:text-zinc-400">{m.hips ?? "—"}</td>
                  <td className="py-2 px-2 text-right text-zinc-600 dark:text-zinc-400">{m.body_fat ?? "—"}</td>
                  <td className="py-2 px-2 text-zinc-500 dark:text-zinc-500 max-w-[120px] truncate">{m.notes ?? ""}</td>
                  <td className="py-2 px-2">
                    <button
                      onClick={() => handleDelete(m.id)}
                      className="text-zinc-300 dark:text-zinc-600 hover:text-red-500 transition-colors"
                      title="Удалить"
                    >
                      ×
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function MiniInput({ label, ...props }) {
  return (
    <div>
      <label className="block text-xs text-zinc-500 mb-1">{label}</label>
      <input
        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 outline-none focus:border-zinc-400"
        {...props}
      />
    </div>
  );
}

// ─── Вкладка "График" ─────────────────────────────────────
const CHART_LINES = [
  { key: "weight",   name: "Вес (кг)",    color: "#6366f1" },
  { key: "chest",    name: "Грудь (см)",  color: "#f59e0b" },
  { key: "waist",    name: "Талия (см)",  color: "#10b981" },
  { key: "hips",     name: "Бёдра (см)",  color: "#ec4899" },
  { key: "body_fat", name: "% жира",      color: "#f97316" },
];

function ChartTab({ measurements }) {
  const [visibleLines, setVisibleLines] = useState(["weight", "waist"]);

  const sorted = [...measurements].sort(
    (a, b) => new Date(a.measured_at) - new Date(b.measured_at)
  );

  const chartData = sorted.map((m) => ({
    date: new Date(m.measured_at).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" }),
    weight:   m.weight   ?? undefined,
    chest:    m.chest    ?? undefined,
    waist:    m.waist    ?? undefined,
    hips:     m.hips     ?? undefined,
    body_fat: m.body_fat ?? undefined,
  }));

  if (chartData.length < 2) {
    return (
      <div className="py-12 text-center text-sm text-zinc-400">
        Для графика нужно минимум 2 замера
      </div>
    );
  }

  function toggle(key) {
    setVisibleLines((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  }

  return (
    <div className="space-y-4">
      {/* Переключатели линий */}
      <div className="flex flex-wrap gap-2">
        {CHART_LINES.map((l) => (
          <button
            key={l.key}
            onClick={() => toggle(l.key)}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
              visibleLines.includes(l.key)
                ? "border-transparent text-white"
                : "border-zinc-200 dark:border-zinc-700 text-zinc-500 bg-transparent"
            }`}
            style={visibleLines.includes(l.key) ? { backgroundColor: l.color } : {}}
          >
            <span
              className="inline-block w-2 h-2 rounded-full"
              style={{ backgroundColor: l.color }}
            />
            {l.name}
          </button>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip
            contentStyle={{
              backgroundColor: "var(--tooltip-bg, #fff)",
              border: "1px solid #e4e4e7",
              borderRadius: 8,
              fontSize: 12,
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          {CHART_LINES.filter((l) => visibleLines.includes(l.key)).map((l) => (
            <Line
              key={l.key}
              type="monotone"
              dataKey={l.key}
              name={l.name}
              stroke={l.color}
              strokeWidth={2}
              dot={{ r: 3 }}
              connectNulls={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
