const express = require('express');
const router = express.Router();
const umkmController = require('../controllers/umkmController');
const authenticateToken = require('../authMiddleware');

// Route untuk mendapatkan profil UMKM yang sedang login
router.get('/profile', authenticateToken, umkmController.getUmkmProfile);

// Route baru untuk mengupdate profil UMKM
router.put('/profile', authenticateToken, umkmController.updateUmkmProfile);

// Route untuk menambah produk baru
router.post('/products', authenticateToken, umkmController.addProduct);

// Route untuk mendapatkan semua produk dari UMKM yang sedang login
router.get('/products', authenticateToken, umkmController.getUmkmProducts);

// Route untuk mendapatkan detail satu produk UMKM tertentu
router.get('/products/:productId', authenticateToken, umkmController.getUmkmProductDetail);

// Route untuk mengupdate produk berdasarkan ID
router.put('/products/:productId', authenticateToken, umkmController.updateProduct);

// Route untuk menghapus produk berdasarkan ID
router.delete('/products/:productId', authenticateToken, umkmController.deleteProduct);

// Endpoint: /api/v1/public/umkms/:username/feedback
router.get('/feedback/:username',authenticateToken, umkmController.getAllFeedbackByUmkmUsername);

// Route untuk memperbarui kata sandi user yang sedang login
router.put('/update-password', authenticateToken, umkmController.updatePassword);

module.exports = router;