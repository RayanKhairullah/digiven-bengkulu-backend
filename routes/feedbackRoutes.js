const express = require('express');
const router = express.Router();
const publicController = require('../controllers/publicController');
const { feedbackLimiter, generalAuthLimiter } = require('../Middlewares/limiter');


router.post('/:productId', feedbackLimiter, publicController.submitProductFeedback);
router.delete('/:feedbackId', publicController.deleteProductFeedback);

// Mendapatkan feedback untuk produk tertentu
router.get('/:productId', generalAuthLimiter, publicController.getProductFeedback);

module.exports = router;
