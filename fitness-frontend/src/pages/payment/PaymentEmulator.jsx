import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { paymentsApi } from "../../api/payments.js";

/**
 * Эмулятор платёжного шлюза.
 * Открывается в отдельной вкладке по ссылке /payment/:id.
 *
 * Не требует авторизации: статус и webhook — публичные эндпоинты.
 *
 * Шаги:
 *  1. Загружаем платёж по :id (GET /payments/:id/status)
 *  2. Если статус pending — показываем форму "Оплатить" / "Отменить"
 *  3. По клику — отправляем webhook с success=true|false
 *  4. После ответа — показываем финальный экран, предлагаем закрыть вкладку
 */
export default function PaymentEmulator() {
  const { id } = useParams();
  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState(null); // null | "success" | "cancelled"
  const [error, setError] = useState(null);

  useEffect(() => {
    paymentsApi
      .status(id)
      .then((r) => {
        setPayment(r.data.data);
        if (r.data.data.status !== "pending") {
          setResult(r.data.data.status === "success" ? "success" : "cancelled");
        }
      })
      .catch((err) => setError(err.response?.data?.message || "Платёж не найден"))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleAction(success) {
    setProcessing(true);
    setError(null);
    try {
      await paymentsApi.webhook(id, success);
      setResult(success ? "success" : "cancelled");
    } catch (err) {
      setError(err.response?.data?.message || "Ошибка обработки платежа");
    } finally {
      setProcessing(false);
    }
  }

  if (loading) {
    return (
      <FullScreen>
        <div className="text-sm text-zinc-400">Загрузка...</div>
      </FullScreen>
    );
  }

  if (error && !payment) {
    return (
      <FullScreen>
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-8 max-w-md w-full text-center">
          <div className="text-3xl mb-3">⚠️</div>
          <div className="text-sm text-red-500 mb-2">{error}</div>
          <div className="text-xs text-zinc-400">Закройте эту вкладку</div>
        </div>
      </FullScreen>
    );
  }

  // ── Финальный экран ──────────────────────────────
  if (result) {
    const isSuccess = result === "success";
    return (
      <FullScreen>
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-8 max-w-md w-full text-center">
          <div
            className={`w-16 h-16 rounded-full flex items-center justify-center text-3xl mx-auto mb-4 ${
              isSuccess
                ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-600"
                : "bg-red-100 dark:bg-red-950 text-red-600"
            }`}
          >
            {isSuccess ? "✓" : "✕"}
          </div>
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
            {isSuccess ? "Оплата прошла" : "Оплата отменена"}
          </h1>
          <p className="text-sm text-zinc-500 mb-6">
            {isSuccess
              ? (payment.purpose === "balance_topup"
                  ? "Баланс успешно пополнен. Вернитесь в личный кабинет."
                  : payment.purpose === "product_sale"
                  ? "Продажа оформлена. Вернитесь в кабинет администратора."
                  : "Абонемент активирован. Вернитесь в кабинет администратора.")
              : (payment.purpose === "balance_topup"
                  ? "Пополнение отменено. Вернитесь в личный кабинет."
                  : payment.purpose === "product_sale"
                  ? "Продажа отменена. Вернитесь в кабинет администратора."
                  : "Абонемент отменён. Вернитесь в кабинет администратора для повторного оформления.")}
          </p>
          <div className="text-xs text-zinc-400 bg-zinc-50 dark:bg-zinc-800 rounded-lg p-3 mb-4">
            <div>Транзакция: <span className="font-mono">{payment.transaction_id}</span></div>
            <div>Сумма: <strong>{Number(payment.amount).toLocaleString("ru-RU")} ₽</strong></div>
          </div>
          <button
            onClick={() => window.close()}
            className="w-full py-2.5 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg text-sm font-medium hover:opacity-80"
          >
            Закрыть вкладку
          </button>
        </div>
      </FullScreen>
    );
  }

  // ── Активная оплата (pending) ────────────────────
  const methodLabel = {
    card_terminal: "Банковская карта",
    online_sbp: "Система быстрых платежей",
    cash: "Наличные",
    bank_transfer: "Банковский перевод",
  }[payment.method] ?? payment.method;

  return (
    <FullScreen>
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-8 max-w-md w-full">
        {/* Псевдо-брендинг */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 text-xs text-zinc-400 uppercase tracking-wider">
            <span className="w-6 h-px bg-zinc-300 dark:bg-zinc-700"></span>
            FitPay · Эмулятор
            <span className="w-6 h-px bg-zinc-300 dark:bg-zinc-700"></span>
          </div>
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mt-3">
            {payment.purpose === "balance_topup" ? "Пополнение баланса" : payment.purpose === "product_sale" ? "Оплата товаров" : "Оплата абонемента"}
          </h1>
        </div>

        {/* Чек */}
        <div className="bg-zinc-50 dark:bg-zinc-800 rounded-lg p-4 mb-6 space-y-2.5 text-sm">
          <Row label="Клиент" value={payment.client_name ?? "—"} />
          {payment.purpose === "balance_topup"
            ? <Row label="Операция" value="Пополнение баланса" />
            : payment.purpose === "product_sale"
            ? <Row label="Позиций" value={payment.product_sale_items_count != null ? `${payment.product_sale_items_count} шт.` : "Товары/услуги"} />
            : <Row label="Абонемент" value={payment.membership_type ?? "—"} />
          }
          <Row label="Способ оплаты" value={methodLabel} />
          <Row label="Транзакция" value={<span className="font-mono text-xs">{payment.transaction_id}</span>} />
          <div className="pt-2 mt-2 border-t border-zinc-200 dark:border-zinc-700">
            <div className="flex justify-between items-baseline">
              <span className="text-zinc-500">К оплате</span>
              <span className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
                {Number(payment.amount).toLocaleString("ru-RU")} ₽
              </span>
            </div>
          </div>
        </div>

        {error && (
          <div className="text-sm text-red-500 mb-4 p-2 bg-red-50 dark:bg-red-950 rounded">
            {error}
          </div>
        )}

        <div className="text-xs text-zinc-400 text-center mb-4">
          Это эмулятор эквайринга. Выберите результат платежа:
        </div>

        {/* Кнопки */}
        <div className="space-y-2">
          <button
            onClick={() => handleAction(true)}
            disabled={processing}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
          >
            {processing ? "Обработка..." : "✓ Оплатить"}
          </button>
          <button
            onClick={() => handleAction(false)}
            disabled={processing}
            className="w-full py-3 border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 rounded-lg text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-50 transition-colors"
          >
            ✕ Отменить оплату
          </button>
        </div>
      </div>
    </FullScreen>
  );
}

function FullScreen({ children }) {
  return (
    <div className="min-h-screen bg-zinc-100 dark:bg-zinc-950 flex items-center justify-center p-4">
      {children}
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between">
      <span className="text-zinc-500">{label}</span>
      <span className="text-zinc-800 dark:text-zinc-200 font-medium text-right">{value}</span>
    </div>
  );
}
