import { useState, useEffect, useCallback } from 'react';
import { api } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { Modal } from '../components/Common/Modal';
import {
    CalendarIcon,
    PlusIcon,
    TrashIcon,
    ClockIcon,
    ChevronDownIcon,
    ChevronRightIcon
} from '../components/Common/Icons';

export function Calendar() {
    const { user } = useAuth();
    const { addToast } = useToast();

    const [currentDate, setCurrentDate] = useState(() => new Date());
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);

    // Selected day details
    const [selectedDateEvents, setSelectedDateEvents] = useState([]);
    const [selectedDateStr, setSelectedDateStr] = useState(null);

    // Modal add event (Admin)
    const [addModalOpen, setAddModalOpen] = useState(false);
    const [eventTitle, setEventTitle] = useState('');
    const [eventDescription, setEventDescription] = useState('');
    const [eventDate, setEventDate] = useState('');
    const [eventTime, setEventTime] = useState('08:00');
    const [eventType, setEventType] = useState('kuliah'); // 'kuliah', 'tugas', 'ujian', 'libur'
    const [eventRoom, setEventRoom] = useState('');
    const [eventBuilding, setEventBuilding] = useState('');
    const [eventLocation, setEventLocation] = useState('');
    const [savingEvent, setSavingEvent] = useState(false);

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1; // 1-12

    const loadEvents = useCallback(async () => {
        try {
            setLoading(true);
            const data = await api.getCalendarEvents(month, year);
            setEvents(data.events || []);
        } catch (err) {
            console.error('Error loading calendar events:', err);
        } finally {
            setLoading(false);
        }
    }, [month, year]);

    useEffect(() => {
        loadEvents();
    }, [loadEvents]);

    const prevMonth = () => {
        setCurrentDate(new Date(year, currentDate.getMonth() - 1, 1));
        setSelectedDateStr(null);
    };

    const nextMonth = () => {
        setCurrentDate(new Date(year, currentDate.getMonth() + 1, 1));
        setSelectedDateStr(null);
    };

    // Calendar grid calculations
    const daysInMonth = new Date(year, month, 0).getDate();
    const firstDayIndex = new Date(year, month - 1, 1).getDay(); // 0 is Sunday

    const monthNames = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];

    const dayHeaders = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

    const getDayEvents = (dayNumber) => {
        const dayStr = `${year}-${String(month).padStart(2, '0')}-${String(dayNumber).padStart(2, '0')}`;
        return events.filter(e => e.event_date === dayStr);
    };

    const handleSelectDay = (dayNumber) => {
        const dayStr = `${year}-${String(month).padStart(2, '0')}-${String(dayNumber).padStart(2, '0')}`;
        setSelectedDateStr(dayStr);
        const dayEvents = events.filter(e => e.event_date === dayStr);
        setSelectedDateEvents(dayEvents);
    };

    const handleOpenAddEvent = () => {
        const defaultDate = selectedDateStr || `${year}-${String(month).padStart(2, '0')}-01`;
        setEventDate(defaultDate);
        setEventTitle('');
        setEventDescription('');
        setEventRoom('');
        setEventBuilding('');
        setEventLocation('');
        setEventType('kuliah');
        setAddModalOpen(true);
    };

    const handleSaveEvent = async (e) => {
        e.preventDefault();
        if (!eventTitle.trim() || !eventDate) {
            addToast('Judul dan tanggal agenda wajib diisi.', 'error');
            return;
        }

        try {
            setSavingEvent(true);
            await api.createCalendarEvent({
                title: eventTitle.trim(),
                description: eventDescription.trim(),
                event_date: eventDate,
                event_time: eventTime,
                event_type: eventType,
                room: eventRoom.trim(),
                building: eventBuilding.trim(),
                location: eventLocation.trim()
            });
            addToast('Agenda berhasil ditambahkan dan diumumkan ke mahasiswa.', 'success');
            setAddModalOpen(false);
            await loadEvents();
        } catch (err) {
            addToast(err.message || 'Gagal menambahkan agenda.', 'error');
        } finally {
            setSavingEvent(false);
        }
    };

    const handleDeleteEvent = async (id, isAssignment) => {
        if (isAssignment) {
            addToast('Batas tugas dikelola melalui menu Pengumpulan Tugas.', 'warning');
            return;
        }
        if (!window.confirm('Hapus agenda ini?')) return;
        try {
            await api.deleteCalendarEvent(id);
            addToast('Agenda berhasil dihapus.', 'success');
            await loadEvents();
            if (selectedDateStr) {
                setSelectedDateEvents(prev => prev.filter(e => e.id !== id));
            }
        } catch (err) {
            addToast(err.message || 'Gagal menghapus agenda.', 'error');
        }
    };

    const isToday = (dayNumber) => {
        const today = new Date();
        return (
            today.getDate() === dayNumber &&
            today.getMonth() === currentDate.getMonth() &&
            today.getFullYear() === year
        );
    };

    const renderEventTypeBadge = (type) => {
        switch (type) {
            case 'kuliah':
                return <span className="badge-status badge-hadir">Kelas Kuliah</span>;
            case 'tugas':
                return <span className="badge-status badge-izin">Tugas Kuliah</span>;
            case 'ujian':
                return <span className="badge-status badge-alpha">Quiz / Ujian</span>;
            case 'libur':
                return <span className="badge-status badge-sakit">Hari Libur</span>;
            default:
                return <span className="badge-status">{type}</span>;
        }
    };

    return (
        <div>
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                    <h1 className="page-title">Kalender Akademik</h1>
                    <p className="page-subtitle">Jadwal perkuliahan, pengumpulan tugas, dan agenda penting Statistika - Kelas TI25C</p>
                </div>

                {user?.role === 'admin' && (
                    <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={handleOpenAddEvent}
                    >
                        <PlusIcon size={16} /> Tambah Agenda
                    </button>
                )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
                {/* Visual Kalender */}
                <div className="card">
                    {/* Header Navigasi Bulan */}
                    <div className="card-header" style={{ marginBottom: '16px' }}>
                        <h2 className="card-title" style={{ fontSize: '1.125rem' }}>
                            {monthNames[month - 1]} {year}
                        </h2>

                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={prevMonth}
                                aria-label="Bulan sebelumnya"
                            >
                                Sebelumnya
                            </button>
                            <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={nextMonth}
                                aria-label="Bulan berikutnya"
                            >
                                Selanjutnya
                            </button>
                        </div>
                    </div>

                    {/* Grid Kalender */}
                    <div className="calendar-grid">
                        {dayHeaders.map((dh) => (
                            <div key={dh} className="calendar-header-cell">
                                {dh}
                            </div>
                        ))}

                        {/* Blank cells for offset */}
                        {Array.from({ length: firstDayIndex }).map((_, i) => (
                            <div key={`blank-${i}`} className="calendar-cell other-month" />
                        ))}

                        {/* Day cells */}
                        {Array.from({ length: daysInMonth }).map((_, i) => {
                            const day = i + 1;
                            const dayEvents = getDayEvents(day);
                            const hasEvent = dayEvents.length > 0;
                            const today = isToday(day);
                            const isSelected = selectedDateStr === `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

                            const hasKuliah = dayEvents.some(e => e.event_type === 'kuliah');
                            const hasTugas = dayEvents.some(e => e.event_type === 'tugas');
                            const hasQuiz = dayEvents.some(e => e.event_type === 'ujian');
                            const hasLibur = dayEvents.some(e => e.event_type === 'libur');

                            return (
                                <button
                                    key={`day-${day}`}
                                    type="button"
                                    className={`calendar-cell ${today ? 'today' : ''} ${hasEvent ? 'has-event' : ''}`}
                                    style={{
                                        position: 'relative',
                                        padding: '4px',
                                        minHeight: '44px',
                                        ...(isSelected && !today ? { border: '2px solid var(--color-primary)' } : {})
                                    }}
                                    onClick={() => handleSelectDay(day)}
                                >
                                    <span style={{ fontWeight: today ? 700 : 500 }}>{day}</span>
                                    {hasEvent && (
                                        <div style={{ display: 'flex', gap: '3px', marginTop: '3px', alignItems: 'center', justifyContent: 'center' }}>
                                            {hasKuliah && <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#2563EB' }} title="Ada Kuliah" />}
                                            {hasTugas && <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#D97706' }} title="Ada Batas Tugas" />}
                                            {hasQuiz && <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#DC2626' }} title="Ada Quiz / Ujian" />}
                                            {hasLibur && <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10B981' }} title="Hari Libur" />}
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {/* Petunjuk Indikator Warna */}
                    <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--color-border)', fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#2563EB', display: 'inline-block' }} />
                            <span>Kelas Kuliah</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#D97706', display: 'inline-block' }} />
                            <span>Pengumpulan Tugas</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#DC2626', display: 'inline-block' }} />
                            <span>Quiz / Ujian</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10B981', display: 'inline-block' }} />
                            <span>Hari Libur</span>
                        </div>
                    </div>
                </div>

                {/* Detail Agenda untuk Tanggal yang Dipilih */}
                <div className="card">
                    <div className="card-header">
                        <h2 className="card-title">
                            {selectedDateStr ? `Agenda Tanggal: ${selectedDateStr}` : 'Daftar Agenda Bulan Ini'}
                        </h2>
                    </div>

                    {loading ? (
                        <div className="text-center text-muted" style={{ padding: '32px 0' }}>
                            Memuat agenda...
                        </div>
                    ) : selectedDateStr ? (
                        selectedDateEvents.length === 0 ? (
                            <div className="empty-state" style={{ padding: '36px 0' }}>
                                <CalendarIcon size={36} />
                                <h3>Tidak Ada Agenda</h3>
                                <p>Tidak ada kegiatan terjadwal pada tanggal ini.</p>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {selectedDateEvents.map((evt) => (
                                    <div
                                        key={evt.id}
                                        style={{
                                            border: '1px solid var(--color-border)',
                                            borderRadius: 'var(--radius-md)',
                                            padding: '14px',
                                            backgroundColor: 'var(--color-bg)'
                                        }}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                            <div>
                                                {renderEventTypeBadge(evt.event_type)}
                                                <h3 style={{ fontSize: '1rem', fontWeight: 600, marginTop: '4px', color: 'var(--color-text)' }}>
                                                    {evt.title}
                                                </h3>
                                            </div>
                                            {user?.role === 'admin' && !evt.is_assignment && (
                                                <button
                                                    type="button"
                                                    className="modal-close"
                                                    onClick={() => handleDeleteEvent(evt.id, evt.is_assignment)}
                                                    title="Hapus Agenda"
                                                >
                                                    <TrashIcon size={16} />
                                                </button>
                                            )}
                                        </div>

                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '8px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <ClockIcon size={14} />
                                                <span>{evt.event_time || '08:00 WIB'}</span>
                                            </div>
                                            {evt.room && evt.room !== '-' && (
                                                <span>Ruang: <strong>{evt.room}</strong></span>
                                            )}
                                            {evt.building && evt.building !== '-' && (
                                                <span>Gedung: <strong>{evt.building}</strong></span>
                                            )}
                                            {evt.location && (!evt.room || evt.room === '-') && (
                                                <span>Lokasi: {evt.location}</span>
                                            )}
                                        </div>

                                        {evt.description && (
                                            <p style={{ fontSize: '0.813rem', color: 'var(--color-text-secondary)', marginTop: '6px', lineHeight: 1.5 }}>
                                                {evt.description}
                                            </p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )
                    ) : events.length === 0 ? (
                        <div className="empty-state" style={{ padding: '36px 0' }}>
                            <CalendarIcon size={36} />
                            <h3>Belum Ada Agenda Bulan Ini</h3>
                            <p>Pilih tanggal pada kalender untuk melihat atau menambahkan agenda perkuliahan.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {events.map((evt) => (
                                <div
                                    key={evt.id}
                                    style={{
                                        border: '1px solid var(--color-border)',
                                        borderRadius: 'var(--radius-md)',
                                        padding: '14px',
                                        backgroundColor: 'var(--color-bg)'
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <div>
                                            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                                                {evt.event_date}
                                            </span>
                                            <h3 style={{ fontSize: '0.938rem', fontWeight: 600, marginTop: '2px', color: 'var(--color-text)' }}>
                                                {evt.title}
                                            </h3>
                                        </div>
                                        {renderEventTypeBadge(evt.event_type)}
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '6px' }}>
                                        <span>{evt.event_time || '08:00 WIB'}</span>
                                        {evt.room && evt.room !== '-' && <span>Ruang: <strong>{evt.room}</strong></span>}
                                        {evt.building && evt.building !== '-' && <span>Gedung: <strong>{evt.building}</strong></span>}
                                        {evt.location && (!evt.room || evt.room === '-') && <span>Lokasi: {evt.location}</span>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Modal Tambah Agenda (Admin) */}
            <Modal
                isOpen={addModalOpen}
                onClose={() => setAddModalOpen(false)}
                title="Tambah Pengingat Agenda / Kelas / Quiz Baru"
            >
                <form onSubmit={handleSaveEvent}>
                    <div className="form-group">
                        <label className="form-label" htmlFor="eventTitleInput">
                            Judul Agenda <span style={{ color: 'var(--color-danger)' }}>*</span>
                        </label>
                        <input
                            id="eventTitleInput"
                            type="text"
                            className="form-input"
                            placeholder="Contoh: Kuliah Pertemuan 5 - Analisis Regresi / Quiz 1"
                            value={eventTitle}
                            onChange={(e) => setEventTitle(e.target.value)}
                            required
                        />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div className="form-group">
                            <label className="form-label" htmlFor="eventDateInput">
                                Tanggal <span style={{ color: 'var(--color-danger)' }}>*</span>
                            </label>
                            <input
                                id="eventDateInput"
                                type="date"
                                className="form-input"
                                value={eventDate}
                                onChange={(e) => setEventDate(e.target.value)}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label" htmlFor="eventTimeInput">
                                Waktu / Jam
                            </label>
                            <input
                                id="eventTimeInput"
                                type="text"
                                className="form-input"
                                placeholder="Contoh: 08:00 - 09:40 WIB"
                                value={eventTime}
                                onChange={(e) => setEventTime(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label" htmlFor="eventTypeSelect">
                            Pilih Kategori Agenda
                        </label>
                        <div className="choice-pills">
                            <button
                                type="button"
                                className={`choice-pill ${eventType === 'kuliah' ? 'selected' : ''}`}
                                onClick={() => setEventType('kuliah')}
                            >
                                <span className="pill-dot" style={{ backgroundColor: '#2563EB' }} />
                                Kuliah Tatap Muka
                            </button>
                            <button
                                type="button"
                                className={`choice-pill ${eventType === 'ujian' ? 'selected' : ''}`}
                                onClick={() => setEventType('ujian')}
                            >
                                <span className="pill-dot" style={{ backgroundColor: '#DC2626' }} />
                                Quiz / Ujian
                            </button>
                            <button
                                type="button"
                                className={`choice-pill ${eventType === 'tugas' ? 'selected' : ''}`}
                                onClick={() => setEventType('tugas')}
                            >
                                <span className="pill-dot" style={{ backgroundColor: '#D97706' }} />
                                Pengumpulan Tugas
                            </button>
                            <button
                                type="button"
                                className={`choice-pill ${eventType === 'libur' ? 'selected' : ''}`}
                                onClick={() => setEventType('libur')}
                            >
                                <span className="pill-dot" style={{ backgroundColor: '#16A34A' }} />
                                Libur Kuliah
                            </button>
                        </div>
                        <select
                            id="eventTypeSelect"
                            className="form-select"
                            value={eventType}
                            onChange={(e) => setEventType(e.target.value)}
                        >
                            <option value="kuliah">Kuliah Tatap Muka</option>
                            <option value="ujian">Quiz / Evaluasi / Ujian</option>
                            <option value="tugas">Pengumpulan Tugas</option>
                            <option value="libur">Hari Libur Perkuliahan</option>
                        </select>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div className="form-group">
                            <label className="form-label" htmlFor="eventRoomInput">
                                Ruang Kelas
                            </label>
                            <input
                                id="eventRoomInput"
                                type="text"
                                className="form-input"
                                placeholder="Contoh: R.304 / Lab 2"
                                value={eventRoom}
                                onChange={(e) => setEventRoom(e.target.value)}
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label" htmlFor="eventBuildingInput">
                                Gedung
                            </label>
                            <input
                                id="eventBuildingInput"
                                type="text"
                                className="form-input"
                                placeholder="Contoh: Gedung F / Kampus Utama"
                                value={eventBuilding}
                                onChange={(e) => setEventBuilding(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label" htmlFor="eventDescInput">
                            Keterangan Tambahan / Perlengkapan
                        </label>
                        <textarea
                            id="eventDescInput"
                            className="form-textarea"
                            rows={3}
                            placeholder="Contoh: Membawa laptop dengan aplikasi SPSS/Excel terpasang, berpakaian rapi..."
                            value={eventDescription}
                            onChange={(e) => setEventDescription(e.target.value)}
                        />
                    </div>

                    <div className="modal-footer" style={{ borderTop: 'none', padding: 0 }}>
                        <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => setAddModalOpen(false)}
                            disabled={savingEvent}
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            className="btn btn-primary btn-sm"
                            disabled={savingEvent}
                        >
                            {savingEvent ? 'Menyimpan...' : 'Simpan & Siarkan Agenda'}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
