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
    FileTextIcon,
    DownloadIcon,
    AlertCircleIcon,
    XIcon
} from '../components/Common/Icons';

export function Profile() {
    const { user, settings, updateUser, updateSettings } = useAuth();
    const { theme, setTheme, darkMode, toggleDarkMode, THEMES } = useTheme();
    const { addToast } = useToast();

    const [summary, setSummary] = useState(null);
    const [courseInfo, setCourseInfo] = useState(null);
    const [loadingSummary, setLoadingSummary] = useState(true);
    const [uploadingPhoto, setUploadingPhoto] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [autoLogoutVal, setAutoLogoutVal] = useState(settings?.auto_logout_minutes || 30);
    const [savingSettings, setSavingSettings] = useState(false);
    const [showPrintModal, setShowPrintModal] = useState(false);

    const loadSummary = useCallback(async () => {
        if (user?.role === 'admin') {
            setLoadingSummary(false);
            return;
        }
        try {
            setLoadingSummary(true);
            const [dataSummary, dataCourse] = await Promise.all([
                api.getAttendanceSummary().catch(() => ({ summary: null })),
                api.getCourseInfo().catch(() => ({ info: null }))
            ]);
            setSummary(dataSummary?.summary || null);
            if (dataCourse?.info) {
                setCourseInfo(dataCourse.info);
            }
        } catch (err) {
            console.error('Error loading attendance summary:', err);
        } finally {
            setLoadingSummary(false);
        }
    }, [user?.role]);

    useEffect(() => {
        loadSummary();
    }, [loadSummary]);

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

                    {/* Ringkasan Kehadiran Pribadi (Hanya Tampil untuk Mahasiswa, Tidak untuk Admin) */}
                    {user?.role !== 'admin' && (
                        <div style={{ width: '100%', borderTop: '1px solid var(--color-border)', paddingTop: '20px', marginTop: '16px', textAlign: 'left' }}>
                            <h4 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '12px', color: 'var(--color-text)' }}>
                                Ringkasan Kehadiran Pribadi
                            </h4>

                            {loadingSummary ? (
                                <div className="text-center text-muted" style={{ padding: '16px 0' }}>
                                    Memuat ringkasan...
                                </div>
                            ) : summary ? (
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                        <span style={{ fontSize: '0.813rem', color: 'var(--color-text-secondary)' }}>
                                            Tingkat Kehadiran
                                        </span>
                                        <span style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--color-primary)', fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' }}>
                                            {summary.percentage}%
                                        </span>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', textAlign: 'center', marginTop: '12px' }}>
                                        <div style={{ padding: '8px', backgroundColor: 'var(--color-success-light)', borderRadius: 'var(--radius-md)' }}>
                                            <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-success)', fontFamily: 'var(--font-mono)' }}>{summary.hadir}</div>
                                            <div style={{ fontSize: '0.688rem', color: 'var(--color-success)' }}>Hadir</div>
                                        </div>
                                        <div style={{ padding: '8px', backgroundColor: 'var(--color-warning-light)', borderRadius: 'var(--radius-md)' }}>
                                            <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-warning)', fontFamily: 'var(--font-mono)' }}>{summary.izin}</div>
                                            <div style={{ fontSize: '0.688rem', color: 'var(--color-warning)' }}>Izin</div>
                                        </div>
                                        <div style={{ padding: '8px', backgroundColor: 'var(--color-info-light)', borderRadius: 'var(--radius-md)' }}>
                                            <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-info)', fontFamily: 'var(--font-mono)' }}>{summary.sakit}</div>
                                            <div style={{ fontSize: '0.688rem', color: 'var(--color-info)' }}>Sakit</div>
                                        </div>
                                        <div style={{ padding: '8px', backgroundColor: 'var(--color-danger-light)', borderRadius: 'var(--radius-md)' }}>
                                            <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-danger)', fontFamily: 'var(--font-mono)' }}>{summary.alpha}</div>
                                            <div style={{ fontSize: '0.688rem', color: 'var(--color-danger)' }}>Alpha</div>
                                        </div>
                                    </div>

                                    {/* Status Evaluasi Syarat UAS (Minimal 40%) */}
                                    <div style={{
                                        marginTop: '16px',
                                        padding: '12px 14px',
                                        borderRadius: 'var(--radius-md)',
                                        background: 'var(--color-bg-hover)',
                                        border: '1px solid var(--color-border)'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                                            <span style={{ fontSize: '0.813rem', fontWeight: 600 }}>Status Syarat UAS</span>
                                            {summary.percentage >= 40 ? (
                                                <span className="badge-status badge-hadir">Memenuhi Syarat (&gt;= 40%)</span>
                                            ) : (
                                                <span className="badge-status badge-alpha">Kritis: Di Bawah 40%</span>
                                            )}
                                        </div>
                                        <p style={{
                                            fontSize: '0.75rem',
                                            color: summary.percentage >= 40 ? 'var(--color-text-secondary)' : 'var(--color-danger)',
                                            margin: 0,
                                            lineHeight: '1.4'
                                        }}>
                                            {summary.percentage >= 40
                                                ? 'Tingkat kehadiran Anda memenuhi batas minimal 40% untuk berhak mengikuti Ujian Akhir Semester.'
                                                : 'Peringatan: Kehadiran Anda saat ini berada di bawah batas minimal 40%. Segera koordinasikan dengan PJ MK.'}
                                        </p>
                                    </div>

                                    <button
                                        type="button"
                                        className="btn btn-secondary btn-block"
                                        onClick={() => setShowPrintModal(true)}
                                        style={{ marginTop: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                                    >
                                        <FileTextIcon size={16} /> Cetak Bukti Presensi Resmi (PDF)
                                    </button>
                                </div>
                            ) : null}
                        </div>
                    )}


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

            {/* Modal Cetak Slip Bukti Presensi Resmi (Khusus Mahasiswa) */}
            {showPrintModal && summary && user?.role !== 'admin' && (
                <div className="modal-backdrop" onClick={() => setShowPrintModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '640px', padding: '32px 28px' }}>
                        <div className="no-print" style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
                            <button
                                type="button"
                                className="modal-close"
                                onClick={() => setShowPrintModal(false)}
                            >
                                <XIcon size={18} />
                            </button>
                        </div>

                        {/* Lembar Dokumen Slip Cetak */}
                        <div style={{
                            border: '2px solid #000000',
                            padding: '24px',
                            background: '#ffffff',
                            color: '#111827',
                            fontFamily: 'serif',
                            lineHeight: '1.4'
                        }}>
                            {/* Kop Surat Dokumen */}
                            <div style={{ textAlign: 'center', borderBottom: '2px solid #000000', paddingBottom: '12px', marginBottom: '16px' }}>
                                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, textTransform: 'uppercase', margin: 0, letterSpacing: '1px' }}>
                                    KARTU BUKTI KEHADIRAN PERKULIAHAN
                                </h3>
                                <p style={{ fontSize: '0.875rem', fontWeight: 600, margin: '4px 0 0 0' }}>
                                    MATA KULIAH: STATISTIKA (3 SKS) - KELAS TI25C
                                </p>
                                <p style={{ fontSize: '0.75rem', color: '#4B5563', margin: '2px 0 0 0' }}>
                                    Tahun Akademik Berjalan - Program Studi Sarjana
                                </p>
                            </div>

                            {/* Data Mahasiswa & Dosen */}
                            <table style={{ width: '100%', fontSize: '0.813rem', marginBottom: '16px', borderCollapse: 'collapse' }}>
                                <tbody>
                                    <tr>
                                        <td style={{ width: '140px', padding: '3px 0', fontWeight: 600 }}>Nama Mahasiswa</td>
                                        <td style={{ width: '10px' }}>:</td>
                                        <td style={{ fontWeight: 700 }}>{user?.name}</td>
                                    </tr>
                                    <tr>
                                        <td style={{ padding: '3px 0', fontWeight: 600 }}>Peran / Status</td>
                                        <td>:</td>
                                        <td>{user?.role === 'admin' ? 'PJ MK (Admin)' : 'Mahasiswa'}</td>
                                    </tr>
                                    <tr>
                                        <td style={{ padding: '3px 0', fontWeight: 600 }}>Dosen Pengampu</td>
                                        <td>:</td>
                                        <td>{courseInfo?.lecturer_name || 'Dr. Hendra Wijaya, M.Si.'}</td>
                                    </tr>
                                    <tr>
                                        <td style={{ padding: '3px 0', fontWeight: 600 }}>Hari & Jam Kuliah</td>
                                        <td>:</td>
                                        <td>{courseInfo?.schedule_day || 'Kamis'}, {courseInfo?.schedule_time || '08:00 - 09:40 WIB'}</td>
                                    </tr>
                                    <tr>
                                        <td style={{ padding: '3px 0', fontWeight: 600 }}>Ruang Kuliah</td>
                                        <td>:</td>
                                        <td>{courseInfo?.room || 'Ruang Teori Gedung Kuliah'}</td>
                                    </tr>
                                </tbody>
                            </table>

                            {/* Tabel Rekapitulasi Angka Kehadiran */}
                            <table style={{ width: '100%', fontSize: '0.813rem', border: '1px solid #000000', borderCollapse: 'collapse', textAlign: 'center', marginBottom: '16px' }}>
                                <thead>
                                    <tr style={{ background: '#F3F4F6', borderBottom: '1px solid #000000' }}>
                                        <th style={{ padding: '6px', borderRight: '1px solid #000000' }}>Hadir</th>
                                        <th style={{ padding: '6px', borderRight: '1px solid #000000' }}>Izin</th>
                                        <th style={{ padding: '6px', borderRight: '1px solid #000000' }}>Sakit</th>
                                        <th style={{ padding: '6px', borderRight: '1px solid #000000' }}>Alpha</th>
                                        <th style={{ padding: '6px' }}>Persentase</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td style={{ padding: '8px', borderRight: '1px solid #000000', fontWeight: 700 }}>{summary.hadir}</td>
                                        <td style={{ padding: '8px', borderRight: '1px solid #000000', fontWeight: 700 }}>{summary.izin}</td>
                                        <td style={{ padding: '8px', borderRight: '1px solid #000000', fontWeight: 700 }}>{summary.sakit}</td>
                                        <td style={{ padding: '8px', borderRight: '1px solid #000000', fontWeight: 700 }}>{summary.alpha}</td>
                                        <td style={{ padding: '8px', fontWeight: 800 }}>{summary.percentage}%</td>
                                    </tr>
                                </tbody>
                            </table>

                            {/* Evaluasi Syarat UAS */}
                            <div style={{
                                padding: '10px 14px',
                                border: '1px dashed #000000',
                                marginBottom: '24px',
                                fontSize: '0.813rem'
                            }}>
                                <div style={{ fontWeight: 700 }}>
                                    STATUS KELAYAKAN UAS: {summary.percentage >= 40 ? 'MEMENUHI SYARAT (>= 40%)' : 'TIDAK MEMENUHI SYARAT (< 40%)'}
                                </div>
                                <div style={{ fontSize: '0.75rem', marginTop: '2px' }}>
                                    {summary.percentage >= 40
                                        ? 'Mahasiswa bersangkutan dinyatakan berhak mengikuti Ujian Akhir Semester (UAS).'
                                        : 'Mahasiswa bersangkutan berada di bawah batas minimum kehadiran 40%.'}
                                </div>
                            </div>

                            {/* Kolom Tanda Tangan */}
                            <div style={{ display: 'flex', justifyContent: 'flex-end', textAlign: 'center', fontSize: '0.813rem', marginTop: '16px' }}>
                                <div style={{ width: '220px' }}>
                                    <div>Mengetahui,</div>
                                    <div style={{ fontWeight: 600 }}>PJ MK Statistika - TI25C</div>
                                    <div style={{ height: '54px' }}></div>
                                    <div style={{ fontWeight: 700, textDecoration: 'underline' }}>Faqih Hidayatus Salam</div>
                                    <div style={{ fontSize: '0.75rem' }}>NIM: 250511067 (Kelas TI25C)</div>
                                </div>
                            </div>
                        </div>

                        {/* Tombol Aksi di Modal */}
                        <div className="no-print" style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                            <button
                                type="button"
                                className="btn btn-secondary"
                                style={{ flex: 1 }}
                                onClick={() => setShowPrintModal(false)}
                            >
                                Tutup
                            </button>
                            <button
                                type="button"
                                className="btn btn-primary"
                                style={{ flex: 1 }}
                                onClick={() => window.print()}
                            >
                                <DownloadIcon size={16} /> Cetak / Simpan PDF
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
