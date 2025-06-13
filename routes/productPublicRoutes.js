const express = require('express');
const router = express.Router();
const publicController = require('../controllers/publicController');

// Route untuk mendapatkan SEMUA PRODUK dari SEMUA UMKM
// Endpoint: /api/v1/public/products
router.get('/', publicController.getAllProducts);

// Route untuk mendapatkan DETAIL SATU PRODUK berdasarkan ID
// Endpoint: /api/v1/public/products/:productId
router.get('/:productId', publicController.getSingleProductDetail);

module.exports = router;
