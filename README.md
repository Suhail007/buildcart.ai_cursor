# Buildcart.ai Backend

A complete backend API architecture for Buildcart.ai - an AI-powered e-commerce platform builder. This project provides a robust foundation for building, deploying, and managing e-commerce stores with AI assistance.

## 🚀 Features

### Authentication System
- **JWT-based authentication** with access and refresh tokens
- **User registration** with email verification
- **Password reset** functionality
- **Role-based access control** (User, Admin, Super Admin)
- **Secure password hashing** with bcrypt
- **Email notifications** for account events

### Store Management
- **AI-powered store generation** from natural language prompts
- **Store configuration** with themes, modules, and settings
- **Multi-store support** per user
- **Store analytics** and performance tracking

### Deployment System
- **Static site generation** from store configurations
- **Custom domain support** with SSL certificates
- **Deployment history** and rollback capabilities
- **Build logs** and status tracking
- **Multiple environments** (production, staging)

### E-commerce Features
- **Product management** with variants and inventory
- **Order processing** with status tracking
- **Customer management** with segmentation
- **Payment integration** (Stripe)
- **Analytics and reporting**

### AI Integration
- **OpenAI GPT-4 integration** for content generation
- **Store optimization** recommendations
- **Product description generation**
- **SEO content optimization**

## 🛠 Technology Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js 4.18+
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT + bcrypt
- **AI Integration**: OpenAI API (GPT-4)
- **Payments**: Stripe API
- **File Storage**: Cloudinary
- **Email**: SendGrid
- **Caching**: Redis
- **Logging**: Winston
- **Validation**: Joi
- **Testing**: Jest + Supertest

## 📁 Project Structure

```
buildcart-backend/
├── src/
│   ├── controllers/          # Business logic controllers
│   │   ├── authController.js
│   │   ├── deploymentController.js
│   │   └── ...
│   ├── middleware/           # Express middleware
│   │   ├── auth.js
│   │   ├── validation.js
│   │   ├── errorHandler.js
│   │   └── ...
│   ├── routes/              # API route definitions
│   │   ├── auth.js
│   │   ├── deployment.js
│   │   └── ...
│   ├── services/            # Business services
│   │   ├── emailService.js
│   │   ├── deploymentService.js
│   │   └── ...
│   ├── utils/               # Utility functions
│   │   ├── logger.js
│   │   └── ...
│   └── app.js              # Main application file
├── prisma/
│   ├── schema.prisma       # Database schema
│   └── migrations/         # Database migrations
├── tests/                  # Test files
├── builds/                 # Generated static sites
├── logs/                   # Application logs
├── package.json
├── env.example
└── README.md
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ installed
- PostgreSQL database
- Redis (optional, for caching)
- SendGrid account (for emails)
- OpenAI API key (for AI features)
- Stripe account (for payments)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd buildcart-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp env.example .env
   # Edit .env with your configuration
   ```

4. **Set up the database**
   ```bash
   # Generate Prisma client
   npm run db:generate
   
   # Push schema to database
   npm run db:push
   
   # Or run migrations
   npm run db:migrate
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

The server will start on `http://localhost:3001`

## 🔧 Configuration

### Environment Variables

Create a `.env` file based on `env.example`:

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/buildcart"

# JWT
JWT_SECRET="your-super-secret-jwt-key"
JWT_REFRESH_SECRET="your-refresh-secret"
JWT_EXPIRES_IN="7d"
JWT_REFRESH_EXPIRES_IN="30d"

# OpenAI
OPENAI_API_KEY="sk-your-openai-key"

# Stripe
STRIPE_SECRET_KEY="sk_test_your-stripe-secret"

# SendGrid
SENDGRID_API_KEY="SG.your-sendgrid-key"
FROM_EMAIL="noreply@buildcart.ai"

# Server
PORT=3001
NODE_ENV=development
CORS_ORIGIN="http://localhost:3000"
```

## 📚 API Documentation

### Authentication Endpoints

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securePassword123",
  "confirmPassword": "securePassword123"
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "securePassword123"
}
```

#### Forgot Password
```http
POST /api/auth/forgot-password
Content-Type: application/json

{
  "email": "john@example.com"
}
```

#### Reset Password
```http
POST /api/auth/reset-password
Content-Type: application/json

{
  "token": "reset-token",
  "password": "newPassword123",
  "confirmPassword": "newPassword123"
}
```

#### Get Current User
```http
GET /api/auth/me
Authorization: Bearer <access-token>
```

### Deployment Endpoints

#### Deploy Store
```http
POST /api/deployment/stores/:storeId/deploy
Authorization: Bearer <access-token>
Content-Type: application/json

{
  "environment": "production",
  "customDomain": "mystore.com",
  "sslEnabled": true
}
```

#### Get Deployment Status
```http
GET /api/deployment/deployments/:deploymentId
Authorization: Bearer <access-token>
```

#### Get Store Deployments
```http
GET /api/deployment/stores/:storeId/deployments?page=1&limit=10
Authorization: Bearer <access-token>
```

#### Setup Custom Domain
```http
POST /api/deployment/stores/:storeId/domain
Authorization: Bearer <access-token>
Content-Type: application/json

{
  "domain": "mystore.com"
}
```

## 🔒 Security Features

- **JWT token authentication** with refresh tokens
- **Password hashing** with bcrypt (12 rounds)
- **Rate limiting** on all endpoints
- **Input validation** with Joi schemas
- **CORS protection** with configurable origins
- **Helmet.js** for security headers
- **SQL injection protection** with Prisma ORM
- **XSS protection** with input sanitization

## 🧪 Testing

Run the test suite:

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm test -- auth.test.js
```

## 📊 Database Schema

The application uses Prisma with PostgreSQL. Key models include:

- **User**: Authentication and user management
- **Store**: E-commerce store configurations
- **Product**: Product catalog with variants
- **Order**: Order processing and tracking
- **Customer**: Customer management
- **Deployment**: Store deployment history
- **Analytics**: Performance metrics

## 🚀 Deployment

### Production Deployment

1. **Set environment variables** for production
2. **Build the application**:
   ```bash
   npm run build
   ```
3. **Start the production server**:
   ```bash
   npm start
   ```

### Docker Deployment

```bash
# Build Docker image
docker build -t buildcart-backend .

# Run container
docker run -p 3001:3001 buildcart-backend
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:

- Create an issue in the GitHub repository
- Contact the development team
- Check the documentation

## 🔄 Changelog

### v1.0.0
- Initial release
- Complete authentication system
- Store deployment service
- Basic e-commerce functionality
- AI integration foundation

---

**Buildcart.ai Backend** - Building the future of e-commerce with AI 🚀 