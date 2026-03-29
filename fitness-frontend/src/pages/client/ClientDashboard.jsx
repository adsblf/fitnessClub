import { useNavigate } from "react-router-dom";
import { currentClient, clientUpcomingBookings, clientVisitHistory } from "../../data/mock";

function StatusBadge({ status }) {
  const map = {
    ПОДТВЕРЖДЕНО: "bg-emerald-100 text-emerald-700",
    ЗАБРОНИРОВАНО: "bg-blue-100 text-blue-700",
    ОТМЕНЕНО:      "bg-zinc-100 text-zinc-500",
    ПОСЕЩЕНО:      "bg-emerald-100 text-emerald-700",
    НЕЯВКА:        "bg-red-100 text-red-600",
  };
  return (
    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${map[status] ?? "bg-zinc-100 text-zinc-600"}`}>
      {status}
    </span>
  );
}

function MembershipCard({ client }) {
  const daysLeft = Math.ceil(
    (new Date(client.membershipExpiry) - new Date()) / (1000 * 60 * 60 * 24)
  );
  const isExpiringSoon = daysLeft <= 14;

  return (
    <div className="bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-xl p-6 flex flex-col gap-4">
      <div className="flex justify-between items-start">
        <div>
          <div className="text-xs opacity-60 mb-1">Тип абонемента</div>
          <div className="font-semibold text-lg">{client.membershipType}</div>
        </div>
        <span className="text-xs px-2.5 py-1 rounded-full bg-white/20 dark:bg-black/10 font-medium">
          {client.membershipStatus}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="text-xs opacity-60 mb-0.5">Действует до</div>
          <div className="font-medium">
            {new Date(client.membershipExpiry).toLocaleDateString("ru-RU")}
          </div>
          {isExpiringSoon && (
            <div className="text-xs text-amber-300 dark:text-amber-600 mt-0.5">
              Осталось {daysLeft} дн.
            </div>
          )}
        </div>
        <div>
          <div className="text-xs opacity-60 mb-0.5">Посещений</div>
          <div className="font-medium">
            {client.visitsLeft === null ? "Безлимит" : client.visitsLeft}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ClientDashboard() {
  const navigate = useNavigate();

  return (
    <div className="p-6 space-y-6">
      {/* Заголовок */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Привет, {currentClient.name.split(" ")[0]}! 👋
          </h1>
          <p className="text-sm text-zinc-400 mt-0.5">Всего посещений: {currentClient.visitsTotal}</p>
        </div>
        <button
          onClick={() => navigate("/client/schedule")}
          className="px-4 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg text-sm font-medium hover:opacity-80 transition-opacity"
        >
          Записаться на занятие
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Абонемент */}
        <div className="col-span-1">
          <MembershipCard client={currentClient} />
        </div>

        {/* Ближайшие записи */}
        <div className="col-span-2 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5">
          <div className="flex justify-between items-center mb-4">
            <div className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Ближайшие записи</div>
            <button
              onClick={() => navigate("/client/bookings")}
              className="text-xs text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
            >
              Все записи →
            </button>
          </div>
          {clientUpcomingBookings.length === 0 ? (
            <div className="text-sm text-zinc-400 text-center py-6">Нет предстоящих занятий</div>
          ) : (
            <div className="space-y-2.5">
              {clientUpcomingBookings.map((b) => (
                <div
                  key={b.id}
                  className="flex items-center gap-4 p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800"
                >
                  <div className="text-center min-w-[44px]">
                    <div className="text-xs text-zinc-400">
                      {new Date(b.date).toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}
                    </div>
                    <div className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">{b.time}</div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-zinc-800 dark:text-zinc-200 truncate">{b.class}</div>
                    <div className="text-xs text-zinc-400 truncate">{b.trainer} · {b.hall}</div>
                  </div>
                  <StatusBadge status={b.status} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* История посещений */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800">
        <div className="px-5 py-4 border-b border-zinc-100 dark:border-zinc-800">
          <div className="text-sm font-medium text-zinc-700 dark:text-zinc-300">История посещений</div>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-zinc-400 border-b border-zinc-100 dark:border-zinc-800">
              <th className="text-left px-5 py-2.5 font-normal">Дата</th>
              <th className="text-left px-5 py-2.5 font-normal">Занятие</th>
              <th className="text-left px-5 py-2.5 font-normal">Тренер</th>
              <th className="text-left px-5 py-2.5 font-normal">Статус</th>
            </tr>
          </thead>
          <tbody>
            {clientVisitHistory.map((v, i) => (
              <tr
                key={v.id}
                className={`border-b border-zinc-50 dark:border-zinc-800 last:border-0 ${
                  i % 2 === 0 ? "" : "bg-zinc-50/50 dark:bg-zinc-800/20"
                }`}
              >
                <td className="px-5 py-3 text-zinc-500">
                  {new Date(v.date).toLocaleDateString("ru-RU")} · {v.time}
                </td>
                <td className="px-5 py-3 text-zinc-800 dark:text-zinc-200 font-medium">{v.class}</td>
                <td className="px-5 py-3 text-zinc-500">{v.trainer}</td>
                <td className="px-5 py-3"><StatusBadge status={v.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
