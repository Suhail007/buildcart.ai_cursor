const express = require('express');
const router = express.Router();
const { validate } = require('../middleware/validation');
const { authenticate, verifyStoreOwnership } = require('../middleware/auth');
const deploymentController = require('../controllers/deploymentController');
const Joi = require('joi');

// All routes require authentication
router.use(authenticate);

// Deploy store
router.post('/stores/:storeId/deploy',
  verifyStoreOwnership,
  validate(Joi.object({
    environment: Joi.string().valid('production', 'staging').default('production'),
    customDomain: Joi.string().domain().optional(),
    sslEnabled: Joi.boolean().default(true)
  })),
  deploymentController.deployStore
);

// Get deployment status
router.get('/deployments/:deploymentId',
  deploymentController.getDeploymentStatus
);

// Get deployment logs
router.get('/deployments/:deploymentId/logs',
  deploymentController.getDeploymentLogs
);

// Get store deployments
router.get('/stores/:storeId/deployments',
  verifyStoreOwnership,
  validate(Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10)
  }), 'query'),
  deploymentController.getStoreDeployments
);

// Rollback deployment
router.post('/stores/:storeId/rollback',
  verifyStoreOwnership,
  validate(Joi.object({
    version: Joi.string().required()
  })),
  deploymentController.rollbackDeployment
);

// Setup custom domain
router.post('/stores/:storeId/domain',
  verifyStoreOwnership,
  validate(Joi.object({
    domain: Joi.string().domain().required()
  })),
  deploymentController.setupCustomDomain
);

// Enable SSL
router.post('/stores/:storeId/ssl',
  verifyStoreOwnership,
  validate(Joi.object({
    domain: Joi.string().domain().required()
  })),
  deploymentController.enableSSL
);

// Get deployment analytics
router.get('/stores/:storeId/deployment-analytics',
  verifyStoreOwnership,
  validate(Joi.object({
    startDate: Joi.date().optional(),
    endDate: Joi.date().optional()
  }), 'query'),
  deploymentController.getDeploymentAnalytics
);

// Delete deployment
router.delete('/deployments/:deploymentId',
  deploymentController.deleteDeployment
);

// Get deployment configuration
router.get('/stores/:storeId/deployment-config',
  verifyStoreOwnership,
  deploymentController.getDeploymentConfig
);

module.exports = router; 