const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const { AuthenticationError, AuthorizationError } = require('./errorHandler');

const prisma = new PrismaClient();

// JWT token verification
const verifyToken = (token, secret) => {
  try {
    return jwt.verify(token, secret);
  } catch (error) {
    throw new AuthenticationError('Invalid or expired token');
  }
};

// Main authentication middleware
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AuthenticationError('Access token required');
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    const decoded = verifyToken(token, process.env.JWT_SECRET);

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        emailVerified: true,
        subscriptionStatus: true,
        lastLoginAt: true
      }
    });

    if (!user) {
      throw new AuthenticationError('User not found');
    }

    // Check if user is active
    if (!user.emailVerified) {
      throw new AuthenticationError('Email not verified. Please verify your email first.');
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

// Optional authentication middleware (doesn't throw error if no token)
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(); // Continue without user
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token, process.env.JWT_SECRET);

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

    if (user && user.emailVerified) {
      req.user = user;
    }
    
    next();
  } catch (error) {
    // Continue without user if token is invalid
    next();
  }
};

// Role-based authorization middleware
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AuthenticationError('Authentication required'));
    }

    if (!roles.includes(req.user.role)) {
      return next(new AuthorizationError('Insufficient permissions'));
    }

    next();
  };
};

// Store ownership verification
const verifyStoreOwnership = async (req, res, next) => {
  try {
    const storeId = req.params.storeId || req.params.id || req.body.storeId;
    
    if (!storeId) {
      return next(new Error('Store ID is required'));
    }

    const store = await prisma.store.findUnique({
      where: { id: storeId },
      select: { userId: true, name: true }
    });

    if (!store) {
      return next(new Error('Store not found'));
    }

    // Allow admin access to all stores
    if (req.user.role === 'ADMIN' || req.user.role === 'SUPER_ADMIN') {
      req.store = store;
      return next();
    }

    // Check if user owns the store
    if (store.userId !== req.user.id) {
      return next(new AuthorizationError('Access denied to this store'));
    }

    req.store = store;
    next();
  } catch (error) {
    next(error);
  }
};

// Subscription check middleware
const requireSubscription = (requiredPlan = 'FREE') => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AuthenticationError('Authentication required'));
    }

    const subscriptionLevels = {
      'FREE': 0,
      'BASIC': 1,
      'PROFESSIONAL': 2,
      'ENTERPRISE': 3
    };

    const userLevel = subscriptionLevels[req.user.subscriptionStatus] || 0;
    const requiredLevel = subscriptionLevels[requiredPlan] || 0;

    if (userLevel < requiredLevel) {
      return next(new AuthorizationError(`This feature requires a ${requiredPlan} subscription or higher`));
    }

    next();
  };
};

// API key authentication middleware
const authenticateApiKey = async (req, res, next) => {
  try {
    const apiKey = req.headers['x-api-key'] || req.headers['authorization'];
    
    if (!apiKey) {
      throw new AuthenticationError('API key required');
    }

    // Remove 'Bearer ' prefix if present
    const key = apiKey.startsWith('Bearer ') ? apiKey.substring(7) : apiKey;

    // Here you would typically validate against stored API keys
    // For now, we'll use a simple check against environment variable
    if (key !== process.env.API_KEY) {
      throw new AuthenticationError('Invalid API key');
    }

    // Set API user context
    req.isApiRequest = true;
    next();
  } catch (error) {
    next(error);
  }
};

// Rate limiting for authenticated users
const authRateLimit = (windowMs = 15 * 60 * 1000, max = 100) => {
  const rateLimit = require('express-rate-limit');
  
  return rateLimit({
    windowMs,
    max,
    message: {
      error: 'Too many requests from this user, please try again later.',
      statusCode: 429
    },
    keyGenerator: (req) => {
      return req.user ? req.user.id : req.ip;
    },
    skip: (req) => {
      // Skip rate limiting for admin users
      return req.user && (req.user.role === 'ADMIN' || req.user.role === 'SUPER_ADMIN');
    }
  });
};

// AI endpoint rate limiting (more restrictive)
const aiRateLimit = (windowMs = 60 * 1000, max = 10) => {
  const rateLimit = require('express-rate-limit');
  
  return rateLimit({
    windowMs,
    max,
    message: {
      error: 'AI rate limit exceeded. Please try again later.',
      statusCode: 429
    },
    keyGenerator: (req) => {
      return req.user ? req.user.id : req.ip;
    },
    skip: (req) => {
      // Skip rate limiting for admin users
      return req.user && (req.user.role === 'ADMIN' || req.user.role === 'SUPER_ADMIN');
    }
  });
};

// Refresh token verification
const verifyRefreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      throw new AuthenticationError('Refresh token required');
    }

    const decoded = verifyToken(refreshToken, process.env.JWT_REFRESH_SECRET);
    
    // Get user from database
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

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

// Email verification check
const requireEmailVerification = (req, res, next) => {
  if (!req.user) {
    return next(new AuthenticationError('Authentication required'));
  }

  if (!req.user.emailVerified) {
    return next(new AuthenticationError('Email verification required'));
  }

  next();
};

module.exports = {
  authenticate,
  optionalAuth,
  authorize,
  verifyStoreOwnership,
  requireSubscription,
  authenticateApiKey,
  authRateLimit,
  aiRateLimit,
  verifyRefreshToken,
  requireEmailVerification
}; 