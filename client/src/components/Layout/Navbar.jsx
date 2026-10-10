import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { BellIcon, SunIcon, MoonIcon } from '../Common/Icons';

export function Navbar({ onToggleSidebar, isSidebarOpen, onToggleNotifications, unreadCount }) {
    const { user } = useAuth();
    const { darkMode, toggleDarkMode } = useTheme();

    return (
        <header className="navbar">
            <div className="navbar-brand">
                <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'var(--color-primary)',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: '0.75rem',
                    letterSpacing: '0.04em'
                }}>
                    TI
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h1 style={{ fontSize: '0.975rem', fontWeight: 700, margin: 0, letterSpacing: '-0.02em', color: 'var(--color-text)' }}>
                        Statistika <span style={{ color: 'var(--color-primary)', fontWeight: 600, fontSize: '0.813rem' }}>TI25C</span>
                    </h1>
                    <span style={{
                        fontSize: '0.688rem',
                        fontWeight: 600,
                        padding: '2px 8px',
                        borderRadius: 'var(--radius-xs)',
                        backgroundColor: user?.role === 'admin' ? 'var(--color-primary-light)' : 'var(--color-bg-hover)',
                        color: user?.role === 'admin' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                        border: '1px solid var(--color-border)'
                    }}>
                        {user?.role === 'admin' ? 'PJ MK' : 'Mahasiswa'}
                    </span>
                </div>
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
