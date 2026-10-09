const express = require('express');
const router = express.Router();
const { getDb } = require('../config/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// GET /api/announcements - Ambil semua pengumuman
router.get('/', authenticateToken, (req, res) => {
    try {
        const db = getDb();
        const announcements = db.prepare(
            `SELECT a.*, u.name as author_name 
             FROM announcements a 
             JOIN users u ON a.created_by = u.id 
             ORDER BY a.created_at DESC`
        ).all();

        res.json({ announcements });
    } catch (err) {
        console.error('Get announcements error:', err);
        res.status(500).json({ error: 'Terjadi kesalahan server.' });
    }
});

// POST /api/announcements/create - Buat pengumuman (admin)
router.post('/create', authenticateToken, requireAdmin, (req, res) => {
    try {
        const { title, content } = req.body;
        const db = getDb();

        if (!title || !content) {
            return res.status(400).json({ error: 'Judul dan isi pengumuman wajib diisi.' });
        }

        db.prepare(
            'INSERT INTO announcements (title, content, created_by) VALUES (?, ?, ?)'
        ).run(title, content, req.user.id);

        // Notifikasi ke semua user
        const users = db.prepare("SELECT id FROM users WHERE role = 'user'").all();
        const insertNotif = db.prepare(
            `INSERT INTO notifications (user_id, title, message, type, created_by) VALUES (?, ?, ?, ?, ?)`
        );

        users.forEach(user => {
            insertNotif.run(user.id, 'Pengumuman Baru', `${title}: ${content.substring(0, 100)}`, 'announcement', req.user.id);
        });

        // Log aktivitas
        db.prepare(
            'INSERT INTO activity_log (user_id, action, description) VALUES (?, ?, ?)'
        ).run(req.user.id, 'pengumuman', `Membuat pengumuman: ${title}`);

        res.json({ message: 'Pengumuman berhasil dibuat.' });
    } catch (err) {
        console.error('Create announcement error:', err);
        res.status(500).json({ error: 'Terjadi kesalahan server.' });
    }
});

// DELETE /api/announcements/:id - Hapus pengumuman (admin)
router.delete('/:id', authenticateToken, requireAdmin, (req, res) => {
    try {
        const db = getDb();
        db.prepare('DELETE FROM announcements WHERE id = ?').run(req.params.id);
        res.json({ message: 'Pengumuman berhasil dihapus.' });
    } catch (err) {
        console.error('Delete announcement error:', err);
        res.status(500).json({ error: 'Terjadi kesalahan server.' });
    }
});

module.exports = router;
