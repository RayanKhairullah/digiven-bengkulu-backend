const express = require('express');
const router = express.Router();
const umkmController = require('../controllers/umkmController');
const authenticateToken = require('../authMiddleware'); // Middleware untuk rute terproteksi

// Route untuk mendapatkan profil UMKM yang sedang login
router.get('/profile', authenticateToken, umkmController.getUmkmProfile);

// Route untuk menambah produk baru
router.post('/products', authenticateToken, umkmController.addProduct);

// Route untuk mendapatkan semua produk dari UMKM yang sedang login
router.get('/products', authenticateToken, umkmController.getUmkmProducts);

// Route untuk mengupdate produk berdasarkan ID
router.put('/products/:id', authenticateToken, umkmController.updateProduct);

// Route untuk menghapus produk berdasarkan ID
router.delete('/products/:id', authenticateToken, umkmController.deleteProduct);

module.exports = router;
