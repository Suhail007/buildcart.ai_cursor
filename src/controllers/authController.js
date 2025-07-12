const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');
const { 
  AuthenticationError, 
  ValidationError, 
  ConflictError,
  NotFoundError 
} = require('../middleware/errorHandler');
const { asyncHandler } = require('../middleware/errorHandler');
const emailService = require('../services/emailService');
const logger = require('../utils/logger');

const prisma = new PrismaClient();

// Generate JWT tokens
const generateTokens = (userId) => {
  const accessToken = jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

  const refreshToken = jwt.sign(
    { userId },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d' }
  );

  return { accessToken, refreshToken };
};

// Generate verification/reset tokens
const generateToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

// Register new user
const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: email.toLowerCase() }
  });

  if (existingUser) {
    throw new ConflictError('User with this email already exists');
  }

  // Hash password
  const saltRounds = 12;
  const hashedPassword = await bcrypt.hash(password, saltRounds);

  // Generate email verification token
  const emailVerifyToken = generateToken();

  // Create user
  const user = await prisma.user.create({
    data: {
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      emailVerifyToken,
      role: 'USER',
      subscriptionStatus: 'FREE'
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      emailVerified: true,
      subscriptionStatus: true,
      createdAt: true
    }
  });

  // Send verification email
  try {
    await emailService.sendEmailVerification(user, emailVerifyToken);
  } catch (error) {
    logger.error('Failed to send verification email:', error);
    // Don't fail registration if email fails
  }

  // Generate tokens
  const { accessToken, refreshToken } = generateTokens(user.id);

  // Update last login
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() }
  });

  logger.info(`New user registered: ${user.email}`);

  res.status(201).json({
    success: true,
    message: 'User registered successfully. Please check your email to verify your account.',
    data: {
      user,
      tokens: {
        accessToken,
        refreshToken
      }
    }
  });
});

// Login user
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Find user
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() }
  });

  if (!user) {
    throw new AuthenticationError('Invalid email or password');
  }

  // Check password
  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    throw new AuthenticationError('Invalid email or password');
  }

  // Check if email is verified
  if (!user.emailVerified) {
    throw new AuthenticationError('Please verify your email before logging in');
  }

  // Generate tokens
  const { accessToken, refreshToken } = generateTokens(user.id);

  // Update last login
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() }
  });

  logger.info(`User logged in: ${user.email}`);

  res.json({
    success: true,
    message: 'Login successful',
    data: {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        emailVerified: user.emailVerified,
        subscriptionStatus: user.subscriptionStatus
      },
      tokens: {
        accessToken,
        refreshToken
      }
    }
  });
});

// Logout user
const logout = asyncHandler(async (req, res) => {
  // In a more advanced implementation, you might want to blacklist the token
  // For now, we'll just return a success response
  // The client should remove the token from storage

  logger.info(`User logged out: ${req.user.email}`);

  res.json({
    success: true,
    message: 'Logout successful'
  });
});

// Get current user
const getMe = asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      avatar: true,
      role: true,
      emailVerified: true,
      subscriptionStatus: true,
      createdAt: true,
      lastLoginAt: true
    }
  });

  res.json({
    success: true,
    data: { user }
  });
});

// Forgot password
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() }
  });

  if (!user) {
    // Don't reveal if user exists or not for security
    return res.json({
      success: true,
      message: 'If an account with that email exists, a password reset link has been sent.'
    });
  }

  // Generate reset token
  const resetToken = generateToken();
  const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  // Save reset token
  await prisma.user.update({
    where: { id: user.id },
    data: {
      resetToken,
      resetTokenExpiry
    }
  });

  // Send reset email
  try {
    await emailService.sendPasswordResetEmail(user, resetToken);
    logger.info(`Password reset email sent to: ${user.email}`);
  } catch (error) {
    logger.error('Failed to send password reset email:', error);
    throw new Error('Failed to send password reset email');
  }

  res.json({
    success: true,
    message: 'If an account with that email exists, a password reset link has been sent.'
  });
});

