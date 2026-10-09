import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { BellIcon, SunIcon, MoonIcon } from '../Common/Icons';

export function Navbar({ onToggleSidebar, isSidebarOpen, onToggleNotifications, unreadCount }) {
    const { user } = useAuth();
    const { darkMode, toggleDarkMode } = useTheme();

    return (
        <header className="navbar">
            <div className="navbar-brand">
                <h1>Statistika - TI25C</h1>
                <span>{user?.role === 'admin' ? 'PJ MK' : 'Mahasiswa'}</span>
            </div>

            <div className="navbar-actions">
                <button
                    type="button"
                    className="navbar-icon-btn"
                    onClick={toggleDarkMode}
                    title={darkMode ? 'Mode Terang' : 'Mode Gelap'}
                    aria-label="Ubah tema gelap terang"
                >
                    {darkMode ? <SunIcon size={20} /> : <MoonIcon size={20} />}
                </button>

                <button
                    type="button"
                    className="navbar-icon-btn"
                    onClick={onToggleNotifications}
                    title="Notifikasi"
                    aria-label="Buka notifikasi"
                >
                    <BellIcon size={20} />
                    {unreadCount > 0 && (
                        <span className="badge">
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                    )}
                </button>

                <button
                    type="button"
                    className={`hamburger-btn ${isSidebarOpen ? 'active' : ''}`}
                    onClick={onToggleSidebar}
                    aria-label="Menu navigasi"
                >
                    <span className="hamburger-line" />
                    <span className="hamburger-line" />
                    <span className="hamburger-line" />
                </button>
            </div>
        </header>
    );
}
