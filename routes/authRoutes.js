// routes/authRoutes.js

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Route untuk pendaftaran UMKM baru
router.post('/register', authController.registerUmkm);

// Route untuk login UMKM
router.post('/login', authController.loginUmkm);

// Route untuk verifikasi email
router.get('/verify-email', authController.verifyEmail);

// Route untuk mengirim ulang email verifikasi
router.post('/resend-verification', authController.resendVerificationEmail);

// Route untuk permintaan lupa kata sandi
router.post('/forgot-password', authController.forgotPassword);

// Route untuk mereset kata sandi
router.post('/reset-password', authController.resetPassword);

module.exports = router;
