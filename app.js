require('dotenv').config(); // Muat variabel lingkungan dari file .env
const express = require('express');
const cors = require('cors'); // Untuk Cross-Origin Resource Sharing

const app = express();

// ===========================================
// MIDDLEWARE GLOBAL
// ===========================================
app.use(cors()); // Aktifkan CORS untuk semua origin (sesuaikan untuk produksi dengan origin spesifik)
app.use(express.json()); // Parsing body request sebagai JSON

// ===========================================
// IMPOR DAN GUNAKAN ROUTE
// ===========================================
const authRoutes = require('./routes/authRoutes');
const umkmRoutes = require('./routes/umkmRoutes');
const umkmPublicRoutes = require('./routes/umkmPublicRoutes');
const feedbackRoutes = require('./routes/feedbackRoutes'); 

// Route dasar
app.get('/', (req, res) => {
    res.send('API Backend UMKM Bengkulu Berjalan! Kunjungi /api/v1/auth, /api/v1/umkm, atau /api/v1/public');
});

// Gunakan route yang telah dipisah
app.use('/api/v1/auth', authRoutes); // Misalnya: /api/v1/auth/register, /api/v1/auth/login
app.use('/api/v1/umkm', umkmRoutes); // Misalnya: /api/v1/umkm/profile, /api/v1/umkm/products
app.use('/api/v1/public/umkms', umkmPublicRoutes); // Misalnya: /api/v1/public/umkms, /api/v1/public/umkms/:username
app.use('/api/v1/public/feedback', feedbackRoutes); // Misalnya: /api/v1/public/feedback/:productId

// ===========================================
// MULAI SERVER
// ===========================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server Express.js berjalan di port ${PORT}`);
    console.log(`URL Supabase: ${process.env.SUPABASE_URL}`);
});
