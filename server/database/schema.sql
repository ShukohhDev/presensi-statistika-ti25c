-- ================================================
-- Database Schema: Website Presensi MK Statistika - Kelas TI25C
-- ================================================

-- Tabel Users (Mahasiswa dan Admin)
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('user', 'admin')),
    profile_photo TEXT DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabel Sessions (Sesi Presensi yang dibuka Admin)
CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    meeting_number INTEGER NOT NULL,
    title TEXT DEFAULT 'Pertemuan',
    status TEXT NOT NULL DEFAULT 'closed' CHECK(status IN ('open', 'closed')),
    duration_minutes INTEGER DEFAULT 15,
    opened_at DATETIME DEFAULT NULL,
    closed_at DATETIME DEFAULT NULL,
    created_by INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Tabel Attendance (Kehadiran)
CREATE TABLE IF NOT EXISTS attendance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    session_id INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'alpha' CHECK(status IN ('hadir', 'izin', 'sakit', 'alpha')),
    note TEXT DEFAULT NULL,
    evidence_image TEXT DEFAULT NULL,
    submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (session_id) REFERENCES sessions(id),
    UNIQUE(user_id, session_id)
);

-- Tabel Tasks (Tugas yang dikumpulkan)
CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    task_title TEXT DEFAULT NULL,
    description TEXT DEFAULT NULL,
    file_name TEXT NOT NULL,
    file_path TEXT DEFAULT NULL,
    file_type TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    google_drive_id TEXT DEFAULT NULL,
    google_drive_link TEXT DEFAULT NULL,
    submitted_date DATE NOT NULL,
    submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Tabel Reports (Laporan Kritik/Saran/Bug)
CREATE TABLE IF NOT EXISTS reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    category TEXT NOT NULL CHECK(category IN ('kritik', 'saran', 'bug')),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'baru' CHECK(status IN ('baru', 'diproses', 'selesai')),
    admin_response TEXT DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Tabel Activity Log (Log Aktivitas)
CREATE TABLE IF NOT EXISTS activity_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    action TEXT NOT NULL,
    description TEXT NOT NULL,
    metadata TEXT DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Tabel Notifications (Notifikasi)
CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER DEFAULT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'info' CHECK(type IN ('info', 'warning', 'reminder', 'announcement')),
    is_read INTEGER NOT NULL DEFAULT 0,
    created_by INTEGER DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Tabel Announcements (Pengumuman dari Admin)
CREATE TABLE IF NOT EXISTS announcements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    created_by INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Tabel Calendar Events (Kalender Akademik)
CREATE TABLE IF NOT EXISTS calendar_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT DEFAULT NULL,
    event_date DATE NOT NULL,
    event_time TIME DEFAULT NULL,
    event_type TEXT NOT NULL DEFAULT 'kuliah' CHECK(event_type IN ('kuliah', 'tugas', 'ujian', 'lainnya')),
    location TEXT DEFAULT NULL,
    created_by INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Tabel User Settings (Pengaturan User)
CREATE TABLE IF NOT EXISTS user_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL UNIQUE,
    theme TEXT NOT NULL DEFAULT 'biru-klasik',
    dark_mode INTEGER NOT NULL DEFAULT 0,
    auto_logout_minutes INTEGER NOT NULL DEFAULT 30,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Tabel Assignments (Slot Penugasan oleh PJ MK)
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

-- Tabel Course Info (Informasi Dosen, Jadwal & Ruangan)
CREATE TABLE IF NOT EXISTS course_info (
    id INTEGER PRIMARY KEY,
    lecturer_name TEXT DEFAULT 'Dosen Pengampu Statistika',
    lecturer_nip TEXT DEFAULT '-',
    schedule_day TEXT DEFAULT 'Kamis',
    schedule_time TEXT DEFAULT '08:00 - 09:40 WIB',
    room TEXT DEFAULT 'Ruang Teori Gedung Kuliah',
    whatsapp_group_link TEXT DEFAULT 'https://chat.whatsapp.com/sample-statistika-ti25c',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes untuk performa
CREATE INDEX IF NOT EXISTS idx_attendance_user ON attendance(user_id);
CREATE INDEX IF NOT EXISTS idx_attendance_session ON attendance(session_id);
CREATE INDEX IF NOT EXISTS idx_tasks_user ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_user ON activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_reports_user ON reports(user_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
