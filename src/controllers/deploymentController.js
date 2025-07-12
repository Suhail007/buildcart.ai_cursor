const { PrismaClient } = require('@prisma/client');
const { asyncHandler } = require('../middleware/errorHandler');
const { NotFoundError, ValidationError } = require('../middleware/errorHandler');
const deploymentService = require('../services/deploymentService');
const logger = require('../utils/logger');

const prisma = new PrismaClient();

// Deploy store
const deployStore = asyncHandler(async (req, res) => {
  const { storeId } = req.params;
  const { environment, customDomain, sslEnabled } = req.body;

  // Verify store ownership
  const store = await prisma.store.findUnique({
    where: { id: storeId },
    include: { user: true }
  });

  if (!store) {
    throw new NotFoundError('Store not found');
  }

  if (store.userId !== req.user.id && req.user.role !== 'ADMIN') {
    throw new ValidationError('Access denied to this store');
  }

  // Deploy store
  const result = await deploymentService.deployStore(storeId, environment);

  // Setup custom domain if provided
  if (customDomain) {
    try {
      await deploymentService.setupCustomDomain(storeId, customDomain);
      
      // Enable SSL if requested
      if (sslEnabled) {
        await deploymentService.enableSSL(customDomain);
      }
    } catch (error) {
      logger.error('Failed to setup custom domain:', error);
      // Don't fail deployment if domain setup fails
    }
  }

  res.json({
    success: true,
    message: 'Store deployed successfully',
    data: {
      deployment: result.deployment,
      url: result.url,
      buildPath: result.buildPath
    }
  });
});

// Get deployment status
const getDeploymentStatus = asyncHandler(async (req, res) => {
  const { deploymentId } = req.params;

  const deployment = await prisma.deployment.findUnique({
    where: { id: deploymentId },
    include: { store: true }
  });

  if (!deployment) {
    throw new NotFoundError('Deployment not found');
  }

  // Check access
  if (deployment.store.userId !== req.user.id && req.user.role !== 'ADMIN') {
    throw new ValidationError('Access denied to this deployment');
  }

  res.json({
    success: true,
    data: { deployment }
  });
});

// Get deployment logs
const getDeploymentLogs = asyncHandler(async (req, res) => {
  const { deploymentId } = req.params;

  const deployment = await prisma.deployment.findUnique({
    where: { id: deploymentId },
    include: { store: true }
  });

  if (!deployment) {
    throw new NotFoundError('Deployment not found');
  }

  // Check access
  if (deployment.store.userId !== req.user.id && req.user.role !== 'ADMIN') {
    throw new ValidationError('Access denied to this deployment');
  }

  res.json({
    success: true,
    data: {
      logs: deployment.buildLogs,
      status: deployment.status,
      deployedAt: deployment.deployedAt
    }
  });
});

// Get store deployments
const getStoreDeployments = asyncHandler(async (req, res) => {
  const { storeId } = req.params;
  const { page = 1, limit = 10 } = req.query;

  // Verify store ownership
  const store = await prisma.store.findUnique({
    where: { id: storeId }
  });

  if (!store) {
    throw new NotFoundError('Store not found');
  }

  if (store.userId !== req.user.id && req.user.role !== 'ADMIN') {
    throw new ValidationError('Access denied to this store');
  }

  // Get deployments with pagination
  const skip = (page - 1) * limit;
  
  const [deployments, total] = await Promise.all([
    prisma.deployment.findMany({
      where: { storeId },
      orderBy: { createdAt: 'desc' },
      skip: parseInt(skip),
      take: parseInt(limit)
    }),
    prisma.deployment.count({
      where: { storeId }
    })
  ]);

  res.json({
    success: true,
    data: {
      deployments,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    }
  });
});

// Rollback deployment
const rollbackDeployment = asyncHandler(async (req, res) => {
  const { storeId } = req.params;
  const { version } = req.body;

  // Verify store ownership
  const store = await prisma.store.findUnique({
    where: { id: storeId }
  });

  if (!store) {
    throw new NotFoundError('Store not found');
  }

  if (store.userId !== req.user.id && req.user.role !== 'ADMIN') {
    throw new ValidationError('Access denied to this store');
  }

  // Rollback deployment
  const deployment = await deploymentService.rollbackDeployment(storeId, version);

  res.json({
    success: true,
    message: 'Deployment rolled back successfully',
    data: { deployment }
  });
});

// Setup custom domain
const setupCustomDomain = asyncHandler(async (req, res) => {
  const { storeId } = req.params;
  const { domain } = req.body;

  // Verify store ownership
  const store = await prisma.store.findUnique({
    where: { id: storeId }
  });

  if (!store) {
    throw new NotFoundError('Store not found');
  }

  if (store.userId !== req.user.id && req.user.role !== 'ADMIN') {
    throw new ValidationError('Access denied to this store');
  }

  // Setup custom domain
  const result = await deploymentService.setupCustomDomain(storeId, domain);

  res.json({
    success: true,
    message: 'Custom domain setup successfully',
    data: result
  });
});

