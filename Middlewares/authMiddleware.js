const jwt = require('jsonwebtoken');
const jwtSecret = process.env.JWT_SECRET;

/**
 * Middleware untuk mengautentikasi token JWT dari header Authorization.
 * Memverifikasi token dan melampirkan payload pengguna ke objek request (req.user).
 */
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Akses Ditolak: Tidak ada token disediakan.' });
    }

    jwt.verify(token, jwtSecret, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Akses Ditolak: Token tidak valid.' });
        }
        // Token valid, lampirkan payload user ke objek request
        // Payload user berisi { userId: user.id, email: user.email } seperti saat sign()
        req.user = user;
        next(); // Lanjutkan ke handler route berikutnya
    });
};

module.exports = authenticateToken;
