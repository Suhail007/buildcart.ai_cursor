const Joi = require('joi');
const { ValidationError } = require('./errorHandler');

// Common validation schemas
const commonSchemas = {
  id: Joi.string().cuid().required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).max(128).required(),
  name: Joi.string().min(2).max(100).required(),
  phone: Joi.string().pattern(/^\+?[\d\s\-\(\)]+$/).optional(),
  url: Joi.string().uri().optional(),
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    sortBy: Joi.string().optional(),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc')
  })
};

// Authentication validation schemas
const authSchemas = {
  register: Joi.object({
    name: commonSchemas.name,
    email: commonSchemas.email,
    password: commonSchemas.password,
    confirmPassword: Joi.string().valid(Joi.ref('password')).required()
      .messages({
        'any.only': 'Passwords do not match'
      })
  }),

  login: Joi.object({
    email: commonSchemas.email,
    password: Joi.string().required()
  }),

  forgotPassword: Joi.object({
    email: commonSchemas.email
  }),

  resetPassword: Joi.object({
    token: Joi.string().required(),
    password: commonSchemas.password,
    confirmPassword: Joi.string().valid(Joi.ref('password')).required()
      .messages({
        'any.only': 'Passwords do not match'
      })
  }),

  verifyEmail: Joi.object({
    token: Joi.string().required()
  }),

  refreshToken: Joi.object({
    refreshToken: Joi.string().required()
  })
};