// Enable SSL
const enableSSL = asyncHandler(async (req, res) => {
  const { storeId } = req.params;
  const { domain } = req.body;

  // Verify store ownership
  const store = await prisma.store.findUnique({
    where: { id: storeId }
  });

  if (!store) {
    throw new NotFoundError('Store not found');
  }

  if (store.userId !== req.user.id && req.user.role !== 'ADMIN') {
    throw new ValidationError('Access denied to this store');
  }

  // Enable SSL
  const result = await deploymentService.enableSSL(domain);

  res.json({
    success: true,
    message: 'SSL certificate enabled successfully',
    data: result
  });
});

// Get deployment analytics
const getDeploymentAnalytics = asyncHandler(async (req, res) => {
  const { storeId } = req.params;
  const { startDate, endDate } = req.query;

  // Verify store ownership
  const store = await prisma.store.findUnique({
    where: { id: storeId }
  });

  if (!store) {
    throw new NotFoundError('Store not found');
  }

  if (store.userId !== req.user.id && req.user.role !== 'ADMIN') {
    throw new ValidationError('Access denied to this store');
  }

  // Build date filter
  const dateFilter = {};
  if (startDate) {
    dateFilter.gte = new Date(startDate);
  }
  if (endDate) {
    dateFilter.lte = new Date(endDate);
  }

  // Get deployment statistics
  const [totalDeployments, successfulDeployments, failedDeployments, averageBuildTime] = await Promise.all([
    prisma.deployment.count({
      where: { 
        storeId,
        ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter })
      }
    }),
    prisma.deployment.count({
      where: { 
        storeId,
        status: 'SUCCESS',
        ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter })
      }
    }),
    prisma.deployment.count({
      where: { 
        storeId,
        status: 'FAILED',
        ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter })
      }
    }),
    prisma.deployment.aggregate({
      where: { 
        storeId,
        status: 'SUCCESS',
        deployedAt: { not: null },
        ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter })
      },
      _avg: {
        _raw: 'EXTRACT(EPOCH FROM ("deployedAt" - "createdAt"))'
      }
    })
  ]);

  // Get recent deployments
  const recentDeployments = await prisma.deployment.findMany({
    where: { storeId },
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: {
      id: true,
      version: true,
      status: true,
      environment: true,
      createdAt: true,
      deployedAt: true
    }
  });

  res.json({
    success: true,
    data: {
      statistics: {
        totalDeployments,
        successfulDeployments,
        failedDeployments,
        successRate: totalDeployments > 0 ? (successfulDeployments / totalDeployments) * 100 : 0,
        averageBuildTime: averageBuildTime._avg._raw || 0
      },
      recentDeployments
    }
  });
});

// Delete deployment
const deleteDeployment = asyncHandler(async (req, res) => {
  const { deploymentId } = req.params;

  const deployment = await prisma.deployment.findUnique({
    where: { id: deploymentId },
    include: { store: true }
  });

  if (!deployment) {
    throw new NotFoundError('Deployment not found');
  }

  // Check access
  if (deployment.store.userId !== req.user.id && req.user.role !== 'ADMIN') {
    throw new ValidationError('Access denied to this deployment');
  }

  // Delete deployment
  await prisma.deployment.delete({
    where: { id: deploymentId }
  });

  logger.info(`Deployment deleted: ${deploymentId}`);

  res.json({
    success: true,
    message: 'Deployment deleted successfully'
  });
});

// Get deployment configuration
const getDeploymentConfig = asyncHandler(async (req, res) => {
  const { storeId } = req.params;

  // Verify store ownership
  const store = await prisma.store.findUnique({
    where: { id: storeId },
    select: {
      id: true,
      name: true,
      slug: true,
      customDomain: true,
      deploymentUrl: true,
      isDeployed: true,
      userId: true
    }
  });

  if (!store) {
    throw new NotFoundError('Store not found');
  }

  if (store.userId !== req.user.id && req.user.role !== 'ADMIN') {
    throw new ValidationError('Access denied to this store');
  }

  // Get latest deployment
  const latestDeployment = await prisma.deployment.findFirst({
    where: { storeId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      version: true,
      status: true,
      environment: true,
      url: true,
      createdAt: true,
      deployedAt: true
    }
  });

  res.json({
    success: true,
    data: {
      store,
      latestDeployment,
      deploymentUrl: store.deploymentUrl || latestDeployment?.url
    }
  });
});

module.exports = {
  deployStore,
  getDeploymentStatus,
  getDeploymentLogs,
  getStoreDeployments,
  rollbackDeployment,
  setupCustomDomain,
  enableSSL,
  getDeploymentAnalytics,
  deleteDeployment,
  getDeploymentConfig
}; 