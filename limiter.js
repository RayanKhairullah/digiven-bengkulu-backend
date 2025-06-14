const rateLimit = require('express-rate-limit');

// 10 request per 10 menit per IP
const feedbackLimiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 menit
    max: 10,
    message: 'Terlalu banyak feedback dari IP ini, coba lagi nanti.'
});

module.exports = { feedbackLimiter };
