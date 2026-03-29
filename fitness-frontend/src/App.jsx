import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AdminLayout from "./components/layout/AdminLayout";
import ClientLayout from "./components/layout/ClientLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import ClientDashboard from "./pages/client/ClientDashboard";
import Schedule from "./pages/client/Schedule";
import BookingConfirm from "./pages/client/BookingConfirm";

// Заглушки для страниц, которые ещё не готовы
function Stub({ title }) {
  return (
      <div className="p-6">
        <div className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">{title}</div>
        <div className="text-sm text-zinc-400">Страница в разработке</div>
      </div>
  );
}

export default function App() {
  return (
      <BrowserRouter>
        <Routes>
          {/* Редирект с корня */}
          <Route path="/" element={<Navigate to="/admin" replace />} />

          {/* ---- Администратор ---- */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="clients"  element={<Stub title="Клиенты" />} />
            <Route path="schedule" element={<Stub title="Расписание" />} />
            <Route path="payments" element={<Stub title="Оплаты" />} />
            <Route path="reports"  element={<Stub title="Отчёты" />} />
          </Route>

          {/* ---- Клиент ---- */}
          <Route path="/client" element={<ClientLayout />}>
            <Route index element={<ClientDashboard />} />
            <Route path="schedule" element={<Schedule />} />
            <Route path="schedule/book/:id" element={<BookingConfirm />} />
            <Route path="bookings" element={<Stub title="Мои записи" />} />
            <Route path="profile"  element={<Stub title="Профиль" />} />
          </Route>
        </Routes>
      </BrowserRouter>
  );
}
