const express = require('express');
const router = express.Router();
const { getDb } = require('../config/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// GET /api/calendar - Ambil semua event kalender
router.get('/', authenticateToken, (req, res) => {
    try {
        const db = getDb();
        const { month, year } = req.query;

        let events;
        if (month && year) {
            events = db.prepare(
                `SELECT * FROM calendar_events 
                 WHERE strftime('%m', event_date) = ? AND strftime('%Y', event_date) = ?
                 ORDER BY event_date ASC, event_time ASC`
            ).all(month.toString().padStart(2, '0'), year.toString());
        } else {
            events = db.prepare(
                'SELECT * FROM calendar_events ORDER BY event_date ASC, event_time ASC'
            ).all();
        }

        res.json({ events });
    } catch (err) {
        console.error('Get calendar error:', err);
        res.status(500).json({ error: 'Terjadi kesalahan server.' });
    }
});

// POST /api/calendar/create - Buat event baru (admin)
router.post('/create', authenticateToken, requireAdmin, (req, res) => {
    try {
        const { title, description, event_date, event_time, event_type, location } = req.body;
        const db = getDb();

        if (!title || !event_date) {
            return res.status(400).json({ error: 'Judul dan tanggal wajib diisi.' });
        }

        db.prepare(
            `INSERT INTO calendar_events (title, description, event_date, event_time, event_type, location, created_by) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`
        ).run(title, description, event_date, event_time, event_type || 'kuliah', location, req.user.id);

        res.json({ message: 'Event berhasil ditambahkan.' });
    } catch (err) {
        console.error('Create calendar event error:', err);
        res.status(500).json({ error: 'Terjadi kesalahan server.' });
    }
});

// DELETE /api/calendar/:id - Hapus event (admin)
router.delete('/:id', authenticateToken, requireAdmin, (req, res) => {
    try {
        const db = getDb();
        db.prepare('DELETE FROM calendar_events WHERE id = ?').run(req.params.id);
        res.json({ message: 'Event berhasil dihapus.' });
    } catch (err) {
        console.error('Delete calendar event error:', err);
        res.status(500).json({ error: 'Terjadi kesalahan server.' });
    }
});

module.exports = router;
