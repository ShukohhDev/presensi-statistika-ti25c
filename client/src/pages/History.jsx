import { useState, useEffect, useCallback } from 'react';
import { api } from '../utils/api';
import { useToast } from '../contexts/ToastContext';
import {
    ClockIcon,
    FileTextIcon,
    CheckCircleIcon,
    RefreshIcon,
    HistoryIcon,
    TrashIcon
} from '../components/Common/Icons';

export function History() {
    const { addToast } = useToast();
    const [activeTab, setActiveTab] = useState('attendance'); // 'attendance', 'tasks', 'activity'
    const [attendanceList, setAttendanceList] = useState([]);
    const [taskList, setTaskList] = useState([]);
    const [activityList, setActivityList] = useState([]);
    const [loading, setLoading] = useState(true);

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            const [attData, taskData, actData] = await Promise.all([
                api.getAttendanceHistory().catch(() => ({ history: [] })),
                api.getTaskHistory().catch(() => ({ tasks: [] })),
                api.getActivity().catch(() => ({ activities: [] }))
            ]);

            setAttendanceList(attData.history || []);
            setTaskList(taskData.tasks || []);
            setActivityList(actData.activities || []);
        } catch (err) {
            console.error('Error loading history:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const formatDateTime = (dateStr) => {
        if (!dateStr) return '-';
        try {
            const date = new Date(dateStr);
            return date.toLocaleDateString('id-ID', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch {
            return dateStr;
        }
    };

    const formatBytes = (bytes) => {
        if (!bytes || bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
    };

    const handleDeleteTask = async (id, title) => {
        if (!window.confirm(`Hapus berkas tugas "${title}"? Tindakan ini tidak dapat dibatalkan.`)) {
            return;
        }

        try {
            await api.deleteTask(id);
            addToast('Berkas tugas berhasil dihapus.', 'success');
            await loadData();
        } catch (err) {
            addToast(err.message || 'Gagal menghapus berkas tugas.', 'error');
        }
    };

    return (
        <div>
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                    <h1 className="page-title">Riwayat Aktivitas</h1>
                    <p className="page-subtitle">Pencatatan rekam jejak presensi, tugas, dan aktivitas akun Anda</p>
                </div>
                <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={loadData}
                >
                    <RefreshIcon size={16} /> Segarkan Data
                </button>
            </div>

            {/* Navigasi Tab */}
            <div className="tabs">
                <button
                    type="button"
                    className={`tab ${activeTab === 'attendance' ? 'active' : ''}`}
                    onClick={() => setActiveTab('attendance')}
                >
                    Riwayat Kehadiran ({attendanceList.length})
                </button>
                <button
                    type="button"
                    className={`tab ${activeTab === 'tasks' ? 'active' : ''}`}
                    onClick={() => setActiveTab('tasks')}
                >
                    Riwayat Tugas ({taskList.length})
                </button>
                <button
                    type="button"
                    className={`tab ${activeTab === 'activity' ? 'active' : ''}`}
                    onClick={() => setActiveTab('activity')}
                >
                    Log Aktivitas ({activityList.length})
                </button>
            </div>

            {loading ? (
                <div className="text-center text-muted" style={{ padding: '48px 0' }}>
                    Memuat riwayat...
                </div>
            ) : activeTab === 'attendance' ? (
                /* Tab 1: Riwayat Kehadiran */
                <div className="card">
                    {attendanceList.length === 0 ? (
                        <div className="empty-state">
                            <ClockIcon size={44} />
                            <h3>Belum Ada Riwayat Kehadiran</h3>
                            <p>Data kehadiran akan dicatat saat Anda melakukan presensi perkuliahan.</p>
                        </div>
                    ) : (
                        <div className="table-container">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th style={{ width: '48px' }}>No</th>
                                        <th>Pertemuan</th>
                                        <th>Materi Perkuliahan</th>
                                        <th>Status</th>
                                        <th>Waktu Presensi</th>
                                        <th>Keterangan / Bukti</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {attendanceList.map((item, index) => (
                                        <tr key={item.id}>
                                            <td>{index + 1}</td>
                                            <td style={{ fontWeight: 600 }}>P{item.meeting_number}</td>
                                            <td>{item.title || `Pertemuan ${item.meeting_number}`}</td>
                                            <td>
                                                <span className={`badge-status badge-${item.status}`}>
                                                    {item.status === 'hadir' ? 'Masuk (Hadir)' : item.status}
                                                </span>
                                            </td>
                                            <td style={{ fontSize: '0.813rem', color: 'var(--color-text-secondary)' }}>
                                                {formatDateTime(item.timestamp)}
                                            </td>
                                            <td>
                                                {item.note && <div style={{ fontSize: '0.813rem', marginBottom: '4px' }}>{item.note}</div>}
                                                {item.evidence_image && (
                                                    <a
                                                        href={`${API_URL}${item.evidence_image}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        style={{ fontSize: '0.75rem', textDecoration: 'underline' }}
                                                    >
                                                        Lihat Bukti Foto
                                                    </a>
                                                )}
                                                {!item.note && !item.evidence_image && (
                                                    <span style={{ color: 'var(--color-text-muted)' }}>-</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            ) : activeTab === 'tasks' ? (
                /* Tab 2: Riwayat Tugas */
                <div className="card">
                    {taskList.length === 0 ? (
                        <div className="empty-state">
                            <FileTextIcon size={44} />
                            <h3>Belum Ada Tugas Dikumpulkan</h3>
                            <p>Tugas yang Anda kumpulkan akan muncul dalam daftar riwayat ini.</p>
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
                                        <th>Tanggal Pengumpulan</th>
                                        <th>Waktu Masuk</th>
                                        <th style={{ textAlign: 'center', width: '80px' }}>Aksi</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {taskList.map((t, index) => (
                                        <tr key={t.id}>
                                            <td>{index + 1}</td>
                                            <td style={{ fontWeight: 600 }}>{t.task_title || 'Tugas Statistika'}</td>
                                            <td style={{ fontSize: '0.813rem', color: 'var(--color-text-secondary)' }}>
                                                {t.description || '-'}
                                            </td>
                                            <td>{t.file_name}</td>
                                            <td>{formatBytes(t.file_size)}</td>
                                            <td>{t.submitted_date}</td>
                                            <td style={{ fontSize: '0.813rem', color: 'var(--color-text-muted)' }}>
                                                {formatDateTime(t.submitted_at)}
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                                <button
                                                    type="button"
                                                    className="btn btn-ghost btn-sm"
                                                    onClick={() => handleDeleteTask(t.id, t.task_title || t.file_name)}
                                                    style={{ color: 'var(--color-danger)', padding: '4px 8px', fontSize: '0.75rem' }}
                                                    title="Hapus berkas tugas ini"
                                                >
                                                    <TrashIcon size={14} /> Hapus
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            ) : (
                /* Tab 3: Log Aktivitas */
                <div className="card">
                    {activityList.length === 0 ? (
                        <div className="empty-state">
                            <HistoryIcon size={44} />
                            <h3>Belum Ada Catatan Aktivitas</h3>
                            <p>Setiap tindakan seperti login, presensi, dan upload akan terekam di sini.</p>
                        </div>
                    ) : (
                        <div className="table-container">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th style={{ width: '48px' }}>No</th>
                                        <th>Waktu</th>
                                        <th>Jenis Aksi</th>
                                        <th>Deskripsi Aktivitas</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {activityList.map((act, index) => (
                                        <tr key={act.id}>
                                            <td>{index + 1}</td>
                                            <td style={{ fontSize: '0.813rem', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
                                                {formatDateTime(act.created_at)}
                                            </td>
                                            <td>
                                                <span className="badge-status badge-hadir">
                                                    {act.action}
                                                </span>
                                            </td>
                                            <td>{act.description}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
