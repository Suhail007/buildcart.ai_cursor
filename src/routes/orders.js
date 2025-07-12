const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');

// Placeholder for order routes
router.get('/', authenticate, (req, res) => {
  res.json({
    success: true,
    message: 'Orders endpoint - to be implemented'
  });
});

module.exports = router; 