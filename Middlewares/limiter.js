const rateLimit = require('express-rate-limit');

// Konfigurasi Rate Limiter untuk feedback (10 permintaan per 10 menit per IP)
const feedbackLimiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 menit
    max: 10,
    message: 'Terlalu banyak feedback dari IP ini, coba lagi nanti.',
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Konfigurasi Rate Limiter untuk endpoint otentikasi umum (50 permintaan per 15 menit per IP)
const generalAuthLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 menit
    max: 50, // Batasi setiap IP menjadi 50 permintaan per windowMs
    message: 'Terlalu banyak permintaan dari IP ini, silakan coba lagi setelah 15 menit.',
    standardHeaders: true,
    legacyHeaders: false,
});

// Konfigurasi Rate Limiter untuk login dan pendaftaran yang lebih ketat (5 percobaan per 15 menit per IP)
const strictAuthLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 menit
    max: 5, // Batasi setiap IP menjadi 5 permintaan per windowMs
    message: 'Terlalu banyak percobaan, silakan coba lagi setelah 15 menit.',
    standardHeaders: true,
    legacyHeaders: false,
});

module.exports = { 
    feedbackLimiter,
    generalAuthLimiter,
    strictAuthLimiter
};
