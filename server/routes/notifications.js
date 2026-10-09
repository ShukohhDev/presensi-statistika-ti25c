const express = require('express');
const router = express.Router();
const { getDb } = require('../config/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// GET /api/notifications - Ambil notifikasi user
router.get('/', authenticateToken, (req, res) => {
    try {
        const db = getDb();
        const notifications = db.prepare(
            'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50'
        ).all(req.user.id);

        const unreadCount = db.prepare(
            'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0'
        ).get(req.user.id).count;

        res.json({ notifications, unreadCount });
    } catch (err) {
        console.error('Get notifications error:', err);
        res.status(500).json({ error: 'Terjadi kesalahan server.' });
    }
});

// PUT /api/notifications/read/:id - Tandai sudah dibaca
router.put('/read/:id', authenticateToken, (req, res) => {
    try {
        const db = getDb();
        db.prepare(
            'UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?'
        ).run(req.params.id, req.user.id);

        res.json({ message: 'Notifikasi ditandai sudah dibaca.' });
    } catch (err) {
        console.error('Read notification error:', err);
        res.status(500).json({ error: 'Terjadi kesalahan server.' });
    }
});

// PUT /api/notifications/read-all - Tandai semua sudah dibaca
router.put('/read-all', authenticateToken, (req, res) => {
    try {
        const db = getDb();
        db.prepare(
            'UPDATE notifications SET is_read = 1 WHERE user_id = ?'
        ).run(req.user.id);

        res.json({ message: 'Semua notifikasi ditandai sudah dibaca.' });
    } catch (err) {
        console.error('Read all notifications error:', err);
        res.status(500).json({ error: 'Terjadi kesalahan server.' });
    }
});

// POST /api/notifications/send - Kirim notifikasi (admin)
router.post('/send', authenticateToken, requireAdmin, (req, res) => {
    try {
        const { user_id, title, message, type } = req.body;
        const db = getDb();

        if (user_id === 'all') {
            // Kirim ke semua user
            const users = db.prepare("SELECT id FROM users WHERE role = 'user'").all();
            const insert = db.prepare(
                'INSERT INTO notifications (user_id, title, message, type, created_by) VALUES (?, ?, ?, ?, ?)'
            );
            users.forEach(user => {
                insert.run(user.id, title, message, type || 'announcement', req.user.id);
            });
        } else {
            db.prepare(
                'INSERT INTO notifications (user_id, title, message, type, created_by) VALUES (?, ?, ?, ?, ?)'
            ).run(user_id, title, message, type || 'info', req.user.id);
        }

        res.json({ message: 'Notifikasi berhasil dikirim.' });
    } catch (err) {
        console.error('Send notification error:', err);
        res.status(500).json({ error: 'Terjadi kesalahan server.' });
    }
});

module.exports = router;
