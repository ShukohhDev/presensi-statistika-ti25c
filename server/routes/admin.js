const express = require('express');
const router = express.Router();
const { getDb } = require('../config/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const XLSX = require('xlsx');

// POST /api/admin/session/open - Buka sesi presensi
router.post('/session/open', authenticateToken, requireAdmin, (req, res) => {
    try {
        const { meeting_number, title, duration_minutes } = req.body;
        const db = getDb();

        // Cek apakah ada sesi yang masih terbuka
        const openSession = db.prepare("SELECT * FROM sessions WHERE status = 'open'").get();
        if (openSession) {
            return res.status(400).json({ error: 'Masih ada sesi yang terbuka. Tutup sesi tersebut terlebih dahulu.' });
        }

        // Cek apakah meeting_number sudah ada
        const existingMeeting = db.prepare('SELECT * FROM sessions WHERE meeting_number = ?').get(meeting_number);
        if (existingMeeting) {
            return res.status(400).json({ error: `Pertemuan ke-${meeting_number} sudah pernah dibuat.` });
        }

        const result = db.prepare(
            `INSERT INTO sessions (meeting_number, title, status, duration_minutes, opened_at, created_by) 
             VALUES (?, ?, 'open', ?, CURRENT_TIMESTAMP, ?)`
        ).run(meeting_number, title || `Pertemuan ${meeting_number}`, duration_minutes || 15, req.user.id);

        // Buat notifikasi untuk semua user
        const users = db.prepare("SELECT id FROM users WHERE role = 'user'").all();
        const insertNotif = db.prepare(
            `INSERT INTO notifications (user_id, title, message, type, created_by) VALUES (?, ?, ?, ?, ?)`
        );

        users.forEach(user => {
            insertNotif.run(
                user.id,
                'Sesi Presensi Dibuka',
                `Sesi presensi untuk ${title || 'Pertemuan ' + meeting_number} telah dibuka. Segera lakukan presensi.`,
                'reminder',
                req.user.id
            );
        });

        // Log aktivitas
        db.prepare(
            'INSERT INTO activity_log (user_id, action, description) VALUES (?, ?, ?)'
        ).run(req.user.id, 'buka_sesi', `Membuka sesi presensi pertemuan ${meeting_number}`);

        res.json({ message: 'Sesi presensi berhasil dibuka.', sessionId: result.lastInsertRowid });
    } catch (err) {
        console.error('Open session error:', err);
        res.status(500).json({ error: 'Terjadi kesalahan server.' });
    }
});

// POST /api/admin/session/close - Tutup sesi presensi
router.post('/session/close', authenticateToken, requireAdmin, (req, res) => {
    try {
        const { session_id } = req.body;
        const db = getDb();

        const session = db.prepare("SELECT * FROM sessions WHERE id = ? AND status = 'open'").get(session_id);
        if (!session) {
            return res.status(400).json({ error: 'Sesi tidak ditemukan atau sudah ditutup.' });
        }

        db.prepare(
            "UPDATE sessions SET status = 'closed', closed_at = CURRENT_TIMESTAMP WHERE id = ?"
        ).run(session_id);

        // Set alpha untuk user yang tidak absen
        const usersWhoAttended = db.prepare(
            'SELECT user_id FROM attendance WHERE session_id = ?'
        ).all(session_id).map(a => a.user_id);

        const allUsers = db.prepare("SELECT id FROM users WHERE role = 'user'").all();
        const insertAlpha = db.prepare(
            "INSERT OR IGNORE INTO attendance (user_id, session_id, status) VALUES (?, ?, 'alpha')"
        );

        allUsers.forEach(user => {
            if (!usersWhoAttended.includes(user.id)) {
                insertAlpha.run(user.id, session_id);
            }
        });

        // Log aktivitas
        db.prepare(
            'INSERT INTO activity_log (user_id, action, description) VALUES (?, ?, ?)'
        ).run(req.user.id, 'tutup_sesi', `Menutup sesi presensi pertemuan ${session.meeting_number}`);

        res.json({ message: 'Sesi presensi berhasil ditutup. Mahasiswa yang tidak absen dihitung Alpha.' });
    } catch (err) {
        console.error('Close session error:', err);
        res.status(500).json({ error: 'Terjadi kesalahan server.' });
    }
});

// GET /api/admin/sessions - Daftar semua sesi
router.get('/sessions', authenticateToken, requireAdmin, (req, res) => {
    try {
        const db = getDb();
        const sessions = db.prepare('SELECT * FROM sessions ORDER BY meeting_number DESC').all();
        res.json({ sessions });
    } catch (err) {
        console.error('Get sessions error:', err);
        res.status(500).json({ error: 'Terjadi kesalahan server.' });
    }
});

// GET /api/admin/students - Daftar semua mahasiswa
router.get('/students', authenticateToken, requireAdmin, (req, res) => {
    try {
        const db = getDb();
        const students = db.prepare("SELECT id, name, profile_photo, created_at FROM users WHERE role = 'user' ORDER BY name").all();
        res.json({ students });
    } catch (err) {
        console.error('Get students error:', err);
        res.status(500).json({ error: 'Terjadi kesalahan server.' });
    }
});

// GET /api/admin/export/excel - Export rekap ke Excel
router.get('/export/excel', authenticateToken, requireAdmin, (req, res) => {
    try {
        const db = getDb();
        const users = db.prepare("SELECT id, name FROM users WHERE role = 'user' ORDER BY name").all();
        const sessions = db.prepare('SELECT * FROM sessions ORDER BY meeting_number ASC').all();

        // Buat data untuk Excel
        const data = [];

        // Header row
        const headerRow = ['No', 'Nama Mahasiswa'];
        sessions.forEach(s => {
            headerRow.push(`P${s.meeting_number}`);
        });
        headerRow.push('Hadir', 'Izin', 'Sakit', 'Alpha', 'Persentase');
        data.push(headerRow);

        // Data rows
        users.forEach((user, index) => {
            const row = [index + 1, user.name];
            let hadir = 0, izin = 0, sakit = 0, alpha = 0;

            sessions.forEach(session => {
                const att = db.prepare(
                    'SELECT status FROM attendance WHERE user_id = ? AND session_id = ?'
                ).get(user.id, session.id);

                const status = att ? att.status : 'alpha';
                switch (status) {
                    case 'hadir': row.push('H'); hadir++; break;
                    case 'izin': row.push('I'); izin++; break;
                    case 'sakit': row.push('S'); sakit++; break;
                    default: row.push('A'); alpha++; break;
                }
            });

            const percentage = sessions.length > 0
                ? Math.round((hadir / sessions.length) * 100) + '%'
                : '0%';

            row.push(hadir, izin, sakit, alpha, percentage);
            data.push(row);
        });

        // Buat workbook
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet(data);

        // Set column widths
        ws['!cols'] = [
            { wch: 5 },  // No
            { wch: 40 }, // Nama
            ...sessions.map(() => ({ wch: 5 })),
            { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 8 },
            { wch: 12 }
        ];

        XLSX.utils.book_append_sheet(wb, ws, 'Rekap Kehadiran');

        const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=rekap_kehadiran_statistika_TI25C.xlsx');
        res.send(buffer);
    } catch (err) {
        console.error('Export Excel error:', err);
        res.status(500).json({ error: 'Terjadi kesalahan server.' });
    }
});

// GET /api/admin/export/csv - Export rekap ke CSV
router.get('/export/csv', authenticateToken, requireAdmin, (req, res) => {
    try {
        const db = getDb();
        const users = db.prepare("SELECT id, name FROM users WHERE role = 'user' ORDER BY name").all();
        const sessions = db.prepare('SELECT * FROM sessions ORDER BY meeting_number ASC').all();

        let csv = 'No,Nama Mahasiswa';
        sessions.forEach(s => { csv += `,P${s.meeting_number}`; });
        csv += ',Hadir,Izin,Sakit,Alpha,Persentase\n';

        users.forEach((user, index) => {
            let row = `${index + 1},"${user.name}"`;
            let hadir = 0, izin = 0, sakit = 0, alpha = 0;

            sessions.forEach(session => {
                const att = db.prepare(
                    'SELECT status FROM attendance WHERE user_id = ? AND session_id = ?'
                ).get(user.id, session.id);

                const status = att ? att.status : 'alpha';
                switch (status) {
                    case 'hadir': row += ',H'; hadir++; break;
                    case 'izin': row += ',I'; izin++; break;
                    case 'sakit': row += ',S'; sakit++; break;
                    default: row += ',A'; alpha++; break;
                }
            });

            const percentage = sessions.length > 0
                ? Math.round((hadir / sessions.length) * 100) + '%'
                : '0%';

            row += `,${hadir},${izin},${sakit},${alpha},${percentage}`;
            csv += row + '\n';
        });

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=rekap_kehadiran_statistika_TI25C.csv');
        res.send(csv);
    } catch (err) {
        console.error('Export CSV error:', err);
        res.status(500).json({ error: 'Terjadi kesalahan server.' });
    }
});

// GET /api/admin/dashboard-stats - Statistik dashboard
router.get('/dashboard-stats', authenticateToken, requireAdmin, (req, res) => {
    try {
        const db = getDb();

        const totalStudents = db.prepare("SELECT COUNT(*) as total FROM users WHERE role = 'user'").get().total;
        const totalSessions = db.prepare('SELECT COUNT(*) as total FROM sessions').get().total;
        const openSession = db.prepare("SELECT * FROM sessions WHERE status = 'open'").get();
        const totalReports = db.prepare("SELECT COUNT(*) as total FROM reports WHERE status = 'baru'").get().total;
        const totalTasks = db.prepare('SELECT COUNT(*) as total FROM tasks').get().total;

        // Rata-rata kehadiran
        const avgAttendance = db.prepare(`
            SELECT ROUND(
                AVG(CASE WHEN status = 'hadir' THEN 100.0 ELSE 0 END), 1
            ) as avg
            FROM attendance
        `).get();

        res.json({
            totalStudents,
            totalSessions,
            openSession,
            totalReports,
            totalTasks,
            avgAttendance: avgAttendance.avg || 0
        });
    } catch (err) {
        console.error('Dashboard stats error:', err);
        res.status(500).json({ error: 'Terjadi kesalahan server.' });
    }
});

// GET /api/admin/session/:id/attendances - Detail kehadiran sesi beserta bukti foto
router.get('/session/:id/attendances', authenticateToken, requireAdmin, (req, res) => {
    try {
        const db = getDb();
        const sessionId = req.params.id;

        const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(sessionId);
        if (!session) {
            return res.status(404).json({ error: 'Sesi tidak ditemukan.' });
        }

        const users = db.prepare("SELECT id, name FROM users WHERE role = 'user' ORDER BY name").all();
        const attendances = db.prepare('SELECT * FROM attendance WHERE session_id = ?').all(sessionId);

        const attendanceMap = {};
        attendances.forEach(a => {
            attendanceMap[a.user_id] = a;
        });

        const list = users.map(user => {
            const att = attendanceMap[user.id];
            return {
                user_id: user.id,
                name: user.name,
                status: att ? att.status : 'alpha',
                note: att ? att.note : null,
                evidence_image: att ? att.evidence_image : null,
                timestamp: att ? att.timestamp : null
            };
        });

        res.json({ session, attendances: list });
    } catch (err) {
        console.error('Get session attendances error:', err);
        res.status(500).json({ error: 'Terjadi kesalahan server.' });
    }
});

// GET /api/admin/session/:id/wa-summary - Buat teks rekap WhatsApp untuk Dosen
router.get('/session/:id/wa-summary', authenticateToken, requireAdmin, (req, res) => {
    try {
        const db = getDb();
        const sessionId = req.params.id;

        const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(sessionId);
        if (!session) {
            return res.status(404).json({ error: 'Sesi tidak ditemukan.' });
        }

        const course = db.prepare('SELECT * FROM course_info WHERE id = 1').get() || {};
        const users = db.prepare("SELECT id, name FROM users WHERE role = 'user' ORDER BY name").all();
        const attendances = db.prepare('SELECT * FROM attendance WHERE session_id = ?').all(sessionId);

        const attendanceMap = {};
        attendances.forEach(a => { attendanceMap[a.user_id] = a; });

        const hadir = [];
        const izin = [];
        const sakit = [];
        const alpha = [];

        users.forEach(u => {
            const att = attendanceMap[u.id];
            if (!att || att.status === 'alpha') {
                alpha.push(u.name);
            } else if (att.status === 'hadir') {
                hadir.push(u.name);
            } else if (att.status === 'izin') {
                izin.push(`${u.name}${att.note ? ' (' + att.note + ')' : ''}`);
            } else if (att.status === 'sakit') {
                sakit.push(`${u.name}${att.note ? ' (' + att.note + ')' : ''}`);
            }
        });

        const dateObj = new Date(session.opened_at);
        const formattedDate = dateObj.toLocaleDateString('id-ID', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });

        let text = `*LAPORAN PRESENSI MK STATISTIKA (KELAS TI25C)*\n`;
        text += `Kelas: TI25C\n`;
        text += `Pertemuan: ${session.meeting_number} (${session.title})\n`;
        text += `Hari, Tanggal: ${formattedDate}\n`;
        text += `Dosen Pengampu: ${course.lecturer_name || '-'}\n`;
        text += `PJ MK: Faqih Hidayatus Salam (TI25C)\n\n`;
        text += `*Ringkasan Kehadiran (Total: ${users.length} Mahasiswa)*\n`;
        text += `- Hadir: ${hadir.length} orang\n`;
        text += `- Izin: ${izin.length} orang\n`;
        if (izin.length > 0) {
            text += `  Ket: ${izin.join(', ')}\n`;
        }
        text += `- Sakit: ${sakit.length} orang\n`;
        if (sakit.length > 0) {
            text += `  Ket: ${sakit.join(', ')}\n`;
        }
        text += `- Alpha: ${alpha.length} orang\n`;
        if (alpha.length > 0) {
            text += `  Daftar Alpha: ${alpha.join(', ')}\n`;
        }
        text += `\nDemikian laporan presensi perkuliahan ini disampaikan. Terima kasih.`;

        res.json({
            text,
            summary: {
                total: users.length,
                hadir: hadir.length,
                izin: izin.length,
                sakit: sakit.length,
                alpha: alpha.length
            }
        });
    } catch (err) {
        console.error('Generate WA summary error:', err);
        res.status(500).json({ error: 'Terjadi kesalahan server.' });
    }
});

