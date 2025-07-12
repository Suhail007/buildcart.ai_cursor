const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');

// Placeholder for store routes
router.get('/', authenticate, (req, res) => {
  res.json({
    success: true,
    message: 'Stores endpoint - to be implemented'
  });
});

module.exports = router; 