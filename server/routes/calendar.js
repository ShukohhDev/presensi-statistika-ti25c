const express = require('express');
const router = express.Router();
const { getDb } = require('../config/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// GET /api/calendar - Ambil semua event kalender (termasuk batas tugas)
router.get('/', authenticateToken, (req, res) => {
    try {
        const db = getDb();
        const { month, year } = req.query;

        let events = [];
        let assignments = [];

        if (month && year) {
            const m = month.toString().padStart(2, '0');
            const y = year.toString();
            events = db.prepare(
                `SELECT * FROM calendar_events 
                 WHERE strftime('%m', event_date) = ? AND strftime('%Y', event_date) = ?
                 ORDER BY event_date ASC, event_time ASC`
            ).all(m, y);

            assignments = db.prepare(
                `SELECT id, title, description, due_date, due_time 
                 FROM assignments 
                 WHERE strftime('%m', due_date) = ? AND strftime('%Y', due_date) = ?
                 ORDER BY due_date ASC`
            ).all(m, y);
        } else {
            events = db.prepare(
                'SELECT * FROM calendar_events ORDER BY event_date ASC, event_time ASC'
            ).all();

            assignments = db.prepare(
                'SELECT id, title, description, due_date, due_time FROM assignments ORDER BY due_date ASC'
            ).all();
        }

        // Map assignments to calendar events so tasks appear on the calendar
        const assignmentEvents = assignments.map(a => ({
            id: `task-${a.id}`,
            assignment_id: a.id,
            title: `Batas Tugas: ${a.title}`,
            description: a.description || 'Pengumpulan berkas tugas melalui menu Pengumpulan Tugas.',
            event_date: a.due_date,
            event_time: a.due_time || '23:59',
            event_type: 'tugas',
            location: 'Online (Portal & Drive)',
            room: 'Online',
            building: 'Web Presensi',
            is_assignment: true
        }));

        const allEvents = [...events, ...assignmentEvents].sort((a, b) => {
            const dateCompare = (a.event_date || '').localeCompare(b.event_date || '');
            if (dateCompare !== 0) return dateCompare;
            return (a.event_time || '').localeCompare(b.event_time || '');
        });

        res.json({ events: allEvents });
    } catch (err) {
        console.error('Get calendar error:', err);
        res.status(500).json({ error: 'Terjadi kesalahan server.' });
    }
});

// POST /api/calendar/create - Buat event baru (admin)
router.post('/create', authenticateToken, requireAdmin, (req, res) => {
    try {
        const { title, description, event_date, event_time, event_type, location, room, building } = req.body;
        const db = getDb();

        if (!title || !event_date) {
            return res.status(400).json({ error: 'Judul dan tanggal wajib diisi.' });
        }

        const roomVal = (room || '').trim();
        const buildingVal = (building || '').trim();
        let loc = (location || '').trim();
        if (!loc && (roomVal || buildingVal)) {
            loc = [roomVal ? `Ruang ${roomVal}` : '', buildingVal ? `Gedung ${buildingVal}` : ''].filter(Boolean).join(' - ');
        }

        db.prepare(
            `INSERT INTO calendar_events (title, description, event_date, event_time, event_type, location, room, building, created_by) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).run(
            title.trim(),
            description ? description.trim() : null,
            event_date,
            event_time || '08:00',
            event_type || 'kuliah',
            loc || 'Kampus / Tatap Muka',
            roomVal,
            buildingVal,
            req.user.id
        );

        // Notifikasi ke seluruh mahasiswa
        const users = db.prepare("SELECT id FROM users WHERE role = 'user'").all();
        const insertNotif = db.prepare(
            'INSERT INTO notifications (user_id, title, message, type, created_by) VALUES (?, ?, ?, ?, ?)'
        );

        const typeLabel = event_type === 'ujian' ? 'Ujian / Quiz' : event_type === 'tugas' ? 'Tugas' : 'Perkuliahan';
        const notifMsg = `Ada agenda ${typeLabel} "${title}" pada tanggal ${event_date} pukul ${event_time || '08:00 WIB'}${loc ? ' di ' + loc : ''}.`;

        users.forEach(u => {
            insertNotif.run(u.id, `Agenda Kalender Baru: ${title}`, notifMsg, 'reminder', req.user.id);
        });

        res.json({ message: 'Agenda kalender berhasil ditambahkan dan disiarkan.' });
    } catch (err) {
        console.error('Create calendar event error:', err);
        res.status(500).json({ error: 'Terjadi kesalahan server.' });
    }
});

// DELETE /api/calendar/:id - Hapus event (admin)
router.delete('/:id', authenticateToken, requireAdmin, (req, res) => {
    try {
        const db = getDb();
        const { id } = req.params;

        if (String(id).startsWith('task-')) {
            return res.status(400).json({ error: 'Batas tugas ini dikelola melalui menu Pengumpulan Tugas.' });
        }

        db.prepare('DELETE FROM calendar_events WHERE id = ?').run(id);
        res.json({ message: 'Agenda kalender berhasil dihapus.' });
    } catch (err) {
        console.error('Delete calendar event error:', err);
        res.status(500).json({ error: 'Terjadi kesalahan server.' });
    }
});

module.exports = router;
