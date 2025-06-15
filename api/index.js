require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const app = express();

// ===========================================
// MIDDLEWARE GLOBAL
// ===========================================
app.use(cors({
    origin: process.env.FRONTEND_URL,
    credentials: true // mengirim/menerima cookie
}));
app.use(express.json());
app.use(cookieParser());

// ===========================================
// IMPOR DAN GUNAKAN ROUTE
// ===========================================
const authRoutes = require('./routes/authRoutes');
const umkmRoutes = require('./routes/umkmRoutes');
const productPublicRoutes = require('./routes/productPublicRoutes'); 
const umkmPublicRoutes = require('./routes/umkmPublicRoutes');
const feedbackRoutes = require('./routes/feedbackRoutes'); 

// Route dasar
app.get('/', (req, res) => {
    res.send('API Backend UMKM Bengkulu Berjalan! Kunjungi /api/v1/auth, /api/v1/umkm, atau /api/v1/public');
});

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/umkm', umkmRoutes);
app.use('/api/v1/public/products', productPublicRoutes);
app.use('/api/v1/public/umkms', umkmPublicRoutes);
app.use('/api/v1/public/feedback', feedbackRoutes);

// ===========================================
// PENANGANAN ERROR GLOBAL (Middleware)
// ===========================================
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(err.statusCode).json({
        error: err.message || 'Terjadi kesalahan internal server.'
    });
});

// ===========================================
// EKSPOR APP UNTUK VERCEL
// ===========================================
module.exports = app;