// Store validation schemas
const storeSchemas = {
  create: Joi.object({
    name: commonSchemas.name,
    industry: Joi.string().required(),
    storeType: Joi.string().valid('B2C', 'B2B', 'MARKETPLACE', 'DIGITAL').required(),
    description: Joi.string().max(500).optional(),
    targetAudience: Joi.string().max(200).optional(),
    modules: Joi.object().optional(),
    settings: Joi.object().optional(),
    theme: Joi.object().optional()
  }),

  update: Joi.object({
    name: Joi.string().min(2).max(100).optional(),
    description: Joi.string().max(500).optional(),
    targetAudience: Joi.string().max(200).optional(),
    modules: Joi.object().optional(),
    settings: Joi.object().optional(),
    theme: Joi.object().optional(),
    metaTitle: Joi.string().max(60).optional(),
    metaDescription: Joi.string().max(160).optional()
  }),

  theme: Joi.object({
    primaryColor: Joi.string().pattern(/^#[0-9A-F]{6}$/i).optional(),
    secondaryColor: Joi.string().pattern(/^#[0-9A-F]{6}$/i).optional(),
    layout: Joi.string().valid('modern', 'classic', 'minimal').optional(),
    fonts: Joi.object({
      heading: Joi.string().optional(),
      body: Joi.string().optional()
    }).optional()
  }),

  deploy: Joi.object({
    environment: Joi.string().valid('production', 'staging').default('production'),
    customDomain: Joi.string().domain().optional(),
    sslEnabled: Joi.boolean().default(true)
  })
};

// Product validation schemas
const productSchemas = {
  create: Joi.object({
    name: commonSchemas.name,
    description: Joi.string().max(2000).optional(),
    shortDescription: Joi.string().max(500).optional(),
    sku: Joi.string().max(50).optional(),
    price: Joi.number().positive().precision(2).required(),
    comparePrice: Joi.number().positive().precision(2).optional(),
    costPrice: Joi.number().positive().precision(2).optional(),
    b2bPrice: Joi.number().positive().precision(2).optional(),
    inventory: Joi.number().integer().min(0).default(0),
    trackInventory: Joi.boolean().default(true),
    allowBackorder: Joi.boolean().default(false),
    weight: Joi.number().positive().precision(2).optional(),
    dimensions: Joi.object({
      length: Joi.number().positive().optional(),
      width: Joi.number().positive().optional(),
      height: Joi.number().positive().optional()
    }).optional(),
    category: Joi.string().max(100).optional(),
    tags: Joi.array().items(Joi.string().max(50)).optional(),
    images: Joi.array().items(Joi.string().uri()).optional(),
    metaTitle: Joi.string().max(60).optional(),
    metaDescription: Joi.string().max(160).optional(),
    urlHandle: Joi.string().max(100).optional(),
    isActive: Joi.boolean().default(true),
    isFeatured: Joi.boolean().default(false),
    variants: Joi.array().items(Joi.object({
      title: Joi.string().required(),
      sku: Joi.string().max(50).optional(),
      price: Joi.number().positive().precision(2).required(),
      comparePrice: Joi.number().positive().precision(2).optional(),
      inventory: Joi.number().integer().min(0).default(0),
      weight: Joi.number().positive().precision(2).optional(),
      option1: Joi.string().optional(),
      option2: Joi.string().optional(),
      option3: Joi.string().optional()
    })).optional()
  }),

  update: Joi.object({
    name: Joi.string().min(2).max(100).optional(),
    description: Joi.string().max(2000).optional(),
    shortDescription: Joi.string().max(500).optional(),
    sku: Joi.string().max(50).optional(),
    price: Joi.number().positive().precision(2).optional(),
    comparePrice: Joi.number().positive().precision(2).optional(),
    costPrice: Joi.number().positive().precision(2).optional(),
    b2bPrice: Joi.number().positive().precision(2).optional(),
    inventory: Joi.number().integer().min(0).optional(),
    trackInventory: Joi.boolean().optional(),
    allowBackorder: Joi.boolean().optional(),
    weight: Joi.number().positive().precision(2).optional(),
    dimensions: Joi.object().optional(),
    category: Joi.string().max(100).optional(),
    tags: Joi.array().items(Joi.string().max(50)).optional(),
    images: Joi.array().items(Joi.string().uri()).optional(),
    metaTitle: Joi.string().max(60).optional(),
    metaDescription: Joi.string().max(160).optional(),
    urlHandle: Joi.string().max(100).optional(),
    isActive: Joi.boolean().optional(),
    isFeatured: Joi.boolean().optional()
  }),

  bulkUpdate: Joi.object({
    products: Joi.array().items(Joi.object({
      id: commonSchemas.id,
      price: Joi.number().positive().precision(2).optional(),
      inventory: Joi.number().integer().min(0).optional(),
      isActive: Joi.boolean().optional(),
      isFeatured: Joi.boolean().optional()
    })).min(1).required()
  })
};

// Order validation schemas
const orderSchemas = {
  create: Joi.object({
    customerId: commonSchemas.id,
    items: Joi.array().items(Joi.object({
      productId: commonSchemas.id,
      quantity: Joi.number().integer().min(1).required(),
      price: Joi.number().positive().precision(2).required()
    })).min(1).required(),
    billingAddress: Joi.object({
      firstName: Joi.string().required(),
      lastName: Joi.string().required(),
      address1: Joi.string().required(),
      address2: Joi.string().optional(),
      city: Joi.string().required(),
      state: Joi.string().required(),
      country: Joi.string().required(),
      zip: Joi.string().required(),
      phone: commonSchemas.phone.optional()
    }).required(),
    shippingAddress: Joi.object({
      firstName: Joi.string().required(),
      lastName: Joi.string().required(),
      address1: Joi.string().required(),
      address2: Joi.string().optional(),
      city: Joi.string().required(),
      state: Joi.string().required(),
      country: Joi.string().required(),
      zip: Joi.string().required(),
      phone: commonSchemas.phone.optional()
    }).optional(),
    notes: Joi.string().max(500).optional(),
    customerNotes: Joi.string().max(500).optional()
  }),

  updateStatus: Joi.object({
    status: Joi.string().valid('PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED').required(),
    notes: Joi.string().max(500).optional()
  }),

  fulfill: Joi.object({
    trackingNumber: Joi.string().required(),
    carrier: Joi.string().required(),
    items: Joi.array().items(Joi.object({
      orderItemId: commonSchemas.id,
      quantity: Joi.number().integer().min(1).required()
    })).min(1).required()
  }),

  refund: Joi.object({
    amount: Joi.number().positive().precision(2).required(),
    reason: Joi.string().max(200).required(),
    items: Joi.array().items(commonSchemas.id).optional()
  }),

  cancel: Joi.object({
    reason: Joi.string().max(200).required(),
    refund: Joi.boolean().default(false)
  })
};

// Customer validation schemas
const customerSchemas = {
  create: Joi.object({
    email: commonSchemas.email,
    firstName: Joi.string().min(2).max(50).required(),
    lastName: Joi.string().min(2).max(50).required(),
    phone: commonSchemas.phone,
    customerType: Joi.string().valid('B2C', 'B2B').default('B2C'),
    companyName: Joi.string().max(100).optional(),
    taxId: Joi.string().max(50).optional(),
    address: Joi.object({
      address1: Joi.string().required(),
      address2: Joi.string().optional(),
      city: Joi.string().required(),
      state: Joi.string().required(),
      country: Joi.string().required(),
      zip: Joi.string().required()
    }).optional(),
    acceptsMarketing: Joi.boolean().default(false)
  }),

  update: Joi.object({
    firstName: Joi.string().min(2).max(50).optional(),
    lastName: Joi.string().min(2).max(50).optional(),
    phone: commonSchemas.phone,
    companyName: Joi.string().max(100).optional(),
    taxId: Joi.string().max(50).optional(),
    address: Joi.object({
      address1: Joi.string().required(),
      address2: Joi.string().optional(),
      city: Joi.string().required(),
      state: Joi.string().required(),
      country: Joi.string().required(),
      zip: Joi.string().required()
    }).optional(),
    acceptsMarketing: Joi.boolean().optional()
  })
};

// AI validation schemas
const aiSchemas = {
  generateStore: Joi.object({
    prompt: Joi.string().min(10).max(1000).required(),
    industry: Joi.string().optional(),
    preferences: Joi.object({
      colorScheme: Joi.string().valid('warm', 'cool', 'neutral').optional(),
      style: Joi.string().valid('modern', 'classic', 'minimal').optional()
    }).optional()
  }),

  generateProducts: Joi.object({
    storeId: commonSchemas.id,
    category: Joi.string().optional(),
    count: Joi.number().integer().min(1).max(50).default(10)
  }),

  generateContent: Joi.object({
    type: Joi.string().valid('product_description', 'meta_description', 'page_content').required(),
    productData: Joi.object({
      name: Joi.string().required(),
      features: Joi.array().items(Joi.string()).optional()
    }).optional()
  }),

  optimizeStore: Joi.object({
    storeId: commonSchemas.id,
    goals: Joi.array().items(Joi.string().valid('increase_conversion', 'improve_seo', 'enhance_ux')).min(1).required()
  }),

  chat: Joi.object({
    message: Joi.string().min(1).max(1000).required(),
    context: Joi.object({
      storeId: commonSchemas.id.optional(),
      currentMetrics: Joi.object().optional()
    }).optional()
  })
};

// Validation middleware factory
const validate = (schema, property = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      stripUnknown: true,
      allowUnknown: false
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));
      
      throw new ValidationError('Validation failed', errors);
    }

    // Replace request data with validated data
    req[property] = value;
    next();
  };
};

// Export all schemas and validation middleware
module.exports = {
  validate,
  commonSchemas,
  authSchemas,
  storeSchemas,
  productSchemas,
  orderSchemas,
  customerSchemas,
  aiSchemas
}; 