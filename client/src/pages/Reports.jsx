import { useState, useEffect, useCallback } from 'react';
import { api } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { Modal } from '../components/Common/Modal';
import {
    MessageSquareIcon,
    SendIcon,
    CheckCircleIcon,
    ClockIcon,
    AlertCircleIcon,
    EditIcon,
    RefreshIcon
} from '../components/Common/Icons';

export function Reports() {
    const { user } = useAuth();
    const { addToast } = useToast();

    // Form states
    const [category, setCategory] = useState('saran'); // 'kritik', 'saran', 'kendala', 'bug'
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // List states
    const [myReports, setMyReports] = useState([]);
    const [allReports, setAllReports] = useState([]);
    const [activeTab, setActiveTab] = useState('create'); // 'create', 'my-reports', 'all-reports'
    const [loading, setLoading] = useState(true);

    // Modal state for Admin
    const [respondModalOpen, setRespondModalOpen] = useState(false);
    const [selectedReport, setSelectedReport] = useState(null);
    const [newStatus, setNewStatus] = useState('proses');
    const [adminResponse, setAdminResponse] = useState('');
    const [updatingStatus, setUpdatingStatus] = useState(false);

    const loadReports = useCallback(async () => {
        try {
            setLoading(true);
            const myData = await api.getMyReports();
            setMyReports(myData.reports || []);

            if (user?.role === 'admin') {
                const allData = await api.getAllReports().catch(() => ({ reports: [] }));
                setAllReports(allData.reports || []);
            }
        } catch (err) {
            console.error('Error loading reports:', err);
        } finally {
            setLoading(false);
        }
    }, [user?.role]);

    useEffect(() => {
        loadReports();
    }, [loadReports]);

    const handleSubmitReport = async (e) => {
        e.preventDefault();
        if (!title.trim() || !description.trim()) {
            addToast('Judul dan deskripsi laporan wajib diisi.', 'error');
            return;
        }

        try {
            setSubmitting(true);
            await api.createReport(category, title.trim(), description.trim());
            addToast('Laporan Anda berhasil dikirim ke PJ MK.', 'success');
            setTitle('');
            setDescription('');
            await loadReports();
            setActiveTab('my-reports');
        } catch (err) {
            addToast(err.message || 'Gagal mengirim laporan.', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const handleOpenRespond = (report) => {
        setSelectedReport(report);
        setNewStatus(report.status === 'proses' ? 'diproses' : (report.status || 'diproses'));
        setAdminResponse(report.admin_response || '');
        setRespondModalOpen(true);
    };

    const handleSaveResponse = async (e) => {
        e.preventDefault();
        if (!selectedReport) return;

        try {
            setUpdatingStatus(true);
            await api.updateReportStatus(selectedReport.id, newStatus, adminResponse.trim());
            addToast('Tanggapan laporan berhasil diperbarui.', 'success');
            setRespondModalOpen(false);
            await loadReports();
        } catch (err) {
            addToast(err.message || 'Gagal memperbarui status laporan.', 'error');
        } finally {
            setUpdatingStatus(false);
        }
    };

    const handleQuickUpdateStatus = async (reportId, targetStatus) => {
        try {
            const report = allReports.find(r => r.id === reportId);
            await api.updateReportStatus(reportId, targetStatus, report?.admin_response || '');
            const label = targetStatus === 'baru' ? 'Baru' : targetStatus === 'diproses' ? 'Sedang Diproses' : 'Selesai';
            addToast(`Status laporan berhasil diubah menjadi "${label}".`, 'success');
            await loadReports();
        } catch (err) {
            addToast(err.message || 'Gagal mengubah status laporan.', 'error');
        }
    };

    const formatDateTime = (dateStr) => {
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

    const getStatusBadge = (status) => {
        switch (status) {
            case 'baru':
                return <span className="badge-status badge-baru">Baru (Belum Ditinjau)</span>;
            case 'diproses':
            case 'proses':
                return <span className="badge-status badge-diproses">Sedang Diproses</span>;
            case 'selesai':
                return <span className="badge-status badge-selesai">Selesai Ditangani</span>;
            default:
                return <span className="badge-status">{status}</span>;
        }
    };

    return (
        <div>
            <div className="page-header">
                <h1 className="page-title">Laporan & Masukan</h1>
                <p className="page-subtitle">Kanal komunikasi aspirasi, kritik, saran, serta kendala teknis perkuliahan</p>
            </div>

            {/* Navigasi Tab */}
            <div className="tabs">
                <button
                    type="button"
                    className={`tab ${activeTab === 'create' ? 'active' : ''}`}
                    onClick={() => setActiveTab('create')}
                >
                    Kirim Laporan Baru
                </button>
                <button
                    type="button"
                    className={`tab ${activeTab === 'my-reports' ? 'active' : ''}`}
                    onClick={() => setActiveTab('my-reports')}
                >
                    Laporan Saya ({myReports.length})
                </button>
                {user?.role === 'admin' && (
                    <button
                        type="button"
                        className={`tab ${activeTab === 'all-reports' ? 'active' : ''}`}
                        onClick={() => setActiveTab('all-reports')}
                    >
                        Kelola Semua Laporan ({allReports.length})
                    </button>
                )}
            </div>

            {/* Tab 1: Form Kirim Laporan */}
            {activeTab === 'create' && (
                <div className="card" style={{ maxWidth: '640px', margin: '0 auto' }}>
                    <div className="card-header">
                        <h2 className="card-title">Form Laporan & Saran</h2>
                    </div>

                    <form onSubmit={handleSubmitReport}>
                        <div className="form-group">
                            <label className="form-label" htmlFor="reportCategory">Kategori Laporan</label>
                            <select
                                id="reportCategory"
                                className="form-select"
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                            >
                                <option value="saran">Saran & Masukan</option>
                                <option value="kritik">Kritik Membangun</option>
                                <option value="kendala">Kendala Perkuliahan</option>
                                <option value="bug">Laporan Masalah Sistem</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label className="form-label" htmlFor="reportTitle">
                                Judul Laporan <span style={{ color: 'var(--color-danger)' }}>*</span>
                            </label>
                            <input
                                id="reportTitle"
                                type="text"
                                className="form-input"
                                placeholder="Contoh: Kesulitan mengunduh materi pertemuan 3"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label" htmlFor="reportDescription">
                                Deskripsi Rinci <span style={{ color: 'var(--color-danger)' }}>*</span>
                            </label>
                            <textarea
                                id="reportDescription"
                                className="form-textarea"
                                rows={5}
                                placeholder="Jelaskan secara jelas kendala atau masukan yang ingin disampaikan..."
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            className="btn btn-primary btn-block btn-lg"
                            disabled={submitting}
                            style={{ marginTop: '24px' }}
                        >
                            <SendIcon size={18} />
                            {submitting ? 'Mengirim Laporan...' : 'Kirim Laporan'}
                        </button>
                    </form>
                </div>
            )}

            {/* Tab 2: Laporan Saya */}
            {activeTab === 'my-reports' && (
                <div className="card">
                    <div className="card-header">
                        <h2 className="card-title">Riwayat Laporan Anda</h2>
                        <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={loadReports}
                        >
                            <RefreshIcon size={16} /> Segarkan
                        </button>
                    </div>

                    {loading ? (
                        <div className="text-center text-muted" style={{ padding: '36px 0' }}>
                            Memuat daftar laporan...
                        </div>
                    ) : myReports.length === 0 ? (
                        <div className="empty-state">
                            <MessageSquareIcon size={44} />
                            <h3>Belum Ada Laporan Terkirim</h3>
                            <p>Laporan atau masukan yang Anda ajukan akan tampil di sini.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {myReports.map((r) => (
                                <div key={r.id} style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '16px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                                        <div>
                                            <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--color-text-secondary)', fontWeight: 600 }}>
                                                {r.category}
                                            </span>
                                            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginTop: '2px', color: 'var(--color-text)' }}>
                                                {r.title}
                                            </h3>
                                        </div>
                                        <div>{getStatusBadge(r.status)}</div>
                                    </div>

                                    <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginTop: '8px', lineHeight: 1.5 }}>
                                        {r.description}
                                    </p>

                                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '12px' }}>
                                        Diajukan pada: {formatDateTime(r.created_at)}
                                    </div>

                                    {/* Tanggapan Admin Jika Ada */}
                                    {r.admin_response && (
                                        <div style={{ marginTop: '12px', padding: '12px', backgroundColor: 'var(--color-primary-subtle)', borderRadius: 'var(--radius-sm)', borderLeft: '3px solid var(--color-primary)' }}>
                                            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-primary)' }}>
                                                Tanggapan PJ MK (Admin):
                                            </div>
                                            <p style={{ fontSize: '0.813rem', color: 'var(--color-text)', marginTop: '4px' }}>
                                                {r.admin_response}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Tab 3: Kelola Semua Laporan (Admin) */}
            {activeTab === 'all-reports' && user?.role === 'admin' && (
                <div className="card">
                    <div className="card-header">
                        <h2 className="card-title">Daftar Seluruh Laporan Mahasiswa</h2>
                        <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={loadReports}
                        >
                            <RefreshIcon size={16} /> Segarkan
                        </button>
                    </div>

                    {loading ? (
                        <div className="text-center text-muted" style={{ padding: '36px 0' }}>
                            Memuat seluruh laporan...
                        </div>
                    ) : allReports.length === 0 ? (
                        <div className="empty-state">
                            <MessageSquareIcon size={44} />
                            <h3>Tidak Ada Laporan Masuk</h3>
                            <p>Saat ini tidak ada laporan dari mahasiswa.</p>
                        </div>
                    ) : (
                        <div className="table-container">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th style={{ width: '48px' }}>No</th>
                                        <th>Mahasiswa</th>
                                        <th>Kategori</th>
                                        <th>Judul & Pesan</th>
                                        <th>Status</th>
                                        <th>Tanggal</th>
                                        <th style={{ textAlign: 'right' }}>Aksi</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {allReports.map((r, index) => (
                                        <tr key={r.id}>
                                            <td>{index + 1}</td>
                                            <td style={{ fontWeight: 600 }}>{r.reporter_name}</td>
                                            <td style={{ textTransform: 'capitalize' }}>{r.category}</td>
                                            <td style={{ maxWidth: '300px' }}>
                                                <div style={{ fontWeight: 600 }}>{r.title}</div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {r.description}
                                                </div>
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                    <div>{getStatusBadge(r.status)}</div>
                                                    <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap' }}>
                                                        <button
                                                            type="button"
                                                            className={`btn btn-sm ${r.status === 'baru' ? 'btn-primary' : 'btn-ghost'}`}
                                                            style={{ fontSize: '0.688rem', padding: '2px 6px', height: 'auto', lineHeight: '1.2' }}
                                                            onClick={() => handleQuickUpdateStatus(r.id, 'baru')}
                                                            title="Ubah status laporan ke Baru"
                                                        >
                                                            Baru
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className={`btn btn-sm ${r.status === 'diproses' ? 'btn-primary' : 'btn-ghost'}`}
                                                            style={{ fontSize: '0.688rem', padding: '2px 6px', height: 'auto', lineHeight: '1.2' }}
                                                            onClick={() => handleQuickUpdateStatus(r.id, 'diproses')}
                                                            title="Ubah status laporan ke Sedang Diproses"
                                                        >
                                                            Proses
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className={`btn btn-sm ${r.status === 'selesai' ? 'btn-primary' : 'btn-ghost'}`}
                                                            style={{ fontSize: '0.688rem', padding: '2px 6px', height: 'auto', lineHeight: '1.2' }}
                                                            onClick={() => handleQuickUpdateStatus(r.id, 'selesai')}
                                                            title="Ubah status laporan ke Selesai / Teratasi"
                                                        >
                                                            Selesai
                                                        </button>
                                                    </div>
                                                </div>
                                            </td>
                                            <td style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                                                {formatDateTime(r.created_at)}
                                            </td>
                                            <td style={{ textAlign: 'right' }}>
                                                <button
                                                    type="button"
                                                    className="btn btn-secondary btn-sm"
                                                    onClick={() => handleOpenRespond(r)}
                                                    title="Tulis tanggapan atau catatan admin"
                                                >
                                                    <EditIcon size={14} /> Tanggapi
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* Modal Tanggapi Laporan (Admin) */}
            <Modal
                isOpen={respondModalOpen}
                onClose={() => setRespondModalOpen(false)}
                title="Tanggapi Laporan Mahasiswa"
            >
                <form onSubmit={handleSaveResponse}>
                    <div style={{ marginBottom: '16px', padding: '12px', background: 'var(--color-bg-hover)', borderRadius: 'var(--radius-md)' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                            Pengirim: {selectedReport?.reporter_name}
                        </div>
                        <div style={{ fontWeight: 600, fontSize: '0.938rem', marginTop: '4px' }}>
                            {selectedReport?.title}
                        </div>
                        <p style={{ fontSize: '0.813rem', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
                            {selectedReport?.description}
                        </p>
                    </div>

                    <div className="form-group">
                        <label className="form-label" htmlFor="statusUpdateSelect">
                            Perbarui Status
                        </label>
                        <select
                            id="statusUpdateSelect"
                            className="form-select"
                            value={newStatus}
                            onChange={(e) => setNewStatus(e.target.value)}
                        >
                            <option value="baru">Baru (Belum Ditinjau Admin)</option>
                            <option value="diproses">Sedang Diproses (Sudah Dibaca & Sedang Dikerjakan)</option>
                            <option value="selesai">Sudah Selesai / Teratasi</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label className="form-label" htmlFor="adminResponseText">
                            Tanggapan / Catatan untuk Mahasiswa
                        </label>
                        <textarea
                            id="adminResponseText"
                            className="form-textarea"
                            rows={4}
                            placeholder="Tuliskan solusi atau tindak lanjut atas laporan ini..."
                            value={adminResponse}
                            onChange={(e) => setAdminResponse(e.target.value)}
                        />
                    </div>

                    <div className="modal-footer" style={{ borderTop: 'none', padding: 0 }}>
                        <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => setRespondModalOpen(false)}
                            disabled={updatingStatus}
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            className="btn btn-primary btn-sm"
                            disabled={updatingStatus}
                        >
                            {updatingStatus ? 'Menyimpan...' : 'Simpan Tanggapan'}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
