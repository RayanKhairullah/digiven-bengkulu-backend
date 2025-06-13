const express = require('express');
const router = express.Router();
const publicController = require('../controllers/publicController');

// Endpoint: /api/v1/public/umkms
router.get('/', publicController.getAllUmkms);

// Route untuk mendapatkan detail toko UMKM dan daftar produknya berdasarkan username
// Endpoint: /api/v1/public/umkms/:username
router.get('/:username', publicController.getUmkmStoreByUsername);

module.exports = router;