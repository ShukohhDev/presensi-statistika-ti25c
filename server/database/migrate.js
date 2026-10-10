const { getDb } = require('../config/database');

function migrate() {
    const db = getDb();

    db.exec(`
        CREATE TABLE IF NOT EXISTS assignments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            description TEXT,
            due_date DATE NOT NULL,
            due_time TEXT DEFAULT '23:59',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            created_by INTEGER NOT NULL,
            FOREIGN KEY (created_by) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS course_info (
            id INTEGER PRIMARY KEY,
            lecturer_name TEXT DEFAULT 'Dosen Pengampu Statistika',
            lecturer_nip TEXT DEFAULT '-',
            schedule_day TEXT DEFAULT 'Kamis',
            schedule_time TEXT DEFAULT '08:00 - 09:40 WIB',
            room TEXT DEFAULT 'Ruang Teori Gedung Kuliah',
            whatsapp_group_link TEXT DEFAULT 'https://chat.whatsapp.com/sample-statistika-ti25c',
            pj_whatsapp_phone TEXT DEFAULT '',
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS materials (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            meeting_number INTEGER DEFAULT 1,
            title TEXT NOT NULL,
            description TEXT,
            file_name TEXT,
            file_path TEXT,
            file_type TEXT,
            file_size INTEGER,
            external_link TEXT,
            category TEXT DEFAULT 'slide',
            created_by INTEGER NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (created_by) REFERENCES users(id)
        );

        INSERT OR IGNORE INTO course_info (id, lecturer_name, lecturer_nip, schedule_day, schedule_time, room, whatsapp_group_link, pj_whatsapp_phone)
        VALUES (1, 'Dosen Pengampu Statistika', '-', 'Kamis', '08:00 - 09:40 WIB', 'Ruang Teori Gedung Kuliah', 'https://chat.whatsapp.com/sample-statistika-ti25c', '082316188656');
    `);

    try {
        db.prepare('ALTER TABLE tasks ADD COLUMN assignment_id INTEGER').run();
    } catch (e) {}

    try {
        db.prepare("ALTER TABLE materials ADD COLUMN category TEXT DEFAULT 'slide'").run();
    } catch (e) {}

    try {
        db.prepare("ALTER TABLE course_info ADD COLUMN pj_whatsapp_phone TEXT DEFAULT ''").run();
    } catch (e) {}

    try {
        db.prepare("ALTER TABLE calendar_events ADD COLUMN room TEXT DEFAULT ''").run();
    } catch (e) {}

    try {
        db.prepare("ALTER TABLE calendar_events ADD COLUMN building TEXT DEFAULT ''").run();
    } catch (e) {}

    try {
        db.prepare(`
            UPDATE materials 
            SET title = 'Slide & Modul Pertemuan 1 - Pengantar Statistika dan Probabilitas',
                description = 'Materi pengantar konsep dasar statistika deskriptif, populasi & sampel, skala pengukuran, dan penyajian data.',
                external_link = 'https://drive.google.com/drive/folders/1gzYtiqFXn6lyyr4sDQa6jfXsb7qBHq9L'
            WHERE external_link LIKE '%sample-slide-kalkulus2%' OR id = 1
        `).run();
    } catch (e) {}

    // Sinkronisasi data mahasiswa (hapus Rangga Aditama, tambah Nisa Amaliyah Zahira & Ahmad Azhar Ibrahim)
    try {
        const bcrypt = require('bcryptjs');

        // 1. Hapus Rangga Aditama jika masih ada
        const rangga = db.prepare("SELECT id FROM users WHERE name = 'Rangga Aditama'").get();
        if (rangga) {
            db.prepare('DELETE FROM user_settings WHERE user_id = ?').run(rangga.id);
            db.prepare('DELETE FROM attendance WHERE user_id = ?').run(rangga.id);
            db.prepare('DELETE FROM tasks WHERE user_id = ?').run(rangga.id);
            db.prepare('DELETE FROM reports WHERE user_id = ?').run(rangga.id);
            db.prepare('DELETE FROM activity_log WHERE user_id = ?').run(rangga.id);
            db.prepare('DELETE FROM notifications WHERE user_id = ?').run(rangga.id);
            db.prepare('DELETE FROM users WHERE id = ?').run(rangga.id);
            console.log('Akun mahasiswa Rangga Aditama berhasil dihapus dari database.');
        }

        // 2. Tambah Nisa Amaliyah Zahira dan Ahmad Azhar Ibrahim jika belum ada
        const newStudents = [
            { name: 'Nisa Amaliyah Zahira', password: '250511133', role: 'user' },
            { name: 'Ahmad Azhar Ibrahim', password: '250511108', role: 'user' }
        ];

        for (const student of newStudents) {
            const existing = db.prepare('SELECT id FROM users WHERE name = ?').get(student.name);
            if (!existing) {
                const hashedPassword = bcrypt.hashSync(student.password, 10);
                const res = db.prepare('INSERT INTO users (name, password, role) VALUES (?, ?, ?)').run(student.name, hashedPassword, student.role);
                db.prepare('INSERT OR IGNORE INTO user_settings (user_id, theme, dark_mode, auto_logout_minutes) VALUES (?, ?, ?, ?)').run(res.lastInsertRowid, 'biru-klasik', 0, 30);
                console.log(`Akun mahasiswa ${student.name} (${student.password}) berhasil ditambahkan ke database.`);
            }
        }
    } catch (err) {
        console.error('Error saat sinkronisasi data akun mahasiswa:', err);
    }

    console.log('Database migration completed successfully.');
}

module.exports = migrate;

if (require.main === module) {
    migrate();
}
