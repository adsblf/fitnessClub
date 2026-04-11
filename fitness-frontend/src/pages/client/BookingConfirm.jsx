import { useState, useEffect } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../context/useAuth";
import { scheduleApi } from "../../api/schedule";
import { bookingsApi } from "../../api/bookings";

export default function BookingConfirm() {
    const { id } = useParams();
    const { state } = useLocation();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [session, setSession] = useState(state?.session ?? null);
    const [loading, setLoading] = useState(!state?.session);
    const [status, setStatus] = useState("idle"); // idle | loading | success | error
    const [error, setError] = useState(null);

    useEffect(() => {
        if (session) return;
        scheduleApi
            .get(id)
            .then((r) => setSession(r.data.data))
            .catch(() => setError("Занятие не найдено"))
            .finally(() => setLoading(false));
    }, [id, session]);

    async function handleConfirm() {
        setStatus("loading");
        setError(null);
        try {
            await bookingsApi.create({
                client_id: user.id,
                session_id: Number(id),
            });
            setStatus("success");
        } catch (err) {
            setError(err.response?.data?.message || "Ошибка записи");
            setStatus("error");
        }
    }

    if (loading) return <div className="p-6 text-sm text-zinc-400">Загрузка...</div>;

    if (!session && error) {
        return (
            <div className="p-6 text-sm text-zinc-400">
                {error}.{" "}
                <button className="underline" onClick={() => navigate("/client/schedule")}>
                    Назад
                </button>
            </div>
        );
    }

    if (!session) return null;

    const free = session.available_slots;
    const date = new Date(session.date).toLocaleDateString("ru-RU", {
        weekday: "long",
        day: "numeric",
        month: "long",
    });

    if (status === "success") {
        return (
            <div className="p-6 flex flex-col items-center justify-center min-h-[60vh] text-center">
                <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center text-3xl mb-4">
                    ⏳
                </div>
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
                    Запись отправлена на подтверждение
                </h2>
                <p className="text-sm text-zinc-400 mb-2">
                    Администратор проверит вашу запись на{" "}
                    <strong className="text-zinc-700 dark:text-zinc-300">
                        {session.name ?? "Персональную тренировку"}
                    </strong>
                </p>
                <p className="text-sm text-zinc-400 mb-8">
                    {date}, {session.time_start} · Зал {session.hall?.number}
                </p>
                <div className="flex gap-3">
                    <button
                        onClick={() => navigate("/client")}
                        className="px-4 py-2 text-sm bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg font-medium hover:opacity-80"
                    >
                        На главную
                    </button>
                    <button
                        onClick={() => navigate("/client/schedule")}
                        className="px-4 py-2 text-sm border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800"
                    >
                        К расписанию
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-xl">
            <button
                onClick={() => navigate(-1)}
                className="text-xs text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 mb-6 flex items-center gap-1"
            >
                ← Назад к расписанию
            </button>

            <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-6">
                Запись на занятие
            </h1>

            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5 mb-4">
                <div className="font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
                    {session.name ?? "Персональная тренировка"}
                </div>
                <div className="text-sm text-zinc-400 mb-4">{session.trainer?.full_name}</div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="bg-zinc-50 dark:bg-zinc-800 rounded-lg p-3">
                        <div className="text-xs text-zinc-400 mb-0.5">Дата и время</div>
                        <div className="text-zinc-800 dark:text-zinc-200 font-medium capitalize">{date}</div>
                        <div className="text-zinc-500">
                            {session.time_start}–{session.time_end} · {session.duration} мин
                        </div>
                    </div>
                    <div className="bg-zinc-50 dark:bg-zinc-800 rounded-lg p-3">
                        <div className="text-xs text-zinc-400 mb-0.5">Место</div>
                        <div className="text-zinc-800 dark:text-zinc-200 font-medium">
                            Зал {session.hall?.number}
                        </div>
                        {free != null && (
                            <div className="text-zinc-500">
                                Свободных мест:{" "}
                                <span className={free <= 3 ? "text-amber-500 font-medium" : "text-emerald-600 font-medium"}>
                  {free}
                </span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="bg-zinc-50 dark:bg-zinc-800 rounded-xl p-4 mb-6 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-sm font-medium text-zinc-600 dark:text-zinc-300">
                    {user?.full_name
                        ?.split(" ")
                        .map((w) => w[0])
                        .join("")
                        .slice(0, 2) ?? "?"}
                </div>
                <div>
                    <div className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                        {user?.full_name}
                    </div>
                    <div className="text-xs text-zinc-400">{user?.email}</div>
                </div>
            </div>

            {free != null && free <= 3 && free > 0 && (
                <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-3 mb-4 text-xs text-amber-700 dark:text-amber-400">
                    Осталось мало мест — запишитесь сейчас!
                </div>
            )}

            {error && (
                <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-3 mb-4 text-sm text-red-600">
                    {error}
                </div>
            )}

            <div className="flex gap-3">
                <button
                    onClick={handleConfirm}
                    disabled={status === "loading"}
                    className="flex-1 py-2.5 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg text-sm font-medium hover:opacity-80 disabled:opacity-50"
                >
                    {status === "loading" ? "Записываемся..." : "Подтвердить запись"}
                </button>
                <button
                    onClick={() => navigate(-1)}
                    disabled={status === "loading"}
                    className="px-4 py-2.5 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800"
                >
                    Отмена
                </button>
            </div>
        </div>
    );
}
