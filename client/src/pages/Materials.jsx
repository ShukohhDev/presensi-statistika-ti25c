import { useState, useEffect, useCallback } from 'react';
import { api, API_URL } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import {
    BookOpenIcon,
    UploadIcon,
    FileTextIcon,
    DownloadIcon,
    ExternalLinkIcon,
    PlusIcon,
    TrashIcon,
    EditIcon,
    XIcon,
    SearchIcon,
    RefreshIcon,
    CalendarIcon,
    WhatsAppIcon
} from '../components/Common/Icons';

export function Materials() {
    const { user } = useAuth();
    const { addToast } = useToast();

    const [materials, setMaterials] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedMeetingFilter, setSelectedMeetingFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState('slide'); // 'slide' or 'dataset'
    const [pjPhone, setPjPhone] = useState('');

    // Modal state for Admin (Upload)
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [meetingNumber, setMeetingNumber] = useState(1);
    const [category, setCategory] = useState('slide'); // 'slide' or 'dataset'
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [externalLink, setExternalLink] = useState('');
    const [materialFile, setMaterialFile] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Modal state for Admin (Edit)
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [editMeetingNumber, setEditMeetingNumber] = useState(1);
    const [editCategory, setEditCategory] = useState('slide');
    const [editTitle, setEditTitle] = useState('');
    const [editDescription, setEditDescription] = useState('');
    const [editExternalLink, setEditExternalLink] = useState('');
    const [isSavingEdit, setIsSavingEdit] = useState(false);

    const loadMaterials = useCallback(async () => {
        try {
            setLoading(true);
            const [data, courseData] = await Promise.all([
                api.getMaterials().catch(() => ({ materials: [] })),
                api.getCourseInfo().catch(() => ({ info: null }))
            ]);
            setMaterials(data.materials || []);
            if (courseData?.info?.pj_whatsapp_phone) {
                setPjPhone(courseData.info.pj_whatsapp_phone);
            }
        } catch (err) {
            console.error('Error loading materials:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadMaterials();
    }, [loadMaterials]);

    const handleFileChange = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            setMaterialFile(file);
        }
    };

    const handleAskPJMK = (m) => {
        if (!pjPhone || !pjPhone.trim()) {
            addToast('Nomor WhatsApp PJ MK belum diatur oleh admin di menu Info Dosen & Jadwal.', 'warning');
            return;
        }

        let cleanPhone = pjPhone.trim().replace(/[^0-9]/g, '');
        if (cleanPhone.startsWith('0')) {
            cleanPhone = '62' + cleanPhone.slice(1);
        }

        const studentName = user?.name || 'Mahasiswa TI25C';
        const typeLabel = m.category === 'dataset' ? 'Dataset Praktikum' : 'Materi Perkuliahan';
        const text = `Samlekom (Shukoh#Dev), Gue ${studentName}.

Mau nanya uy, yang ${typeLabel} Pertemuan ke-${m.meeting_number}:
Judul: "${m.title}"

Pertanyaan saya: `;

        const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
        window.open(url, '_blank', 'noopener,noreferrer');
    };

    const handleCreateMaterial = async (e) => {
        e.preventDefault();
        if (!title.trim()) {
            addToast('Judul materi wajib diisi.', 'error');
            return;
        }

        if (!materialFile && !externalLink.trim()) {
            addToast('Wajib melampirkan berkas materi atau tautan eksternal.', 'error');
            return;
        }

        try {
            setIsSubmitting(true);
            const formData = new FormData();
            formData.append('meeting_number', meetingNumber);
            formData.append('category', category);
            formData.append('title', title.trim());
            formData.append('description', description.trim());
            if (externalLink.trim()) {
                formData.append('external_link', externalLink.trim());
            }
            if (materialFile) {
                formData.append('file', materialFile);
            }

            await api.createMaterial(formData);
            addToast('Materi perkuliahan berhasil disimpan dan diumumkan.', 'success');
            setShowUploadModal(false);
            setCategory('slide');
            setTitle('');
            setDescription('');
            setExternalLink('');
            setMaterialFile(null);
            await loadMaterials();
        } catch (err) {
            addToast(err.message || 'Gagal menyimpan materi perkuliahan.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteMaterial = async (id, matTitle) => {
        if (!window.confirm(`Hapus materi perkuliahan "${matTitle}"?`)) {
            return;
        }

        try {
            await api.deleteMaterial(id);
            addToast('Materi perkuliahan berhasil dihapus.', 'success');
            await loadMaterials();
        } catch (err) {
            addToast(err.message || 'Gagal menghapus materi.', 'error');
        }
    };

    const handleOpenEdit = (m) => {
        setEditingId(m.id);
        setEditTitle(m.title || '');
        setEditDescription(m.description || '');
        setEditMeetingNumber(m.meeting_number || 1);
        setEditCategory(m.category || 'slide');
        setEditExternalLink(m.external_link || '');
        setShowEditModal(true);
    };

    const handleSaveEdit = async (e) => {
        e.preventDefault();
        if (!editTitle.trim()) {
            addToast('Judul materi wajib diisi.', 'error');
            return;
        }

        try {
            setIsSavingEdit(true);
            await api.updateMaterial(editingId, {
                meeting_number: editMeetingNumber,
                category: editCategory,
                title: editTitle.trim(),
                description: editDescription.trim(),
                external_link: editExternalLink.trim()
            });
            addToast('Materi perkuliahan berhasil diperbarui.', 'success');
            setShowEditModal(false);
            await loadMaterials();
        } catch (err) {
            addToast(err.message || 'Gagal memperbarui materi.', 'error');
        } finally {
            setIsSavingEdit(false);
        }
    };

    const formatBytes = (bytes) => {
        if (!bytes || bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
    };

    const filteredMaterials = materials.filter(m => {
        const itemCategory = m.category || 'slide';
        const matchesCategory = itemCategory === activeCategory;
        const matchesMeeting = selectedMeetingFilter === 'all' || String(m.meeting_number) === String(selectedMeetingFilter);
        const q = searchQuery.toLowerCase().trim();
        const matchesSearch = !q ||
            (m.title && m.title.toLowerCase().includes(q)) ||
            (m.description && m.description.toLowerCase().includes(q)) ||
            (m.file_name && m.file_name.toLowerCase().includes(q));
        return matchesCategory && matchesMeeting && matchesSearch;
    });

    const slideCount = materials.filter(m => (m.category || 'slide') === 'slide').length;
    const datasetCount = materials.filter(m => m.category === 'dataset').length;

    return (
        <div>
            <div className="page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                    <h1 className="page-title">Bank Materi & Modul Perkuliahan</h1>
                    <p className="page-subtitle">Pusat arsip slide perkuliahan, diktat rumus, modul referensi, dan bahan ajar Statistika - Kelas TI25C</p>
                </div>
                {user?.role === 'admin' && (
                    <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => setShowUploadModal(true)}
                    >
                        <PlusIcon size={18} /> Unggah Materi Baru
                    </button>
                )}
            </div>

            {/* Tab Kategori Bahan Perkuliahan */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '18px', flexWrap: 'wrap' }}>
                <button
                    type="button"
                    className={`btn ${activeCategory === 'slide' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setActiveCategory('slide')}
                    style={{ fontWeight: 600 }}
                >
                    Slide & Modul Kuliah ({slideCount})
                </button>
                <button
                    type="button"
                    className={`btn ${activeCategory === 'dataset' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setActiveCategory('dataset')}
                    style={{ fontWeight: 600 }}
                >
                    Bank Dataset & Praktikum ({datasetCount})
                </button>
            </div>

            {/* Filter & Search Bar */}
            <div className="card" style={{ marginBottom: '20px', padding: '16px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: '1 1 280px' }}>
                        <div style={{ position: 'relative', width: '100%' }}>
                            <input
                                type="text"
                                className="form-input"
                                placeholder="Cari judul materi, topik, atau nama berkas..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                style={{ paddingLeft: '38px' }}
                            />
                            <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }}>
                                <SearchIcon size={16} />
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <label htmlFor="meetingFilterSelect" style={{ fontSize: '0.813rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>
                            Pertemuan:
                        </label>
                        <select
                            id="meetingFilterSelect"
                            className="form-input"
                            style={{ width: 'auto', padding: '6px 12px' }}
                            value={selectedMeetingFilter}
                            onChange={(e) => setSelectedMeetingFilter(e.target.value)}
                        >
                            <option value="all">Semua Pertemuan ({materials.length})</option>
                            {Array.from({ length: 16 }, (_, i) => i + 1).map(num => (
                                <option key={num} value={num}>Pertemuan {num}</option>
                            ))}
                        </select>
                        <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={loadMaterials}
                            title="Segarkan data"
                        >
                            <RefreshIcon size={16} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Daftar Kartu Materi */}
            {loading ? (
                <div className="text-center text-muted" style={{ padding: '48px 0' }}>
                    Memuat daftar materi perkuliahan...
                </div>
            ) : filteredMaterials.length === 0 ? (
                <div className="card empty-state" style={{ padding: '48px 16px' }}>
                    <BookOpenIcon size={48} />
                    <h3>{activeCategory === 'dataset' ? 'Tidak Ada Dataset Praktikum Ditemukan' : 'Tidak Ada Materi Perkuliahan Ditemukan'}</h3>
                    <p>
                        {searchQuery || selectedMeetingFilter !== 'all'
                            ? 'Tidak ada berkas yang sesuai dengan kata kunci pencarian atau filter pertemuan ini.'
                            : activeCategory === 'dataset'
                            ? 'PJ MK belum mengunggah dataset atau contoh soal praktikum statistika.'
                            : 'PJ MK belum mengunggah modul atau slide perkuliahan.'}
                    </p>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '18px' }}>
                    {filteredMaterials.map(m => (
                        <div
                            key={m.id}
                            className="card"
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'space-between',
                                transition: 'var(--transition)'
                            }}
                        >
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '10px' }}>
                                    <span className={`badge-status ${m.category === 'dataset' ? 'badge-izin' : 'badge-hadir'}`} style={{ fontSize: '0.75rem', fontWeight: 600 }}>
                                        Pertemuan ke-{m.meeting_number} {m.category === 'dataset' ? '- Dataset' : ''}
                                    </span>
                                    {user?.role === 'admin' && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <button
                                                type="button"
                                                className="btn btn-ghost btn-sm"
                                                onClick={() => handleOpenEdit(m)}
                                                style={{ color: 'var(--color-primary)', padding: '4px' }}
                                                title="Edit materi ini"
                                            >
                                                <EditIcon size={16} />
                                            </button>
                                            <button
                                                type="button"
                                                className="btn btn-ghost btn-sm"
                                                onClick={() => handleDeleteMaterial(m.id, m.title)}
                                                style={{ color: 'var(--color-danger)', padding: '4px' }}
                                                title="Hapus materi ini"
                                            >
                                                <TrashIcon size={16} />
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--color-text)', marginBottom: '8px', lineHeight: '1.4' }}>
                                    {m.title}
                                </h3>

                                {m.description && (
                                    <p style={{ fontSize: '0.813rem', color: 'var(--color-text-secondary)', lineHeight: '1.5', marginBottom: '14px' }}>
                                        {m.description}
                                    </p>
                                )}

                                {m.file_name && (
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '10px',
                                        padding: '10px 12px',
                                        background: 'var(--color-bg-hover)',
                                        borderRadius: 'var(--radius-md)',
                                        marginBottom: '14px',
                                        border: '1px solid var(--color-border)'
                                    }}>
                                        <FileTextIcon size={20} style={{ color: 'var(--color-primary)' }} />
                                        <div style={{ overflow: 'hidden', flex: 1 }}>
                                            <div style={{ fontSize: '0.813rem', fontWeight: 600, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                                                {m.file_name}
                                            </div>
                                            <div style={{ fontSize: '0.688rem', color: 'var(--color-text-muted)' }}>
                                                {formatBytes(m.file_size)}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                borderTop: '1px solid var(--color-border)',
                                paddingTop: '12px',
                                marginTop: '10px',
                                flexWrap: 'wrap'
                            }}>
                                {m.file_path && (
                                    <a
                                        href={`${API_URL}${m.file_path}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="btn btn-primary btn-sm"
                                        style={{ flex: '1 1 110px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                                        download
                                    >
                                        <DownloadIcon size={14} /> Unduh Berkas
                                    </a>
                                )}
                                {m.external_link && (
                                    <a
                                        href={m.external_link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="btn btn-secondary btn-sm"
                                        style={{ flex: '1 1 110px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                                    >
                                        <ExternalLinkIcon size={14} /> Tautan
                                    </a>
                                )}
                                <button
                                    type="button"
                                    className="btn btn-secondary btn-sm"
                                    onClick={() => handleAskPJMK(m)}
                                    style={{ flex: '1 1 110px', borderColor: '#25D366', color: '#128C7E', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                                    title="Tanya materi via WhatsApp pribadi PJ MK"
                                >
                                    <WhatsAppIcon size={14} /> Tanya PJ MK
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal Unggah Materi Baru (Admin) */}
            {showUploadModal && (
                <div className="modal-backdrop" onClick={() => setShowUploadModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '560px' }}>
                        <div className="modal-header">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div className="modal-header-icon">
                                    <UploadIcon size={18} />
                                </div>
                                <h3>Unggah Materi Perkuliahan Baru</h3>
                            </div>
                            <button
                                type="button"
                                className="modal-close"
                                onClick={() => setShowUploadModal(false)}
                            >
                                <XIcon size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleCreateMaterial} style={{ padding: '20px' }}>
                            <div className="form-group">
                                <label className="form-label" htmlFor="matCategorySelect">
                                    Kategori Berkas <span style={{ color: 'var(--color-danger)' }}>*</span>
                                </label>
                                <div className="choice-pills">
                                    <button
                                        type="button"
                                        className={`choice-pill ${category === 'slide' ? 'selected' : ''}`}
                                        onClick={() => setCategory('slide')}
                                    >
                                        <span className="pill-dot" style={{ backgroundColor: '#2563EB' }} />
                                        Slide & Modul Teori
                                    </button>
                                    <button
                                        type="button"
                                        className={`choice-pill ${category === 'dataset' ? 'selected' : ''}`}
                                        onClick={() => setCategory('dataset')}
                                    >
                                        <span className="pill-dot" style={{ backgroundColor: '#059669' }} />
                                        Dataset & Praktikum
                                    </button>
                                </div>
                                <select
                                    id="matCategorySelect"
                                    className="form-select"
                                    value={category}
                                    onChange={(e) => setCategory(e.target.value)}
                                    required
                                >
                                    <option value="slide">Slide & Modul Kuliah (Teori)</option>
                                    <option value="dataset">Bank Dataset & Bahan Praktikum (CSV/Excel/SPSS)</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label className="form-label" htmlFor="matMeetingNumber">
                                    Pertemuan Perkuliahan <span style={{ color: 'var(--color-danger)' }}>*</span>
                                </label>
                                <select
                                    id="matMeetingNumber"
                                    className="form-input"
                                    value={meetingNumber}
                                    onChange={(e) => setMeetingNumber(e.target.value)}
                                    required
                                >
                                    {Array.from({ length: 16 }, (_, i) => i + 1).map(num => (
                                        <option key={num} value={num}>Pertemuan ke-{num}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label className="form-label" htmlFor="matTitle">
                                    Judul / Topik Materi <span style={{ color: 'var(--color-danger)' }}>*</span>
                                </label>
                                <input
                                    id="matTitle"
                                    type="text"
                                    className="form-input"
                                    placeholder="Contoh: Modul Integral Lipat Tiga dan Koordinat Bola"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label" htmlFor="matDesc">
                                    Deskripsi / Catatan Tambahan
                                </label>
                                <textarea
                                    id="matDesc"
                                    className="form-textarea"
                                    rows={3}
                                    placeholder="Ringkasan poin bahasan, halaman buku referensi, atau instruksi dari dosen..."
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label" htmlFor="matExtLink">
                                    Tautan Eksternal (Opsional)
                                </label>
                                <input
                                    id="matExtLink"
                                    type="url"
                                    className="form-input"
                                    placeholder="https://drive.google.com/... atau tautan video materi"
                                    value={externalLink}
                                    onChange={(e) => setExternalLink(e.target.value)}
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">
                                    Unggah Berkas Slide / Modul (PDF, PPTX, DOCX, ZIP)
                                </label>

                                {!materialFile ? (
                                    <label className="file-upload-zone" htmlFor="materialFileInput" style={{ display: 'block' }}>
                                        <UploadIcon size={36} />
                                        <p>Klik untuk memilih file materi</p>
                                        <span className="upload-hint">Mendukung semua format berkas dokumen & presentasi</span>
                                        <input
                                            id="materialFileInput"
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
                                            <div className="file-name">{materialFile.name}</div>
                                            <div className="file-size">{formatBytes(materialFile.size)}</div>
                                        </div>
                                        <button
                                            type="button"
                                            className="modal-close"
                                            onClick={() => setMaterialFile(null)}
                                            aria-label="Batalkan pilihan file"
                                        >
                                            <XIcon size={18} />
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div style={{ display: 'flex', gap: '10px', marginTop: '24px' }}>
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    style={{ flex: 1 }}
                                    onClick={() => setShowUploadModal(false)}
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    style={{ flex: 1 }}
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? 'Menyimpan...' : 'Unggah Materi'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Edit Materi (Admin) */}
            {showEditModal && (
                <div className="modal-backdrop" onClick={() => setShowEditModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '560px' }}>
                        <div className="modal-header">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div className="modal-header-icon">
                                    <EditIcon size={18} />
                                </div>
                                <h3>Edit Materi Perkuliahan</h3>
                            </div>
                            <button
                                type="button"
                                className="modal-close"
                                onClick={() => setShowEditModal(false)}
                            >
                                <XIcon size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleSaveEdit} style={{ padding: '20px' }}>
                            <div className="form-group">
                                <label className="form-label" htmlFor="editMatCategorySelect">
                                    Kategori Berkas <span style={{ color: 'var(--color-danger)' }}>*</span>
                                </label>
                                <div className="choice-pills">
                                    <button
                                        type="button"
                                        className={`choice-pill ${editCategory === 'slide' ? 'selected' : ''}`}
                                        onClick={() => setEditCategory('slide')}
                                    >
                                        <span className="pill-dot" style={{ backgroundColor: '#2563EB' }} />
                                        Slide & Modul Teori
                                    </button>
                                    <button
                                        type="button"
                                        className={`choice-pill ${editCategory === 'dataset' ? 'selected' : ''}`}
                                        onClick={() => setEditCategory('dataset')}
                                    >
                                        <span className="pill-dot" style={{ backgroundColor: '#059669' }} />
                                        Dataset & Praktikum
                                    </button>
                                </div>
                                <select
                                    id="editMatCategorySelect"
                                    className="form-select"
                                    value={editCategory}
                                    onChange={(e) => setEditCategory(e.target.value)}
                                    required
                                >
                                    <option value="slide">Slide & Modul Kuliah (Teori)</option>
                                    <option value="dataset">Bank Dataset & Bahan Praktikum (CSV/Excel/SPSS)</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label className="form-label" htmlFor="editMatMeetingNumber">
                                    Pertemuan Perkuliahan <span style={{ color: 'var(--color-danger)' }}>*</span>
                                </label>
                                <select
                                    id="editMatMeetingNumber"
                                    className="form-input"
                                    value={editMeetingNumber}
                                    onChange={(e) => setEditMeetingNumber(Number(e.target.value))}
                                    required
                                >
                                    {Array.from({ length: 16 }, (_, i) => i + 1).map(num => (
                                        <option key={num} value={num}>Pertemuan {num}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label className="form-label" htmlFor="editMatTitle">
                                    Judul / Topik Materi <span style={{ color: 'var(--color-danger)' }}>*</span>
                                </label>
                                <input
                                    id="editMatTitle"
                                    type="text"
                                    className="form-input"
                                    value={editTitle}
                                    onChange={(e) => setEditTitle(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label" htmlFor="editMatDescription">
                                    Deskripsi Singkat / Catatan Dosen
                                </label>
                                <textarea
                                    id="editMatDescription"
                                    className="form-textarea"
                                    rows={3}
                                    value={editDescription}
                                    onChange={(e) => setEditDescription(e.target.value)}
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label" htmlFor="editMatExternalLink">
                                    Tautan Google Drive / Repository Materi
                                </label>
                                <input
                                    id="editMatExternalLink"
                                    type="url"
                                    className="form-input"
                                    value={editExternalLink}
                                    onChange={(e) => setEditExternalLink(e.target.value)}
                                />
                            </div>

                            <div style={{ display: 'flex', gap: '10px', marginTop: '24px' }}>
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    style={{ flex: 1 }}
                                    onClick={() => setShowEditModal(false)}
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    style={{ flex: 1 }}
                                    disabled={isSavingEdit}
                                >
                                    {isSavingEdit ? 'Menyimpan Perubahan...' : 'Simpan Perubahan'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
