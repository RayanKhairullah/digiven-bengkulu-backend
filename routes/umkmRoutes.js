const express = require('express');
const router = express.Router();
const umkmController = require('../controllers/umkmController');
const authenticateToken = require('../Middlewares/authMiddleware');
const { generalAuthLimiter, strictAuthLimiter } = require('../Middlewares/limiter');

// Route untuk get, put profil UMKM dan update password
router.get('/profile', authenticateToken, umkmController.getUmkmProfile);
router.put('/profile', authenticateToken, generalAuthLimiter, umkmController.updateUmkmProfile);
router.put('/update-password', authenticateToken, strictAuthLimiter, umkmController.updatePassword);

// Route untuk crud produk UMKM
router.post('/products', authenticateToken, generalAuthLimiter, umkmController.addProduct);
router.get('/products', authenticateToken, umkmController.getUmkmProducts);
router.put('/products/:productId', authenticateToken, generalAuthLimiter, umkmController.updateProduct);
router.delete('/products/:productId', authenticateToken, generalAuthLimiter, umkmController.deleteProduct);

// Route untuk mendapatkan detail satu produk UMKM tertentu
router.get('/products/:productId', authenticateToken, umkmController.getUmkmProductDetail);

// Route untuk mendapatkan seluruh feedback produk berdasarkan username UMKM
router.get('/feedback/:username', authenticateToken, generalAuthLimiter, umkmController.getAllFeedbackByUmkmUsername);

module.exports = router;