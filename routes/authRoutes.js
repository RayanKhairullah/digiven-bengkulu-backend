const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Route untuk pendaftaran UMKM baru
router.post('/register', authController.registerUmkm);

// Route untuk login UMKM
router.post('/login', authController.loginUmkm);

module.exports = router;
