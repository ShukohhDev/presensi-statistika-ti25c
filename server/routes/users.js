const express = require('express');
const router = express.Router();
const { getDb } = require('../config/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { uploadProfile } = require('../middleware/upload');

// PUT /api/users/profile-photo - Upload foto profil
router.put('/profile-photo', authenticateToken, uploadProfile.single('photo'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'File foto wajib diupload.' });
        }

        const db = getDb();
        const photoPath = `/uploads/profiles/${req.file.filename}`;

        db.prepare('UPDATE users SET profile_photo = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
            .run(photoPath, req.user.id);

        // Log aktivitas
        db.prepare(
            'INSERT INTO activity_log (user_id, action, description) VALUES (?, ?, ?)'
        ).run(req.user.id, 'update_profil', 'Mengubah foto profil');

        res.json({ message: 'Foto profil berhasil diperbarui.', photo: photoPath });
    } catch (err) {
        console.error('Upload profile photo error:', err);
        res.status(500).json({ error: 'Terjadi kesalahan server.' });
    }
});

// PUT /api/users/settings - Update pengaturan user
router.put('/settings', authenticateToken, (req, res) => {
    try {
        const { theme, dark_mode, auto_logout_minutes } = req.body;
        const db = getDb();

        const existing = db.prepare('SELECT * FROM user_settings WHERE user_id = ?').get(req.user.id);

        if (existing) {
            db.prepare(
                `UPDATE user_settings 
                 SET theme = COALESCE(?, theme), 
                     dark_mode = COALESCE(?, dark_mode), 
                     auto_logout_minutes = COALESCE(?, auto_logout_minutes)
                 WHERE user_id = ?`
            ).run(theme, dark_mode, auto_logout_minutes, req.user.id);
        } else {
            db.prepare(
                'INSERT INTO user_settings (user_id, theme, dark_mode, auto_logout_minutes) VALUES (?, ?, ?, ?)'
            ).run(req.user.id, theme || 'biru-klasik', dark_mode || 0, auto_logout_minutes || 30);
        }

        res.json({ message: 'Pengaturan berhasil disimpan.' });
    } catch (err) {
        console.error('Update settings error:', err);
        res.status(500).json({ error: 'Terjadi kesalahan server.' });
    }
});

// GET /api/users/activity - Log aktivitas user
router.get('/activity', authenticateToken, (req, res) => {
    try {
        const db = getDb();
        const activities = db.prepare(
            'SELECT * FROM activity_log WHERE user_id = ? ORDER BY created_at DESC LIMIT 100'
        ).all(req.user.id);

        res.json({ activities });
    } catch (err) {
        console.error('Get activity error:', err);
        res.status(500).json({ error: 'Terjadi kesalahan server.' });
    }
});

// GET /api/users/login-history - Riwayat login/logout user
router.get('/login-history', authenticateToken, (req, res) => {
    try {
        const db = getDb();
        const history = db.prepare(
            "SELECT * FROM activity_log WHERE user_id = ? AND action IN ('login', 'logout') ORDER BY created_at DESC LIMIT 50"
        ).all(req.user.id);

        res.json({ history });
    } catch (err) {
        console.error('Get login history error:', err);
        res.status(500).json({ error: 'Terjadi kesalahan server.' });
    }
});

module.exports = router;