// Reset password
const resetPassword = asyncHandler(async (req, res) => {
  const { token, password } = req.body;

  // Find user with valid reset token
  const user = await prisma.user.findFirst({
    where: {
      resetToken: token,
      resetTokenExpiry: {
        gt: new Date()
      }
    }
  });

  if (!user) {
    throw new ValidationError('Invalid or expired reset token');
  }

  // Hash new password
  const saltRounds = 12;
  const hashedPassword = await bcrypt.hash(password, saltRounds);

  // Update user password and clear reset token
  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: hashedPassword,
      resetToken: null,
      resetTokenExpiry: null
    }
  });

  logger.info(`Password reset successful for: ${user.email}`);

  res.json({
    success: true,
    message: 'Password reset successful. You can now login with your new password.'
  });
});

// Verify email
const verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.body;

  const user = await prisma.user.findFirst({
    where: {
      emailVerifyToken: token
    }
  });

  if (!user) {
    throw new ValidationError('Invalid verification token');
  }

  // Update user
  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerified: true,
      emailVerifyToken: null
    }
  });

  logger.info(`Email verified for: ${user.email}`);

  res.json({
    success: true,
    message: 'Email verified successfully. You can now login to your account.'
  });
});

// Resend verification email
const resendVerification = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() }
  });

  if (!user) {
    throw new NotFoundError('User not found');
  }

  if (user.emailVerified) {
    throw new ValidationError('Email is already verified');
  }

  // Generate new verification token
  const emailVerifyToken = generateToken();

  // Update user
  await prisma.user.update({
    where: { id: user.id },
    data: { emailVerifyToken }
  });

  // Send verification email
  try {
    await emailService.sendEmailVerification(user, emailVerifyToken);
    logger.info(`Verification email resent to: ${user.email}`);
  } catch (error) {
    logger.error('Failed to send verification email:', error);
    throw new Error('Failed to send verification email');
  }

  res.json({
    success: true,
    message: 'Verification email sent successfully'
  });
});

// Refresh token
const refreshToken = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    throw new AuthenticationError('Refresh token required');
  }

  // Verify refresh token
  const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

  // Get user
  const user = await prisma.user.findUnique({
    where: { id: decoded.userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      emailVerified: true,
      subscriptionStatus: true
    }
  });

  if (!user) {
    throw new AuthenticationError('User not found');
  }

  if (!user.emailVerified) {
    throw new AuthenticationError('Email not verified');
  }

  // Generate new tokens
  const tokens = generateTokens(user.id);

  logger.info(`Token refreshed for: ${user.email}`);

  res.json({
    success: true,
    data: {
      user,
      tokens
    }
  });
});

// Change password
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  // Get user with password
  const user = await prisma.user.findUnique({
    where: { id: req.user.id }
  });

  // Verify current password
  const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
  if (!isCurrentPasswordValid) {
    throw new AuthenticationError('Current password is incorrect');
  }

  // Hash new password
  const saltRounds = 12;
  const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

  // Update password
  await prisma.user.update({
    where: { id: user.id },
    data: { password: hashedPassword }
  });

  logger.info(`Password changed for: ${user.email}`);

  res.json({
    success: true,
    message: 'Password changed successfully'
  });
});

// Update profile
const updateProfile = asyncHandler(async (req, res) => {
  const { name, avatar } = req.body;

  const updatedUser = await prisma.user.update({
    where: { id: req.user.id },
    data: {
      name: name || undefined,
      avatar: avatar || undefined
    },
    select: {
      id: true,
      name: true,
      email: true,
      avatar: true,
      role: true,
      emailVerified: true,
      subscriptionStatus: true,
      createdAt: true,
      lastLoginAt: true
    }
  });

  logger.info(`Profile updated for: ${updatedUser.email}`);

  res.json({
    success: true,
    message: 'Profile updated successfully',
    data: { user: updatedUser }
  });
});

// Delete account
const deleteAccount = asyncHandler(async (req, res) => {
  const { password } = req.body;

  // Get user with password
  const user = await prisma.user.findUnique({
    where: { id: req.user.id }
  });

  // Verify password
  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    throw new AuthenticationError('Password is incorrect');
  }

  // Delete user (this will cascade to related data due to Prisma schema)
  await prisma.user.delete({
    where: { id: req.user.id }
  });

  logger.info(`Account deleted for: ${user.email}`);

  res.json({
    success: true,
    message: 'Account deleted successfully'
  });
});

module.exports = {
  register,
  login,
  logout,
  getMe,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerification,
  refreshToken,
  changePassword,
  updateProfile,
  deleteAccount
}; 