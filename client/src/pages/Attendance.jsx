import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../utils/api';
import { useToast } from '../contexts/ToastContext';
import {
    ChevronDownIcon,
    CheckCircleIcon,
    ClockIcon,
    AlertCircleIcon,
    UploadIcon,
    FileTextIcon,
    XIcon,
    BookOpenIcon,
    ExternalLinkIcon,
    WhatsAppIcon
} from '../components/Common/Icons';

export function Attendance() {
    const [isPanelOpen, setIsPanelOpen] = useState(true);
    const [activeSession, setActiveSession] = useState(null);
    const [userAttendance, setUserAttendance] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [courseInfo, setCourseInfo] = useState(null);

    // Form selection
    const [selectedOption, setSelectedOption] = useState('hadir'); // 'hadir' (Masuk), 'izin', 'sakit'
    const [note, setNote] = useState('');
    const [evidenceFile, setEvidenceFile] = useState(null);
    const [filePreviewUrl, setFilePreviewUrl] = useState(null);

    // Countdown timer
    const [timeLeft, setTimeLeft] = useState(null);
    const timerRef = useRef(null);
    const { addToast } = useToast();

    const fetchSessionData = useCallback(async () => {
        try {
            setLoading(true);
            const data = await api.getActiveSession();
            setActiveSession(data.session);
            setUserAttendance(data.attendance);
        } catch (err) {
            console.error('Error fetching session:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchCourseInfo = useCallback(async () => {
        try {
            const data = await api.getCourseInfo();
            if (data?.info) {
                setCourseInfo(data.info);
            }
        } catch (err) {
            console.error('Error fetching course info:', err);
        }
    }, []);

    useEffect(() => {
        fetchSessionData();
        fetchCourseInfo();
        const poll = setInterval(fetchSessionData, 15000);
        return () => clearInterval(poll);
    }, [fetchSessionData, fetchCourseInfo]);

    // Timer calculation
    useEffect(() => {
        if (!activeSession || !activeSession.opened_at) {
            setTimeLeft(null);
            return;
        }

        const calculateTimeLeft = () => {
            const openedTime = new Date(activeSession.opened_at).getTime();
            const durationMs = (activeSession.duration_minutes || 15) * 60 * 1000;
            const endTime = openedTime + durationMs;
            const diff = Math.max(0, Math.floor((endTime - Date.now()) / 1000));
            setTimeLeft(diff);
        };

        calculateTimeLeft();
        timerRef.current = setInterval(calculateTimeLeft, 1000);

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [activeSession]);

    const formatTimer = (seconds) => {
        if (seconds === null) return '--:--';
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const handleFileChange = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            setEvidenceFile(file);
            setFilePreviewUrl(URL.createObjectURL(file));
        }
    };

    const removeFile = () => {
        setEvidenceFile(null);
        if (filePreviewUrl) {
            URL.revokeObjectURL(filePreviewUrl);
            setFilePreviewUrl(null);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!activeSession) {
            addToast('Tidak ada sesi presensi yang sedang berlangsung.', 'error');
            return;
        }

        if ((selectedOption === 'izin' || selectedOption === 'sakit') && !note.trim()) {
            addToast('Catatan wajib diisi untuk permohonan izin atau sakit.', 'error');
            return;
        }

        if ((selectedOption === 'izin' || selectedOption === 'sakit') && !evidenceFile) {
            addToast('Bukti gambar wajib diunggah untuk permohonan izin atau sakit.', 'error');
            return;
        }

        try {
            setSubmitting(true);
            const formData = new FormData();
            formData.append('session_id', activeSession.id);
            formData.append('status', selectedOption);

            if (selectedOption !== 'hadir') {
                formData.append('note', note.trim());
                if (evidenceFile) {
                    formData.append('evidence', evidenceFile);
                }
            }

            await api.submitAttendance(formData);
            addToast('Presensi Anda berhasil dicatat.', 'success');
            removeFile();
            setNote('');
            await fetchSessionData();
        } catch (err) {
            addToast(err.message || 'Gagal mengirim presensi.', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const formatDateTime = (timestamp) => {
        if (!timestamp) return '-';
        try {
            const date = new Date(timestamp);
            return date.toLocaleDateString('id-ID', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch {
            return timestamp;
        }
    };

    return (
        <div>
            <div className="page-header">
                <h1 className="page-title">Halaman Presensi</h1>
                <p className="page-subtitle">Pencatatan kehadiran perkuliahan Mata Kuliah Statistika - Kelas TI25C</p>
            </div>

            {/* Kartu Informasi Perkuliahan & Dosen Pengampu */}
            <div className="card" style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', borderBottom: '1px solid var(--color-border)', paddingBottom: '14px', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: 'var(--radius-md)',
                            backgroundColor: 'var(--color-bg-hover)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--color-primary)'
                        }}>
                            <BookOpenIcon size={22} />
                        </div>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                <h2 style={{ fontSize: '1.05rem', fontWeight: 600, margin: 0 }}>Mata Kuliah Statistika</h2>
                                <span className="badge-status badge-hadir" style={{ fontSize: '0.688rem', padding: '2px 8px' }}>
                                    Kelas TI25C - 3 SKS
                                </span>
                            </div>
                            <p style={{ fontSize: '0.813rem', color: 'var(--color-text-secondary)', margin: '2px 0 0 0' }}>
                                Program Studi Teknik Informatika - Kelas TI25C
                            </p>
                        </div>
                    </div>
                    {courseInfo?.whatsapp_group_link && (
                        <a
                            href={courseInfo.whatsapp_group_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-secondary btn-sm"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                        >
                            <WhatsAppIcon size={16} />
                            Grup WhatsApp Kelas
                            <ExternalLinkIcon size={14} />
                        </a>
                    )}
                </div>

                <div className="course-meta-grid">
                    <div style={{ padding: '12px 14px', background: 'var(--color-bg-hover)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                        <div style={{ fontSize: '0.688rem', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Dosen Pengampu
                        </div>
                        <div style={{ fontWeight: 600, color: 'var(--color-text)', marginTop: '4px' }}>
                            {courseInfo?.lecturer_name || 'Dosen Pengampu Statistika'}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                            NIP: {courseInfo?.lecturer_nip || '-'}
                        </div>
                    </div>

                    <div style={{ padding: '12px 14px', background: 'var(--color-bg-hover)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                        <div style={{ fontSize: '0.688rem', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Jadwal Perkuliahan
                        </div>
                        <div style={{ fontWeight: 600, color: 'var(--color-text)', marginTop: '4px' }}>
                            {courseInfo?.schedule_day || 'Kamis'}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                            {courseInfo?.schedule_time || '08:00 - 09:40 WIB'}
                        </div>
                    </div>

                    <div style={{ padding: '12px 14px', background: 'var(--color-bg-hover)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                        <div style={{ fontSize: '0.688rem', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Ruang Kuliah
                        </div>
                        <div style={{ fontWeight: 600, color: 'var(--color-text)', marginTop: '4px' }}>
                            {courseInfo?.room || 'Ruang Teori Gedung Kuliah'}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                            Perkuliahan Tatap Muka
                        </div>
                    </div>

                    <div style={{ padding: '12px 14px', background: 'var(--color-bg-hover)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                        <div style={{ fontSize: '0.688rem', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Penanggung Jawab (PJ MK)
                        </div>
                        <div style={{ fontWeight: 600, color: 'var(--color-primary)', marginTop: '4px' }}>
                            Faqih Hidayatus Salam
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                            NIM: 250511067 (Kelas TI25C)
                        </div>
                    </div>
                </div>
            </div>

            <div className="attendance-panel">
                {/* Panel Mata Kuliah dengan Panah */}
                <div
                    className={`attendance-subject ${isPanelOpen ? 'expanded' : ''}`}
                    onClick={() => setIsPanelOpen(!isPanelOpen)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setIsPanelOpen(!isPanelOpen); }}
                >
                    <div>
                        <h3>Statistika</h3>
                        <p style={{ fontSize: '0.813rem', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                            {activeSession ? (
                                `Pertemuan ${activeSession.meeting_number}: ${activeSession.title}`
                            ) : (
                                'Sesi Perkuliahan Statistika - Kelas TI25C'
                            )}
                        </p>
                    </div>
                    <div className="arrow-icon">
                        <ChevronDownIcon size={24} />
                    </div>
                </div>

                {isPanelOpen && (
                    <div style={{ marginTop: '20px' }}>
                        {loading ? (
                            <div className="text-center text-muted" style={{ padding: '32px 0' }}>
                                Memeriksa sesi presensi...
                            </div>
                        ) : userAttendance ? (
                            /* Tampilan Setelah Presensi Berhasil */
                            <div className="attendance-done-msg">
                                <div className="check-icon">
                                    <CheckCircleIcon size={36} />
                                </div>
                                <h3>Presensi Berhasil Dicatat</h3>
                                <p>
                                    Anda telah melakukan presensi dengan status{' '}
                                    <span className={`badge-status badge-${userAttendance.status}`} style={{ margin: '0 4px' }}>
                                        {userAttendance.status === 'hadir' ? 'Masuk (Hadir)' : userAttendance.status}
                                    </span>
                                </p>
                                <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '8px' }}>
                                    Waktu Presensi: {formatDateTime(userAttendance.timestamp)}
                                </p>
                                {userAttendance.note && (
                                    <div style={{ marginTop: '16px', padding: '12px', background: 'var(--color-bg-hover)', borderRadius: 'var(--radius-md)', textAlign: 'left' }}>
                                        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Catatan:</div>
                                        <div style={{ fontSize: '0.875rem', marginTop: '4px' }}>{userAttendance.note}</div>
                                    </div>
                                )}
                            </div>
                        ) : activeSession ? (
                            /* Sesi Presensi Sedang Dibuka */
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
                                    <div>
                                        <span className="badge-status badge-active-session">Sesi Aktif</span>
                                        <span style={{ fontSize: '0.813rem', color: 'var(--color-text-secondary)', marginLeft: '8px' }}>
                                            Pertemuan ke-{activeSession.meeting_number}
                                        </span>
                                    </div>

                                    {timeLeft !== null && (
                                        <div className={`session-timer ${timeLeft < 180 ? 'urgent' : ''}`}>
                                            <ClockIcon size={16} />
                                            <span>Sisa Waktu: {formatTimer(timeLeft)}</span>
                                        </div>
                                    )}
                                </div>

                                <form onSubmit={handleSubmit}>
                                    <label className="form-label" style={{ marginBottom: '12px' }}>
                                        Pilih Status Kehadiran
                                    </label>

                                    <div className="attendance-options">
                                        {/* Pilihan Masuk (Hadir) */}
                                        <button
                                            type="button"
                                            className={`attendance-option ${selectedOption === 'hadir' ? 'selected' : ''}`}
                                            onClick={() => setSelectedOption('hadir')}
                                        >
                                            <span className="option-dot" />
                                            <div>
                                                <div style={{ fontWeight: 600 }}>Masuk</div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                                                    Hadir mengikuti perkuliahan
                                                </div>
                                            </div>
                                        </button>

                                        {/* Pilihan Izin */}
                                        <button
                                            type="button"
                                            className={`attendance-option ${selectedOption === 'izin' ? 'selected' : ''}`}
                                            onClick={() => setSelectedOption('izin')}
                                        >
                                            <span className="option-dot" />
                                            <div>
                                                <div style={{ fontWeight: 600 }}>Izin</div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                                                    Berhalangan hadir dengan keterangan
                                                </div>
                                            </div>
                                        </button>

                                        {/* Pilihan Sakit */}
                                        <button
                                            type="button"
                                            className={`attendance-option ${selectedOption === 'sakit' ? 'selected' : ''}`}
                                            onClick={() => setSelectedOption('sakit')}
                                        >
                                            <span className="option-dot" />
                                            <div>
                                                <div style={{ fontWeight: 600 }}>Sakit</div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                                                    Kondisi kesehatan tidak memungkinkan
                                                </div>
                                            </div>
                                        </button>
                                    </div>

                                    {/* Form Catatan & Bukti Gambar Jika Izin atau Sakit */}
                                    {(selectedOption === 'izin' || selectedOption === 'sakit') && (
                                        <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--color-border)' }}>
                                            <div className="form-group">
                                                <label className="form-label" htmlFor="note">
                                                    Catatan Keterangan <span style={{ color: 'var(--color-danger)' }}>*</span>
                                                </label>
                                                <textarea
                                                    id="note"
                                                    className="form-textarea"
                                                    placeholder={`Tuliskan alasan ${selectedOption === 'izin' ? 'izin' : 'sakit'} secara jelas...`}
                                                    value={note}
                                                    onChange={(e) => setNote(e.target.value)}
                                                    required
                                                />
                                            </div>

                                            <div className="form-group">
                                                <label className="form-label">
                                                    Unggah Bukti Gambar <span style={{ color: 'var(--color-danger)' }}>*</span>
                                                </label>

                                                {!evidenceFile ? (
                                                    <label className="file-upload-zone" htmlFor="evidenceInput" style={{ display: 'block' }}>
                                                        <UploadIcon size={32} />
                                                        <p>Klik atau seret gambar bukti ke area ini</p>
                                                        <span className="upload-hint">Format: JPG, PNG, atau WEBP</span>
                                                        <input
                                                            id="evidenceInput"
                                                            type="file"
                                                            accept="image/*"
                                                            style={{ display: 'none' }}
                                                            onChange={handleFileChange}
                                                        />
                                                    </label>
                                                ) : (
                                                    <div>
                                                        <div className="file-preview">
                                                            <div className="file-preview-icon">
                                                                <FileTextIcon size={20} />
                                                            </div>
                                                            <div className="file-preview-info">
                                                                <div className="file-name">{evidenceFile.name}</div>
                                                                <div className="file-size">
                                                                    {(evidenceFile.size / 1024).toFixed(1)} KB
                                                                </div>
                                                            </div>
                                                            <button
                                                                type="button"
                                                                className="modal-close"
                                                                onClick={removeFile}
                                                                aria-label="Hapus file bukti"
                                                            >
                                                                <XIcon size={16} />
                                                            </button>
                                                        </div>

                                                        {filePreviewUrl && (
                                                            <div style={{ marginTop: '12px', textAlign: 'center' }}>
                                                                <img
                                                                    src={filePreviewUrl}
                                                                    alt="Pratinjau Bukti"
                                                                    style={{ maxHeight: '180px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}
                                                                />
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    <button
                                        type="submit"
                                        className="btn btn-primary btn-block btn-lg"
                                        style={{ marginTop: '24px' }}
                                        disabled={submitting || (timeLeft !== null && timeLeft <= 0)}
                                    >
                                        {submitting ? 'Memproses Presensi...' : 'Selesai'}
                                    </button>
                                </form>
                            </div>
                        ) : (
                            /* Sesi Sedang Ditutup */
                            <div className="empty-state" style={{ padding: '36px 16px' }}>
                                <AlertCircleIcon size={44} />
                                <h3>Sesi Presensi Belum Dibuka</h3>
                                <p>PJ Mata Kuliah (Admin) belum membuka sesi presensi untuk perkuliahan saat ini.</p>
                                <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '8px' }}>
                                    Halaman ini akan diperbarui secara berkala saat sesi dibuka.
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
