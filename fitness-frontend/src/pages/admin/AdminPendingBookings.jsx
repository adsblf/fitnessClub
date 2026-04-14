import { useState, useEffect } from "react";
import { bookingsApi } from "../../api/bookings";
import { clientsApi } from "../../api/clients";

export default function AdminPendingBookings() {
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [actionLoading, setActionLoading] = useState(null);
    const [selectedClientId, setSelectedClientId] = useState(null);
    const [clientDetail, setClientDetail] = useState(null);
    const [clientLoading, setClientLoading] = useState(false);

    useEffect(() => {
        fetchPendingBookings();
    }, []);

    async function fetchPendingBookings() {
        try {
            setLoading(true);
            const response = await bookingsApi.getPending();
            let bookings = response.data.data || [];

            // Автоматически отклоняем прошедшие тренировки
            const now = new Date();
            const expiredBookings = bookings.filter(b => {
                const sessionEnd = new Date(b.session_date + 'T' + b.session_time.split(' - ')[1]);
                return sessionEnd < now;
            });

            // Если есть прошедшие тренировки, отклоняем их
            if (expiredBookings.length > 0) {
                await Promise.all(
                    expiredBookings.map(b => bookingsApi.reject(b.id).catch(e => console.error(e)))
                );
                // Перезагружаем список
                bookings = bookings.filter(b => !expiredBookings.find(eb => eb.id === b.id));
            }

            setBookings(bookings);
            setError(null);
        } catch (err) {
            setError("Ошибка загрузки списка");
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    function handleSelectClient(clientId) {
        if (selectedClientId === clientId) {
            setSelectedClientId(null);
            setClientDetail(null);
            return;
        }

        setSelectedClientId(clientId);
        setClientLoading(true);
        clientsApi
            .get(clientId)
            .then(res => setClientDetail(res.data.data))
            .catch(err => console.error(err))
            .finally(() => setClientLoading(false));
    }

    async function handleApprove(id) {
        setActionLoading(id);
        try {
            await bookingsApi.approve(id);
            setBookings(bookings.filter((b) => b.id !== id));
            setSelectedClientId(null);
            setClientDetail(null);
        } catch (err) {
            alert(err.response?.data?.message || "Ошибка подтверждения записи");
        } finally {
            setActionLoading(null);
        }
    }

    async function handleReject(id) {
        setActionLoading(id);
        try {
            await bookingsApi.reject(id);
            setBookings(bookings.filter((b) => b.id !== id));
            setSelectedClientId(null);
            setClientDetail(null);
        } catch (err) {
            alert(err.response?.data?.message || "Ошибка отклонения записи");
        } finally {
            setActionLoading(null);
        }
    }

    if (loading) {
        return (
            <div className="p-4 sm:p-6">
                <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-6">
                    Записи на подтверждение
                </h1>
                <div className="text-center py-12 text-zinc-400">Загрузка...</div>
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6">
            <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-6">
                Записи на подтверждение
            </h1>

            {error && (
                <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6 text-red-600 dark:text-red-400">
                    {error}
                </div>
            )}

            {bookings.length === 0 ? (
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-12 text-center">
                    <div className="text-4xl mb-4">✓</div>
                    <p className="text-zinc-500 dark:text-zinc-400">
                        Нет записей, требующих подтверждения
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Таблица записей */}
                    <div className="lg:col-span-2 overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                                    <th className="text-left py-3 px-4 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                                        Клиент
                                    </th>
                                    <th className="text-left py-3 px-4 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                                        Занятие
                                    </th>
                                    <th className="text-left py-3 px-4 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                                        Дата и время
                                    </th>
                                    <th className="text-left py-3 px-4 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                                        Действия
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {bookings.map((booking) => (
                                    <tr
                                        key={booking.id}
                                        className={`border-b border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 cursor-pointer ${
                                            selectedClientId === booking.client_id ? 'bg-zinc-100 dark:bg-zinc-800' : ''
                                        }`}
                                        onClick={() => handleSelectClient(booking.client_id)}
                                    >
                                        <td className="py-3 px-4 text-sm text-zinc-900 dark:text-zinc-100 font-medium">
                                            {booking.client_name}
                                        </td>
                                        <td className="py-3 px-4 text-sm text-zinc-700 dark:text-zinc-300">
                                            {booking.session_name}
                                        </td>
                                        <td className="py-3 px-4 text-sm text-zinc-700 dark:text-zinc-300">
                                            <div>{booking.session_date}</div>
                                            <div className="text-xs text-zinc-500">{booking.session_time}</div>
                                        </td>
                                        <td className="py-3 px-4 text-sm" onClick={(e) => e.stopPropagation()}>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleApprove(booking.id)}
                                                    disabled={actionLoading === booking.id}
                                                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-medium disabled:opacity-50"
                                                >
                                                    {actionLoading === booking.id ? "..." : "✓"}
                                                </button>
                                                <button
                                                    onClick={() => handleReject(booking.id)}
                                                    disabled={actionLoading === booking.id}
                                                    className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-medium disabled:opacity-50"
                                                >
                                                    {actionLoading === booking.id ? "..." : "✕"}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Карточка клиента */}
                    <div className="col-span-1">
                        {selectedClientId ? (
                            clientLoading ? (
                                <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-4 text-center text-sm text-zinc-400">
                                    Загрузка...
                                </div>
                            ) : clientDetail ? (
                                <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-4 space-y-4 sticky top-6">
                                    {/* Аватар и ФИО */}
                                    <div className="flex items-center gap-3 pb-4 border-b border-zinc-200 dark:border-zinc-800">
                                        <div className="w-12 h-12 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-sm font-bold text-zinc-600 dark:text-zinc-300">
                                            {clientDetail.full_name
                                                ?.split(" ")
                                                .map((w) => w[0])
                                                .join("")
                                                .slice(0, 2) ?? "?"}
                                        </div>
                                        <div>
                                            <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                                                {clientDetail.full_name}
                                            </div>
                                            <div className="text-xs text-zinc-400">ID: {clientDetail.id}</div>
                                        </div>
                                    </div>

                                    {/* Контакты */}
                                    <div className="space-y-2">
                                        <div>
                                            <div className="text-xs text-zinc-400">Email</div>
                                            <div className="text-sm text-zinc-700 dark:text-zinc-300 break-all">
                                                {clientDetail.email}
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-xs text-zinc-400">Телефон</div>
                                            <div className="text-sm text-zinc-700 dark:text-zinc-300">
                                                {clientDetail.phone ?? "—"}
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-xs text-zinc-400">Дата рождения</div>
                                            <div className="text-sm text-zinc-700 dark:text-zinc-300">
                                                {clientDetail.birth_date ?? "—"}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Статистика */}
                                    {(clientDetail.total_visits || clientDetail.active_bookings) && (
                                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
                                            <div className="bg-zinc-50 dark:bg-zinc-800 rounded p-2 text-center">
                                                <div className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                                                    {clientDetail.total_visits ?? 0}
                                                </div>
                                                <div className="text-xs text-zinc-400">Посещений</div>
                                            </div>
                                            <div className="bg-zinc-50 dark:bg-zinc-800 rounded p-2 text-center">
                                                <div className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                                                    {clientDetail.active_bookings ?? 0}
                                                </div>
                                                <div className="text-xs text-zinc-400">Активных</div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Активный абонемент */}
                                    {clientDetail.membership && (
                                        <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-lg p-3 border border-emerald-200 dark:border-emerald-800/50 space-y-1">
                                            <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                                                Активный абонемент
                                            </div>
                                            <div className="text-xs text-emerald-600 dark:text-emerald-300">
                                                {clientDetail.membership.type}
                                            </div>
                                            <div className="text-xs text-emerald-600 dark:text-emerald-300">
                                                Действует: {clientDetail.membership.end_date}
                                            </div>
                                            <div className="text-xs text-emerald-600 dark:text-emerald-300">
                                                Осталось: {clientDetail.membership.remaining_visits} посещений
                                            </div>
                                        </div>
                                    )}

                                    {/* Статус */}
                                    <div className="text-xs">
                                        <span
                                            className={`inline-flex px-2 py-1 rounded text-xs font-medium ${
                                                clientDetail.status === "active"
                                                    ? "bg-emerald-100 text-emerald-700"
                                                    : clientDetail.status === "inactive"
                                                    ? "bg-zinc-100 text-zinc-500"
                                                    : "bg-red-100 text-red-600"
                                            }`}
                                        >
                                            {clientDetail.status === "active" && "Активен"}
                                            {clientDetail.status === "inactive" && "Неактивен"}
                                            {clientDetail.status === "blocked" && "Заблокирован"}
                                        </span>
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-4 text-center text-sm text-zinc-400">
                                    Ошибка загрузки
                                </div>
                            )
                        ) : (
                            <div className="bg-zinc-50 dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-800 p-4 text-center text-sm text-zinc-400">
                                Выберите клиента для просмотра
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

