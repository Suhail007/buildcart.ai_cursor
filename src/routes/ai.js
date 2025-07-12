const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');

// Placeholder for AI routes
router.post('/generate-store', authenticate, (req, res) => {
  res.json({
    success: true,
    message: 'AI store generation endpoint - to be implemented'
  });
});

module.exports = router; 