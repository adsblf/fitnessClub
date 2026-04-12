import { useState, useEffect } from "react";
import { clientsApi } from "../api/clients";
import { todayStr } from "../lib/tz";

const STATUS = {
    active:   { label: "Активен",     cls: "bg-emerald-100 text-emerald-700" },
    inactive: { label: "Неактивен",   cls: "bg-zinc-100 text-zinc-500" },
    blocked:  { label: "Заблокирован", cls: "bg-red-100 text-red-600" },
};

const PHONE_REGEX = /^\+7-\d{3}-\d{3}-\d{4}$/;
const SERIES_REGEX = /^\d{4}$/;
const NUMBER_REGEX = /^\d{6}$/;
const DEPT_REGEX = /^\d{3}-\d{3}$/;

export default function ClientDetailModal({ clientId, onClose, onDeleted }) {
    const [detail, setDetail] = useState(null);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(false);

    function fetchDetail() {
        setLoading(true);
        clientsApi
            .get(clientId)
            .then((res) => setDetail(res.data.data))
            .finally(() => setLoading(false));
    }

    useEffect(() => {
        fetchDetail();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [clientId]);

    async function handleDelete() {
        if (!confirm("Удалить клиента? Это действие необратимо.")) return;
        await clientsApi.delete(clientId);
        onDeleted?.();
    }

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
            onClick={onClose}
        >
            <div
                className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6 w-full max-w-xl max-h-[85vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
            >
                {loading || !detail ? (
                    <div className="text-sm text-zinc-400">Загрузка карточки клиента...</div>
                ) : editing ? (
                    <EditMode
                        detail={detail}
                        onCancel={() => setEditing(false)}
                        onSaved={() => {
                            setEditing(false);
                            fetchDetail();
                        }}
                    />
                ) : (
                    <ViewMode
                        detail={detail}
                        clientId={clientId}
                        onClose={onClose}
                        onEdit={() => setEditing(true)}
                        onDelete={onDeleted ? handleDelete : null}
                    />
                )}
            </div>
        </div>
    );
}

// ── Режим просмотра ─────────────────────────────────
function ViewMode({ detail, clientId, onClose, onEdit, onDelete }) {
    return (
        <>
            <div className="flex justify-between items-start mb-5">
                <div>
                    <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                        {detail.full_name}
                    </h2>
                    <p className="text-xs text-zinc-400 mt-0.5">
                        Зарегистрирован: {detail.registration_date}
                    </p>
                </div>
                <span
                    className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                        STATUS[detail.status]?.cls ?? "bg-zinc-100 text-zinc-600"
                    }`}
                >
                    {STATUS[detail.status]?.label ?? detail.status}
                </span>
            </div>

            <Section title="Контакты">
                <Row label="Email" value={detail.email} />
                <Row label="Телефон" value={detail.phone ?? "—"} />
                <Row label="Дата рождения" value={detail.birth_date ?? "—"} />
            </Section>

            {/* Учётные данные для личного кабинета */}
            <CredentialsSection clientId={clientId} />

            <Section title="Паспортные данные">
                {detail.has_passport || detail.passport_series ? (
                    <>
                        <Row
                            label="Серия и номер"
                            value={`${detail.passport_series ?? "—"} ${detail.passport_number ?? ""}`}
                        />
                        <Row label="Дата выдачи" value={detail.passport_issued_at ?? "—"} />
                        <Row label="Кем выдан" value={detail.passport_issued_by ?? "—"} />
                        <Row label="Код подразделения" value={detail.passport_department_code ?? "—"} />
                        <Row label="Адрес регистрации" value={detail.registration_address ?? "—"} />
                    </>
                ) : (
                    <p className="text-xs text-zinc-400 italic">Паспортные данные не указаны</p>
                )}
            </Section>

            {detail.membership && (
                <Section title="Активный абонемент">
                    <Row label="Тип" value={detail.membership.type} />
                    <Row label="Статус" value={detail.membership.status} />
                    <Row label="Действует до" value={detail.membership.end_date} />
                    <Row label="Остаток посещений" value={detail.membership.remaining_visits} />
                </Section>
            )}

            {detail.card && (
                <Section title="Карточка тренировок">
                    <Row label="Цель" value={detail.card.training_goal ?? "—"} />
                    <Row label="Вес" value={detail.card.current_weight ? `${detail.card.current_weight} кг` : "—"} />
                    <Row label="Рост" value={detail.card.height ? `${detail.card.height} см` : "—"} />
                    <Row label="ИМТ" value={detail.card.bmi ?? "—"} />
                </Section>
            )}

            <div className="grid grid-cols-2 gap-3 mb-5">
                <div className="bg-zinc-50 dark:bg-zinc-800 rounded-lg p-3 text-center">
                    <div className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                        {detail.total_visits ?? 0}
                    </div>
                    <div className="text-xs text-zinc-400">Посещений</div>
                </div>
                <div className="bg-zinc-50 dark:bg-zinc-800 rounded-lg p-3 text-center">
                    <div className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                        {detail.active_bookings ?? 0}
                    </div>
                    <div className="text-xs text-zinc-400">Активных записей</div>
                </div>
            </div>

            <div className="flex gap-3">
                <button
                    onClick={onClose}
                    className="flex-1 py-2 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                >
                    Закрыть
                </button>
                <button
                    onClick={onEdit}
                    className="px-4 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg text-sm font-medium hover:opacity-80"
                >
                    Редактировать
                </button>
                {onDelete && (
                    <button
                        onClick={onDelete}
                        className="px-4 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-950 rounded-lg transition-colors"
                    >
                        Удалить
                    </button>
                )}
            </div>
        </>
    );
}

// ── Секция с учётными данными (показ по кнопке) ─────
function CredentialsSection({ clientId }) {
    const [shown, setShown] = useState(false);
    const [loading, setLoading] = useState(false);
    const [creds, setCreds] = useState(null);
    const [error, setError] = useState(null);
    const [copied, setCopied] = useState(false);

    async function handleShow() {
        if (shown) {
            // Скрыть обратно
            setShown(false);
            setCreds(null);
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const r = await clientsApi.credentials(clientId);
            if (r.data.data) {
                setCreds(r.data.data);
                setShown(true);
            } else {
                setError(r.data.message ?? "Учётные данные ещё не генерировались");
            }
        } catch (err) {
            setError(err.response?.data?.message ?? "Не удалось получить учётные данные");
        } finally {
            setLoading(false);
        }
    }

    function copyAll() {
        if (!creds) return;
        navigator.clipboard.writeText(`Логин: ${creds.login}\nПароль: ${creds.password}`);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }

    return (
        <div className="mb-5">
            <div className="flex items-center justify-between mb-2">
                <div className="text-xs uppercase tracking-wide text-zinc-400">
                    Учётные данные для личного кабинета
                </div>
                <button
                    onClick={handleShow}
                    disabled={loading}
                    className="text-xs text-blue-600 hover:underline disabled:opacity-50"
                >
                    {loading ? "..." : shown ? "Скрыть" : "Показать"}
                </button>
            </div>

            <div className="bg-zinc-50 dark:bg-zinc-800 rounded-lg p-3">
                {error ? (
                    <p className="text-xs text-amber-600 dark:text-amber-400 italic">{error}</p>
                ) : !shown ? (
                    <p className="text-xs text-zinc-400 italic">
                        Скрыто. Нажмите «Показать», чтобы увидеть логин и пароль клиента.
                    </p>
                ) : creds ? (
                    <div className="space-y-2 font-mono text-xs">
                        <div className="flex justify-between items-center">
                            <div>
                                <div className="text-zinc-400 text-[10px] uppercase">Логин</div>
                                <div className="text-zinc-900 dark:text-zinc-100 break-all">{creds.login}</div>
                            </div>
                        </div>
                        <div className="flex justify-between items-center">
                            <div>
                                <div className="text-zinc-400 text-[10px] uppercase">Пароль</div>
                                <div className="text-zinc-900 dark:text-zinc-100">{creds.password}</div>
                            </div>
                            <button
                                onClick={copyAll}
                                className="text-xs text-blue-600 hover:underline ml-3"
                            >
                                {copied ? "Скопировано ✓" : "Копировать"}
                            </button>
                        </div>
                    </div>
                ) : null}
            </div>
        </div>
    );
}

// ── Режим редактирования ───────────────────────────
function EditMode({ detail, onCancel, onSaved }) {
    const [form, setForm] = useState({
        full_name: detail.full_name ?? "",
        email: detail.email ?? "",
        phone: detail.phone ?? "",
        birth_date: detail.birth_date ?? "",
        status: detail.status ?? "active",
        passport_series: detail.passport_series ?? "",
        passport_number: detail.passport_number ?? "",
        passport_issued_at: detail.passport_issued_at ?? "",
        passport_issued_by: detail.passport_issued_by ?? "",
        passport_department_code: detail.passport_department_code ?? "",
        registration_address: detail.registration_address ?? "",
    });
    const [errors, setErrors] = useState({});
    const [serverError, setServerError] = useState(null);
    const [saving, setSaving] = useState(false);

    function set(field, value) {
        setForm({ ...form, [field]: value });
    }

    function validate() {
        const e = {};
        if (!form.full_name.trim()) e.full_name = "Укажите ФИО";
        if (!form.email.trim()) e.email = "Укажите email";
        if (form.phone && !PHONE_REGEX.test(form.phone)) {
            e.phone = "Формат: +7-nnn-nnn-nnnn";
        }
        if (form.passport_series && !SERIES_REGEX.test(form.passport_series)) {
            e.passport_series = "Серия — ровно 4 цифры";
        }
        if (form.passport_number && !NUMBER_REGEX.test(form.passport_number)) {
            e.passport_number = "Номер — ровно 6 цифр";
        }
        if (form.passport_department_code && !DEPT_REGEX.test(form.passport_department_code)) {
            e.passport_department_code = "Формат: nnn-nnn";
        }
        if (
            form.passport_issued_at &&
            form.passport_issued_at > todayStr()
        ) {
            e.passport_issued_at = "Дата не может быть в будущем";
        }
        setErrors(e);
        return Object.keys(e).length === 0;
    }

    async function handleSave(e) {
        e.preventDefault();
        setServerError(null);
        if (!validate()) return;

        setSaving(true);
        try {
            await clientsApi.update(detail.id, form);
            onSaved();
        } catch (err) {
            const data = err.response?.data;
            if (data?.errors) {
                setErrors(
                    Object.fromEntries(
                        Object.entries(data.errors).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v])
                    )
                );
            } else {
                setServerError(data?.message || "Ошибка сохранения");
            }
        } finally {
            setSaving(false);
        }
    }

    return (
        <form onSubmit={handleSave}>
            <div className="flex justify-between items-start mb-4">
                <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                    Редактирование клиента
                </h2>
                <button
                    type="button"
                    onClick={onCancel}
                    className="text-xs text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                >
                    Отмена
                </button>
            </div>

            {serverError && (
                <div className="text-sm text-red-500 mb-3 p-2 bg-red-50 dark:bg-red-950 rounded">
                    {serverError}
                </div>
            )}

            <div className="space-y-4">
                {/* Основное */}
                <div className="space-y-3">
                    <div className="text-xs uppercase tracking-wide text-zinc-400">Основное</div>
                    <Field label="ФИО *" error={errors.full_name}>
                        <input
                            className="input"
                            required
                            value={form.full_name}
                            onChange={(e) => set("full_name", e.target.value)}
                        />
                    </Field>
                    <Field label="Email *" error={errors.email}>
                        <input
                            type="email"
                            className="input"
                            required
                            value={form.email}
                            onChange={(e) => set("email", e.target.value)}
                        />
                    </Field>
                    <Field label="Телефон" error={errors.phone} hint="+7-nnn-nnn-nnnn">
                        <input
                            className="input"
                            value={form.phone}
                            onChange={(e) => set("phone", e.target.value)}
                            placeholder="+7-900-123-45-67"
                        />
                    </Field>
                    <Field label="Дата рождения" error={errors.birth_date}>
                        <input
                            type="date"
                            className="input"
                            value={form.birth_date}
                            onChange={(e) => set("birth_date", e.target.value)}
                        />
                    </Field>
                    <Field label="Статус">
                        <select
                            className="input"
                            value={form.status}
                            onChange={(e) => set("status", e.target.value)}
                        >
                            <option value="active">Активен</option>
                            <option value="inactive">Неактивен</option>
                            <option value="blocked">Заблокирован</option>
                        </select>
                    </Field>
                </div>

                {/* Паспорт */}
                <div className="space-y-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                    <div className="text-xs uppercase tracking-wide text-zinc-400">Паспорт</div>
                    <div className="grid grid-cols-2 gap-3">
                        <Field label="Серия" error={errors.passport_series} hint="4 цифры">
                            <input
                                className="input"
                                maxLength={4}
                                value={form.passport_series}
                                onChange={(e) => set("passport_series", e.target.value.replace(/\D/g, ""))}
                            />
                        </Field>
                        <Field label="Номер" error={errors.passport_number} hint="6 цифр">
                            <input
                                className="input"
                                maxLength={6}
                                value={form.passport_number}
                                onChange={(e) => set("passport_number", e.target.value.replace(/\D/g, ""))}
                            />
                        </Field>
                    </div>
                    <Field label="Дата выдачи" error={errors.passport_issued_at}>
                        <input
                            type="date"
                            className="input"
                            value={form.passport_issued_at}
                            onChange={(e) => set("passport_issued_at", e.target.value)}
                        />
                    </Field>
                    <Field label="Кем выдан" error={errors.passport_issued_by}>
                        <input
                            className="input"
                            value={form.passport_issued_by}
                            onChange={(e) => set("passport_issued_by", e.target.value)}
                            placeholder="ОУФМС России по г. Москве по р-ну ..."
                        />
                    </Field>
                    <Field
                        label="Код подразделения"
                        error={errors.passport_department_code}
                        hint="nnn-nnn"
                    >
                        <input
                            className="input"
                            maxLength={7}
                            value={form.passport_department_code}
                            onChange={(e) => set("passport_department_code", e.target.value)}
                        />
                    </Field>
                    <Field label="Адрес регистрации" error={errors.registration_address}>
                        <input
                            className="input"
                            value={form.registration_address}
                            onChange={(e) => set("registration_address", e.target.value)}
                        />
                    </Field>
                </div>
            </div>

            <div className="flex gap-3 pt-5">
                <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg text-sm font-medium hover:opacity-80 disabled:opacity-50"
                >
                    {saving ? "Сохранение..." : "Сохранить"}
                </button>
                <button
                    type="button"
                    onClick={onCancel}
                    className="px-4 py-2 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                >
                    Отмена
                </button>
            </div>
        </form>
    );
}

// ── Вспомогательные компоненты ──────────────────────
function Section({ title, children }) {
    return (
        <div className="mb-5">
            <div className="text-xs uppercase tracking-wide text-zinc-400 mb-2">{title}</div>
            <div className="bg-zinc-50 dark:bg-zinc-800 rounded-lg p-3 space-y-1.5">{children}</div>
        </div>
    );
}

function Row({ label, value }) {
    return (
        <div className="flex justify-between text-xs">
            <span className="text-zinc-500">{label}</span>
            <span className="text-zinc-800 dark:text-zinc-200 font-medium text-right">{value}</span>
        </div>
    );
}

function Field({ label, error, hint, children }) {
    return (
        <div>
            <label className="block text-xs text-zinc-500 mb-1">{label}</label>
            <div className="[&_.input]:w-full [&_.input]:px-3 [&_.input]:py-2 [&_.input]:text-sm [&_.input]:rounded-lg [&_.input]:border [&_.input]:border-zinc-200 dark:[&_.input]:border-zinc-700 [&_.input]:bg-zinc-50 dark:[&_.input]:bg-zinc-800 [&_.input]:text-zinc-900 dark:[&_.input]:text-zinc-100 [&_.input]:outline-none [&_.input]:focus:border-zinc-400">
                {children}
            </div>
            {error ? (
                <p className="text-xs text-red-500 mt-1">{error}</p>
            ) : hint ? (
                <p className="text-xs text-zinc-400 mt-1">{hint}</p>
            ) : null}
        </div>
    );
}
