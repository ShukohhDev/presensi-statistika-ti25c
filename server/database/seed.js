const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const DB_PATH = path.join(__dirname, '..', 'data', 'presensi.db');

// Pastikan folder data ada
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(DB_PATH);

// Enable WAL mode untuk performa
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Jalankan schema
const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
db.exec(schema);

// Data mahasiswa
const students = [
    { name: 'dafa rizki', password: '250511019', role: 'user' },
    { name: 'Choirul Mustakim', password: '250511017', role: 'user' },
    { name: 'Muhammad Reza Pahlevi Fairuz', password: '250511029', role: 'user' },
    { name: 'Putri Dian Puspita Sari', password: '250511004', role: 'user' },
    { name: 'Delviera Renada Anrelia', password: '250511021', role: 'user' },
    { name: 'Inggi Febriani Sepina', password: '250511068', role: 'user' },
    { name: 'Islananda Enjeli', password: '250511104', role: 'user' },
    { name: 'Putra Sadewo', password: '250511121', role: 'user' },
    { name: 'Dipo Endratanaya Kunto', password: '250511095', role: 'user' },
    { name: 'Bayu Setiawan Hadi', password: '250511082', role: 'user' },
    { name: 'Rommy zaidan zidna fann', password: '250511115', role: 'user' },
    { name: 'Sayyid Sakhiy Sulaeman', password: '250511048', role: 'user' },
    { name: 'Handini', password: '250511087', role: 'user' },
    { name: 'Tyara Septyanita', password: '250511078', role: 'user' },
    { name: 'Syifa Hayatun Nisa', password: '250511089', role: 'user' },
    { name: 'Ananda Abel Deas Pratama', password: '250511023', role: 'user' },
    { name: 'zain akbar mujahidan', password: '250511097', role: 'user' },
    { name: "Muhammad 'Azmi", password: '250511043', role: 'user' },
    { name: 'IlhamAuliatullah', password: '250511022', role: 'user' },
    { name: 'Rengga Ramdani Anggari', password: '250511053', role: 'user' },
    { name: 'Faqih Hidayatus Salam', password: '250511067', role: 'user' },
    { name: 'Shukoh#Dev', password: 'FAFA17052007', role: 'admin' },
    { name: 'Nisa Amaliyah Zahira', password: '250511133', role: 'user' },
    { name: 'Ahmad Azhar Ibrahim', password: '250511108', role: 'user' },
    { name: 'Asep Fauzan Muhammad Salman Al Baihaqi', password: '250511079', role: 'user' },
    { name: 'naufal irsyadillah', password: '250511088', role: 'user' },
    { name: 'ahmad fajar', password: '250511091', role: 'user' },
    { name: 'Fadilah Wildan Firdaus', password: '250511125', role: 'user' },
    { name: 'Andhika Prasetia Nugraha Putra', password: '250511103', role: 'user' },
];

function seed() {
    console.log('Memulai seeding database...');

    // Cek apakah data sudah ada
    const existingCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
    if (existingCount.count > 0) {
        console.log('Data sudah ada, skip seeding. Jumlah user:', existingCount.count);
        db.close();
        return;
    }

    const insertUser = db.prepare(
        'INSERT INTO users (name, password, role) VALUES (?, ?, ?)'
    );

    const insertSettings = db.prepare(
        'INSERT INTO user_settings (user_id, theme, dark_mode, auto_logout_minutes) VALUES (?, ?, ?, ?)'
    );

    const insertMany = db.transaction((students) => {
        for (const student of students) {
            const hashedPassword = bcrypt.hashSync(student.password, 10);
            const result = insertUser.run(student.name, hashedPassword, student.role);

            // Buat default settings untuk setiap user
            insertSettings.run(result.lastInsertRowid, 'biru-klasik', 0, 30);

            console.log(`  Ditambahkan: ${student.name} (${student.role})`);
        }
    });

    insertMany(students);

    console.log(`\nSeeding selesai! Total ${students.length} akun berhasil ditambahkan.`);
    console.log('Admin: Shukoh#Dev (FAFA17052007)');
    console.log('Mahasiswa: Faqih Hidayatus Salam (250511067)');

    db.close();
}

seed();
