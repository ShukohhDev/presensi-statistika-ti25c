const express = require('express');
const router = express.Router();
const { getDb } = require('../config/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { uploadTask } = require('../middleware/upload');

const { uploadToDrive, testDriveConnection, DEFAULT_FOLDER_URL } = require('../services/google-drive');

// GET /api/tasks/test-drive - Uji status koneksi Google Drive
router.get('/test-drive', authenticateToken, async (req, res) => {
    try {
        const result = await testDriveConnection();
        res.json(result);
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// POST /api/tasks/upload - Upload tugas
router.post('/upload', authenticateToken, uploadTask.single('file'), async (req, res) => {
    try {
        const { task_title, description, submitted_date, assignment_id, drive_link } = req.body;

        if (!req.file && (!drive_link || !drive_link.trim())) {
            return res.status(400).json({ error: 'Harap pilih file tugas atau masukkan tautan Google Drive.' });
        }

        if (!submitted_date) {
            return res.status(400).json({ error: 'Tanggal pengumpulan wajib diisi.' });
        }

        let googleDriveId = null;
        let googleDriveLink = (drive_link && drive_link.trim()) ? drive_link.trim() : null;
        let localPath = null;
        let fileName = 'Tautan Google Drive';
        let fileType = 'application/octet-stream';
        let fileSize = 0;

        if (req.file) {
            fileName = req.file.originalname;
            fileType = req.file.mimetype;
            fileSize = req.file.size;
            localPath = `/uploads/tasks/${req.file.filename}`;

            const driveResult = await uploadToDrive(
                req.file.path,
                `${req.user.name}_${req.file.originalname}`,
                req.file.mimetype
            );

            if (driveResult.googleDriveId) {
                googleDriveId = driveResult.googleDriveId;
            }
            if (driveResult.googleDriveLink) {
                googleDriveLink = driveResult.googleDriveLink;
            } else if (!googleDriveLink) {
                googleDriveLink = DEFAULT_FOLDER_URL;
            }
        } else if (!googleDriveLink) {
            googleDriveLink = DEFAULT_FOLDER_URL;
        }

        const db = getDb();

        db.prepare(
            `INSERT INTO tasks (user_id, assignment_id, task_title, description, file_name, file_path, file_type, file_size, google_drive_id, google_drive_link, submitted_date) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).run(
            req.user.id,
            assignment_id ? parseInt(assignment_id, 10) : null,
            task_title || 'Tugas Statistika',
            description || null,
            fileName,
            localPath,
            fileType,
            fileSize,
            googleDriveId,
            googleDriveLink,
            submitted_date
        );

        // Log aktivitas
        db.prepare(
            'INSERT INTO activity_log (user_id, action, description) VALUES (?, ?, ?)'
        ).run(req.user.id, 'upload_tugas', `Mengumpulkan tugas: ${fileName}`);

        res.json({
            message: 'Tugas berhasil dikumpulkan.',
            file: {
                name: fileName,
                size: fileSize,
                type: fileType,
                driveLink: googleDriveLink
            }
        });
    } catch (err) {
        console.error('Upload task error:', err);
        res.status(500).json({ error: 'Terjadi kesalahan server.' });
    }
});

// GET /api/tasks/history - Riwayat tugas user
router.get('/history', authenticateToken, (req, res) => {
    try {
        const db = getDb();
        const tasks = db.prepare(
            'SELECT * FROM tasks WHERE user_id = ? ORDER BY submitted_at DESC'
        ).all(req.user.id);

        res.json({ tasks });
    } catch (err) {
        console.error('Get task history error:', err);
        res.status(500).json({ error: 'Terjadi kesalahan server.' });
    }
});

// GET /api/tasks/all - Semua tugas (admin)
router.get('/all', authenticateToken, (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Akses ditolak.' });
        }

        const db = getDb();
        const tasks = db.prepare(`
            SELECT t.*, u.name as student_name 
            FROM tasks t 
            JOIN users u ON t.user_id = u.id 
            ORDER BY t.submitted_at DESC
        `).all();

        res.json({ tasks });
    } catch (err) {
        console.error('Get all tasks error:', err);
        res.status(500).json({ error: 'Terjadi kesalahan server.' });
    }
});

// GET /api/tasks/assignments - Daftar semua slot tugas aktif
router.get('/assignments', authenticateToken, (req, res) => {
    try {
        const db = getDb();
        const assignments = db.prepare(`
            SELECT a.*, 
                   (SELECT COUNT(*) FROM tasks t WHERE t.assignment_id = a.id) as submitted_count,
                   (SELECT COUNT(*) FROM tasks t WHERE t.assignment_id = a.id AND t.user_id = ?) as my_submission_count
            FROM assignments a 
            ORDER BY a.due_date ASC, a.due_time ASC
        `).all(req.user.id);

        res.json({ assignments });
    } catch (err) {
        console.error('Get assignments error:', err);
        res.status(500).json({ error: 'Terjadi kesalahan server.' });
    }
});

// POST /api/tasks/assignments/create - Buat slot tugas baru (admin)
router.post('/assignments/create', authenticateToken, requireAdmin, (req, res) => {
    try {
        const { title, description, due_date, due_time } = req.body;
        const db = getDb();

        if (!title || !due_date) {
            return res.status(400).json({ error: 'Judul dan batas tanggal pengumpulan wajib diisi.' });
        }

        const result = db.prepare(`
            INSERT INTO assignments (title, description, due_date, due_time, created_by)
            VALUES (?, ?, ?, ?, ?)
        `).run(title, description || null, due_date, due_time || '23:59', req.user.id);

        // Kirim notifikasi tugas baru ke semua mahasiswa
        const users = db.prepare("SELECT id FROM users WHERE role = 'user'").all();
        const insertNotif = db.prepare(
            `INSERT INTO notifications (user_id, title, message, type, created_by) VALUES (?, ?, ?, ?, ?)`
        );

        users.forEach(user => {
            insertNotif.run(
                user.id,
                'Tugas Baru Dibuka',
                `PJ MK telah membuka pengumpulan tugas baru: ${title}. Batas pengumpulan: ${due_date}.`,
                'reminder',
                req.user.id
            );
        });

        // Log aktivitas
        db.prepare(
            'INSERT INTO activity_log (user_id, action, description) VALUES (?, ?, ?)'
        ).run(req.user.id, 'buka_tugas', `Membuka slot tugas baru: ${title}`);

        res.json({ message: 'Slot penugasan berhasil dibuat.', assignmentId: result.lastInsertRowid });
    } catch (err) {
        console.error('Create assignment error:', err);
        res.status(500).json({ error: 'Terjadi kesalahan server.' });
    }
});

// DELETE /api/tasks/assignments/:id - Hapus slot tugas (admin)
router.delete('/assignments/:id', authenticateToken, requireAdmin, (req, res) => {
    try {
        const db = getDb();
        db.prepare('DELETE FROM assignments WHERE id = ?').run(req.params.id);
        res.json({ message: 'Slot penugasan berhasil dihapus.' });
    } catch (err) {
        console.error('Delete assignment error:', err);
        res.status(500).json({ error: 'Terjadi kesalahan server.' });
    }
});

// GET /api/tasks/assignments/:id/status - Status pengumpulan seluruh mahasiswa (admin)
router.get('/assignments/:id/status', authenticateToken, requireAdmin, (req, res) => {
    try {
        const db = getDb();
        const assignmentId = req.params.id;

        const assignment = db.prepare('SELECT * FROM assignments WHERE id = ?').get(assignmentId);
        if (!assignment) {
            return res.status(404).json({ error: 'Penugasan tidak ditemukan.' });
        }

        const users = db.prepare("SELECT id, name FROM users WHERE role = 'user' ORDER BY name").all();
        const submissions = db.prepare('SELECT * FROM tasks WHERE assignment_id = ?').all(assignmentId);

        const submissionMap = {};
        submissions.forEach(s => { submissionMap[s.user_id] = s; });

        const studentStatusList = users.map(u => {
            const sub = submissionMap[u.id];
            return {
                user_id: u.id,
                name: u.name,
                has_submitted: !!sub,
                file_name: sub ? sub.file_name : null,
                file_path: sub ? sub.file_path : null,
                file_size: sub ? sub.file_size : null,
                submitted_at: sub ? sub.submitted_at : null,
                google_drive_link: sub ? sub.google_drive_link : null
            };
        });

        res.json({ assignment, students: studentStatusList });
    } catch (err) {
        console.error('Get assignment status error:', err);
        res.status(500).json({ error: 'Terjadi kesalahan server.' });
    }
});

module.exports = router;
