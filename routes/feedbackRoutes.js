const express = require('express');
const router = express.Router();
const publicController = require('../controllers/publicController');
const { feedbackLimiter } = require('../limiter');

// Lindungi POST route pakai limiter
router.post('/:productId', feedbackLimiter, publicController.submitProductFeedback);

router.get('/:productId', publicController.getProductFeedback);

module.exports = router;
