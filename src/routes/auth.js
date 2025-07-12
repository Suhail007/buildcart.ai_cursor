const express = require('express');
const router = express.Router();
const { validate, authSchemas } = require('../middleware/validation');
const { authenticate, requireEmailVerification } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const authController = require('../controllers/authController');
const Joi = require('joi');

// Public routes
router.post('/register', 
  validate(authSchemas.register), 
  authController.register
);

router.post('/login', 
  validate(authSchemas.login), 
  authController.login
);

router.post('/forgot-password', 
  validate(authSchemas.forgotPassword), 
  authController.forgotPassword
);

router.post('/reset-password', 
  validate(authSchemas.resetPassword), 
  authController.resetPassword
);

router.post('/verify-email', 
  validate(authSchemas.verifyEmail), 
  authController.verifyEmail
);

router.post('/resend-verification', 
  validate(authSchemas.forgotPassword), // Uses same schema as forgot password
  authController.resendVerification
);

router.post('/refresh', 
  validate(authSchemas.refreshToken), 
  authController.refreshToken
);

// Protected routes
router.post('/logout', 
  authenticate, 
  authController.logout
);

router.get('/me', 
  authenticate, 
  authController.getMe
);

router.post('/change-password', 
  authenticate, 
  requireEmailVerification,
  validate(Joi.object({
    currentPassword: Joi.string().required(),
    newPassword: authSchemas.register.extract('password'),
    confirmPassword: Joi.string().valid(Joi.ref('newPassword')).required()
      .messages({
        'any.only': 'Passwords do not match'
      })
  })), 
  authController.changePassword
);

router.put('/profile', 
  authenticate, 
  requireEmailVerification,
  validate(Joi.object({
    name: Joi.string().min(2).max(100).optional(),
    avatar: Joi.string().uri().optional()
  })), 
  authController.updateProfile
);

router.delete('/account', 
  authenticate, 
  requireEmailVerification,
  validate(Joi.object({
    password: Joi.string().required()
  })), 
  authController.deleteAccount
);

module.exports = router; 