import { useState, useEffect, useCallback, useRef } from 'react';
import { api, API_URL } from '../utils/api';
import { useToast } from '../contexts/ToastContext';
import { Modal } from '../components/Common/Modal';
import {
    ClockIcon,
    DownloadIcon,
    SendIcon,
    EditIcon,
    RefreshIcon,
    UserIcon,
    CheckCircleIcon,
    AlertCircleIcon,
    WhatsAppIcon,
    FileTextIcon,
    SettingsIcon,
    CalculatorIcon
} from '../components/Common/Icons';

export function AdminDashboard() {
    const [stats, setStats] = useState(null);
    const [sessions, setSessions] = useState([]);
    const [students, setStudents] = useState([]);
    const [activeSession, setActiveSession] = useState(null);
    const [loading, setLoading] = useState(true);

    // Form open session
    const [meetingNumber, setMeetingNumber] = useState(1);
    const [sessionTitle, setSessionTitle] = useState('');
    const [durationHours, setDurationHours] = useState(0);
    const [durationMins, setDurationMins] = useState(15);
    const [durationMinutes, setDurationMinutes] = useState(15);
    const [openingSession, setOpeningSession] = useState(false);

    // Form announcement
    const [announcementTitle, setAnnouncementTitle] = useState('');
    const [announcementContent, setAnnouncementContent] = useState('');
    const [sendingAnnouncement, setSendingAnnouncement] = useState(false);

    // Edit attendance modal
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [selectedStatus, setSelectedStatus] = useState('hadir');
    const [targetSessionId, setTargetSessionId] = useState(null);
    const [savingStatus, setSavingStatus] = useState(false);

    // Countdown timer for active session
    const [countdown, setCountdown] = useState(null);
    const timerRef = useRef(null);

    // Feature 1: WhatsApp Quick Copy state
    const [copyingWA, setCopyingWA] = useState(false);

    // Feature 3: Evidence proof photo preview modal
    const [previewModalOpen, setPreviewModalOpen] = useState(false);
    const [selectedEvidenceStudent, setSelectedEvidenceStudent] = useState(null);
    const [evidencePreviewUrl, setEvidencePreviewUrl] = useState(null);

    // Session attendances list for active session inspection
    const [sessionAttendances, setSessionAttendances] = useState([]);
    const [loadingAttendances, setLoadingAttendances] = useState(false);

    // Feature 4: Course Info & Lecturer Settings modal
    const [courseModalOpen, setCourseModalOpen] = useState(false);
    const [courseInfo, setCourseInfo] = useState({
        lecturer_name: 'Dosen Pengampu Statistika',
        lecturer_nip: '-',
        schedule_day: 'Kamis',
        schedule_time: '08:00 - 09:40 WIB',
        room: 'Ruang Teori Gedung Kuliah',
        whatsapp_group_link: 'https://chat.whatsapp.com/sample-statistika-ti25c',
        pj_whatsapp_phone: ''
    });
    const [savingCourse, setSavingCourse] = useState(false);

    // Feature 1: Simulator Kelayakan UAS Mahasiswa (Khusus Akun Admin Shukoh#Dev)
    const [simulatorModalOpen, setSimulatorModalOpen] = useState(false);
    const [recapData, setRecapData] = useState([]);
    const [loadingRecap, setLoadingRecap] = useState(false);
    const [simStudentId, setSimStudentId] = useState('all');

    const { addToast } = useToast();

    const loadDashboardData = useCallback(async () => {
        try {
            setLoading(true);
            const [statsData, sessionsData, studentsData, activeData, courseData] = await Promise.all([
                api.getDashboardStats().catch(() => null),
                api.getSessions().catch(() => ({ sessions: [] })),
                api.getStudents().catch(() => ({ students: [] })),
                api.getActiveSession().catch(() => ({ session: null })),
                api.getCourseInfo().catch(() => ({ info: null }))
            ]);

            setStats(statsData);
            setSessions(sessionsData.sessions || []);
            setStudents(studentsData.students || []);
            setActiveSession(activeData.session || null);

            if (courseData?.info) {
                setCourseInfo(courseData.info);
            }

            // If there's an active session, load its detailed attendance list
            if (activeData?.session) {
                loadSessionAttendances(activeData.session.id);
            } else if (sessionsData?.sessions && sessionsData.sessions.length > 0) {
                loadSessionAttendances(sessionsData.sessions[0].id);
            }

            // Set next meeting number suggestion
            if (sessionsData.sessions && sessionsData.sessions.length > 0) {
                const maxMeeting = Math.max(...sessionsData.sessions.map(s => s.meeting_number));
                setMeetingNumber(maxMeeting + 1);
            }
        } catch (err) {
            console.error('Error loading dashboard:', err);
            addToast('Gagal memuat data dashboard.', 'error');
        } finally {
            setLoading(false);
        }
    }, [addToast]);

    const loadSessionAttendances = async (sessionId) => {
        try {
            setLoadingAttendances(true);
            const data = await api.getSessionAttendances(sessionId);
            setSessionAttendances(data.attendances || []);
        } catch (err) {
            console.error('Error loading session attendances:', err);
        } finally {
            setLoadingAttendances(false);
        }
    };

    useEffect(() => {
        loadDashboardData();
    }, [loadDashboardData]);

    // Live countdown calculation
    useEffect(() => {
        if (!activeSession || !activeSession.opened_at) {
            setCountdown(null);
            return;
        }

        const tick = () => {
            const openedTime = new Date(activeSession.opened_at).getTime();
            const durationMs = (activeSession.duration_minutes || 15) * 60 * 1000;
            const diff = Math.max(0, Math.floor((openedTime + durationMs - Date.now()) / 1000));
            setCountdown(diff);
        };

        tick();
        timerRef.current = setInterval(tick, 1000);
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [activeSession]);

    const formatTimer = (secs) => {
        if (secs === null) return '--:--';
        const mins = Math.floor(secs / 60);
        const remSecs = secs % 60;
        return `${mins.toString().padStart(2, '0')}:${remSecs.toString().padStart(2, '0')}`;
    };

    const handleOpenSession = async (e) => {
        e.preventDefault();
        const totalDuration = (parseInt(durationHours, 10) * 60) + parseInt(durationMins, 10);
        if (totalDuration < 5) {
            addToast('Durasi minimal sesi adalah 5 menit.', 'error');
            return;
        }

        try {
            setOpeningSession(true);
            const res = await api.openSession(
                parseInt(meetingNumber, 10),
                sessionTitle.trim() || `Pertemuan ${meetingNumber}`,
                totalDuration
            );
            addToast(res.message || 'Sesi presensi berhasil dibuka.', 'success');
            setSessionTitle('');
            await loadDashboardData();
        } catch (err) {
            addToast(err.message || 'Gagal membuka sesi presensi.', 'error');
        } finally {
            setOpeningSession(false);
        }
    };

    const handleCloseSession = async () => {
        if (!activeSession) return;
        if (!window.confirm('Tutup sesi presensi sekarang? Mahasiswa yang belum presensi akan dihitung Alpha.')) return;

        try {
            const res = await api.closeSession(activeSession.id);
            addToast(res.message || 'Sesi presensi ditutup.', 'success');
            await loadDashboardData();
        } catch (err) {
            addToast(err.message || 'Gagal menutup sesi.', 'error');
        }
    };

    // Feature 1: Salin Format Rekap WhatsApp untuk Dosen
    const handleCopyWASummary = async (sessionId) => {
        const targetId = sessionId || activeSession?.id || (sessions.length > 0 ? sessions[0].id : null);
        if (!targetId) {
            addToast('Pilih pertemuan yang ingin disalin format rekapnya.', 'error');
            return;
        }

        try {
            setCopyingWA(true);
            const data = await api.getSessionWASummary(targetId);
            if (data?.text) {
                await navigator.clipboard.writeText(data.text);
                addToast('Format rekap WhatsApp berhasil disalin ke clipboard! Siap dikirim ke Dosen.', 'success');
            }
        } catch (err) {
            addToast(err.message || 'Gagal membuat format pesan WhatsApp.', 'error');
        } finally {
            setCopyingWA(false);
        }
    };

    // Colek / Ingatkan Cepat via WhatsApp untuk mahasiswa yang belum presensi
    const handleCopyNudgeWA = (sessionId) => {
        const targetId = sessionId || activeSession?.id || (sessions.length > 0 ? sessions[0].id : null);
        if (!targetId) {
            addToast('Pilih sesi presensi terlebih dahulu.', 'error');
            return;
        }

        const unpresenced = sessionAttendances.filter(a => a.status === 'alpha' || !a.status);
        if (unpresenced.length === 0) {
            addToast('Semua mahasiswa sudah melakukan presensi pada sesi ini!', 'info');
            return;
        }

        const meetingNum = activeSession ? activeSession.meeting_number : (sessions.find(s => s.id === targetId)?.meeting_number || '-');
        let text = `*PENGINGAT PRESENSI MK STATISTIKA (KELAS TI25C)*\n`;
        text += `Halo teman-teman, sesi presensi Pertemuan ke-${meetingNum} saat ini sedang berlangsung.\n\n`;
        text += `Berikut daftar mahasiswa yang *BELUM MELAKUKAN PRESENSI* (${unpresenced.length} orang):\n`;
        unpresenced.forEach((m, idx) => {
            text += `${idx + 1}. ${m.name}\n`;
        });
        text += `\nMohon segera membuka website presensi dan melakukan absensi sebelum sesi ditutup. Terima kasih.\n- PJ MK Faqih Hidayatus Salam`;

        navigator.clipboard.writeText(text)
            .then(() => addToast('Pesan pengingat WA berhasil disalin ke clipboard! Siap dibagikan ke grup kelas.', 'success'))
            .catch(() => addToast('Gagal menyalin teks pengingat.', 'error'));
    };

    // Feature 3: Pratinjau Bukti Foto Izin/Sakit
    const handleOpenEvidence = (att) => {
        setSelectedEvidenceStudent(att);
        setEvidencePreviewUrl(att.evidence_image ? `${API_URL}${att.evidence_image}` : null);
        setPreviewModalOpen(true);
    };

    // Feature 4: Simpan Informasi Perkuliahan & Dosen
    const handleSaveCourseInfo = async (e) => {
        e.preventDefault();
        try {
            setSavingCourse(true);
            await api.updateCourseInfo(courseInfo);
            addToast('Informasi perkuliahan dan dosen berhasil diperbarui.', 'success');
            setCourseModalOpen(false);
        } catch (err) {
            addToast(err.message || 'Gagal memperbarui info perkuliahan.', 'error');
        } finally {
            setSavingCourse(false);
        }
    };

    // Feature 1: Simulator Kelayakan UAS (Khusus Admin Shukoh#Dev)
    const loadRecapData = async () => {
        try {
            setLoadingRecap(true);
            const data = await api.getAttendanceRecap();
            setRecapData(data.recap || []);
        } catch (err) {
            console.error('Error loading recap for simulator:', err);
            addToast('Gagal memuat rekap kehadiran mahasiswa.', 'error');
        } finally {
            setLoadingRecap(false);
        }
    };

    const handleOpenSimulator = () => {
        setSimulatorModalOpen(true);
        loadRecapData();
    };

    const handleCopyWarningWA = (student) => {
        const hadir = student.counts?.hadir || 0;
        const totalHeld = sessions.length;
        const remaining = Math.max(0, 16 - totalHeld);
        const needed = Math.max(0, 7 - hadir);
        const maxPossible = hadir + remaining;
        const safetyBuffer = maxPossible - 7;

        let statusText = 'AMAN';
        if (hadir >= 7) {
            statusText = 'SUDAH MEMENUHI SYARAT (AMAN)';
        } else if (maxPossible < 7) {
            statusText = 'KRITIS (TIDAK MEMENUHI SYARAT 40%)';
        } else if (safetyBuffer <= 1) {
            statusText = 'WASPADA (BATAS RAWAN)';
        } else {
            statusText = 'AMAN TERKENDALI';
        }

        const text = `*PEMBERITAHUAN SIMULASI KELAYAKAN UAS STATISTIKA TI25C*
Nama Mahasiswa: ${student.name}
Kehadiran Saat Ini: ${hadir} dari ${totalHeld} pertemuan terlaksana
Syarat Minimal Kelayakan UAS (40%): 7 pertemuan
Sisa Pertemuan Semester: ${remaining} pertemuan
Kebutuhan Kehadiran: Minimal ${needed} pertemuan lagi
Jatah Absen Aman: ${safetyBuffer >= 0 ? safetyBuffer + ' kali' : 'Tidak ada (Sudah melewati batas)'}
Status Prediksi: ${statusText}

Catatan:
Mahasiswa wajib memenuhi kehadiran minimal 40% (7 pertemuan) untuk dapat mengikuti Ujian Akhir Semester (UAS) Statistika. Mohon maksimalkan kehadiran pada pertemuan berikutnya.

Penanggung Jawab Mata Kuliah:
Shukoh#Dev (PJ MK Statistika Kelas TI25C)`;

        navigator.clipboard.writeText(text);
        addToast(`Format peringatan WA untuk ${student.name} berhasil disalin.`, 'success');
    };

    const handleSendAnnouncement = async (e) => {
        e.preventDefault();
        if (!announcementTitle.trim() || !announcementContent.trim()) {
            addToast('Judul dan isi pengumuman wajib diisi.', 'error');
            return;
        }

        try {
            setSendingAnnouncement(true);
            await api.createAnnouncement(announcementTitle.trim(), announcementContent.trim());
            addToast('Pengumuman berhasil disiarkan kepada semua mahasiswa.', 'success');
            setAnnouncementTitle('');
            setAnnouncementContent('');
        } catch (err) {
            addToast(err.message || 'Gagal mengirim pengumuman.', 'error');
        } finally {
            setSendingAnnouncement(false);
        }
    };

    const handleOpenEditStatus = (student) => {
        setSelectedStudent(student);
        const currentSession = activeSession?.id || (sessions.length > 0 ? sessions[0].id : null);
        setTargetSessionId(currentSession);
        setSelectedStatus('hadir');
        setEditModalOpen(true);
    };

    const handleSaveStatus = async (e) => {
        e.preventDefault();
        if (!selectedStudent || !targetSessionId) {
            addToast('Pilih mahasiswa dan sesi perkuliahan.', 'error');
            return;
        }

        try {
            setSavingStatus(true);
            await api.updateAttendanceStatus(selectedStudent.id, targetSessionId, selectedStatus);
            addToast(`Status kehadiran ${selectedStudent.name} berhasil diperbarui.`, 'success');
            setEditModalOpen(false);
            await loadDashboardData();
        } catch (err) {
            addToast(err.message || 'Gagal mengubah status kehadiran.', 'error');
        } finally {
            setSavingStatus(false);
        }
    };

    const handleExportExcel = async () => {
        try {
            addToast('Sedang menyiapkan file Excel...', 'info');
            await api.exportExcel();
            addToast('File Excel berhasil diunduh.', 'success');
        } catch (err) {
            addToast(err.message || 'Gagal mengunduh file Excel.', 'error');
        }
    };

    const handleExportCSV = async () => {
        try {
            addToast('Sedang menyiapkan file CSV...', 'info');
            await api.exportCSV();
            addToast('File CSV berhasil diunduh.', 'success');
        } catch (err) {
            addToast(err.message || 'Gagal mengunduh file CSV.', 'error');
        }
    };

    return (
        <div>
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                    <h1 className="page-title">Dashboard Admin & Kendali Sesi</h1>
                    <p className="page-subtitle">Panel Pengelolaan Presensi Mata Kuliah Statistika - Kelas TI25C</p>
                </div>

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={handleOpenSimulator}
                        title="Kalkulator Simulasi Kelayakan UAS Mahasiswa (Syarat Minimal 40%)"
                    >
                        <CalculatorIcon size={16} /> Simulator UAS
                    </button>
                    <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => setCourseModalOpen(true)}
                        title="Atur Info Dosen & Jadwal Kelas"
                    >
                        <SettingsIcon size={16} /> Info Dosen & Jadwal
                    </button>
                    <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={handleExportCSV}
                        title="Unduh Rekap Format CSV"
                    >
                        <DownloadIcon size={16} /> Unduh CSV
                    </button>
                    <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={handleExportExcel}
                        title="Unduh Rekap Format Excel"
                    >
                        <DownloadIcon size={16} /> Unduh Excel (.xlsx)
                    </button>
                </div>
            </div>

            {/* Grid Statistik */}
            <div className="stat-grid">
                <div className="stat-card">
                    <div className="stat-icon primary">
                        <UserIcon size={22} />
                    </div>
                    <div className="stat-info">
                        <h3>{stats?.totalStudents || students.length || 27}</h3>
                        <p>Total Mahasiswa</p>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon success">
                        <CheckCircleIcon size={22} />
                    </div>
                    <div className="stat-info">
                        <h3>{stats?.totalSessions || sessions.length || 0}</h3>
                        <p>Total Pertemuan Selesai</p>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon warning">
                        <ClockIcon size={22} />
                    </div>
                    <div className="stat-info">
                        <h3>{activeSession ? 'Aktif' : 'Tutup'}</h3>
                        <p>Status Sesi Presensi</p>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon primary">
                        <AlertCircleIcon size={22} />
                    </div>
                    <div className="stat-info">
                        <h3>{stats?.totalReports || 0}</h3>
                        <p>Laporan Baru Mahasiswa</p>
                    </div>
                </div>
            </div>

            {/* Baris Panel Kendali Sesi & Pengumuman */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px', marginBottom: '32px' }}>
                {/* Panel Kendali Sesi */}
                <div className="card">
                    <div className="card-header">
                        <h2 className="card-title">Panel Kendali Sesi Presensi</h2>
                        {activeSession && <span className="badge-status badge-active-session">Sedang Berlangsung</span>}
                    </div>

                    {activeSession ? (
                        <div style={{ padding: '8px 0' }}>
                            <div style={{ backgroundColor: 'var(--color-primary-subtle)', padding: '16px', borderRadius: 'var(--radius-lg)', marginBottom: '16px' }}>
                                <div style={{ fontSize: '0.813rem', color: 'var(--color-primary)', fontWeight: 600 }}>
                                    Pertemuan ke-{activeSession.meeting_number}
                                </div>
                                <h3 style={{ fontSize: '1.125rem', marginTop: '4px', color: 'var(--color-text)' }}>
                                    {activeSession.title}
                                </h3>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px' }}>
                                    <ClockIcon size={18} />
                                    <span style={{ fontSize: '1.25rem', fontWeight: 700, color: countdown < 180 ? 'var(--color-danger)' : 'var(--color-primary)' }}>
                                        {formatTimer(countdown)}
                                    </span>
                                    <span style={{ fontSize: '0.813rem', color: 'var(--color-text-secondary)' }}>
                                        (Durasi: {activeSession.duration_minutes} menit)
                                    </span>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '10px', flexDirection: 'column' }}>
                                <button
                                    type="button"
                                    className="btn btn-secondary btn-block"
                                    onClick={() => handleCopyWASummary(activeSession.id)}
                                    disabled={copyingWA}
                                    style={{ borderColor: '#25D366', color: '#128C7E' }}
                                >
                                    <WhatsAppIcon size={18} />
                                    {copyingWA ? 'Menyiapkan...' : 'Salin Format Rekap ke WhatsApp Dosen'}
                                </button>

                                <button
                                    type="button"
                                    className="btn btn-secondary btn-block"
                                    onClick={() => handleCopyNudgeWA(activeSession.id)}
                                    style={{ borderColor: '#25D366', color: '#128C7E' }}
                                >
                                    <WhatsAppIcon size={18} />
                                    Salin Pengingat WA Mahasiswa Belum Presensi
                                </button>

                                <button
                                    type="button"
                                    className="btn btn-danger btn-block"
                                    onClick={handleCloseSession}
                                >
                                    Tutup Sesi Presensi Sekarang
                                </button>
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={handleOpenSession}>
                            <div className="form-group">
                                <label className="form-label" htmlFor="meetingNumber">
                                    Pertemuan Ke-
                                </label>
                                <input
                                    id="meetingNumber"
                                    type="number"
                                    min="1"
                                    max="32"
                                    className="form-input"
                                    value={meetingNumber}
                                    onChange={(e) => setMeetingNumber(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label" htmlFor="sessionTitle">
                                    Materi / Topik Perkuliahan
                                </label>
                                <input
                                    id="sessionTitle"
                                    type="text"
                                    className="form-input"
                                    placeholder="Contoh: Turunan Fungsi Dua Peubah"
                                    value={sessionTitle}
                                    onChange={(e) => setSessionTitle(e.target.value)}
                                />
                            </div>

                            <div className="form-group">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                    <label className="form-label" style={{ margin: 0 }}>
                                        Durasi Sesi Presensi
                                    </label>
                                    <span className="badge-status badge-hadir" style={{ fontSize: '0.75rem', fontWeight: 600 }}>
                                        Total: {(durationHours * 60) + durationMins} Menit {durationHours > 0 ? `(${durationHours} jam ${durationMins} mnt)` : ''}
                                    </span>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                    <div>
                                        <label htmlFor="durationHoursSelect" style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginBottom: '4px', display: 'block' }}>
                                            Jam
                                        </label>
                                        <select
                                            id="durationHoursSelect"
                                            className="form-select"
                                            value={durationHours}
                                            onChange={(e) => setDurationHours(Number(e.target.value))}
                                        >
                                            {[0, 1, 2, 3, 4, 5].map((h) => (
                                                <option key={h} value={h}>{h} Jam</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label htmlFor="durationMinsSelect" style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginBottom: '4px', display: 'block' }}>
                                            Menit
                                        </label>
                                        <select
                                            id="durationMinsSelect"
                                            className="form-select"
                                            value={durationMins}
                                            onChange={(e) => setDurationMins(Number(e.target.value))}
                                        >
                                            {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map((m) => (
                                                <option key={m} value={m}>{m} Menit</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {/* Tombol Pintas Durasi (Preset Cepat) */}
                                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '10px' }}>
                                    {[
                                        { label: '15 Menit', h: 0, m: 15 },
                                        { label: '30 Menit', h: 0, m: 30 },
                                        { label: '45 Menit', h: 0, m: 45 },
                                        { label: '1 Jam', h: 1, m: 0 },
                                        { label: '1 Jam 30m', h: 1, m: 30 },
                                        { label: '2 Jam', h: 2, m: 0 }
                                    ].map((preset) => {
                                        const isSelected = durationHours === preset.h && durationMins === preset.m;
                                        return (
                                            <button
                                                key={preset.label}
                                                type="button"
                                                className={`btn btn-sm ${isSelected ? 'btn-primary' : 'btn-secondary'}`}
                                                onClick={() => {
                                                    setDurationHours(preset.h);
                                                    setDurationMins(preset.m);
                                                }}
                                                style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                                            >
                                                {preset.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <button
                                type="submit"
                                className="btn btn-primary btn-block btn-lg"
                                disabled={openingSession}
                                style={{ marginTop: '20px' }}
                            >
                                {openingSession ? 'Membuka Sesi...' : 'Buka Sesi Presensi'}
                            </button>
                        </form>
                    )}
                </div>

                {/* Panel Siarkan Pengumuman */}
                <div className="card">
                    <div className="card-header">
                        <h2 className="card-title">Kirim Pengumuman Kelas</h2>
                    </div>

                    <form onSubmit={handleSendAnnouncement}>
                        <div className="form-group">
                            <label className="form-label" htmlFor="notifTitle">
                                Judul Pengumuman
                            </label>
                            <input
                                id="notifTitle"
                                type="text"
                                className="form-input"
                                placeholder="Contoh: Perubahan Jadwal Pertemuan 5"
                                value={announcementTitle}
                                onChange={(e) => setAnnouncementTitle(e.target.value)}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label" htmlFor="notifMessage">
                                Isi Pengumuman
                            </label>
                            <textarea
                                id="notifMessage"
                                className="form-textarea"
                                placeholder="Tuliskan pesan lengkap pengumuman untuk seluruh mahasiswa..."
                                value={announcementContent}
                                onChange={(e) => setAnnouncementContent(e.target.value)}
                                rows={4}
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            className="btn btn-secondary btn-block"
                            disabled={sendingAnnouncement}
                            style={{ marginTop: '20px' }}
                        >
                            <SendIcon size={16} />
                            {sendingAnnouncement ? 'Mengirim...' : 'Siarkan Pengumuman'}
                        </button>
                    </form>
                </div>
            </div>

            {/* Panel Daftar Kehadiran Sesi & Verifikasi Surat Bukti Izin/Sakit */}
            <div className="card" style={{ marginBottom: '32px' }}>
                <div className="card-header" style={{ flexWrap: 'wrap', gap: '8px' }}>
                    <div>
                        <h2 className="card-title">
                            Verifikasi Kehadiran Sesi {activeSession ? `Aktif (P${activeSession.meeting_number})` : sessions.length > 0 ? `(P${sessions[0].meeting_number})` : ''}
                        </h2>
                        <p className="card-subtitle">
                            Periksa surat dokter/bukti izin mahasiswa dan salin rekap ke WhatsApp dosen
                        </p>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleCopyNudgeWA(activeSession?.id || (sessions.length > 0 ? sessions[0].id : null))}
                            style={{ borderColor: '#25D366', color: '#128C7E' }}
                        >
                            <WhatsAppIcon size={16} /> Salin Pengingat Belum Presensi
                        </button>
                        <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleCopyWASummary(activeSession?.id || (sessions.length > 0 ? sessions[0].id : null))}
                            style={{ borderColor: '#25D366', color: '#128C7E' }}
                        >
                            <WhatsAppIcon size={16} /> Salin Format WA Dosen
                        </button>
                    </div>
                </div>

                {loadingAttendances ? (
                    <div className="text-center text-muted" style={{ padding: '24px 0' }}>
                        Memuat data kehadiran sesi...
                    </div>
                ) : sessionAttendances.length === 0 ? (
                    <div className="empty-state" style={{ padding: '24px 0' }}>
                        <p>Belum ada catatan presensi untuk sesi ini.</p>
                    </div>
                ) : (
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th style={{ width: '48px' }}>No</th>
                                    <th>Nama Mahasiswa</th>
                                    <th>Status</th>
                                    <th>Keterangan / Catatan</th>
                                    <th>Surat Bukti</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sessionAttendances.map((att, index) => (
                                    <tr key={att.user_id}>
                                        <td>{index + 1}</td>
                                        <td style={{ fontWeight: 600 }}>{att.name}</td>
                                        <td>
                                            <span className={`badge-status badge-${att.status}`}>
                                                {att.status === 'hadir' ? 'Masuk (Hadir)' : att.status}
                                            </span>
                                        </td>
                                        <td style={{ fontSize: '0.813rem', color: 'var(--color-text-secondary)' }}>
                                            {att.note || '-'}
                                        </td>
                                        <td>
                                            {att.evidence_image ? (
                                                <button
                                                    type="button"
                                                    className="btn btn-secondary btn-sm"
                                                    onClick={() => handleOpenEvidence(att)}
                                                    style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                                                >
                                                    <FileTextIcon size={14} /> Lihat Surat Bukti
                                                </button>
                                            ) : (
                                                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>-</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Tabel Daftar Mahasiswa dan Edit Status Kehadiran */}
            <div className="card">
                <div className="card-header" style={{ flexWrap: 'wrap', gap: '8px' }}>
                    <div>
                        <h2 className="card-title">Daftar Mahasiswa & Pengaturan Presensi Manual</h2>
                        <p className="card-subtitle">Ubah status kehadiran mahasiswa secara manual per sesi jika diperlukan</p>
                    </div>

                    <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={loadDashboardData}
                        title="Muat ulang data"
                    >
                        <RefreshIcon size={16} /> Segarkan
                    </button>
                </div>

                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th style={{ width: '48px' }}>No</th>
                                <th>Nama Mahasiswa</th>
                                <th>Status Akun</th>
                                <th style={{ textAlign: 'right' }}>Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {students.map((student, index) => (
                                <tr key={student.id}>
                                    <td>{index + 1}</td>
                                    <td style={{ fontWeight: 600 }}>{student.name}</td>
                                    <td>
                                        <span className="badge-status badge-hadir">Aktif</span>
                                    </td>
                                    <td style={{ textAlign: 'right' }}>
                                        <button
                                            type="button"
                                            className="btn btn-secondary btn-sm"
                                            onClick={() => handleOpenEditStatus(student)}
                                        >
                                            <EditIcon size={14} /> Ubah Kehadiran
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal Ubah Status Kehadiran */}
            <Modal
                isOpen={editModalOpen}
                onClose={() => setEditModalOpen(false)}
                title="Ubah Status Kehadiran Mahasiswa"
                icon={<EditIcon size={18} />}
            >
                <form onSubmit={handleSaveStatus}>
                    <div style={{ marginBottom: '16px', padding: '12px', background: 'var(--color-bg-hover)', borderRadius: 'var(--radius-md)' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>Mahasiswa:</div>
                        <div style={{ fontWeight: 600, fontSize: '0.938rem', marginTop: '2px' }}>{selectedStudent?.name}</div>
                    </div>

                    <div className="form-group">
                        <label className="form-label" htmlFor="targetSession">Pilih Pertemuan</label>
                        <select
                            id="targetSession"
                            className="form-select"
                            value={targetSessionId || ''}
                            onChange={(e) => setTargetSessionId(Number(e.target.value))}
                            required
                        >
                            {activeSession && (
                                <option value={activeSession.id}>
                                    Sesi Aktif (Pertemuan {activeSession.meeting_number})
                                </option>
                            )}
                            {sessions.map((s) => (
                                <option key={s.id} value={s.id}>
                                    Pertemuan {s.meeting_number} - {s.title}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group">
                        <label className="form-label" htmlFor="statusSelect">Pilih Status Baru</label>
                        <div className="choice-pills">
                            <button
                                type="button"
                                className={`choice-pill ${selectedStatus === 'hadir' ? 'selected' : ''}`}
                                onClick={() => setSelectedStatus('hadir')}
                            >
                                <span className="pill-dot" style={{ backgroundColor: '#10B981' }} />
                                Hadir (Masuk)
                            </button>
                            <button
                                type="button"
                                className={`choice-pill ${selectedStatus === 'izin' ? 'selected' : ''}`}
                                onClick={() => setSelectedStatus('izin')}
                            >
                                <span className="pill-dot" style={{ backgroundColor: '#F59E0B' }} />
                                Izin
                            </button>
                            <button
                                type="button"
                                className={`choice-pill ${selectedStatus === 'sakit' ? 'selected' : ''}`}
                                onClick={() => setSelectedStatus('sakit')}
                            >
                                <span className="pill-dot" style={{ backgroundColor: '#EF4444' }} />
                                Sakit
                            </button>
                            <button
                                type="button"
                                className={`choice-pill ${selectedStatus === 'alpha' ? 'selected' : ''}`}
                                onClick={() => setSelectedStatus('alpha')}
                            >
                                <span className="pill-dot" style={{ backgroundColor: '#6B7280' }} />
                                Alpha
                            </button>
                        </div>
                        <select
                            id="statusSelect"
                            className="form-select"
                            value={selectedStatus}
                            onChange={(e) => setSelectedStatus(e.target.value)}
                            required
                        >
                            <option value="hadir">Hadir (Masuk)</option>
                            <option value="izin">Izin</option>
                            <option value="sakit">Sakit</option>
                            <option value="alpha">Alpha (Tidak Hadir)</option>
                        </select>
                    </div>

                    <div className="modal-footer" style={{ borderTop: 'none', padding: 0 }}>
                        <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => setEditModalOpen(false)}
                            disabled={savingStatus}
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            className="btn btn-primary btn-sm"
                            disabled={savingStatus}
                        >
                            {savingStatus ? 'Menyimpan...' : 'Simpan Perubahan'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Modal Pratinjau Surat Bukti Izin / Sakit */}
            <Modal
                isOpen={previewModalOpen}
                onClose={() => setPreviewModalOpen(false)}
                title="Pratinjau Surat Bukti Izin / Sakit"
                icon={<FileTextIcon size={18} />}
            >
                <div style={{ textAlign: 'center' }}>
                    <div style={{ marginBottom: '12px', textAlign: 'left', padding: '12px', background: 'var(--color-bg-hover)', borderRadius: 'var(--radius-md)' }}>
                        <div style={{ fontWeight: 600 }}>{selectedEvidenceStudent?.name}</div>
                        <div style={{ fontSize: '0.813rem', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                            Status: <span className={`badge-status badge-${selectedEvidenceStudent?.status}`}>{selectedEvidenceStudent?.status}</span>
                        </div>
                        {selectedEvidenceStudent?.note && (
                            <div style={{ fontSize: '0.813rem', marginTop: '6px' }}>
                                <strong>Keterangan:</strong> {selectedEvidenceStudent.note}
                            </div>
                        )}
                    </div>

                    {evidencePreviewUrl ? (
                        <div>
                            <img
                                src={evidencePreviewUrl}
                                alt="Surat Bukti"
                                style={{ maxWidth: '100%', maxHeight: '420px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}
                            />
                            <div style={{ marginTop: '12px' }}>
                                <a
                                    href={evidencePreviewUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="btn btn-secondary btn-sm"
                                >
                                    Buka Ukuran Penuh
                                </a>
                            </div>
                        </div>
                    ) : (
                        <p className="text-muted">Foto bukti tidak tersedia.</p>
                    )}
                </div>
            </Modal>

            {/* Modal Pengaturan Info Dosen & Jadwal Kelas */}
            <Modal
                isOpen={courseModalOpen}
                onClose={() => setCourseModalOpen(false)}
                title="Pengaturan Info Dosen & Jadwal Perkuliahan"
                icon={<SettingsIcon size={18} />}
            >
                <form onSubmit={handleSaveCourseInfo}>
                    <div className="form-group">
                        <label className="form-label" htmlFor="lecturerName">Nama Dosen Pengampu</label>
                        <input
                            id="lecturerName"
                            type="text"
                            className="form-input"
                            value={courseInfo.lecturer_name || ''}
                            onChange={(e) => setCourseInfo({ ...courseInfo, lecturer_name: e.target.value })}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label" htmlFor="lecturerNip">NIP / NIDN Dosen</label>
                        <input
                            id="lecturerNip"
                            type="text"
                            className="form-input"
                            value={courseInfo.lecturer_nip || ''}
                            onChange={(e) => setCourseInfo({ ...courseInfo, lecturer_nip: e.target.value })}
                        />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div className="form-group">
                            <label className="form-label" htmlFor="scheduleDay">Hari Perkuliahan</label>
                            <input
                                id="scheduleDay"
                                type="text"
                                className="form-input"
                                value={courseInfo.schedule_day || ''}
                                onChange={(e) => setCourseInfo({ ...courseInfo, schedule_day: e.target.value })}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label" htmlFor="scheduleTime">Jam Kuliah</label>
                            <input
                                id="scheduleTime"
                                type="text"
                                className="form-input"
                                value={courseInfo.schedule_time || ''}
                                onChange={(e) => setCourseInfo({ ...courseInfo, schedule_time: e.target.value })}
                                required
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label" htmlFor="courseRoom">Ruang Kuliah / Kelas</label>
                        <input
                            id="courseRoom"
                            type="text"
                            className="form-input"
                            value={courseInfo.room || ''}
                            onChange={(e) => setCourseInfo({ ...courseInfo, room: e.target.value })}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label" htmlFor="waGroup">Tautan Undangan Grup WhatsApp</label>
                        <input
                            id="waGroup"
                            type="url"
                            className="form-input"
                            value={courseInfo.whatsapp_group_link || ''}
                            onChange={(e) => setCourseInfo({ ...courseInfo, whatsapp_group_link: e.target.value })}
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label" htmlFor="pjWaPhone">
                            Nomor WhatsApp Pribadi PJ MK (untuk Tanya Jawab Mahasiswa)
                        </label>
                        <input
                            id="pjWaPhone"
                            type="text"
                            className="form-input"
                            placeholder="Contoh: 08123456789 atau 628123456789"
                            value={courseInfo.pj_whatsapp_phone || ''}
                            onChange={(e) => setCourseInfo({ ...courseInfo, pj_whatsapp_phone: e.target.value })}
                        />
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', display: 'block', marginTop: '4px' }}>
                            Nomor ini digunakan saat mahasiswa menekan tombol "Tanya PJ MK via WhatsApp" pada materi perkuliahan.
                        </span>
                    </div>

                    <div className="modal-footer" style={{ borderTop: 'none', padding: 0 }}>
                        <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => setCourseModalOpen(false)}
                            disabled={savingCourse}
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            className="btn btn-primary btn-sm"
                            disabled={savingCourse}
                        >
                            {savingCourse ? 'Menyimpan...' : 'Simpan Informasi'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Modal Simulator Kelayakan UAS (Khusus Admin Shukoh#Dev) */}
            <Modal
                isOpen={simulatorModalOpen}
                onClose={() => setSimulatorModalOpen(false)}
                title="Simulator Kelayakan UAS Mahasiswa (Syarat Minimal 40%)"
                icon={<CalculatorIcon size={18} />}
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {/* Ringkasan Ketentuan */}
                    <div style={{ backgroundColor: 'var(--color-bg-hover)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '14px 16px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px' }}>
                            <div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>Target Semester</div>
                                <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-text)' }}>16 Pertemuan</div>
                            </div>
                            <div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>Syarat Minimal Hadir</div>
                                <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-primary)' }}>40% (7 Pertemuan)</div>
                            </div>
                            <div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>Pertemuan Berjalan</div>
                                <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-text)' }}>{sessions.length} Pertemuan</div>
                            </div>
                            <div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>Sisa Pertemuan</div>
                                <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-text)' }}>{Math.max(0, 16 - sessions.length)} Pertemuan</div>
                            </div>
                        </div>
                    </div>

                    {/* Filter Mahasiswa */}
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" htmlFor="simStudentSelect">
                            Pilih Fokus Mahasiswa untuk Pratinjau Rinci & Salin Pesan WA
                        </label>
                        <select
                            id="simStudentSelect"
                            className="form-select"
                            value={simStudentId}
                            onChange={(e) => setSimStudentId(e.target.value)}
                        >
                            <option value="all">Ringkasan Seluruh Mahasiswa Kelas TI25C</option>
                            {recapData.map((s) => (
                                <option key={s.id} value={s.id}>
                                    {s.name} (Hadir: {s.counts?.hadir || 0}x)
                                </option>
                            ))}
                        </select>
                    </div>

                    {loadingRecap ? (
                        <div className="text-center text-muted" style={{ padding: '24px 0' }}>
                            Menghitung simulasi kehadiran mahasiswa...
                        </div>
                    ) : simStudentId !== 'all' ? (
                        /* Tampilan Kartu Rinci Mahasiswa Terpilih */
                        (() => {
                            const targetStudent = recapData.find((s) => String(s.id) === String(simStudentId));
                            if (!targetStudent) return null;

                            const hadir = targetStudent.counts?.hadir || 0;
                            const totalHeld = sessions.length;
                            const remaining = Math.max(0, 16 - totalHeld);
                            const needed = Math.max(0, 7 - hadir);
                            const maxPossible = hadir + remaining;
                            const safetyBuffer = maxPossible - 7;

                            let statusLabel = 'AMAN';
                            let badgeClass = 'badge-hadir';
                            let description = '';

                            if (hadir >= 7) {
                                statusLabel = 'SUDAH MEMENUHI SYARAT (AMAN)';
                                badgeClass = 'badge-hadir';
                                description = `Mahasiswa telah mengumpulkan ${hadir} kehadiran dari batas minimal 7 pertemuan. Status kepesertaan UAS sudah aman.`;
                            } else if (maxPossible < 7) {
                                statusLabel = 'TIDAK LAYAK UAS (KRITIS)';
                                badgeClass = 'badge-alpha';
                                description = `Kehadiran maksimal yang dapat dicapai (${maxPossible} kali) berada di bawah syarat batas 40% (7 kali).`;
                            } else if (safetyBuffer <= 1) {
                                statusLabel = 'BATAS KRITIS (WASPADA)';
                                badgeClass = 'badge-izin';
                                description = `Mahasiswa wajib hadir pada minimal ${needed} dari ${remaining} pertemuan tersisa. Jatah absen aman tersisa hanya ${safetyBuffer} kali lagi.`;
                            } else {
                                statusLabel = 'AMAN TERKENDALI';
                                badgeClass = 'badge-hadir';
                                description = `Mahasiswa perlu hadir pada minimal ${needed} dari ${remaining} pertemuan tersisa. Jatah absen aman masih tersisa ${safetyBuffer} kali.`;
                            }

                            return (
                                <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: '18px', backgroundColor: 'var(--color-bg-card)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                        <div>
                                            <h4 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--color-text)' }}>{targetStudent.name}</h4>
                                            <span style={{ fontSize: '0.813rem', color: 'var(--color-text-secondary)' }}>Kelas TI25C - Statistika</span>
                                        </div>
                                        <span className={`badge-status ${badgeClass}`} style={{ fontSize: '0.813rem', padding: '6px 12px' }}>
                                            {statusLabel}
                                        </span>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '10px', margin: '14px 0' }}>
                                        <div style={{ padding: '10px', background: 'var(--color-bg-hover)', borderRadius: 'var(--radius-sm)' }}>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>Hadir Saat Ini</div>
                                            <div style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--color-text)' }}>{hadir} kali</div>
                                        </div>
                                        <div style={{ padding: '10px', background: 'var(--color-bg-hover)', borderRadius: 'var(--radius-sm)' }}>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>Target Minimal</div>
                                            <div style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--color-primary)' }}>7 kali (40%)</div>
                                        </div>
                                        <div style={{ padding: '10px', background: 'var(--color-bg-hover)', borderRadius: 'var(--radius-sm)' }}>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>Kebutuhan Hadir</div>
                                            <div style={{ fontSize: '1.125rem', fontWeight: 700, color: needed > 0 ? 'var(--color-warning)' : 'var(--color-success)' }}>
                                                {needed > 0 ? `${needed} sesi lagi` : 'Tercapai'}
                                            </div>
                                        </div>
                                        <div style={{ padding: '10px', background: 'var(--color-bg-hover)', borderRadius: 'var(--radius-sm)' }}>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>Jatah Absen Aman</div>
                                            <div style={{ fontSize: '1.125rem', fontWeight: 700, color: safetyBuffer < 0 ? 'var(--color-danger)' : safetyBuffer <= 1 ? 'var(--color-warning)' : 'var(--color-text)' }}>
                                                {safetyBuffer >= 0 ? `${safetyBuffer} kali` : 'Habis'}
                                            </div>
                                        </div>
                                    </div>

                                    <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', lineHeight: 1.5, marginBottom: '16px' }}>
                                        {description}
                                    </p>

                                    <button
                                        type="button"
                                        className="btn btn-secondary btn-block"
                                        onClick={() => handleCopyWarningWA(targetStudent)}
                                        style={{ borderColor: '#25D366', color: '#128C7E' }}
                                    >
                                        <WhatsAppIcon size={16} /> Salin Pesan Peringatan WA untuk Mahasiswa Ini
                                    </button>
                                </div>
                            );
                        })()
                    ) : (
                        /* Tabel Radar Semua Mahasiswa */
                        <div className="table-container" style={{ maxHeight: '380px', overflowY: 'auto' }}>
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th style={{ width: '40px' }}>No</th>
                                        <th>Nama Mahasiswa</th>
                                        <th style={{ textAlign: 'center' }}>Hadir</th>
                                        <th style={{ textAlign: 'center' }}>Butuh Lagi</th>
                                        <th style={{ textAlign: 'center' }}>Jatah Absen</th>
                                        <th>Status Kelayakan</th>
                                        <th style={{ textAlign: 'right' }}>Aksi</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {recapData.map((s, idx) => {
                                        const hadir = s.counts?.hadir || 0;
                                        const totalHeld = sessions.length;
                                        const remaining = Math.max(0, 16 - totalHeld);
                                        const needed = Math.max(0, 7 - hadir);
                                        const maxPossible = hadir + remaining;
                                        const safetyBuffer = maxPossible - 7;

                                        let badgeClass = 'badge-hadir';
                                        let statusText = 'Aman';

                                        if (hadir >= 7) {
                                            badgeClass = 'badge-hadir';
                                            statusText = 'Lolos 40%';
                                        } else if (maxPossible < 7) {
                                            badgeClass = 'badge-alpha';
                                            statusText = 'Tidak Layak';
                                        } else if (safetyBuffer <= 1) {
                                            badgeClass = 'badge-izin';
                                            statusText = 'Waspada';
                                        }

                                        return (
                                            <tr key={s.id}>
                                                <td>{idx + 1}</td>
                                                <td style={{ fontWeight: 600 }}>{s.name}</td>
                                                <td style={{ textAlign: 'center' }}>{hadir}/16</td>
                                                <td style={{ textAlign: 'center' }}>{needed > 0 ? `${needed}x` : '0x'}</td>
                                                <td style={{ textAlign: 'center' }}>{safetyBuffer >= 0 ? `${safetyBuffer}x` : '-'}</td>
                                                <td>
                                                    <span className={`badge-status ${badgeClass}`}>
                                                        {statusText}
                                                    </span>
                                                </td>
                                                <td style={{ textAlign: 'right' }}>
                                                    <button
                                                        type="button"
                                                        className="btn btn-ghost btn-sm"
                                                        onClick={() => handleCopyWarningWA(s)}
                                                        title="Salin Peringatan WA"
                                                        style={{ color: '#128C7E', padding: '4px 8px' }}
                                                    >
                                                        <WhatsAppIcon size={14} />
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}

                    <div className="modal-footer" style={{ borderTop: 'none', padding: 0 }}>
                        <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => setSimulatorModalOpen(false)}
                        >
                            Tutup Simulator
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
