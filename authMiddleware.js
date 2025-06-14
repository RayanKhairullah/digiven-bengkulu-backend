const jwt = require('jsonwebtoken');

// Pastikan JWT_SECRET diambil dari environment variables yang sama dengan index.js
const jwtSecret = process.env.JWT_SECRET;

/**
 * Middleware untuk mengautentikasi token JWT dari header Authorization.
 * Memverifikasi token dan melampirkan payload pengguna ke objek request (req.user).
 */
const authenticateToken = (req, res, next) => {
    // Ambil header Authorization
    const authHeader = req.headers['authorization'];
    // Format: "Bearer TOKEN"
    const token = authHeader && authHeader.split(' ')[1];

    // Jika tidak ada token
    if (!token) {
        return res.status(401).json({ error: 'Akses Ditolak: Tidak ada token disediakan.' });
    }

    // Verifikasi token
    jwt.verify(token, jwtSecret, (err, user) => {
        // Jika token tidak valid
        if (err) {
            // console.error("Token verification error:", err); // Untuk debugging
            return res.status(403).json({ error: 'Akses Ditolak: Token tidak valid.' });
        }
        // Token valid, lampirkan payload user ke objek request
        // Payload user berisi { userId: user.id, email: user.email } seperti saat sign()
        req.user = user;
        next(); // Lanjutkan ke handler route berikutnya
    });
};

module.exports = authenticateToken;
