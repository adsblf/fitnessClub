import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { useAuth } from "./context/useAuth";
import { RequireRole, GuestOnly } from "./components/guards";

// Layouts
import AdminLayout from "./components/layout/AdminLayout";
import ClientLayout from "./components/layout/ClientLayout";
import TrainerLayout from "./components/layout/TrainerLayout";

// Auth pages
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";

// Admin pages
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminClients from "./pages/admin/AdminClients";
import AdminSchedule from "./pages/admin/AdminSchedule";
import AdminMemberships from "./pages/admin/AdminMemberships";
import AdminVisits from "./pages/admin/AdminVisits";
import AdminPendingBookings from "./pages/admin/AdminPendingBookings";
import AdminSales from "./pages/admin/AdminSales";
import OwnerStaff from "./pages/admin/OwnerStaff";
import OwnerMembershipTypes from "./pages/admin/OwnerMembershipTypes";
import OwnerPromoCodes from "./pages/admin/OwnerPromoCodes";

// Client pages
import ClientDashboard from "./pages/client/ClientDashboard";
import Schedule from "./pages/client/Schedule";
import BookingConfirm from "./pages/client/BookingConfirm";
import Bookings from "./pages/client/Bookings";
import ClientMembership from "./pages/client/Membership";

// Trainer pages
import TrainerSchedule from "./pages/trainer/TrainerSchedule";

// Payment emulator (public)
import PaymentEmulator from "./pages/payment/PaymentEmulator";

function Stub({ title }) {
    return (
        <div className="p-6">
            <div className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">{title}</div>
            <div className="text-sm text-zinc-400">Страница в разработке</div>
        </div>
    );
}

/**
 * Корневой редирект по роли пользователя.
 */
function RootRedirect() {
    const { user, loading, primaryRole } = useAuth();

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-sm text-zinc-400">Загрузка...</div>
            </div>
        );
    }

    if (!user) return <Navigate to="/login" replace />;

    if (primaryRole === "admin" || primaryRole === "owner") return <Navigate to="/admin" replace />;
    if (primaryRole === "trainer") return <Navigate to="/trainer" replace />;
    return <Navigate to="/client" replace />;
}

export default function App() {
    return (
        <AuthProvider>
            <BrowserRouter>
                <Routes>
                    {/* Корень — редирект по роли */}
                    <Route path="/" element={<RootRedirect />} />

                    {/* ── Публичный эмулятор эквайринга ── */}
                    {/* Открывается в отдельной вкладке, не требует авторизации */}
                    <Route path="/payment/:id" element={<PaymentEmulator />} />

                    {/* ── Гостевые маршруты (только не-авторизованные) ── */}
                    <Route element={<GuestOnly />}>
                        <Route path="/login" element={<Login />} />
                        <Route path="/register" element={<Register />} />
                    </Route>

                    {/* ── Администратор / Владелец ── */}
                    <Route element={<RequireRole roles={["admin", "owner"]} />}>
                        <Route path="/admin" element={<AdminLayout />}>
                            <Route index element={<AdminDashboard />} />
                            <Route path="clients" element={<AdminClients />} />
                            <Route path="schedule" element={<AdminSchedule />} />
                            <Route path="memberships" element={<AdminMemberships />} />
                            <Route path="visits" element={<AdminVisits />} />
                            <Route path="pending-bookings" element={<AdminPendingBookings />} />
                            <Route path="sales" element={<AdminSales />} />
                            <Route path="owner/staff" element={<OwnerStaff />} />
                            <Route path="owner/membership-types" element={<OwnerMembershipTypes />} />
                            <Route path="owner/promo-codes" element={<OwnerPromoCodes />} />
                        </Route>
                    </Route>

                    {/* ── Клиент ── */}
                    <Route element={<RequireRole roles={["client"]} />}>
                        <Route path="/client" element={<ClientLayout />}>
                            <Route index element={<ClientDashboard />} />
                            <Route path="schedule" element={<Schedule />} />
                            <Route path="schedule/book/:id" element={<BookingConfirm />} />
                            <Route path="bookings" element={<Bookings />} />
                            <Route path="membership" element={<ClientMembership />} />
                            <Route path="profile" element={<Stub title="Профиль" />} />
                        </Route>
                    </Route>

                    {/* ── Тренер ── */}
                    <Route element={<RequireRole roles={["trainer"]} />}>
                        <Route path="/trainer" element={<TrainerLayout />}>
                            <Route index element={<TrainerSchedule />} />
                            <Route path="my-clients" element={<Stub title="Мои клиенты" />} />
                        </Route>
                    </Route>

                    {/* ── 404 ── */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </BrowserRouter>
        </AuthProvider>
    );
}
