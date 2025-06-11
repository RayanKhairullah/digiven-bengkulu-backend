const express = require('express');
const router = express.Router();
const publicController = require('../controllers/publicController'); // Masih menggunakan publicController

// Route untuk mendapatkan semua UMKM (untuk landing page)
router.get('/', publicController.getAllUmkms);

// Route untuk mendapatkan detail toko UMKM dan produknya berdasarkan username
router.get('/:username', publicController.getUmkmStoreByUsername);

module.exports = router;
