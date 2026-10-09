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
    const [eventLocation, setEventLocation] = useState('Ruang Kuliah / Daring');
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
                location: eventLocation.trim()
            });
            addToast('Agenda berhasil ditambahkan.', 'success');
            setAddModalOpen(false);
            await loadEvents();
        } catch (err) {
            addToast(err.message || 'Gagal menambahkan agenda.', 'error');
        } finally {
            setSavingEvent(false);
        }
    };

    const handleDeleteEvent = async (id) => {
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

                            return (
                                <button
                                    key={`day-${day}`}
                                    type="button"
                                    className={`calendar-cell ${today ? 'today' : ''} ${hasEvent ? 'has-event' : ''}`}
                                    style={isSelected && !today ? { border: '2px solid var(--color-primary)' } : {}}
                                    onClick={() => handleSelectDay(day)}
                                >
                                    <span>{day}</span>
                                </button>
                            );
                        })}
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
                                                <span className="badge-status badge-hadir" style={{ textTransform: 'capitalize' }}>
                                                    {evt.event_type}
                                                </span>
                                                <h3 style={{ fontSize: '1rem', fontWeight: 600, marginTop: '4px', color: 'var(--color-text)' }}>
                                                    {evt.title}
                                                </h3>
                                            </div>
                                            {user?.role === 'admin' && (
                                                <button
                                                    type="button"
                                                    className="modal-close"
                                                    onClick={() => handleDeleteEvent(evt.id)}
                                                    title="Hapus Agenda"
                                                >
                                                    <TrashIcon size={16} />
                                                </button>
                                            )}
                                        </div>

                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '8px' }}>
                                            <ClockIcon size={14} />
                                            <span>Waktu: {evt.event_time || '08:00 WIB'}</span>
                                            {evt.location && <span>- Lokasi: {evt.location}</span>}
                                        </div>

                                        {evt.description && (
                                            <p style={{ fontSize: '0.813rem', color: 'var(--color-text-secondary)', marginTop: '6px' }}>
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
                                        <span className="badge-status badge-hadir" style={{ textTransform: 'capitalize' }}>
                                            {evt.event_type}
                                        </span>
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
                                        {evt.event_time} {evt.location ? `- ${evt.location}` : ''}
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
                title="Tambah Agenda Kalender Baru"
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
                            placeholder="Contoh: Kuliah Pertemuan 4 - Integral Lipat"
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
                                Waktu
                            </label>
                            <input
                                id="eventTimeInput"
                                type="time"
                                className="form-input"
                                value={eventTime}
                                onChange={(e) => setEventTime(e.target.value)}
                            />
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div className="form-group">
                            <label className="form-label" htmlFor="eventTypeSelect">
                                Kategori Agenda
                            </label>
                            <select
                                id="eventTypeSelect"
                                className="form-select"
                                value={eventType}
                                onChange={(e) => setEventType(e.target.value)}
                            >
                                <option value="kuliah">Kuliah Tatap Muka</option>
                                <option value="tugas">Batas Akhir Tugas</option>
                                <option value="ujian">UTS / UAS</option>
                                <option value="libur">Hari Libur Perkuliahan</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label className="form-label" htmlFor="eventLocationInput">
                                Lokasi / Ruangan
                            </label>
                            <input
                                id="eventLocationInput"
                                type="text"
                                className="form-input"
                                placeholder="Gedung / Link Daring"
                                value={eventLocation}
                                onChange={(e) => setEventLocation(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label" htmlFor="eventDescInput">
                            Keterangan Tambahan
                        </label>
                        <textarea
                            id="eventDescInput"
                            className="form-textarea"
                            rows={3}
                            placeholder="Catatan materi atau perlengkapan yang perlu dibawa..."
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
                            {savingEvent ? 'Menyimpan...' : 'Simpan Agenda'}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
