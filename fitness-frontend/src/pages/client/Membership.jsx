import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../context/useAuth";
import { clientsApi } from "../../api/clients";
import { membershipApi } from "../../api/membership";
import { paymentsApi } from "../../api/payments";
import { TZ } from "../../lib/tz";

const STATUS_MAP = {
  active:          { label: "Активный",        cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400" },
  frozen:          { label: "Заморожен",        cls: "bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400" },
  expired:         { label: "Истёк",            cls: "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400" },
  cancelled:       { label: "Отменён",          cls: "bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400" },
  pending_payment: { label: "Ожидание оплаты",  cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400" },
};

const VISIT_STATUS = {
  visited:   { label: "Посещено",  cls: "bg-emerald-100 text-emerald-700" },
  no_show:   { label: "Неявка",    cls: "bg-red-100 text-red-600" },
  late:      { label: "Опоздание", cls: "bg-amber-100 text-amber-700" },
  confirmed: { label: "Записан",   cls: "bg-blue-100 text-blue-700" },
  pending:   { label: "Ожидание",  cls: "bg-zinc-100 text-zinc-500" },
};

const PMT_METHODS = [
  { value: "online_sbp",    label: "СБП", icon: "⚡" },
  { value: "card_terminal", label: "Банковская карта", icon: "💳" },
];

function daysLeft(endDate) {
  const end = new Date(endDate);
  const now = new Date();
  const diff = Math.ceil((end - now) / 86400000);
  return diff;
}

function fmtDate(dateStr) {
  return new Date(dateStr).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });
}

function fmtDateTime(dtStr) {
  return new Date(dtStr).toLocaleString("ru-RU", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
    timeZone: TZ,
  });
}

