const express = require('express');
const router = express.Router();
const { getDb } = require('../config/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { uploadMaterial } = require('../middleware/upload');

// GET /api/materials - Daftar seluruh materi perkuliahan
router.get('/', authenticateToken, (req, res) => {
    try {
        const db = getDb();
        const materials = db.prepare(`
            SELECT m.*, u.name as author_name
            FROM materials m
            LEFT JOIN users u ON m.created_by = u.id
            ORDER BY m.meeting_number ASC, m.created_at DESC
        `).all();

        res.json({ materials });
    } catch (err) {
        console.error('Get materials error:', err);
        res.status(500).json({ error: 'Terjadi kesalahan server.' });
    }
});

// POST /api/materials/create - Unggah materi baru (admin only)
router.post('/create', authenticateToken, requireAdmin, uploadMaterial.single('file'), (req, res) => {
    try {
        const { meeting_number, title, description, external_link, category } = req.body;
        const db = getDb();

        if (!title) {
            return res.status(400).json({ error: 'Judul materi wajib diisi.' });
        }

        let fileName = null;
        let filePath = null;
        let fileType = null;
        let fileSize = null;

        if (req.file) {
            fileName = req.file.originalname;
            filePath = `/uploads/materials/${req.file.filename}`;
            fileType = req.file.mimetype;
            fileSize = req.file.size;
        }

        const meetingNum = parseInt(meeting_number, 10) || 1;
        const cat = category === 'dataset' ? 'dataset' : 'slide';

        const result = db.prepare(`
            INSERT INTO materials (meeting_number, title, description, file_name, file_path, file_type, file_size, external_link, category, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            meetingNum,
            title.trim(),
            description ? description.trim() : null,
            fileName,
            filePath,
            fileType,
            fileSize,
            external_link ? external_link.trim() : null,
            cat,
            req.user.id
        );

        // Notifikasi ke seluruh mahasiswa
        const users = db.prepare("SELECT id FROM users WHERE role = 'user'").all();
        const insertNotif = db.prepare(
            `INSERT INTO notifications (user_id, title, message, type, created_by) VALUES (?, ?, ?, ?, ?)`
        );

        users.forEach(user => {
            insertNotif.run(
                user.id,
                cat === 'dataset' ? 'Dataset Praktikum Baru' : 'Materi Perkuliahan Baru',
                `PJ MK telah membagikan ${cat === 'dataset' ? 'dataset praktikum' : 'materi perkuliahan'} pertemuan ke-${meetingNum}: ${title}.`,
                'announcement',
                req.user.id
            );
        });

        // Log aktivitas
        db.prepare(
            'INSERT INTO activity_log (user_id, action, description) VALUES (?, ?, ?)'
        ).run(req.user.id, 'unggah_materi', `Mengunggah ${cat === 'dataset' ? 'dataset' : 'materi'} pertemuan ke-${meetingNum}: ${title}`);

        res.json({
            message: 'Materi perkuliahan berhasil disimpan.',
            materialId: result.lastInsertRowid
        });
    } catch (err) {
        console.error('Create material error:', err);
        res.status(500).json({ error: 'Terjadi kesalahan server.' });
    }
});

// DELETE /api/materials/:id - Hapus materi perkuliahan (admin only)
router.delete('/:id', authenticateToken, requireAdmin, (req, res) => {
    try {
        const db = getDb();
        const material = db.prepare('SELECT * FROM materials WHERE id = ?').get(req.params.id);
        if (!material) {
            return res.status(404).json({ error: 'Materi tidak ditemukan.' });
        }

        db.prepare('DELETE FROM materials WHERE id = ?').run(req.params.id);

        // Log aktivitas
        db.prepare(
            'INSERT INTO activity_log (user_id, action, description) VALUES (?, ?, ?)'
        ).run(req.user.id, 'hapus_materi', `Menghapus materi: ${material.title}`);

        res.json({ message: 'Materi perkuliahan berhasil dihapus.' });
    } catch (err) {
        console.error('Delete material error:', err);
        res.status(500).json({ error: 'Terjadi kesalahan server.' });
    }
});

module.exports = router;
