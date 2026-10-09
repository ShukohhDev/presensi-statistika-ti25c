const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'presensi-statistika-ti25c-secret-key-2026';

function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Akses ditolak. Token tidak ditemukan.' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(403).json({ error: 'Token tidak valid atau sudah kadaluarsa.' });
    }
}

function requireAdmin(req, res, next) {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Akses ditolak. Hanya admin yang bisa mengakses.' });
    }
    next();
}

function generateToken(user) {
    return jwt.sign(
        { id: user.id, name: user.name, role: user.role },
        JWT_SECRET,
        { expiresIn: '24h' }
    );
}

module.exports = { authenticateToken, requireAdmin, generateToken, JWT_SECRET };
