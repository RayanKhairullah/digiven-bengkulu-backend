const express = require('express');
const router = express.Router();
const publicController = require('../controllers/publicController');
const { generalAuthLimiter } = require('../Middlewares/limiter');

// Route untuk mendapatkan SEMUA tokoh UMKMS dan detail umkm by username
router.get('/', generalAuthLimiter, publicController.getAllUmkms);
router.get('/:username', generalAuthLimiter, publicController.getUmkmStoreByUsername);

module.exports = router;