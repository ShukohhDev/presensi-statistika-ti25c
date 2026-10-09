import { NavLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { API_URL } from '../../utils/api';
import {
    CheckCircleIcon,
    ShieldIcon,
    BarChartIcon,
    UploadIcon,
    HistoryIcon,
    UserIcon,
    MessageSquareIcon,
    CalendarIcon,
    WhatsAppIcon,
    LogOutIcon,
    BookOpenIcon,
    XIcon
} from '../Common/Icons';

export function Sidebar({ isOpen, onClose }) {
    const { user, logout } = useAuth();

    const handleLogout = async () => {
        onClose();
        await logout();
    };

    const getInitials = (name) => {
        if (!name) return 'U';
        return name
            .split(' ')
            .map((n) => n[0])
            .slice(0, 2)
            .join('')
            .toUpperCase();
    };

    // User photo URL if available
    const photoUrl = user?.profile_photo ? `${API_URL}${user.profile_photo}` : null;

    return (
        <>
            <div
                className={`sidebar-overlay ${isOpen ? 'visible' : ''}`}
                onClick={onClose}
                aria-hidden="true"
            />
            <aside className={`sidebar ${isOpen ? 'open' : ''}`} aria-label="Menu navigasi utama">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {photoUrl ? (
                            <img
                                src={photoUrl}
                                alt={user?.name}
                                className="avatar avatar-md"
                            />
                        ) : (
                            <div className="avatar avatar-md">
                                {getInitials(user?.name)}
                            </div>
                        )}
                        <div style={{ overflow: 'hidden' }}>
                            <div style={{ fontWeight: 600, fontSize: '0.938rem', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                                {user?.name || 'Pengguna'}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                                {user?.role === 'admin' ? 'PJ MK (Admin)' : 'Mahasiswa'}
                            </div>
                        </div>
                    </div>
                    <button
                        type="button"
                        className="modal-close"
                        onClick={onClose}
                        aria-label="Tutup navigasi"
                    >
                        <XIcon size={18} />
                    </button>
                </div>

                <div className="sidebar-section">
                    <div className="sidebar-section-title">Menu Utama</div>

                    <NavLink
                        to="/presensi"
                        className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
                        onClick={onClose}
                    >
                        <CheckCircleIcon size={18} />
                        <span>Presensi</span>
                    </NavLink>

                    {user?.role === 'admin' && (
                        <NavLink
                            to="/admin"
                            className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
                            onClick={onClose}
                        >
                            <ShieldIcon size={18} />
                            <span>Dashboard Admin</span>
                        </NavLink>
                    )}

                    <NavLink
                        to="/rekap"
                        className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
                        onClick={onClose}
                    >
                        <BarChartIcon size={18} />
                        <span>Rekap Kehadiran</span>
                    </NavLink>

                    <NavLink
                        to="/tugas"
                        className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
                        onClick={onClose}
                    >
                        <UploadIcon size={18} />
                        <span>Pengumpulan Tugas</span>
                    </NavLink>

                    <NavLink
                        to="/riwayat"
                        className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
                        onClick={onClose}
                    >
                        <HistoryIcon size={18} />
                        <span>Riwayat</span>
                    </NavLink>

                    <NavLink
                        to="/materi"
                        className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
                        onClick={onClose}
                    >
                        <BookOpenIcon size={18} />
                        <span>Bank Materi Kuliah</span>
                    </NavLink>

                    <NavLink
                        to="/kalender"
                        className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
                        onClick={onClose}
                    >
                        <CalendarIcon size={18} />
                        <span>Kalender Akademik</span>
                    </NavLink>

                    <NavLink
                        to="/laporan"
                        className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
                        onClick={onClose}
                    >
                        <MessageSquareIcon size={18} />
                        <span>Laporan & Saran</span>
                    </NavLink>
                </div>

                <div className="sidebar-divider" />

                <div className="sidebar-section">
                    <div className="sidebar-section-title">Komunitas & Akun</div>

                    <a
                        href="https://chat.whatsapp.com/sample-statistika-ti25c"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="sidebar-item"
                        style={{ color: '#25D366' }}
                    >
                        <WhatsAppIcon size={18} />
                        <span style={{ color: 'var(--color-text)' }}>Grup WhatsApp MK</span>
                    </a>

                    <NavLink
                        to="/profil"
                        className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
                        onClick={onClose}
                    >
                        <UserIcon size={18} />
                        <span>Profil & Pengaturan</span>
                    </NavLink>

                    <button
                        type="button"
                        className="sidebar-item"
                        onClick={handleLogout}
                        style={{ color: 'var(--color-danger)' }}
                    >
                        <LogOutIcon size={18} />
                        <span>Keluar Akun</span>
                    </button>
                </div>
            </aside>
        </>
    );
}
