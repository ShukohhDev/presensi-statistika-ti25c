const express = require('express');
const router = express.Router();
const { getDb } = require('../config/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { uploadEvidence } = require('../middleware/upload');

// GET /api/attendance/active-session - Cek sesi aktif
router.get('/active-session', authenticateToken, (req, res) => {
    try {
        const db = getDb();
        const session = db.prepare(
            "SELECT * FROM sessions WHERE status = 'open' ORDER BY id DESC LIMIT 1"
        ).get();

        if (!session) {
            return res.json({ session: null });
        }

        // Cek apakah user sudah absen di sesi ini
        const attendance = db.prepare(
            'SELECT * FROM attendance WHERE user_id = ? AND session_id = ?'
        ).get(req.user.id, session.id);

        res.json({ session, attendance });
    } catch (err) {
        console.error('Get active session error:', err);
        res.status(500).json({ error: 'Terjadi kesalahan server.' });
    }
});

// POST /api/attendance/submit - Submit presensi
router.post('/submit', authenticateToken, uploadEvidence.single('evidence'), (req, res) => {
    try {
        const { session_id, status, note } = req.body;
        const db = getDb();

        // Validasi sesi
        const session = db.prepare(
            "SELECT * FROM sessions WHERE id = ? AND status = 'open'"
        ).get(session_id);

        if (!session) {
            return res.status(400).json({ error: 'Sesi presensi tidak ditemukan atau sudah ditutup.' });
        }

        // Cek apakah sudah absen
        const existing = db.prepare(
            'SELECT * FROM attendance WHERE user_id = ? AND session_id = ?'
        ).get(req.user.id, session_id);

        if (existing) {
            return res.status(400).json({ error: 'Anda sudah melakukan presensi untuk sesi ini.' });
        }

        // Validasi untuk izin dan sakit harus ada catatan dan bukti
        if ((status === 'izin' || status === 'sakit') && !note) {
            return res.status(400).json({ error: 'Catatan wajib diisi untuk status izin atau sakit.' });
        }

        if ((status === 'izin' || status === 'sakit') && !req.file) {
            return res.status(400).json({ error: 'Bukti gambar wajib diupload untuk status izin atau sakit.' });
        }

        const evidencePath = req.file ? `/uploads/evidence/${req.file.filename}` : null;

        db.prepare(
            'INSERT INTO attendance (user_id, session_id, status, note, evidence_image) VALUES (?, ?, ?, ?, ?)'
        ).run(req.user.id, session_id, status, note || null, evidencePath);

        // Log aktivitas
        db.prepare(
            'INSERT INTO activity_log (user_id, action, description) VALUES (?, ?, ?)'
        ).run(req.user.id, 'presensi', `Presensi pertemuan ${session.meeting_number}: ${status}`);

        res.json({ message: 'Presensi berhasil dicatat.', status });
    } catch (err) {
        console.error('Submit attendance error:', err);
        res.status(500).json({ error: 'Terjadi kesalahan server.' });
    }
});

// GET /api/attendance/history - Riwayat kehadiran user
router.get('/history', authenticateToken, (req, res) => {
    try {
        const db = getDb();
        const history = db.prepare(`
            SELECT a.*, s.meeting_number, s.title, s.opened_at, s.closed_at
            FROM attendance a
            JOIN sessions s ON a.session_id = s.id
            WHERE a.user_id = ?
            ORDER BY s.meeting_number DESC
        `).all(req.user.id);

        res.json({ history });
    } catch (err) {
        console.error('Get history error:', err);
        res.status(500).json({ error: 'Terjadi kesalahan server.' });
    }
});

// GET /api/attendance/summary - Ringkasan kehadiran user
router.get('/summary', authenticateToken, (req, res) => {
    try {
        const db = getDb();
        const totalSessions = db.prepare('SELECT COUNT(*) as total FROM sessions').get().total;
        const summary = db.prepare(`
            SELECT 
                COALESCE(SUM(CASE WHEN status = 'hadir' THEN 1 ELSE 0 END), 0) as hadir,
                COALESCE(SUM(CASE WHEN status = 'izin' THEN 1 ELSE 0 END), 0) as izin,
                COALESCE(SUM(CASE WHEN status = 'sakit' THEN 1 ELSE 0 END), 0) as sakit,
                COALESCE(SUM(CASE WHEN status = 'alpha' THEN 1 ELSE 0 END), 0) as alpha
            FROM attendance
            WHERE user_id = ?
        `).get(req.user.id);

        const attended = summary.hadir + summary.izin + summary.sakit;
        const percentage = totalSessions > 0 ? Math.round((summary.hadir / totalSessions) * 100) : 0;

        res.json({ summary: { ...summary, totalSessions, percentage } });
    } catch (err) {
        console.error('Get summary error:', err);
        res.status(500).json({ error: 'Terjadi kesalahan server.' });
    }
});

// GET /api/attendance/recap - Rekap semua mahasiswa
router.get('/recap', authenticateToken, (req, res) => {
    try {
        const db = getDb();
        const users = db.prepare("SELECT id, name FROM users WHERE role = 'user' ORDER BY name").all();
        const sessions = db.prepare('SELECT * FROM sessions ORDER BY meeting_number ASC').all();

        const recap = users.map(user => {
            const attendances = db.prepare(`
                SELECT a.status, a.session_id
                FROM attendance a
                WHERE a.user_id = ?
            `).all(user.id);

            const attendanceMap = {};
            attendances.forEach(a => {
                attendanceMap[a.session_id] = a.status;
            });

            const counts = {
                hadir: attendances.filter(a => a.status === 'hadir').length,
                izin: attendances.filter(a => a.status === 'izin').length,
                sakit: attendances.filter(a => a.status === 'sakit').length,
                alpha: sessions.length - attendances.length
            };

            const percentage = sessions.length > 0
                ? Math.round((counts.hadir / sessions.length) * 100)
                : 0;

            return {
                id: user.id,
                name: user.name,
                counts,
                percentage,
                attendanceMap
            };
        });

        res.json({ recap, sessions });
    } catch (err) {
        console.error('Get recap error:', err);
        res.status(500).json({ error: 'Terjadi kesalahan server.' });
    }
});

// PUT /api/attendance/update-status - Edit status kehadiran (admin only)
router.put('/update-status', authenticateToken, requireAdmin, (req, res) => {
    try {
        const { user_id, session_id, status } = req.body;
        const db = getDb();

        const existing = db.prepare(
            'SELECT * FROM attendance WHERE user_id = ? AND session_id = ?'
        ).get(user_id, session_id);

        if (existing) {
            db.prepare(
                'UPDATE attendance SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ? AND session_id = ?'
            ).run(status, user_id, session_id);
        } else {
            db.prepare(
                'INSERT INTO attendance (user_id, session_id, status) VALUES (?, ?, ?)'
            ).run(user_id, session_id, status);
        }

        // Log aktivitas admin
        const targetUser = db.prepare('SELECT name FROM users WHERE id = ?').get(user_id);
        db.prepare(
            'INSERT INTO activity_log (user_id, action, description) VALUES (?, ?, ?)'
        ).run(req.user.id, 'edit_presensi', `Mengubah status ${targetUser.name} menjadi ${status}`);

        res.json({ message: 'Status kehadiran berhasil diubah.' });
    } catch (err) {
        console.error('Update status error:', err);
        res.status(500).json({ error: 'Terjadi kesalahan server.' });
    }
});

// GET /api/attendance/course-info - Info umum mata kuliah untuk mahasiswa
router.get('/course-info', authenticateToken, (req, res) => {
    try {
        const db = getDb();
        const info = db.prepare('SELECT * FROM course_info WHERE id = 1').get();
        res.json({ info });
    } catch (err) {
        console.error('Get course info error:', err);
        res.status(500).json({ error: 'Terjadi kesalahan server.' });
    }
});

module.exports = router;
