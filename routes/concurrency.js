const express = require('express');
const router = express.Router();
const { reserveItem } = require('../controllers/v1/concurrencyController');

// POST /api/v1/concurrency/reserve
router.post('/reserve', reserveItem);

module.exports = router;