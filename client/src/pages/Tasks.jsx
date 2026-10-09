import { useState, useEffect, useCallback } from 'react';
import { api, API_URL } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import {
    UploadIcon,
    FileTextIcon,
    CheckCircleIcon,
    AlertCircleIcon,
    ClockIcon,
    CalendarIcon,
    RefreshIcon,
    PlusIcon,
    TrashIcon,
    XIcon,
    WhatsAppIcon,
    SearchIcon,
    ExternalLinkIcon
} from '../components/Common/Icons';

const OFFICIAL_DRIVE_FOLDER_URL = 'https://drive.google.com/drive/folders/1PTZksUKnP6_1q2vWeFOl6whu9Cy5bOw4';

export function Tasks() {
    const { user } = useAuth();
    const { addToast } = useToast();

    // Form states
    const [taskTitle, setTaskTitle] = useState('');
    const [taskDescription, setTaskDescription] = useState('');
    const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [taskFile, setTaskFile] = useState(null);
    const [driveLink, setDriveLink] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [selectedAssignmentId, setSelectedAssignmentId] = useState('custom');

    // Data states
    const [myTasks, setMyTasks] = useState([]);
    const [allTasks, setAllTasks] = useState([]);
    const [assignments, setAssignments] = useState([]);
    const [activeTab, setActiveTab] = useState('upload'); // 'upload', 'history', 'slots', 'all'
    const [loading, setLoading] = useState(true);

    // Slot creation states (Admin)
    const [showCreateSlotModal, setShowCreateSlotModal] = useState(false);
    const [newSlotTitle, setNewSlotTitle] = useState('');
    const [newSlotDesc, setNewSlotDesc] = useState('');
    const [newSlotDueDate, setNewSlotDueDate] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() + 7);
        return d.toISOString().split('T')[0];
    });
    const [newSlotDueTime, setNewSlotDueTime] = useState('23:59');
    const [isCreatingSlot, setIsCreatingSlot] = useState(false);

    // Slot status modal states (Admin)
    const [showSlotStatusModal, setShowSlotStatusModal] = useState(false);
    const [selectedSlotForStatus, setSelectedSlotForStatus] = useState(null);
    const [slotStudentStatus, setSlotStudentStatus] = useState([]);
    const [loadingSlotStatus, setLoadingSlotStatus] = useState(false);
    const [searchSlotStatus, setSearchSlotStatus] = useState('');
    const [searchAllTasks, setSearchAllTasks] = useState('');

    const loadTaskData = useCallback(async () => {
        try {
            setLoading(true);
            const [myData, assignmentsData] = await Promise.all([
                api.getTaskHistory().catch(() => ({ tasks: [] })),
                api.getAssignments().catch(() => ({ assignments: [] }))
            ]);

            setMyTasks(myData.tasks || []);
            setAssignments(assignmentsData.assignments || []);

            if (user?.role === 'admin') {
                const allData = await api.getAllTasks().catch(() => ({ tasks: [] }));
                setAllTasks(allData.tasks || []);
            }
        } catch (err) {
            console.error('Error loading task history:', err);
        } finally {
            setLoading(false);
        }
    }, [user?.role]);

    useEffect(() => {
        loadTaskData();
    }, [loadTaskData]);

    const handleAssignmentSelect = (id) => {
        setSelectedAssignmentId(id);
        if (id === 'custom') {
            setTaskTitle('');
        } else {
            const found = assignments.find(a => String(a.id) === String(id));
            if (found) {
                setTaskTitle(found.title);
            }
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            setTaskFile(file);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        const file = e.dataTransfer.files?.[0];
        if (file) {
            setTaskFile(file);
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
    };

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!taskFile && !driveLink.trim()) {
            addToast('Silakan pilih berkas tugas atau masukkan tautan Google Drive Anda.', 'error');
            return;
        }

        if (!selectedDate) {
            addToast('Kolom tanggal pengumpulan wajib diisi.', 'error');
            return;
        }

        try {
            setIsUploading(true);
            const formData = new FormData();
            formData.append('task_title', taskTitle.trim() || 'Tugas Statistika');
            formData.append('description', taskDescription.trim());
            if (taskFile) {
                formData.append('file', taskFile);
            }
            if (driveLink.trim()) {
                formData.append('drive_link', driveLink.trim());
            }
            formData.append('submitted_date', selectedDate);
            if (selectedAssignmentId && selectedAssignmentId !== 'custom') {
                formData.append('assignment_id', selectedAssignmentId);
            }

            await api.uploadTask(formData);
            addToast('Tugas Anda berhasil dikumpulkan dan tersimpan.', 'success');
            setTaskFile(null);
            setDriveLink('');
            setTaskTitle('');
            setTaskDescription('');
            setSelectedAssignmentId('custom');
            await loadTaskData();
            setActiveTab('history');
        } catch (err) {
            addToast(err.message || 'Gagal mengunggah tugas.', 'error');
        } finally {
            setIsUploading(false);
        }
    };

    const handleCreateSlot = async (e) => {
        e.preventDefault();
        if (!newSlotTitle.trim()) {
            addToast('Judul slot tugas wajib diisi.', 'error');
            return;
        }
        if (!newSlotDueDate) {
            addToast('Batas tanggal pengumpulan wajib diisi.', 'error');
            return;
        }

        try {
            setIsCreatingSlot(true);
            await api.createAssignment({
                title: newSlotTitle.trim(),
                description: newSlotDesc.trim(),
                due_date: newSlotDueDate,
                due_time: newSlotDueTime || '23:59'
            });
            addToast('Slot penugasan berhasil dibuat dan diumumkan ke mahasiswa.', 'success');
            setShowCreateSlotModal(false);
            setNewSlotTitle('');
            setNewSlotDesc('');
            await loadTaskData();
        } catch (err) {
            addToast(err.message || 'Gagal membuat slot tugas.', 'error');
        } finally {
            setIsCreatingSlot(false);
        }
    };

    const handleDeleteSlot = async (id, title) => {
        if (!window.confirm(`Hapus slot tugas "${title}"? Berkas yang sudah dikumpulkan mahasiswa akan tetap tersimpan.`)) {
            return;
        }

        try {
            await api.deleteAssignment(id);
            addToast('Slot tugas berhasil dihapus.', 'success');
            await loadTaskData();
        } catch (err) {
            addToast(err.message || 'Gagal menghapus slot tugas.', 'error');
        }
    };

    const handleViewSlotStatus = async (slot) => {
        setSelectedSlotForStatus(slot);
        setShowSlotStatusModal(true);
        setLoadingSlotStatus(true);
        try {
            const data = await api.getAssignmentStatus(slot.id);
            setSlotStudentStatus(data.students || []);
        } catch (err) {
            addToast(err.message || 'Gagal memuat status pengumpulan.', 'error');
        } finally {
            setLoadingSlotStatus(false);
        }
    };

    const handleCopyTaskNudgeWA = () => {
        if (!selectedSlotForStatus) return;
        const unsubmitted = slotStudentStatus.filter(s => !s.has_submitted);
        if (unsubmitted.length === 0) {
            addToast('Seluruh mahasiswa sudah mengumpulkan tugas pada slot ini!', 'info');
            return;
        }

        let text = `*PENGINGAT PENGUMPULAN TUGAS MK STATISTIKA (KELAS TI25C)*\n`;
        text += `Tugas: ${selectedSlotForStatus.title}\n`;
        text += `Batas Pengumpulan: ${selectedSlotForStatus.due_date} pukul ${selectedSlotForStatus.due_time} WIB\n\n`;
        text += `Daftar teman-teman yang *BELUM MENGUMPULKAN* (${unsubmitted.length} orang):\n`;
        unsubmitted.forEach((st, idx) => {
            text += `${idx + 1}. ${st.name}\n`;
        });
        text += `\nBagi yang namanya tercantum, mohon segera mengunggah berkas ke website presensi sebelum batas waktu berakhir. Terima kasih.\n- PJ MK Faqih Hidayatus Salam`;

        navigator.clipboard.writeText(text)
            .then(() => addToast('Pesan pengingat tugas WA berhasil disalin ke clipboard! Siap dibagikan ke grup kelas.', 'success'))
            .catch(() => addToast('Gagal menyalin pesan pengingat.', 'error'));
    };

    const formatBytes = (bytes) => {
        if (!bytes || bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
    };

    const activeSlotData = selectedAssignmentId !== 'custom'
        ? assignments.find(a => String(a.id) === String(selectedAssignmentId))
        : null;

    return (
        <div>
            <div className="page-header">
                <h1 className="page-title">Pengumpulan Tugas</h1>
                <p className="page-subtitle">Portal pengumpulan tugas dan berkas perkuliahan Statistika - Kelas TI25C</p>
            </div>

            {/* Banner Google Drive Terintegrasi */}
            <div style={{
                background: 'var(--color-bg-hover)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                padding: '16px 20px',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px'
            }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, color: 'var(--color-primary)' }}>
                        <FileTextIcon size={18} />
                        <span>Folder Google Drive Penyimpanan Tugas (Kelas TI25C)</span>
                    </div>
                    <p style={{ margin: '4px 0 0 0', fontSize: '0.813rem', color: 'var(--color-text-secondary)', lineHeight: 1.4 }}>
                        Seluruh berkas tugas kelas diarahkan ke folder Google Drive resmi. Anda dapat membuka atau mengecek berkas langsung di folder Drive.
                    </p>
                </div>
                <a
                    href={OFFICIAL_DRIVE_FOLDER_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-secondary btn-sm"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                    <ExternalLinkIcon size={14} /> Buka Folder Google Drive
                </a>
            </div>

            {/* Navigasi Tab */}
            <div className="tabs">
                <button
                    type="button"
                    className={`tab ${activeTab === 'upload' ? 'active' : ''}`}
                    onClick={() => setActiveTab('upload')}
                >
                    Unggah Tugas Baru
                </button>
                <button
                    type="button"
                    className={`tab ${activeTab === 'history' ? 'active' : ''}`}
                    onClick={() => setActiveTab('history')}
                >
                    Riwayat Tugas Saya ({myTasks.length})
                </button>
                {user?.role === 'admin' && (
                    <>
                        <button
                            type="button"
                            className={`tab ${activeTab === 'slots' ? 'active' : ''}`}
                            onClick={() => setActiveTab('slots')}
                        >
                            Kelola Slot Tugas ({assignments.length})
                        </button>
                        <button
                            type="button"
                            className={`tab ${activeTab === 'all' ? 'active' : ''}`}
                            onClick={() => setActiveTab('all')}
                        >
                            Semua Kiriman Mahasiswa ({allTasks.length})
                        </button>
                    </>
                )}
            </div>

            {/* Tab 1: Form Upload Tugas */}
            {activeTab === 'upload' && (
                <div className="card" style={{ maxWidth: '680px', margin: '0 auto' }}>
                    <div className="card-header">
                        <h2 className="card-title">Form Pengumpulan Tugas</h2>
                    </div>

                    <form onSubmit={handleUpload}>
                        {/* Pilihan Slot Penugasan */}
                        <div className="form-group">
                            <label className="form-label" htmlFor="assignmentSelect">
                                Slot Tugas dari PJ MK
                            </label>
                            <select
                                id="assignmentSelect"
                                className="form-input"
                                value={selectedAssignmentId}
                                onChange={(e) => handleAssignmentSelect(e.target.value)}
                            >
                                <option value="custom">Tugas Mandiri / Tugas Lainnya</option>
                                {assignments.map(a => (
                                    <option key={a.id} value={a.id}>
                                        {a.title} (Batas: {a.due_date} {a.due_time}){a.my_submission_count > 0 ? ' [Sudah Mengumpulkan]' : ''}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Kotak Info Slot yang Dipilih */}
                        {activeSlotData && (
                            <div style={{
                                padding: '14px 16px',
                                background: 'var(--color-bg-hover)',
                                borderRadius: 'var(--radius-md)',
                                border: '1px solid var(--color-border)',
                                marginBottom: '20px'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                                    <div style={{ fontWeight: 600, color: 'var(--color-primary)' }}>
                                        {activeSlotData.title}
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <ClockIcon size={14} />
                                        Batas: {activeSlotData.due_date} pukul {activeSlotData.due_time} WIB
                                    </div>
                                </div>
                                {activeSlotData.description && (
                                    <div style={{ fontSize: '0.813rem', color: 'var(--color-text-secondary)', marginTop: '8px', lineHeight: '1.5' }}>
                                        <span style={{ fontWeight: 600 }}>Petunjuk PJ MK: </span>
                                        {activeSlotData.description}
                                    </div>
                                )}
                                {activeSlotData.my_submission_count > 0 && (
                                    <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--color-success)' }}>
                                        <CheckCircleIcon size={14} />
                                        <span>Anda sudah pernah mengumpulkan tugas untuk slot ini. Mengunggah ulang akan menambah riwayat berkas baru Anda.</span>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="form-group">
                            <label className="form-label" htmlFor="taskTitle">
                                Judul / Nama Tugas <span style={{ color: 'var(--color-danger)' }}>*</span>
                            </label>
                            <input
                                id="taskTitle"
                                type="text"
                                className="form-input"
                                placeholder="Contoh: Tugas 1 - Integral Lipat Dua"
                                value={taskTitle}
                                onChange={(e) => setTaskTitle(e.target.value)}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label" htmlFor="taskDesc">
                                Keterangan / Catatan Mahasiswa
                            </label>
                            <textarea
                                id="taskDesc"
                                className="form-textarea"
                                rows={2}
                                placeholder="Contoh: Nomor 1 sampai 5 selesai, dikerjakan berkelompok dengan..."
                                value={taskDescription}
                                onChange={(e) => setTaskDescription(e.target.value)}
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label" htmlFor="submittedDate">
                                Tanggal Pengumpulan <span style={{ color: 'var(--color-danger)' }}>*</span>
                            </label>
                            <input
                                id="submittedDate"
                                type="date"
                                className="form-input"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">
                                Berkas Tugas (Format bebas, tanpa batasan ukuran)
                            </label>

                            {!taskFile ? (
                                <label
                                    className="file-upload-zone"
                                    htmlFor="taskFileInput"
                                    onDrop={handleDrop}
                                    onDragOver={handleDragOver}
                                    style={{ display: 'block' }}
                                >
                                    <UploadIcon size={40} />
                                    <p>Klik atau seret berkas tugas Anda ke sini</p>
                                    <span className="upload-hint">
                                        Mendukung PDF, Word, Excel, ZIP, Gambar, dan format berkas lainnya
                                    </span>
                                    <input
                                        id="taskFileInput"
                                        type="file"
                                        style={{ display: 'none' }}
                                        onChange={handleFileChange}
                                    />
                                </label>
                            ) : (
                                <div className="file-preview">
                                    <div className="file-preview-icon">
                                        <FileTextIcon size={24} />
                                    </div>
                                    <div className="file-preview-info">
                                        <div className="file-name">{taskFile.name}</div>
                                        <div className="file-size">{formatBytes(taskFile.size)}</div>
                                    </div>
                                    <button
                                        type="button"
                                        className="modal-close"
                                        onClick={() => setTaskFile(null)}
                                        aria-label="Batalkan pilihan file"
                                    >
                                        <XIcon size={18} />
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="form-group">
                            <label className="form-label" htmlFor="driveLinkInput">
                                Tautan Berkas Google Drive Anda (Opsional / Alternatif)
                            </label>
                            <input
                                id="driveLinkInput"
                                type="url"
                                className="form-input"
                                placeholder="https://drive.google.com/file/d/... (Opsional jika berkas diunggah di atas)"
                                value={driveLink}
                                onChange={(e) => setDriveLink(e.target.value)}
                            />
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '6px', flexWrap: 'wrap', gap: '8px' }}>
                                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                                    Bila Anda mengunggah file langsung ke folder Drive kelas, salin dan tempelkan tautan file Anda ke sini.
                                </span>
                                <a
                                    href={OFFICIAL_DRIVE_FOLDER_URL}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{ fontSize: '0.75rem', color: 'var(--color-primary)', display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'underline' }}
                                >
                                    <ExternalLinkIcon size={12} /> Buka Folder Drive Kelas
                                </a>
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="btn btn-primary btn-block btn-lg"
                            disabled={isUploading || (!taskFile && !driveLink.trim())}
                            style={{ marginTop: '24px' }}
                        >
                            <UploadIcon size={18} />
                            {isUploading ? 'Sedang Mengunggah...' : 'Kumpulkan Tugas'}
                        </button>
                    </form>
                </div>
            )}

            {/* Tab 2: Riwayat Tugas Saya */}
            {activeTab === 'history' && (
                <div className="card">
                    <div className="card-header">
                        <h2 className="card-title">Daftar Berkas yang Dikumpulkan</h2>
                        <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={loadTaskData}
                        >
                            <RefreshIcon size={16} /> Segarkan
                        </button>
                    </div>

                    {loading ? (
                        <div className="text-center text-muted" style={{ padding: '36px 0' }}>
                            Memuat riwayat pengumpulan tugas...
                        </div>
                    ) : myTasks.length === 0 ? (
                        <div className="empty-state">
                            <FileTextIcon size={48} />
                            <h3>Belum Ada Tugas Dikumpulkan</h3>
                            <p>Anda belum mengunggah tugas pada semester ini.</p>
                        </div>
                    ) : (
                        <div className="table-container">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th style={{ width: '48px' }}>No</th>
                                        <th>Judul Tugas</th>
                                        <th>Keterangan</th>
                                        <th>Nama Berkas</th>
                                        <th>Ukuran</th>
                                        <th>Tanggal Kumpul</th>
                                        <th>Status / Tautan</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {myTasks.map((t, index) => (
                                        <tr key={t.id}>
                                            <td>{index + 1}</td>
                                            <td style={{ fontWeight: 600 }}>{t.task_title || 'Tugas Statistika'}</td>
                                            <td style={{ fontSize: '0.813rem', color: 'var(--color-text-secondary)' }}>
                                                {t.description || '-'}
                                            </td>
                                            <td>{t.file_name}</td>
                                            <td style={{ color: 'var(--color-text-secondary)' }}>
                                                {formatBytes(t.file_size)}
                                            </td>
                                            <td>{t.submitted_date}</td>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <span className="badge-status badge-hadir">
                                                        Terkumpul
                                                    </span>
                                                    {t.file_path && (
                                                        <a
                                                            href={`${API_URL}${t.file_path}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            style={{ fontSize: '0.75rem', color: 'var(--color-primary)', textDecoration: 'underline' }}
                                                            download
                                                        >
                                                            Unduh
                                                        </a>
                                                    )}
                                                    {t.google_drive_link && (
                                                        <a
                                                            href={t.google_drive_link}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            style={{ fontSize: '0.75rem', color: 'var(--color-primary)', display: 'inline-flex', alignItems: 'center', gap: '3px', textDecoration: 'underline' }}
                                                        >
                                                            <ExternalLinkIcon size={12} /> Drive
                                                        </a>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* Tab 3: Kelola Slot Tugas (Admin PJ MK) */}
            {activeTab === 'slots' && user?.role === 'admin' && (
                <div className="card">
                    <div className="card-header" style={{ flexWrap: 'wrap', gap: '12px' }}>
                        <div>
                            <h2 className="card-title">Daftar Slot Penugasan Terpusat</h2>
                            <p style={{ fontSize: '0.813rem', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                                Buat dan atur slot tugas agar pengumpulan tugas mahasiswa terdata rapi sesuai batas waktu.
                            </p>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            <a
                                href={OFFICIAL_DRIVE_FOLDER_URL}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn btn-secondary btn-sm"
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                            >
                                <ExternalLinkIcon size={14} /> Buka Google Drive
                            </a>
                            <button
                                type="button"
                                className="btn btn-primary btn-sm"
                                onClick={() => setShowCreateSlotModal(true)}
                            >
                                <PlusIcon size={16} /> Buat Slot Tugas Baru
                            </button>
                            <button
                                type="button"
                                className="btn btn-ghost btn-sm"
                                onClick={loadTaskData}
                            >
                                <RefreshIcon size={16} /> Segarkan
                            </button>
                        </div>
                    </div>

                    {loading ? (
                        <div className="text-center text-muted" style={{ padding: '36px 0' }}>
                            Memuat daftar slot penugasan...
                        </div>
                    ) : assignments.length === 0 ? (
                        <div className="empty-state">
                            <FileTextIcon size={48} />
                            <h3>Belum Ada Slot Penugasan</h3>
                            <p>PJ MK belum membuat slot tugas terpusat. Klik tombol di atas untuk membuat slot baru.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px', marginTop: '8px' }}>
                            {assignments.map(a => (
                                <div
                                    key={a.id}
                                    style={{
                                        border: '1px solid var(--color-border)',
                                        borderRadius: 'var(--radius-md)',
                                        padding: '16px',
                                        background: 'var(--color-bg-hover)',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        justifyContent: 'space-between',
                                        gap: '12px'
                                    }}
                                >
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '8px' }}>
                                            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--color-text)', margin: 0 }}>
                                                {a.title}
                                            </h3>
                                            <span className="badge-status badge-hadir" style={{ fontSize: '0.688rem', padding: '2px 8px' }}>
                                                Aktif
                                            </span>
                                        </div>

                                        <p style={{ fontSize: '0.813rem', color: 'var(--color-text-secondary)', lineHeight: '1.5', margin: '0 0 12px 0' }}>
                                            {a.description || 'Tidak ada deskripsi tambahan.'}
                                        </p>

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <CalendarIcon size={14} />
                                                <span>Batas Tanggal: {a.due_date}</span>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <ClockIcon size={14} />
                                                <span>Batas Jam: {a.due_time} WIB</span>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px', fontWeight: 600, color: 'var(--color-primary)' }}>
                                                <CheckCircleIcon size={14} />
                                                <span>{a.submitted_count || 0} Mahasiswa telah mengumpulkan</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid var(--color-border)', paddingTop: '12px' }}>
                                        <button
                                            type="button"
                                            className="btn btn-secondary btn-sm"
                                            style={{ flex: 1 }}
                                            onClick={() => handleViewSlotStatus(a)}
                                        >
                                            Status Pengumpulan
                                        </button>
                                        <button
                                            type="button"
                                            className="btn btn-danger btn-sm"
                                            onClick={() => handleDeleteSlot(a.id, a.title)}
                                            title="Hapus Slot Tugas"
                                        >
                                            <TrashIcon size={14} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Tab 4: Pantau Semua Tugas Mahasiswa (Admin) */}
            {activeTab === 'all' && user?.role === 'admin' && (
                <div className="card">
                    <div className="card-header" style={{ flexWrap: 'wrap', gap: '12px' }}>
                        <div>
                            <h2 className="card-title">Rekap Seluruh Tugas Mahasiswa</h2>
                            <p style={{ fontSize: '0.813rem', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                                Pantau dan unduh berkas tugas yang telah dikirimkan oleh seluruh mahasiswa.
                            </p>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                            <a
                                href={OFFICIAL_DRIVE_FOLDER_URL}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn btn-secondary btn-sm"
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                            >
                                <ExternalLinkIcon size={14} /> Buka Google Drive
                            </a>
                            <div style={{ position: 'relative', width: '220px' }}>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="Cari nama mahasiswa..."
                                    value={searchAllTasks}
                                    onChange={(e) => setSearchAllTasks(e.target.value)}
                                    style={{ paddingLeft: '32px', fontSize: '0.813rem' }}
                                />
                                <div style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }}>
                                    <SearchIcon size={14} />
                                </div>
                            </div>
                            <button
                                type="button"
                                className="btn btn-ghost btn-sm"
                                onClick={loadTaskData}
                            >
                                <RefreshIcon size={16} /> Segarkan
                            </button>
                        </div>
                    </div>

                    {loading ? (
                        <div className="text-center text-muted" style={{ padding: '36px 0' }}>
                            Memuat data seluruh tugas...
                        </div>
                    ) : allTasks.length === 0 ? (
                        <div className="empty-state">
                            <FileTextIcon size={48} />
                            <h3>Belum Ada Tugas Masuk</h3>
                            <p>Belum ada mahasiswa yang mengunggah tugas.</p>
                        </div>
                    ) : (
                        <div className="table-container">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th style={{ width: '48px' }}>No</th>
                                        <th>Nama Mahasiswa</th>
                                        <th>Judul Tugas</th>
                                        <th>Keterangan</th>
                                        <th>Nama Berkas</th>
                                        <th>Ukuran</th>
                                        <th>Tanggal Kumpul</th>
                                        <th>Berkas / Tautan</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {allTasks
                                        .filter((t) => {
                                             const q = searchAllTasks.toLowerCase().trim();
                                             if (!q) return true;
                                             return (
                                                 (t.student_name && t.student_name.toLowerCase().includes(q)) ||
                                                 (t.task_title && t.task_title.toLowerCase().includes(q)) ||
                                                 (t.description && t.description.toLowerCase().includes(q)) ||
                                                 (t.file_name && t.file_name.toLowerCase().includes(q))
                                             );
                                         })
                                         .map((t, index) => (
                                         <tr key={t.id}>
                                             <td>{index + 1}</td>
                                             <td style={{ fontWeight: 600 }}>{t.student_name}</td>
                                             <td style={{ fontWeight: 600 }}>{t.task_title || 'Tugas Statistika'}</td>
                                             <td style={{ fontSize: '0.813rem', color: 'var(--color-text-secondary)' }}>
                                                 {t.description || '-'}
                                             </td>
                                             <td>{t.file_name}</td>
                                             <td style={{ color: 'var(--color-text-secondary)' }}>
                                                 {formatBytes(t.file_size)}
                                             </td>
                                             <td>{t.submitted_date}</td>
                                             <td>
                                                 <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                                     {t.file_path && (
                                                         <a
                                                             href={`${API_URL}${t.file_path}`}
                                                             target="_blank"
                                                             rel="noopener noreferrer"
                                                             style={{ fontSize: '0.75rem', color: 'var(--color-primary)', textDecoration: 'underline' }}
                                                             download
                                                         >
                                                             Unduh
                                                         </a>
                                                     )}
                                                     {t.google_drive_link && (
                                                         <a
                                                             href={t.google_drive_link}
                                                             target="_blank"
                                                             rel="noopener noreferrer"
                                                             style={{ fontSize: '0.75rem', color: 'var(--color-primary)', display: 'inline-flex', alignItems: 'center', gap: '3px', textDecoration: 'underline' }}
                                                         >
                                                             <ExternalLinkIcon size={12} /> Drive
                                                         </a>
                                                     )}
                                                     {!t.file_path && !t.google_drive_link && (
                                                         <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Lokal</span>
                                                     )}
                                                 </div>
                                             </td>
                                         </tr>
                                     ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* Modal Buat Slot Tugas Baru (Admin) */}
            {showCreateSlotModal && (
                <div className="modal-backdrop" onClick={() => setShowCreateSlotModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '540px' }}>
                        <div className="modal-header">
                            <h3>Buat Slot Penugasan Baru</h3>
                            <button
                                type="button"
                                className="modal-close"
                                onClick={() => setShowCreateSlotModal(false)}
                            >
                                <XIcon size={18} />
                            </button>
                        </div>
                        <form onSubmit={handleCreateSlot} style={{ padding: '20px' }}>
                            <div className="form-group">
                                <label className="form-label" htmlFor="newSlotTitle">
                                    Judul Slot Tugas <span style={{ color: 'var(--color-danger)' }}>*</span>
                                </label>
                                <input
                                    id="newSlotTitle"
                                    type="text"
                                    className="form-input"
                                    placeholder="Contoh: Tugas 2 - Teorema Green dan Stokes"
                                    value={newSlotTitle}
                                    onChange={(e) => setNewSlotTitle(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label" htmlFor="newSlotDesc">
                                    Petunjuk / Deskripsi Pengerjaan
                                </label>
                                <textarea
                                    id="newSlotDesc"
                                    className="form-textarea"
                                    rows={3}
                                    placeholder="Tuliskan instruksi detail pengerjaan, bab, nomor soal, atau ketentuan berkas..."
                                    value={newSlotDesc}
                                    onChange={(e) => setNewSlotDesc(e.target.value)}
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                                <div className="form-group">
                                    <label className="form-label" htmlFor="newSlotDueDate">
                                        Batas Tanggal <span style={{ color: 'var(--color-danger)' }}>*</span>
                                    </label>
                                    <input
                                        id="newSlotDueDate"
                                        type="date"
                                        className="form-input"
                                        value={newSlotDueDate}
                                        onChange={(e) => setNewSlotDueDate(e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label" htmlFor="newSlotDueTime">
                                        Batas Jam (WIB)
                                    </label>
                                    <input
                                        id="newSlotDueTime"
                                        type="time"
                                        className="form-input"
                                        value={newSlotDueTime}
                                        onChange={(e) => setNewSlotDueTime(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    style={{ flex: 1 }}
                                    onClick={() => setShowCreateSlotModal(false)}
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    style={{ flex: 1 }}
                                    disabled={isCreatingSlot}
                                >
                                    {isCreatingSlot ? 'Menyimpan...' : 'Buka Slot Tugas'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Status Pengumpulan Seluruh Mahasiswa (Admin) */}
            {showSlotStatusModal && selectedSlotForStatus && (
                <div className="modal-backdrop" onClick={() => setShowSlotStatusModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '720px' }}>
                        <div className="modal-header">
                            <div>
                                <h3 style={{ margin: 0 }}>Status Pengumpulan: {selectedSlotForStatus.title}</h3>
                                <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', margin: '4px 0 0 0' }}>
                                    Batas: {selectedSlotForStatus.due_date} {selectedSlotForStatus.due_time} WIB
                                </p>
                            </div>
                            <button
                                type="button"
                                className="modal-close"
                                onClick={() => setShowSlotStatusModal(false)}
                            >
                                <XIcon size={18} />
                            </button>
                        </div>
                        <div style={{ padding: '20px' }}>
                            {loadingSlotStatus ? (
                                <div className="text-center text-muted" style={{ padding: '32px 0' }}>
                                    Memuat status pengumpulan mahasiswa...
                                </div>
                            ) : (
                                <div>
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        padding: '12px 16px',
                                        background: 'var(--color-bg-hover)',
                                        borderRadius: 'var(--radius-md)',
                                        marginBottom: '16px',
                                        flexWrap: 'wrap',
                                        gap: '12px',
                                        fontSize: '0.813rem'
                                    }}>
                                        <div>
                                            <span style={{ fontWeight: 600 }}>Terkumpul: </span>
                                            <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>
                                                {slotStudentStatus.filter(s => s.has_submitted).length}
                                            </span>
                                            <span> dari {slotStudentStatus.length} Mahasiswa (</span>
                                            <span style={{ color: 'var(--color-danger)', fontWeight: 600 }}>
                                                {slotStudentStatus.filter(s => !s.has_submitted).length} Belum
                                            </span>
                                            <span>)</span>
                                        </div>

                                        <button
                                            type="button"
                                            className="btn btn-secondary btn-sm"
                                            onClick={handleCopyTaskNudgeWA}
                                            style={{ borderColor: '#25D366', color: '#128C7E', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                                        >
                                            <WhatsAppIcon size={16} /> Salin Pengingat WA Belum Kumpul
                                        </button>
                                    </div>

                                    {/* Kolom Pencarian Mahasiswa pada Slot */}
                                    <div style={{ position: 'relative', marginBottom: '14px' }}>
                                        <input
                                            type="text"
                                            className="form-input"
                                            placeholder="Cari nama mahasiswa atau nama berkas..."
                                            value={searchSlotStatus}
                                            onChange={(e) => setSearchSlotStatus(e.target.value)}
                                            style={{ paddingLeft: '34px', fontSize: '0.813rem' }}
                                        />
                                        <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }}>
                                            <SearchIcon size={14} />
                                        </div>
                                    </div>

                                    <div className="table-container" style={{ maxHeight: '360px', overflowY: 'auto' }}>
                                        <table className="table">
                                            <thead>
                                                <tr>
                                                    <th style={{ width: '40px' }}>No</th>
                                                    <th>Nama Mahasiswa</th>
                                                    <th>Status</th>
                                                    <th>Nama Berkas</th>
                                                    <th>Tautan</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {slotStudentStatus
                                                    .filter(st => {
                                                        const q = searchSlotStatus.toLowerCase().trim();
                                                        if (!q) return true;
                                                        return (st.name && st.name.toLowerCase().includes(q)) ||
                                                               (st.file_name && st.file_name.toLowerCase().includes(q));
                                                    })
                                                    .map((st, idx) => (
                                                    <tr key={st.user_id}>
                                                        <td>{idx + 1}</td>
                                                        <td style={{ fontWeight: 600 }}>{st.name}</td>
                                                        <td>
                                                            {st.has_submitted ? (
                                                                <span className="badge-status badge-hadir">
                                                                    Sudah Mengumpulkan
                                                                </span>
                                                            ) : (
                                                                <span className="badge-status badge-alpha">
                                                                    Belum Mengumpulkan
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td style={{ fontSize: '0.813rem', color: 'var(--color-text-secondary)' }}>
                                                            {st.file_name || '-'}
                                                        </td>
                                                        <td>
                                                            {st.has_submitted && (
                                                                <div style={{ display: 'flex', gap: '8px' }}>
                                                                    {st.file_path && (
                                                                        <a
                                                                            href={`${API_URL}${st.file_path}`}
                                                                            target="_blank"
                                                                            rel="noopener noreferrer"
                                                                            style={{ fontSize: '0.75rem', color: 'var(--color-primary)', textDecoration: 'underline' }}
                                                                            download
                                                                        >
                                                                            Unduh
                                                                        </a>
                                                                    )}
                                                                    {st.google_drive_link && (
                                                                        <a
                                                                            href={st.google_drive_link}
                                                                            target="_blank"
                                                                            rel="noopener noreferrer"
                                                                            style={{ fontSize: '0.75rem', color: 'var(--color-primary)', display: 'inline-flex', alignItems: 'center', gap: '3px', textDecoration: 'underline' }}
                                                                        >
                                                                            <ExternalLinkIcon size={12} /> Drive
                                                                        </a>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
