const express = require('express');
const router = express.Router();
const publicController = require('../controllers/publicController'); // Masih menggunakan publicController

// Route untuk mengirimkan feedback produk
router.post('/:productId', publicController.submitProductFeedback);

// Route untuk mendapatkan feedback produk
router.get('/:productId', publicController.getProductFeedback);

module.exports = router;
