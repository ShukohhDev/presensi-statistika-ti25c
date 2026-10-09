import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ToastProvider } from './contexts/ToastContext';
import { Layout } from './components/Layout/Layout';

// Pages
import { Login } from './pages/Login';
import { Attendance } from './pages/Attendance';
import { AdminDashboard } from './pages/AdminDashboard';
import { Recap } from './pages/Recap';
import { Tasks } from './pages/Tasks';
import { History } from './pages/History';
import { Profile } from './pages/Profile';
import { Reports } from './pages/Reports';
import { Calendar } from './pages/Calendar';
import { Materials } from './pages/Materials';

function ProtectedRoute({ children }) {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--color-text-secondary)' }}>
                Memuat aplikasi...
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    return children;
}

function AdminRoute({ children }) {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--color-text-secondary)' }}>
                Memuat...
            </div>
        );
    }

    if (!user || user.role !== 'admin') {
        return <Navigate to="/presensi" replace />;
    }

    return children;
}

function StudentOnlyRoute({ children }) {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--color-text-secondary)' }}>
                Memuat...
            </div>
        );
    }

    if (user?.role === 'admin') {
        return <Navigate to="/admin" replace />;
    }

    return children;
}

function HomeRedirect() {
    const { user, loading } = useAuth();
    if (loading) return null;
    return <Navigate to={user?.role === 'admin' ? '/admin' : '/presensi'} replace />;
}

function App() {
    return (
        <AuthProvider>
            <ThemeProvider>
                <ToastProvider>
                    <BrowserRouter>
                        <Routes>
                            {/* Public Login Route */}
                            <Route path="/login" element={<Login />} />

                            {/* Protected Routes inside Layout */}
                            <Route
                                path="/"
                                element={
                                    <ProtectedRoute>
                                        <Layout />
                                    </ProtectedRoute>
                                }
                            >
                                <Route index element={<HomeRedirect />} />
                                <Route
                                    path="presensi"
                                    element={
                                        <StudentOnlyRoute>
                                            <Attendance />
                                        </StudentOnlyRoute>
                                    }
                                />
                                <Route
                                    path="admin"
                                    element={
                                        <AdminRoute>
                                            <AdminDashboard />
                                        </AdminRoute>
                                    }
                                />
                                <Route path="rekap" element={<Recap />} />
                                <Route path="tugas" element={<Tasks />} />
                                <Route
                                    path="riwayat"
                                    element={
                                        <StudentOnlyRoute>
                                            <History />
                                        </StudentOnlyRoute>
                                    }
                                />
                                <Route path="profil" element={<Profile />} />
                                <Route path="laporan" element={<Reports />} />
                                <Route path="kalender" element={<Calendar />} />
                                <Route path="materi" element={<Materials />} />
                            </Route>

                            {/* Catch-all route */}
                            <Route path="*" element={<HomeRedirect />} />
                        </Routes>
                    </BrowserRouter>
                </ToastProvider>
            </ThemeProvider>
        </AuthProvider>
    );
}

export default App;
