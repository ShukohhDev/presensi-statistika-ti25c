const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();
const { getDb } = require('../config/database');
const { authenticateToken, generateToken } = require('../middleware/auth');

// POST /api/auth/login
router.post('/login', (req, res) => {
    try {
        const { name, password } = req.body;

        if (!name || !password) {
            return res.status(400).json({ error: 'Nama dan password wajib diisi.' });
        }

        const db = getDb();
        const user = db.prepare('SELECT * FROM users WHERE name = ?').get(name);

        if (!user) {
            return res.status(401).json({ error: 'Nama atau password salah.' });
        }

        const validPassword = bcrypt.compareSync(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ error: 'Nama atau password salah.' });
        }

        const token = generateToken(user);

        // Log aktivitas login
        db.prepare(
            'INSERT INTO activity_log (user_id, action, description) VALUES (?, ?, ?)'
        ).run(user.id, 'login', 'Berhasil masuk ke sistem');

        res.json({
            token,
            user: {
                id: user.id,
                name: user.name,
                role: user.role,
                profile_photo: user.profile_photo
            }
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Terjadi kesalahan server.' });
    }
});

// POST /api/auth/logout
router.post('/logout', authenticateToken, (req, res) => {
    try {
        const db = getDb();
        db.prepare(
            'INSERT INTO activity_log (user_id, action, description) VALUES (?, ?, ?)'
        ).run(req.user.id, 'logout', 'Keluar dari sistem');

        res.json({ message: 'Berhasil keluar.' });
    } catch (err) {
        console.error('Logout error:', err);
        res.status(500).json({ error: 'Terjadi kesalahan server.' });
    }
});

// GET /api/auth/me - Get current user info
router.get('/me', authenticateToken, (req, res) => {
    try {
        const db = getDb();
        const user = db.prepare('SELECT id, name, role, profile_photo, created_at FROM users WHERE id = ?').get(req.user.id);
        const settings = db.prepare('SELECT * FROM user_settings WHERE user_id = ?').get(req.user.id);

        if (!user) {
            return res.status(404).json({ error: 'User tidak ditemukan.' });
        }

        res.json({ user, settings });
    } catch (err) {
        console.error('Get user error:', err);
        res.status(500).json({ error: 'Terjadi kesalahan server.' });
    }
});

module.exports = router;
