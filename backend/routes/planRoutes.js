const express = require('express');
const router = express.Router();
const memberController = require('../controllers/memberController');
const { protect } = require('../middleware/auth');

router.get('/', protect, memberController.getActivePlans);

module.exports = router;
