import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/useAuth";
import { clientsApi } from "../../api/clients";

function StatusBadge({ status }) {
  const map = {
    booked:    { label: "Забронировано", cls: "bg-blue-100 text-blue-700" },
    confirmed: { label: "Подтверждено",  cls: "bg-emerald-100 text-emerald-700" },
    cancelled: { label: "Отменено",      cls: "bg-zinc-100 text-zinc-500" },
    visited:   { label: "Посещено",      cls: "bg-emerald-100 text-emerald-700" },
    no_show:   { label: "Неявка",        cls: "bg-red-100 text-red-600" },
  };
  const s = map[status] ?? { label: status, cls: "bg-zinc-100 text-zinc-600" };
  return <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${s.cls}`}>{s.label}</span>;
}

export default function ClientDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      clientsApi.get(user.id),
      clientsApi.visits(user.id),
    ])
        .then(([profRes, visRes]) => {
          setProfile(profRes.data.data);
          setVisits(visRes.data.data.slice(0, 5));
        })
        .finally(() => setLoading(false));
  }, [user]);

  if (loading) {
    return <div className="p-6 text-sm text-zinc-400">Загрузка...</div>;
  }

  if (!profile) {
    return <div className="p-6 text-sm text-zinc-400">Профиль не найден</div>;
  }

  const m = profile.membership;
  const firstName = profile.full_name?.split(" ")[0] ?? "";

  return (
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              Привет, {firstName}!
            </h1>
            <p className="text-sm text-zinc-400 mt-0.5">Всего посещений: {profile.total_visits}</p>
          </div>
          <button
              onClick={() => navigate("/client/schedule")}
              className="px-4 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg text-sm font-medium hover:opacity-80"
          >
            Записаться на занятие
          </button>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {/* Абонемент */}
          <div className="col-span-1">
            {m ? (
                <div className="bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-xl p-6 flex flex-col gap-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="text-xs opacity-60 mb-1">Тип абонемента</div>
                      <div className="font-semibold text-lg">{m.type}</div>
                    </div>
                    <span className="text-xs px-2.5 py-1 rounded-full bg-white/20 dark:bg-black/10 font-medium capitalize">
                  {m.status === "active" ? "Активный" : m.status}
                </span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs opacity-60 mb-0.5">Действует до</div>
                      <div className="font-medium">{m.end_date}</div>
                    </div>
                    <div>
                      <div className="text-xs opacity-60 mb-0.5">Остаток</div>
                      <div className="font-medium">
                        {m.remaining_visits >= 999 ? "Безлимит" : m.remaining_visits}
                      </div>
                    </div>
                  </div>
                </div>
            ) : (
                <div className="bg-zinc-50 dark:bg-zinc-800 rounded-xl p-6 text-center">
                  <p className="text-sm text-zinc-400">Нет активного абонемента</p>
                </div>
            )}
          </div>

          {/* Карточка клиента */}
          <div className="col-span-2 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5">
            <div className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-4">Карточка клиента</div>
            {profile.card ? (
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-zinc-50 dark:bg-zinc-800 rounded-lg p-3">
                    <div className="text-xs text-zinc-400 mb-0.5">Цель тренировок</div>
                    <div className="text-zinc-800 dark:text-zinc-200 font-medium">{profile.card.training_goal}</div>
                  </div>
                  <div className="bg-zinc-50 dark:bg-zinc-800 rounded-lg p-3">
                    <div className="text-xs text-zinc-400 mb-0.5">ИМТ</div>
                    <div className="text-zinc-800 dark:text-zinc-200 font-medium">{profile.card.bmi ?? "—"}</div>
                  </div>
                  <div className="bg-zinc-50 dark:bg-zinc-800 rounded-lg p-3">
                    <div className="text-xs text-zinc-400 mb-0.5">Вес</div>
                    <div className="text-zinc-800 dark:text-zinc-200 font-medium">{profile.card.current_weight} кг</div>
                  </div>
                  <div className="bg-zinc-50 dark:bg-zinc-800 rounded-lg p-3">
                    <div className="text-xs text-zinc-400 mb-0.5">Рост</div>
                    <div className="text-zinc-800 dark:text-zinc-200 font-medium">{profile.card.height} см</div>
                  </div>
                </div>
            ) : (
                <p className="text-sm text-zinc-400">Карточка пока не заполнена</p>
            )}
          </div>
        </div>

        {/* История посещений */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800">
          <div className="px-5 py-4 border-b border-zinc-100 dark:border-zinc-800">
            <div className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Последние посещения</div>
          </div>
          {visits.length === 0 ? (
              <div className="p-8 text-center text-sm text-zinc-400">Посещений пока нет</div>
          ) : (
              <table className="w-full text-sm">
                <thead>
                <tr className="text-xs text-zinc-400 border-b border-zinc-100 dark:border-zinc-800">
                  <th className="text-left px-5 py-2.5 font-normal">Дата</th>
                  <th className="text-left px-5 py-2.5 font-normal">Занятие</th>
                  <th className="text-left px-5 py-2.5 font-normal">Статус</th>
                </tr>
                </thead>
                <tbody>
                {visits.map((v, i) => (
                    <tr key={v.id} className={`border-b border-zinc-50 dark:border-zinc-800 last:border-0 ${i % 2 ? "bg-zinc-50/50 dark:bg-zinc-800/20" : ""}`}>
                      <td className="px-5 py-3 text-zinc-500">{v.visited_at}</td>
                      <td className="px-5 py-3 text-zinc-800 dark:text-zinc-200 font-medium">{v.session_name}</td>
                      <td className="px-5 py-3"><StatusBadge status={v.status} /></td>
                    </tr>
                ))}
                </tbody>
              </table>
          )}
        </div>
      </div>
  );
}
