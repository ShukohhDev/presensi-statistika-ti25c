import { useState, useEffect, useCallback } from 'react';
import { api } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import {
    SearchIcon,
    DownloadIcon,
    BarChartIcon,
    RefreshIcon,
    AlertCircleIcon,
    CheckCircleIcon
} from '../components/Common/Icons';

export function Recap() {
    const { user } = useAuth();
    const { addToast } = useToast();
    const [recapData, setRecapData] = useState([]);
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'aman', 'waspada', 'kritis'
    const [viewMode, setViewMode] = useState('summary'); // 'summary' or 'matrix'

    const loadRecap = useCallback(async () => {
        try {
            setLoading(true);
            const data = await api.getAttendanceRecap();
            setRecapData(data.recap || []);
            setSessions(data.sessions || []);
        } catch (err) {
            console.error('Error loading recap:', err);
            addToast('Gagal memuat rekapitulasi kehadiran.', 'error');
        } finally {
            setLoading(false);
        }
    }, [addToast]);

    useEffect(() => {
        loadRecap();
    }, [loadRecap]);

    const handleExportExcel = async () => {
        try {
            addToast('Mengunduh rekap Excel...', 'info');
            await api.exportExcel();
            addToast('Unduhan Excel berhasil.', 'success');
        } catch (err) {
            addToast(err.message || 'Gagal mengunduh Excel.', 'error');
        }
    };

    const handleExportCSV = async () => {
        try {
            addToast('Mengunduh rekap CSV...', 'info');
            await api.exportCSV();
            addToast('Unduhan CSV berhasil.', 'success');
        } catch (err) {
            addToast(err.message || 'Gagal mengunduh CSV.', 'error');
        }
    };

    const getUASStatus = (percentage) => {
        if (percentage < 40) {
            return {
                type: 'kritis',
                label: 'Kritis (< 40%)',
                badgeClass: 'badge-alpha',
                desc: 'Tidak memenuhi syarat UAS'
            };
        }
        if (percentage < 55) {
            return {
                type: 'waspada',
                label: 'Waspada (40-54%)',
                badgeClass: 'badge-warning',
                desc: 'Mendekati batas minimal 40%'
            };
        }
        return {
            type: 'aman',
            label: 'Aman (>= 55%)',
            badgeClass: 'badge-hadir',
            desc: 'Memenuhi syarat UAS'
        };
    };

    const isAdmin = user?.role === 'admin';

    // Filter data based on role: Mahasiswa HANYA melihat data miliknya sendiri
    const displayedRecap = isAdmin
        ? recapData.filter((item) => {
            const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase().trim());
            const uas = getUASStatus(item.percentage || 0);
            let matchesStatus = true;
            if (statusFilter === 'aman') matchesStatus = uas.type === 'aman';
            else if (statusFilter === 'waspada') matchesStatus = uas.type === 'waspada';
            else if (statusFilter === 'kritis') matchesStatus = uas.type === 'kritis';
            return matchesSearch && matchesStatus;
        })
        : recapData.filter((item) => {
            // Strict privacy: hanya akun pemilik
            if (user?.id && item.id === user.id) return true;
            if (user?.name && item.name.trim().toLowerCase() === user.name.trim().toLowerCase()) return true;
            return false;
        });

    // Counts for stats (Admin view)
    const totalAman = recapData.filter(i => (i.percentage || 0) >= 55).length;
    const totalWaspada = recapData.filter(i => (i.percentage || 0) >= 40 && (i.percentage || 0) < 55).length;
    const totalKritis = recapData.filter(i => (i.percentage || 0) < 40).length;

    // Calculate class average
    const averagePercentage =
        recapData.length > 0
            ? Math.round(
                  recapData.reduce((acc, curr) => acc + (curr.percentage || 0), 0) /
                      recapData.length
              )
            : 0;

    const getStatusBadge = (status) => {
        switch (status) {
            case 'hadir':
                return <span className="badge-status badge-hadir">H</span>;
            case 'izin':
                return <span className="badge-status badge-izin">I</span>;
            case 'sakit':
                return <span className="badge-status badge-sakit">S</span>;
            case 'alpha':
                return <span className="badge-status badge-alpha">A</span>;
            default:
                return <span style={{ color: 'var(--color-text-muted)' }}>-</span>;
        }
    };

    const studentItem = !isAdmin && displayedRecap.length > 0
        ? displayedRecap[0]
        : (!isAdmin && recapData.length === 1 ? recapData[0] : null);

    return (
        <div>
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                    <h1 className="page-title">{isAdmin ? 'Rekapitulasi Kehadiran Kelas' : 'Rekapitulasi Kehadiran Pribadi'}</h1>
                    <p className="page-subtitle">
                        {isAdmin
                            ? 'Daftar kehadiran seluruh mahasiswa Mata Kuliah Statistika - Kelas TI25C dengan evaluasi syarat minimal UAS (40%)'
                            : `Rekapitulasi resmi kehadiran perkuliahan untuk ${user?.name || 'Mahasiswa'}. Sesuai kebijakan privasi kelas, hanya data kehadiran Anda yang ditampilkan.`}
                    </p>
                </div>

                {isAdmin && (
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={handleExportCSV}
                        >
                            <DownloadIcon size={16} /> Unduh CSV
                        </button>
                        <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={handleExportExcel}
                        >
                            <DownloadIcon size={16} /> Unduh Excel (.xlsx)
                        </button>
                    </div>
                )}
            </div>

            {/* Ringkasan Statistik */}
            {isAdmin ? (
                <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                    <div className="stat-card">
                        <div className="stat-icon primary">
                            <BarChartIcon size={22} />
                        </div>
                        <div className="stat-info">
                            <h3 style={{ color: 'var(--color-accent)' }}>{averagePercentage}%</h3>
                            <p>Rata-rata Kehadiran Kelas</p>
                        </div>
                    </div>

                    <div className="stat-card">
                        <div className="stat-icon success">
                            <CheckCircleIcon size={22} />
                        </div>
                        <div className="stat-info">
                            <h3>{totalAman + totalWaspada}</h3>
                            <p>Lolos Syarat UAS (&gt;= 40%)</p>
                        </div>
                    </div>

                    <div className="stat-card">
                        <div className="stat-icon warning">
                            <AlertCircleIcon size={22} />
                        </div>
                        <div className="stat-info">
                            <h3>{totalWaspada}</h3>
                            <p>Waspada (40% - 54%)</p>
                        </div>
                    </div>

                    <div className="stat-card">
                        <div className="stat-icon danger">
                            <AlertCircleIcon size={22} />
                        </div>
                        <div className="stat-info">
                            <h3 style={{ color: 'var(--color-danger)' }}>{totalKritis}</h3>
                            <p>Kritis / Tidak Lolos (&lt; 40%)</p>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                    <div className="stat-card">
                        <div className="stat-icon primary">
                            <BarChartIcon size={22} />
                        </div>
                        <div className="stat-info">
                            <h3 style={{ color: 'var(--color-accent)' }}>{studentItem?.percentage ?? 0}%</h3>
                            <p>Persentase Kehadiran Anda</p>
                        </div>
                    </div>

                    <div className="stat-card">
                        <div className="stat-icon success">
                            <CheckCircleIcon size={22} />
                        </div>
                        <div className="stat-info">
                            <h3>{studentItem?.counts?.hadir ?? 0} Sesi</h3>
                            <p>Hadir Mengikuti Kelas</p>
                        </div>
                    </div>

                    <div className="stat-card">
                        <div className="stat-icon warning">
                            <AlertCircleIcon size={22} />
                        </div>
                        <div className="stat-info">
                            <h3>{(studentItem?.counts?.izin ?? 0) + (studentItem?.counts?.sakit ?? 0)} Sesi</h3>
                            <p>Izin ({studentItem?.counts?.izin ?? 0}) & Sakit ({studentItem?.counts?.sakit ?? 0})</p>
                        </div>
                    </div>

                    <div className="stat-card">
                        <div className="stat-icon danger">
                            <AlertCircleIcon size={22} />
                        </div>
                        <div className="stat-info">
                            <h3 style={{ color: (studentItem?.counts?.alpha ?? 0) > 0 ? 'var(--color-danger)' : 'var(--color-text)' }}>
                                {studentItem?.counts?.alpha ?? 0} Sesi
                            </h3>
                            <p>Alpha / Tanpa Keterangan</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Filter & Navigasi Tampilan */}
            <div className="card" style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                    {isAdmin ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: '1 1 320px' }}>
                            <div style={{ position: 'relative', width: '100%' }}>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="Cari nama mahasiswa..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    style={{ paddingLeft: '36px' }}
                                />
                                <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }}>
                                    <SearchIcon size={16} />
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span className="badge-status badge-hadir" style={{ fontSize: '0.75rem', padding: '4px 10px' }}>
                                Privasi Terjaga
                            </span>
                            <span style={{ fontSize: '0.813rem', color: 'var(--color-text-secondary)' }}>
                                Menampilkan rekapitulasi akun {user?.name}
                            </span>
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                        {/* Filter Status Syarat UAS (Admin Only) */}
                        {isAdmin && (
                            <div style={{ display: 'flex', gap: '4px', background: 'var(--color-bg-hover)', padding: '4px', borderRadius: 'var(--radius-md)' }}>
                                <button
                                    type="button"
                                    className={`btn btn-sm ${statusFilter === 'all' ? 'btn-primary' : 'btn-ghost'}`}
                                    onClick={() => setStatusFilter('all')}
                                    style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                                >
                                    Semua ({recapData.length})
                                </button>
                                <button
                                    type="button"
                                    className={`btn btn-sm ${statusFilter === 'aman' ? 'btn-primary' : 'btn-ghost'}`}
                                    onClick={() => setStatusFilter('aman')}
                                    style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                                >
                                    Aman ({totalAman})
                                </button>
                                <button
                                    type="button"
                                    className={`btn btn-sm ${statusFilter === 'waspada' ? 'btn-primary' : 'btn-ghost'}`}
                                    onClick={() => setStatusFilter('waspada')}
                                    style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                                >
                                    Waspada ({totalWaspada})
                                </button>
                                <button
                                    type="button"
                                    className={`btn btn-sm ${statusFilter === 'kritis' ? 'btn-primary' : 'btn-ghost'}`}
                                    onClick={() => setStatusFilter('kritis')}
                                    style={{ padding: '4px 10px', fontSize: '0.75rem', color: statusFilter === 'kritis' ? '#ffffff' : 'var(--color-danger)' }}
                                >
                                    Kritis &lt; 40% ({totalKritis})
                                </button>
                            </div>
                        )}

                        <div className="tabs" style={{ margin: 0, borderBottom: 'none' }}>
                            <button
                                type="button"
                                className={`tab ${viewMode === 'summary' ? 'active' : ''}`}
                                onClick={() => setViewMode('summary')}
                            >
                                Tabel Ringkasan
                            </button>
                            <button
                                type="button"
                                className={`tab ${viewMode === 'matrix' ? 'active' : ''}`}
                                onClick={() => setViewMode('matrix')}
                            >
                                Matriks Pertemuan
                            </button>
                        </div>

                        <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={loadRecap}
                            title="Segarkan data"
                        >
                            <RefreshIcon size={16} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Tabel Konten */}
            {loading ? (
                <div className="text-center text-muted" style={{ padding: '48px 0' }}>
                    Memuat data rekapitulasi...
                </div>
            ) : displayedRecap.length === 0 ? (
                <div className="card empty-state" style={{ padding: '48px 16px' }}>
                    <BarChartIcon size={48} />
                    <h3>Tidak Ada Data Mahasiswa Sesuai Filter</h3>
                    <p>Coba ubah kata kunci pencarian atau pilih filter status lainnya.</p>
                </div>
            ) : viewMode === 'summary' ? (
                /* Tabel Ringkasan */
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th style={{ width: '48px' }}>No</th>
                                <th>Nama Mahasiswa</th>
                                <th style={{ textAlign: 'center' }}>Hadir</th>
                                <th style={{ textAlign: 'center' }}>Izin</th>
                                <th style={{ textAlign: 'center' }}>Sakit</th>
                                <th style={{ textAlign: 'center' }}>Alpha</th>
                                <th style={{ textAlign: 'center' }}>Persentase</th>
                                <th style={{ textAlign: 'center' }}>Status Syarat UAS (Min 40%)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {displayedRecap.map((item, index) => {
                                const uas = getUASStatus(item.percentage || 0);
                                return (
                                    <tr key={item.id}>
                                        <td>{index + 1}</td>
                                        <td style={{ fontWeight: 600 }}>{item.name}</td>
                                        <td style={{ textAlign: 'center', color: 'var(--color-status-hadir)', fontWeight: 600 }}>
                                            {item.counts.hadir}
                                        </td>
                                        <td style={{ textAlign: 'center', color: 'var(--color-status-izin)', fontWeight: 600 }}>
                                            {item.counts.izin}
                                        </td>
                                        <td style={{ textAlign: 'center', color: 'var(--color-status-sakit)', fontWeight: 600 }}>
                                            {item.counts.sakit}
                                        </td>
                                        <td style={{ textAlign: 'center', color: 'var(--color-status-alpha)', fontWeight: 600 }}>
                                            {item.counts.alpha}
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                            <span style={{ fontWeight: 700, fontSize: '0.938rem', color: 'var(--color-accent)' }}>{item.percentage}%</span>
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                            <span className={`badge-status ${uas.badgeClass}`} style={{ fontSize: '0.75rem', padding: '3px 10px' }}>
                                                {uas.label}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            ) : (
                /* Tabel Matriks Rekapitulasi (Mahasiswa x Pertemuan) */
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th style={{ width: '48px' }}>No</th>
                                <th style={{ minWidth: '180px' }}>Nama Mahasiswa</th>
                                {sessions.length === 0 ? (
                                    <th style={{ textAlign: 'center' }}>Belum Ada Pertemuan</th>
                                ) : (
                                    sessions.map((s) => (
                                        <th key={s.id} style={{ textAlign: 'center', minWidth: '40px' }} title={`Pertemuan ${s.meeting_number}: ${s.title}`}>
                                            P{s.meeting_number}
                                        </th>
                                    ))
                                )}
                                <th style={{ textAlign: 'center', minWidth: '70px' }}>Hadir</th>
                                <th style={{ textAlign: 'center', minWidth: '80px' }}>Persentase</th>
                                <th style={{ textAlign: 'center', minWidth: '110px' }}>Status UAS</th>
                            </tr>
                        </thead>
                        <tbody>
                            {displayedRecap.map((item, index) => {
                                const uas = getUASStatus(item.percentage || 0);
                                return (
                                    <tr key={item.id}>
                                        <td>{index + 1}</td>
                                        <td style={{ fontWeight: 600 }}>{item.name}</td>
                                        {sessions.length === 0 ? (
                                            <td style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>-</td>
                                        ) : (
                                            sessions.map((s) => (
                                                <td key={s.id} style={{ textAlign: 'center', padding: '6px' }}>
                                                    {getStatusBadge(item.attendanceMap?.[s.id])}
                                                </td>
                                            ))
                                        )}
                                        <td style={{ textAlign: 'center', fontWeight: 600 }}>
                                            {item.counts.hadir}
                                        </td>
                                        <td style={{ textAlign: 'center', fontWeight: 700, color: 'var(--color-accent)' }}>
                                            {item.percentage}%
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                            <span className={`badge-status ${uas.badgeClass}`} style={{ fontSize: '0.688rem', padding: '2px 8px' }}>
                                                {uas.type === 'kritis' ? '< 40%' : uas.type === 'waspada' ? 'Waspada' : 'Lolos'}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
