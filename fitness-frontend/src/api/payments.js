import api from "./axios";

/**
 * Публичные эндпоинты платёжного эмулятора.
 * Не требуют авторизации (эмулятор открывается в отдельной вкладке).
 */
export const paymentsApi = {
    status(id) {
        return api.get(`/payments/${id}/status`);
    },
    webhook(id, success) {
        return api.post(`/payments/${id}/webhook`, { success });
    },
};
