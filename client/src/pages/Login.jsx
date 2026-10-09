import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { UserIcon, LockIcon } from '../components/Common/Icons';

export function Login() {
    const [name, setName] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const { user, login } = useAuth();
    const { addToast } = useToast();
    const navigate = useNavigate();

    // If already logged in, redirect
    useEffect(() => {
        if (user) {
            navigate(user.role === 'admin' ? '/admin' : '/presensi', { replace: true });
        }
    }, [user, navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!name.trim() || !password.trim()) {
            setError('Nama dan kata sandi wajib diisi.');
            return;
        }

        try {
            setLoading(true);
            const loggedInUser = await login(name.trim(), password.trim());
            addToast(`Selamat datang, ${loggedInUser.name}!`, 'success');
            navigate(loggedInUser.role === 'admin' ? '/admin' : '/presensi', { replace: true });
        } catch (err) {
            setError(err.message || 'Nama atau kata sandi tidak sesuai.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="login-card">
                <div className="login-header">
                    <div className="login-icon">
                        <UserIcon size={32} />
                    </div>
                    <h1>Presensi Statistika</h1>
                    <p>Sistem Informasi Kehadiran Mahasiswa - Kelas TI25C</p>
                </div>

                {error && (
                    <div className="login-error">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label" htmlFor="name">
                            Nama Mahasiswa
                        </label>
                        <div style={{ position: 'relative' }}>
                            <input
                                id="name"
                                type="text"
                                className="form-input"
                                placeholder="Masukkan nama lengkap"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                disabled={loading}
                                autoFocus
                                required
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label" htmlFor="password">
                            Kata Sandi (NIM)
                        </label>
                        <div style={{ position: 'relative' }}>
                            <input
                                id="password"
                                type="password"
                                className="form-input"
                                placeholder="Masukkan NIM Anda"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                disabled={loading}
                                required
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary btn-block btn-lg"
                        disabled={loading}
                        style={{ marginTop: '24px' }}
                    >
                        {loading ? 'Memverifikasi...' : 'Masuk'}
                    </button>
                </form>

                <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '0.813rem', color: 'var(--color-text-secondary)' }}>
                    <span>PJ MK: Faqih Hidayatus Salam</span>
                </div>
            </div>
        </div>
    );
}
