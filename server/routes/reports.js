const express = require('express');
const router = express.Router();
const { getDb } = require('../config/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// POST /api/reports/create - Buat laporan
router.post('/create', authenticateToken, (req, res) => {
    try {
        const { category, title, description } = req.body;
        const db = getDb();

        if (!category || !title || !description) {
            return res.status(400).json({ error: 'Kategori, judul, dan deskripsi wajib diisi.' });
        }

        db.prepare(
            'INSERT INTO reports (user_id, category, title, description) VALUES (?, ?, ?, ?)'
        ).run(req.user.id, category, title, description);

        // Log aktivitas
        db.prepare(
            'INSERT INTO activity_log (user_id, action, description) VALUES (?, ?, ?)'
        ).run(req.user.id, 'laporan', `Mengirim laporan: ${title}`);

        // Notifikasi ke admin
        const admin = db.prepare("SELECT id FROM users WHERE role = 'admin'").get();
        if (admin) {
            db.prepare(
                `INSERT INTO notifications (user_id, title, message, type, created_by) VALUES (?, ?, ?, ?, ?)`
            ).run(admin.id, 'Laporan Baru', `Laporan baru dari ${req.user.name}: ${title}`, 'info', req.user.id);
        }

        res.json({ message: 'Laporan berhasil dikirim.' });
    } catch (err) {
        console.error('Create report error:', err);
        res.status(500).json({ error: 'Terjadi kesalahan server.' });
    }
});

// GET /api/reports/my - Laporan milik user
router.get('/my', authenticateToken, (req, res) => {
    try {
        const db = getDb();
        const reports = db.prepare(
            'SELECT * FROM reports WHERE user_id = ? ORDER BY created_at DESC'
        ).all(req.user.id);

        res.json({ reports });
    } catch (err) {
        console.error('Get my reports error:', err);
        res.status(500).json({ error: 'Terjadi kesalahan server.' });
    }
});

// GET /api/reports/all - Semua laporan (admin)
router.get('/all', authenticateToken, requireAdmin, (req, res) => {
    try {
        const db = getDb();
        const reports = db.prepare(`
            SELECT r.*, u.name as reporter_name 
            FROM reports r 
            JOIN users u ON r.user_id = u.id 
            ORDER BY 
                CASE r.status 
                    WHEN 'baru' THEN 1 
                    WHEN 'diproses' THEN 2 
                    WHEN 'selesai' THEN 3 
                END,
                r.created_at DESC
        `).all();

        res.json({ reports });
    } catch (err) {
        console.error('Get all reports error:', err);
        res.status(500).json({ error: 'Terjadi kesalahan server.' });
    }
});

// PUT /api/reports/update-status - Update status laporan (admin)
router.put('/update-status', authenticateToken, requireAdmin, (req, res) => {
    try {
        const { report_id, status, admin_response } = req.body;
        const db = getDb();

        let normStatus = status === 'proses' ? 'diproses' : status;
        if (!['baru', 'diproses', 'selesai'].includes(normStatus)) {
            normStatus = 'diproses';
        }

        db.prepare(
            'UPDATE reports SET status = ?, admin_response = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
        ).run(normStatus, admin_response || null, report_id);

        // Notifikasi ke user pembuat laporan
        const report = db.prepare('SELECT * FROM reports WHERE id = ?').get(report_id);
        if (report) {
            let statusText = 'sedang diproses oleh PJ MK';
            if (normStatus === 'baru') statusText = 'telah ditinjau kembali';
            if (normStatus === 'selesai') statusText = 'telah selesai ditangani';

            db.prepare(
                `INSERT INTO notifications (user_id, title, message, type, created_by) VALUES (?, ?, ?, ?, ?)`
            ).run(
                report.user_id,
                'Status Laporan Diperbarui',
                `Laporan "${report.title}" ${statusText}.`,
                'info',
                req.user.id
            );
        }

        res.json({ message: 'Status laporan berhasil diperbarui.' });
    } catch (err) {
        console.error('Update report status error:', err);
        res.status(500).json({ error: 'Terjadi kesalahan server.' });
    }
});

module.exports = router;