export default function ClientMembership() {
  const { user } = useAuth();

  const [memberships, setMemberships] = useState([]);
  const [membershipTypes, setMembershipTypes] = useState([]);
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);

  // Freeze form
  const [freezeDays, setFreezeDays] = useState(14);
  const [freezeLoading, setFreezeLoading] = useState(false);
  const [freezeMsg, setFreezeMsg] = useState(null); // { type: 'ok'|'err', text }
  const [unfreezeLoading, setUnfreezeLoading] = useState(false);

  // Renewal form
  const [selectedTypeId, setSelectedTypeId] = useState("");
  const [payMethod, setPayMethod] = useState("online_sbp");
  const [promoCode, setPromoCode] = useState("");
  const [priceInfo, setPriceInfo] = useState(null);
  const [priceLoading, setPriceLoading] = useState(false);
  const [renewLoading, setRenewLoading] = useState(false);
  const [renewError, setRenewError] = useState(null);

  // Payment polling
  const [pendingPayId, setPendingPayId] = useState(null);
  const [polling, setPolling] = useState(false);
  const [pollResult, setPollResult] = useState(null); // null | 'success' | 'cancelled' | 'timeout'

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [membRes, typesRes, visitsRes] = await Promise.all([
        clientsApi.memberships(user.id),
        membershipApi.types(),
        clientsApi.visits(user.id),
      ]);
      setMemberships(membRes.data.data || []);
      setMembershipTypes((typesRes.data.data || []).filter(t => !t.is_trial));
      setVisits(visitsRes.data.data || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  // Calculate price when type or promo changes
  useEffect(() => {
    if (!selectedTypeId) { setPriceInfo(null); return; }
    setPriceLoading(true);
    const params = { membership_type_id: Number(selectedTypeId) };
    if (promoCode.trim()) params.promo_code = promoCode.trim();
    membershipApi.calculatePrice(params)
      .then(r => setPriceInfo(r.data))
      .catch(() => setPriceInfo(null))
      .finally(() => setPriceLoading(false));
  }, [selectedTypeId, promoCode]);

  // Poll payment status after redirect
  useEffect(() => {
    if (!pendingPayId) return;
    setPolling(true);
    let attempts = 0;
    const max = 90; // 3 min
    const interval = setInterval(async () => {
      attempts++;
      if (attempts > max) {
        clearInterval(interval);
        setPolling(false);
        setPollResult("timeout");
        return;
      }
      try {
        const res = await paymentsApi.status(pendingPayId);
        const st = res.data.data.status;
        if (st === "success") {
          clearInterval(interval);
          setPolling(false);
          setPendingPayId(null);
          setPollResult("success");
          load();
        } else if (st === "cancelled") {
          clearInterval(interval);
          setPolling(false);
          setPendingPayId(null);
          setPollResult("cancelled");
        }
      } catch { /* ignore */ }
    }, 2000);
    return () => clearInterval(interval);
  }, [pendingPayId, load]);

  // ── Active membership ──────────────────────────────────────────────
  const activeMembership = memberships.find(
    m => m.status === "active" || m.status === "frozen"
  );

  // ── Actions ────────────────────────────────────────────────────────

  async function handleFreeze() {
    if (!activeMembership) return;
    setFreezeLoading(true);
    setFreezeMsg(null);
    try {
      const res = await membershipApi.selfFreeze(activeMembership.id, freezeDays);
      setFreezeMsg({ type: "ok", text: res.data.message });
      load();
    } catch (err) {
      setFreezeMsg({ type: "err", text: err.response?.data?.message || "Ошибка при заморозке" });
    } finally {
      setFreezeLoading(false);
    }
  }

  async function handleUnfreeze() {
    if (!activeMembership) return;
    setUnfreezeLoading(true);
    setFreezeMsg(null);
    try {
      const res = await membershipApi.selfUnfreeze(activeMembership.id);
      setFreezeMsg({ type: "ok", text: res.data.message });
      load();
    } catch (err) {
      setFreezeMsg({ type: "err", text: err.response?.data?.message || "Ошибка при разморозке" });
    } finally {
      setUnfreezeLoading(false);
    }
  }

  async function handleRenew() {
    if (!selectedTypeId) { setRenewError("Выберите тип абонемента"); return; }
    setRenewLoading(true);
    setRenewError(null);
    setPollResult(null);
    try {
      const res = await membershipApi.selfRenew({
        membership_type_id: Number(selectedTypeId),
        payment_method: payMethod,
        promo_code: promoCode.trim() || undefined,
      });
      window.open(res.data.redirect_url, "_blank");
      setPendingPayId(res.data.payment.id);
    } catch (err) {
      setRenewError(err.response?.data?.message || "Ошибка при создании платежа");
    } finally {
      setRenewLoading(false);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="p-6 text-center text-sm text-zinc-400">Загрузка...</div>
    );
  }

  const days = activeMembership ? daysLeft(activeMembership.end_date) : 0;
  const visitPct = activeMembership && activeMembership.visit_limit
    ? Math.round(((activeMembership.visit_limit - activeMembership.remaining_visits) / activeMembership.visit_limit) * 100)
    : 0;

  const canFreeze = activeMembership?.status === "active" && !activeMembership?.has_been_frozen;
  const isFrozen  = activeMembership?.status === "frozen";

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div>
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Абонемент</h1>
        <p className="text-sm text-zinc-400 mt-0.5">Управляйте своим абонементом и просматривайте историю посещений</p>
      </div>

      {/* ── Current Membership Card ─────────────────────────────── */}
      {activeMembership ? (
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                {activeMembership.type}
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">№ {activeMembership.membership_number}</p>
            </div>
            <span className={`text-xs px-3 py-1 rounded-full font-medium shrink-0 ${STATUS_MAP[activeMembership.status]?.cls ?? "bg-zinc-100 text-zinc-500"}`}>
              {STATUS_MAP[activeMembership.status]?.label ?? activeMembership.status}
            </span>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-zinc-50 dark:bg-zinc-800 rounded-lg p-3">
              <div className="text-xs text-zinc-400 mb-0.5">Дата начала</div>
              <div className="font-medium text-zinc-900 dark:text-zinc-100">{fmtDate(activeMembership.start_date)}</div>
            </div>
            <div className="bg-zinc-50 dark:bg-zinc-800 rounded-lg p-3">
              <div className="text-xs text-zinc-400 mb-0.5">Дата окончания</div>
              <div className={`font-medium ${days <= 7 && days >= 0 ? "text-amber-600 dark:text-amber-400" : "text-zinc-900 dark:text-zinc-100"}`}>
                {fmtDate(activeMembership.end_date)}
                {days >= 0 && <span className="text-xs ml-1 font-normal text-zinc-400">({days} дн.)</span>}
              </div>
            </div>
          </div>

          {/* Visits progress */}
          {activeMembership.visit_limit > 1 && (
            <div>
              <div className="flex justify-between text-xs text-zinc-500 mb-1.5">
                <span>Визиты</span>
                <span className="font-medium text-zinc-900 dark:text-zinc-100">
                  {activeMembership.remaining_visits} из {activeMembership.visit_limit} осталось
                </span>
              </div>
              <div className="h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    visitPct >= 90 ? "bg-red-400" : visitPct >= 70 ? "bg-amber-400" : "bg-emerald-500"
                  }`}
                  style={{ width: `${visitPct}%` }}
                />
              </div>
            </div>
          )}

          {/* Frozen info */}
          {isFrozen && activeMembership.frozen_until && (
            <div className="flex items-center gap-2 px-4 py-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/30 rounded-lg text-sm text-blue-700 dark:text-blue-300">
              <span className="text-lg">❄️</span>
              <span>Абонемент заморожен до <strong>{fmtDate(activeMembership.frozen_until)}</strong></span>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-8 text-center text-zinc-400">
          <div className="text-3xl mb-3">🎫</div>
          <p className="text-sm">У вас нет активного абонемента</p>
          <p className="text-xs mt-1">Приобретите абонемент ниже</p>
        </div>
      )}

      {/* ── Freeze Section ──────────────────────────────────────── */}
      {activeMembership && (
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5 space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Заморозка абонемента</h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Временная приостановка без потери срока действия.
              {activeMembership.has_been_frozen
                ? " Заморозка уже использована."
                : " Доступна 1 раз за срок действия абонемента."}
            </p>
          </div>

          {isFrozen ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 px-4 py-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/30 rounded-lg text-sm text-blue-700 dark:text-blue-300">
                <span className="text-lg">❄️</span>
                <span>Абонемент заморожен до <strong>{fmtDate(activeMembership.frozen_until)}</strong></span>
              </div>

              {freezeMsg && (
                <div className={`text-sm px-3 py-2 rounded-lg ${
                  freezeMsg.type === "ok"
                    ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400"
                    : "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400"
                }`}>
                  {freezeMsg.text}
                </div>
              )}

              <button
                onClick={handleUnfreeze}
                disabled={unfreezeLoading}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                {unfreezeLoading ? "Размораживаем..." : "Разморозить досрочно"}
              </button>
            </div>
          ) : canFreeze ? (
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-zinc-500 mb-1.5">Срок заморозки</label>
                <div className="flex gap-2">
                  {[7, 14, 30].map(d => (
                    <button
                      key={d}
                      onClick={() => setFreezeDays(d)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        freezeDays === d
                          ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900"
                          : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                      }`}
                    >
                      {d} дн.
                    </button>
                  ))}
                </div>
              </div>

              {freezeMsg && (
                <div className={`text-sm px-3 py-2 rounded-lg ${
                  freezeMsg.type === "ok"
                    ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400"
                    : "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400"
                }`}>
                  {freezeMsg.text}
                </div>
              )}

              <button
                onClick={handleFreeze}
                disabled={freezeLoading}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                {freezeLoading ? "Замораживаем..." : `Заморозить на ${freezeDays} дн.`}
              </button>
            </div>
          ) : (
            <div className="text-sm text-zinc-400 flex items-center gap-2">
              <span>ℹ️</span>
              {activeMembership.has_been_frozen
                ? "Заморозка уже была использована для этого абонемента"
                : "Заморозка недоступна в текущем статусе"}
            </div>
          )}
        </div>
      )}

      {/* ── Renewal / Purchase Section ──────────────────────────── */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5 space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            {activeMembership ? "Продление абонемента" : "Приобрести абонемент"}
          </h3>
          {activeMembership && (
            <p className="text-xs text-zinc-400 mt-0.5">
              При продлении оставшиеся дни и визиты добавляются к текущему абонементу
            </p>
          )}
        </div>

        {/* Type selector */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {membershipTypes.map(t => (
            <button
              key={t.id}
              onClick={() => setSelectedTypeId(String(t.id))}
              className={`text-left p-4 rounded-xl border-2 transition-colors ${
                selectedTypeId === String(t.id)
                  ? "border-zinc-900 dark:border-zinc-100 bg-zinc-50 dark:bg-zinc-800"
                  : "border-zinc-200 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-500"
              }`}
            >
              <div className="font-medium text-sm text-zinc-900 dark:text-zinc-100">{t.name}</div>
              <div className="text-xs text-zinc-400 mt-0.5">
                {t.visit_limit} визитов · {t.duration_days} дн.
              </div>
              <div className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mt-2">
                {Number(t.price).toLocaleString("ru-RU")} ₽
              </div>
            </button>
          ))}
        </div>

        {selectedTypeId && (
          <div className="space-y-3">
            {/* Payment method */}
            <div>
              <label className="block text-xs text-zinc-500 mb-1.5">Способ оплаты</label>
              <div className="flex gap-2">
                {PMT_METHODS.map(m => (
                  <button
                    key={m.value}
                    onClick={() => setPayMethod(m.value)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border-2 transition-colors ${
                      payMethod === m.value
                        ? "border-zinc-900 dark:border-zinc-100 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                        : "border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-zinc-400"
                    }`}
                  >
                    <span>{m.icon}</span> {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Promo code */}
            <div>
              <label className="block text-xs text-zinc-500 mb-1.5">Промокод (необязательно)</label>
              <input
                value={promoCode}
                onChange={e => setPromoCode(e.target.value.toUpperCase())}
                placeholder="PROMO2025"
                className="w-full max-w-xs px-3 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 outline-none focus:border-zinc-900 dark:focus:border-zinc-100"
              />
            </div>

            {/* Price info */}
            {priceInfo && (
              <div className="px-4 py-3 bg-zinc-50 dark:bg-zinc-800 rounded-lg text-sm space-y-1">
                {priceInfo.discount > 0 && (
                  <>
                    <div className="flex justify-between text-zinc-400">
                      <span>Стоимость</span>
                      <span className="line-through">{Number(priceInfo.original_price).toLocaleString("ru-RU")} ₽</span>
                    </div>
                    <div className="flex justify-between text-emerald-600 dark:text-emerald-400 text-xs">
                      <span>{priceInfo.promo_message}</span>
                      <span>−{Number(priceInfo.discount).toLocaleString("ru-RU")} ₽</span>
                    </div>
                  </>
                )}
                <div className="flex justify-between font-semibold text-zinc-900 dark:text-zinc-100">
                  <span>Итого</span>
                  <span>{Number(priceInfo.final_price).toLocaleString("ru-RU")} ₽</span>
                </div>
                {promoCode && !priceInfo.promo_valid && (
                  <div className="text-xs text-red-500 mt-1">{priceInfo.promo_message}</div>
                )}
              </div>
            )}

            {/* Polling state */}
            {polling && (
              <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/30 rounded-lg">
                <div className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin shrink-0" />
                <div>
                  <div className="text-sm font-medium text-amber-800 dark:text-amber-300">Ожидание оплаты…</div>
                  <div className="text-xs text-amber-600 dark:text-amber-400">Завершите оплату в открытой вкладке</div>
                </div>
              </div>
            )}

            {pollResult === "success" && (
              <div className="px-4 py-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/30 rounded-lg text-sm text-emerald-700 dark:text-emerald-400">
                ✓ Оплата прошла успешно! Абонемент обновлён.
              </div>
            )}
            {pollResult === "cancelled" && (
              <div className="px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/30 rounded-lg text-sm text-red-600 dark:text-red-400">
                ✕ Оплата отменена.
              </div>
            )}
            {pollResult === "timeout" && (
              <div className="px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-500">
                Ожидание истекло. Проверьте статус позже.
              </div>
            )}

            {renewError && (
              <div className="text-sm text-red-500">{renewError}</div>
            )}

            <button
              onClick={handleRenew}
              disabled={renewLoading || polling || priceLoading}
              className="w-full py-2.5 bg-zinc-900 dark:bg-zinc-100 hover:opacity-80 text-white dark:text-zinc-900 rounded-lg text-sm font-semibold transition-opacity disabled:opacity-50"
            >
              {renewLoading
                ? "Создаём платёж…"
                : `Оплатить ${priceInfo ? Number(priceInfo.final_price).toLocaleString("ru-RU") + " ₽" : ""}`}
            </button>
          </div>
        )}
      </div>

      {/* ── Visit History ────────────────────────────────────────── */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-100 dark:border-zinc-800">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">История посещений</h3>
          <p className="text-xs text-zinc-400 mt-0.5">{visits.length} записей всего</p>
        </div>

        {visits.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-zinc-400">Посещений пока нет</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-zinc-400 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
                  <th className="text-left px-5 py-2.5 font-normal">Дата и время</th>
                  <th className="text-left px-5 py-2.5 font-normal">Занятие</th>
                  <th className="text-left px-5 py-2.5 font-normal">Статус</th>
                </tr>
              </thead>
              <tbody>
                {visits.map((v, idx) => {
                  const st = VISIT_STATUS[v.status] ?? { label: v.status, cls: "bg-zinc-100 text-zinc-500" };
                  return (
                    <tr
                      key={v.id}
                      className={`border-b border-zinc-50 dark:border-zinc-800 last:border-0 ${idx % 2 ? "bg-zinc-50/50 dark:bg-zinc-800/20" : ""}`}
                    >
                      <td className="px-5 py-3 text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
                        {fmtDateTime(v.visited_at)}
                      </td>
                      <td className="px-5 py-3 text-zinc-900 dark:text-zinc-100">
                        {v.session_name || "—"}
                      </td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${st.cls}`}>
                          {st.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
