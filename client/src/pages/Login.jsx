import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { UserIcon, LockIcon, EyeIcon, EyeOffIcon } from '../components/Common/Icons';

export function Login() {
    const [name, setName] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
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
                    <span className="login-badge">PORTAL AKADEMIK TI25C</span>
                    <div className="login-icon">
                        <UserIcon size={24} />
                    </div>
                    <h1>Presensi MK Statistika</h1>
                    <p>Sistem Informasi dan Pencatatan Kehadiran Mahasiswa Kelas TI25C</p>
                </div>

                {error && (
                    <div className="login-error">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label" htmlFor="name">
                            Nama Lengkap Mahasiswa
                        </label>
                        <input
                            id="name"
                            type="text"
                            className="form-input"
                            placeholder="Contoh: Faqih Hidayatus Salam"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            disabled={loading}
                            autoFocus
                            required
                        />
                    </div>

                    <div className="form-group">
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-xs)' }}>
                            <label className="form-label" htmlFor="password" style={{ margin: 0 }}>
                                Kata Sandi (NIM)
                            </label>
                            <span style={{ fontSize: '0.688rem', color: 'var(--color-text-muted)' }}>
                                Nomor Induk Mahasiswa
                            </span>
                        </div>
                        <div style={{ position: 'relative' }}>
                            <input
                                id="password"
                                type={showPassword ? 'text' : 'password'}
                                className="form-input"
                                placeholder="Masukkan NIM terdaftar"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                disabled={loading}
                                required
                                style={{ paddingRight: '44px', fontFamily: showPassword ? 'var(--font-mono)' : 'inherit' }}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                style={{
                                    position: 'absolute',
                                    right: '6px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    background: 'none',
                                    border: 'none',
                                    color: 'var(--color-text-secondary)',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    padding: '6px',
                                    borderRadius: 'var(--radius-sm)',
                                    transition: 'color 0.15s ease'
                                }}
                                title={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                                aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                            >
                                {showPassword ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary btn-block btn-lg"
                        disabled={loading}
                        style={{ marginTop: '20px' }}
                    >
                        {loading ? 'Memverifikasi Kredensial...' : 'Masuk ke Portal'}
                    </button>
                </form>

                <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--color-border)', textAlign: 'center', fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                    <div>Program Studi S1 Teknik Informatika - Angkatan 2025</div>
                    <div style={{ color: 'var(--color-text-muted)', marginTop: '4px' }}>PJ MK: Faqih Hidayatus Salam</div>
                </div>
            </div>
        </div>
    );
}
