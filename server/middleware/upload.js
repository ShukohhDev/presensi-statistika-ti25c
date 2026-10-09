const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

// Pastikan folder uploads dan subfoldernya ada
const uploadsDir = path.join(__dirname, '..', 'uploads');
['evidence', 'tasks', 'profiles', 'materials'].forEach(sub => {
    const subDir = path.join(uploadsDir, sub);
    if (!fs.existsSync(subDir)) {
        fs.mkdirSync(subDir, { recursive: true });
    }
});

// Konfigurasi storage untuk bukti presensi (gambar)
const evidenceStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        const dir = path.join(uploadsDir, 'evidence');
        cb(null, dir);
    },
    filename: function (req, file, cb) {
        const uniqueName = uuidv4() + (path.extname(file.originalname) || '.jpg');
        cb(null, uniqueName);
    }
});

// Konfigurasi storage untuk tugas (file apapun)
const taskStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        const dir = path.join(uploadsDir, 'tasks');
        cb(null, dir);
    },
    filename: function (req, file, cb) {
        const uniqueName = uuidv4() + path.extname(file.originalname);
        cb(null, uniqueName);
    }
});

// Konfigurasi storage untuk foto profil
const profileStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        const dir = path.join(uploadsDir, 'profiles');
        cb(null, dir);
    },
    filename: function (req, file, cb) {
        const ext = path.extname(file.originalname) || '.jpg';
        // Tambahkan timestamp agar browser tidak meng-cache gambar lama
        const uniqueName = `profile-${req.user.id}-${Date.now()}${ext}`;
        cb(null, uniqueName);
    }
});

// Filter gambar: menerima semua mime type image/*
const imageFilter = function (req, file, cb) {
    if (file.mimetype && file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Hanya file gambar yang diperbolehkan (JPEG, PNG, GIF, WebP, dll).'), false);
    }
};

// Konfigurasi storage untuk materi perkuliahan
const materialStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        const dir = path.join(uploadsDir, 'materials');
        cb(null, dir);
    },
    filename: function (req, file, cb) {
        const uniqueName = uuidv4() + path.extname(file.originalname);
        cb(null, uniqueName);
    }
});

const uploadEvidence = multer({
    storage: evidenceStorage,
    fileFilter: imageFilter,
    limits: { fileSize: 15 * 1024 * 1024 } // 15MB untuk bukti
});

const uploadTask = multer({
    storage: taskStorage
    // Tanpa batasan ukuran dan tipe file
});

const uploadProfile = multer({
    storage: profileStorage,
    fileFilter: imageFilter,
    limits: { fileSize: 25 * 1024 * 1024 } // 25MB untuk foto profil
});

const uploadMaterial = multer({
    storage: materialStorage
    // Tanpa batasan ukuran dan tipe file untuk slide / modul PDF
});

module.exports = { uploadEvidence, uploadTask, uploadProfile, uploadMaterial };
