const express = require('express');
const router = express.Router();
const publicController = require('../controllers/publicController');
const { generalAuthLimiter } = require('../Middlewares/limiter');

// Route untuk mendapatkan SEMUA PRODUK dari SEMUA UMKM dan detail product by id
router.get('/', generalAuthLimiter, publicController.getAllProducts);
router.get('/:productId', generalAuthLimiter, publicController.getSingleProductDetail);

module.exports = router;
