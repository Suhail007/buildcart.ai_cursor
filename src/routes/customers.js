const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');

// Placeholder for customer routes
router.get('/', authenticate, (req, res) => {
  res.json({
    success: true,
    message: 'Customers endpoint - to be implemented'
  });
});

module.exports = router; 