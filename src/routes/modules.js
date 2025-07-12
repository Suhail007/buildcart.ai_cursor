const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');

// Placeholder for module routes
router.get('/', authenticate, (req, res) => {
  res.json({
    success: true,
    message: 'Modules endpoint - to be implemented'
  });
});

module.exports = router; 