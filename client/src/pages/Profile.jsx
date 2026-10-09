import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useToast } from '../contexts/ToastContext';
import { api, API_URL } from '../utils/api';
import {
    UserIcon,
    UploadIcon,
    CameraIcon,
    CheckCircleIcon,
    ClockIcon,
    MoonIcon,
    SunIcon,
    DownloadIcon,
    AlertCircleIcon,
    XIcon
} from '../components/Common/Icons';

export function Profile() {
    const { user, settings, updateUser, updateSettings } = useAuth();
    const { theme, setTheme, darkMode, toggleDarkMode, THEMES } = useTheme();
    const { addToast } = useToast();

    const [uploadingPhoto, setUploadingPhoto] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [autoLogoutVal, setAutoLogoutVal] = useState(settings?.auto_logout_minutes || 30);
    const [savingSettings, setSavingSettings] = useState(false);

    useEffect(() => {
        if (settings?.auto_logout_minutes) {
            setAutoLogoutVal(settings.auto_logout_minutes);
        }
    }, [settings]);

    // Helper kompresi gambar client-side agar proses upload instan dan hemat kuota
    const compressImage = (file, maxWidth = 1000, maxHeight = 1000, quality = 0.88) => {
        return new Promise((resolve) => {
            if (!file.type || !file.type.startsWith('image/')) {
                resolve(file);
                return;
            }
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    let { width, height } = img;
                    if (width > maxWidth || height > maxHeight) {
                        if (width > height) {
                            height = Math.round((height * maxWidth) / width);
                            width = maxWidth;
                        } else {
                            width = Math.round((width * maxHeight) / height);
                            height = maxHeight;
                        }
                    }
                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    canvas.toBlob(
                        (blob) => {
                            if (blob) {
                                const newFile = new File([blob], 'avatar.jpg', {
                                    type: 'image/jpeg',
                                    lastModified: Date.now()
                                });
                                resolve(newFile);
                            } else {
                                resolve(file);
                            }
                        },
                        'image/jpeg',
                        quality
                    );
                };
                img.onerror = () => resolve(file);
                img.src = e.target.result;
            };
            reader.onerror = () => resolve(file);
            reader.readAsDataURL(file);
        });
    };

    const processAndUploadPhoto = async (rawFile) => {
        if (!rawFile) return;
        if (rawFile.type && !rawFile.type.startsWith('image/')) {
            addToast('Berkas harus berupa gambar (JPG, PNG, WebP).', 'error');
            return;
        }

        try {
            setUploadingPhoto(true);
            const compressed = await compressImage(rawFile);
            const formData = new FormData();
            formData.append('photo', compressed);

            const res = await api.uploadProfilePhoto(formData);
            addToast('Foto profil berhasil diperbarui.', 'success');
            if (user) {
                updateUser({ ...user, profile_photo: res.photo });
            }
        } catch (err) {
            addToast(err.message || 'Gagal mengunggah foto profil.', 'error');
        } finally {
            setUploadingPhoto(false);
        }
    };

    const handlePhotoUpload = async (e) => {
        const file = e.target.files?.[0];
        if (file) {
            await processAndUploadPhoto(file);
        }
        e.target.value = '';
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = async (e) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file) {
            await processAndUploadPhoto(file);
        }
    };

    // Dukungan Salin-Tempel (Ctrl+V) langsung dari clipboard
    useEffect(() => {
        const handlePaste = (e) => {
            if (!e.clipboardData || !e.clipboardData.items) return;
            for (let i = 0; i < e.clipboardData.items.length; i++) {
                const item = e.clipboardData.items[i];
                if (item.type && item.type.startsWith('image/')) {
                    const blob = item.getAsFile();
                    if (blob) {
                        processAndUploadPhoto(blob);
                        break;
                    }
                }
            }
        };

        window.addEventListener('paste', handlePaste);
        return () => window.removeEventListener('paste', handlePaste);
    }, [user]);

    const handleSaveAutoLogout = async (e) => {
        e.preventDefault();
        try {
            setSavingSettings(true);
            const minutes = parseInt(autoLogoutVal, 10) || 30;
            await api.updateSettings({ auto_logout_minutes: minutes });
            updateSettings({ ...settings, auto_logout_minutes: minutes });
            addToast('Waktu auto-logout berhasil disimpan.', 'success');
        } catch (err) {
            addToast(err.message || 'Gagal menyimpan pengaturan.', 'error');
        } finally {
            setSavingSettings(false);
        }
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

    const photoUrl = user?.profile_photo ? `${API_URL}${user.profile_photo}` : null;

    return (
        <div>
            <div className="page-header">
                <h1 className="page-title">Profil & Pengaturan Akun</h1>
                <p className="page-subtitle">Kelola informasi pribadi, tampilan, dan preferensi akun Anda</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
                {/* Kartu Profil Utama */}
                <div className="card">
                    <div className="card-header">
                        <h2 className="card-title">Informasi Pribadi</h2>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '16px 0' }}>
                        {/* Avatar dengan dukungan Drag & Drop dan Indikator Upload */}
                        <div
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            style={{
                                position: 'relative',
                                marginBottom: '12px',
                                borderRadius: 'var(--radius-full)',
                                border: isDragging ? '3px dashed var(--color-primary)' : '3px solid transparent',
                                transition: 'all 0.2s ease',
                                cursor: 'pointer'
                            }}
                            title="Seret & lepas foto ke sini, atau klik tombol kamera"
                        >
                            {photoUrl ? (
                                <img
                                    src={photoUrl}
                                    alt={user?.name}
                                    className="avatar avatar-xl"
                                    style={{
                                        opacity: uploadingPhoto ? 0.4 : 1,
                                        transition: 'opacity 0.2s ease'
                                    }}
                                />
                            ) : (
                                <div
                                    className="avatar avatar-xl"
                                    style={{
                                        opacity: uploadingPhoto ? 0.4 : 1,
                                        transition: 'opacity 0.2s ease'
                                    }}
                                >
                                    {getInitials(user?.name)}
                                </div>
                            )}

                            {/* Overlay Loading saat sedang mengunggah */}
                            {uploadingPhoto && (
                                <div
                                    style={{
                                        position: 'absolute',
                                        inset: 0,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        borderRadius: 'var(--radius-full)',
                                        background: 'rgba(0, 0, 0, 0.45)',
                                        color: '#FFFFFF',
                                        fontSize: '0.688rem',
                                        fontWeight: 600,
                                        zIndex: 2
                                    }}
                                >
                                    <ClockIcon size={20} className="spinning" />
                                    <span style={{ marginTop: '4px' }}>Mengunggah...</span>
                                </div>
                            )}

                            {/* Tombol Kamera / Ganti Foto */}
                            <label
                                htmlFor="profilePhotoInput"
                                className="btn btn-primary btn-sm"
                                style={{
                                    position: 'absolute',
                                    bottom: 0,
                                    right: 0,
                                    borderRadius: 'var(--radius-full)',
                                    width: '38px',
                                    height: '38px',
                                    padding: 0,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    boxShadow: 'var(--shadow-md)',
                                    zIndex: 3
                                }}
                                title="Pilih Foto dari Komputer"
                            >
                                <CameraIcon size={18} />
                                <input
                                    id="profilePhotoInput"
                                    type="file"
                                    accept="image/*"
                                    style={{ display: 'none' }}
                                    onChange={handlePhotoUpload}
                                    disabled={uploadingPhoto}
                                />
                            </label>
                        </div>

                        {/* Petunjuk Pengunggahan Cepat */}
                        <p style={{
                            fontSize: '0.75rem',
                            color: 'var(--color-text-secondary)',
                            margin: '4px 0 16px 0',
                            maxWidth: '320px',
                            lineHeight: 1.5
                        }}>
                            Pilih berkas dari folder lokal (Downloads/Pictures), seret ke avatar, atau tekan <strong>Ctrl + V</strong>.
                        </p>

                        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-text)' }}>
                            {user?.name}
                        </h3>
                        <div style={{ marginTop: '4px' }}>
                            <span className="badge-status badge-hadir">
                                {user?.role === 'admin' ? 'Penanggung Jawab MK (Admin)' : 'Mahasiswa Aktif'}
                            </span>
                        </div>
                        <p style={{ fontSize: '0.813rem', color: 'var(--color-text-secondary)', marginTop: '8px' }}>
                            Mata Kuliah Statistika - Kelas TI25C (Semester 3)
                        </p>
                    </div>


                </div>

                {/* Kartu Tema & Preferensi */}
                <div className="card">
                    <div className="card-header">
                        <h2 className="card-title">Tema & Tampilan</h2>
                    </div>

                    {/* Mode Gelap / Cerah */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--color-border)', marginBottom: '20px' }}>
                        <div>
                            <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>Mode Gelap</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                                Sesuaikan kenyamanan visual layar Anda
                            </div>
                        </div>

                        <button
                            type="button"
                            className={`dark-mode-toggle ${darkMode ? 'active' : ''}`}
                            onClick={toggleDarkMode}
                            aria-label="Aktifkan mode gelap"
                        >
                            <span className="toggle-knob" />
                        </button>
                    </div>

                    {/* Pilihan 7 Tema Warna */}
                    <div style={{ marginBottom: '24px' }}>
                        <div className="form-label" style={{ marginBottom: '12px' }}>
                            Pilihan Tema Warna (7 Pilihan)
                        </div>

                        <div className="theme-grid">
                            {(THEMES || []).map((t) => (
                                <button
                                    key={t.id}
                                    type="button"
                                    className={`theme-option ${theme === t.id ? 'selected' : ''}`}
                                    onClick={() => setTheme(t.id)}
                                >
                                    <div
                                        className="theme-swatch"
                                        style={{ backgroundColor: t.swatch }}
                                    />
                                    <div className="theme-name">{t.name}</div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Pengaturan Auto-Logout */}
                    <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '20px' }}>
                        <div className="card-title" style={{ fontSize: '0.938rem', marginBottom: '8px' }}>
                            Keamanan Akun
                        </div>
                        <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginBottom: '16px' }}>
                            Akun akan otomatis keluar bila tidak ada aktivitas dalam durasi yang ditentukan.
                        </p>

                        <form onSubmit={handleSaveAutoLogout} style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                            <div className="form-group" style={{ flex: 1, margin: 0 }}>
                                <label className="form-label" htmlFor="logoutTimeout">
                                    Durasi Tidak Aktif (Menit)
                                </label>
                                <input
                                    id="logoutTimeout"
                                    type="number"
                                    min="5"
                                    max="180"
                                    className="form-input"
                                    value={autoLogoutVal}
                                    onChange={(e) => setAutoLogoutVal(e.target.value)}
                                    required
                                />
                            </div>

                            <button
                                type="submit"
                                className="btn btn-secondary btn-sm"
                                disabled={savingSettings}
                                style={{ height: '42px' }}
                            >
                                {savingSettings ? 'Menyimpan...' : 'Simpan'}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
