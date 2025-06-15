const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { generalAuthLimiter, strictAuthLimiter } = require('../Middlewares/limiter');

// Route untuk auth UMKM baru with strictAuthLimiter
router.post('/register', strictAuthLimiter, authController.registerUmkm);
router.get('/verify-email', generalAuthLimiter, authController.verifyEmail);
router.post('/resend-verification', strictAuthLimiter, authController.resendVerificationEmail);

router.post('/login', strictAuthLimiter, authController.loginUmkm);
router.post('/forgot-password', strictAuthLimiter, authController.forgotPassword);
router.post('/reset-password', generalAuthLimiter, authController.resetPassword);

module.exports = router;
