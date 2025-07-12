const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');

// Placeholder for billing routes
router.get('/', authenticate, (req, res) => {
  res.json({
    success: true,
    message: 'Billing endpoint - to be implemented'
  });
});

module.exports = router; 