// GET /api/admin/course-info - Info mata kuliah dan dosen
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

// PUT /api/admin/course-info - Update info mata kuliah (admin only)
router.put('/course-info', authenticateToken, requireAdmin, (req, res) => {
    try {
        const { lecturer_name, lecturer_nip, schedule_day, schedule_time, room, whatsapp_group_link, pj_whatsapp_phone } = req.body;
        const db = getDb();

        db.prepare(`
            UPDATE course_info 
            SET lecturer_name = COALESCE(?, lecturer_name),
                lecturer_nip = COALESCE(?, lecturer_nip),
                schedule_day = COALESCE(?, schedule_day),
                schedule_time = COALESCE(?, schedule_time),
                room = COALESCE(?, room),
                whatsapp_group_link = COALESCE(?, whatsapp_group_link),
                pj_whatsapp_phone = COALESCE(?, pj_whatsapp_phone),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = 1
        `).run(lecturer_name, lecturer_nip, schedule_day, schedule_time, room, whatsapp_group_link, pj_whatsapp_phone);

        res.json({ message: 'Informasi mata kuliah berhasil diperbarui.' });
    } catch (err) {
        console.error('Update course info error:', err);
        res.status(500).json({ error: 'Terjadi kesalahan server.' });
    }
});

module.exports = router;
