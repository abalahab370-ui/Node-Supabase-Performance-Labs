const express = require('express');
const router = express.Router();
const searchPosts = require('../controllers/v1/searchFeedController');

// exemple : GET /api/v1/search?q=postgres&limit=10&offset=0
router.get('/', searchPosts);

module.exports = router;