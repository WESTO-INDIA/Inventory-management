import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import mongoSanitize from 'express-mongo-sanitize'
import { createServer } from 'http'
import mongoose from 'mongoose'
import dotenv from 'dotenv'
import path from 'path'
// Removed unused import: authMiddleware
import { logger } from './utils/logger'
import { setupMongoIndexes } from './utils/dbOptimization'
import { errorHandler, notFoundHandler } from './utils/errorHandler'
import { apiRateLimiter } from './middleware/rateLimiter'
import { sanitizeRequest } from './middleware/sanitizer'
import { validateEnvironment } from './utils/envValidator'
import apiRoutes from './routes'

// Load environment variables from .env file if it exists
// In production, environment variables should be set directly
const envPath = path.resolve(__dirname, '../.env')
const result = dotenv.config({ path: envPath })
if (result.error) {
  // Only log a warning, don't exit - environment variables might be set directly
}

// Set default environment variables if not provided (for development)
const defaults = {
  MONGODB_URI: 'mongodb://localhost:27017/inventory',
  JWT_SECRET: 'your-super-secret-jwt-key-that-is-at-least-32-characters-long-for-security',
  ADMIN_USERNAME: 'admin',
  ADMIN_PASSWORD: 'admin123456',
  PORT: '4000',
  NODE_ENV: 'development',
  ADMIN_EMAIL: 'admin@company.com',
  CLIENT_URL: 'http://localhost:5173'
}

for (const [key, defaultValue] of Object.entries(defaults)) {
  if (!process.env[key]) {
    process.env[key] = defaultValue
  }
}

// Validate environment variables before starting
validateEnvironment()

const app = express()
const httpServer = createServer(app)
const PORT = process.env.PORT || 4000

// Log startup configuration
logger.info('=== Server Configuration ===')
logger.info(`Environment: ${process.env.NODE_ENV}`)
logger.info(`Port: ${PORT}`)
logger.info(`MongoDB URI: ${process.env.MONGODB_URI ? 'Configured' : 'Missing'}`)
logger.info(`JWT Secret: ${process.env.JWT_SECRET ? 'Configured' : 'Missing'}`)
logger.info(`Client URL: ${process.env.CLIENT_URL}`)
logger.info('=============================')

// MongoDB connection with optimization
mongoose.set('strictQuery', false)
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/inventory', {
  maxPoolSize: 10,
  minPoolSize: 5,
  socketTimeoutMS: 45000,
  serverSelectionTimeoutMS: 10000,
})

mongoose.connection.on('connected', async () => {
  logger.info('MongoDB connected')

  // Setup database indexes
  await setupMongoIndexes()
})

mongoose.connection.on('error', (err) => {
  logger.error('MongoDB error:', err)
})

async function startServer() {
  // Security middleware - Helmet for security headers
  app.use(helmet({
    contentSecurityPolicy: process.env.NODE_ENV === 'production',
    crossOriginEmbedderPolicy: process.env.NODE_ENV === 'production'
  }))

  // CORS configuration
  const allowedOrigins = process.env.NODE_ENV === 'production'
    ? [process.env.CLIENT_URL, 'https://inventory-frontend.onrender.com'].filter(Boolean)
    : true

  app.use(cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    preflightContinue: false,
    optionsSuccessStatus: 204
  }))

  logger.info(`CORS origins: ${JSON.stringify(allowedOrigins)}`)

  // Compression middleware for performance
  app.use(compression())

  // Body parsing middleware
  app.use(express.json({ limit: '10mb' }))
  app.use(express.urlencoded({ extended: true, limit: '10mb' }))

  // MongoDB injection prevention
  app.use(mongoSanitize({
    replaceWith: '_'
  }))

  // Request sanitization
  app.use(sanitizeRequest)

  // Rate limiting for API routes
  app.use('/api', apiRateLimiter)

  // REST API routes
  app.use('/api', apiRoutes)

  // Health check
  app.get('/health', (_req, res) => {
    const mongoStatus = mongoose.connection.readyState
    const isHealthy = mongoStatus === 1

    res.status(isHealthy ? 200 : 503).json({
      status: isHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV,
      services: {
        mongodb: {
          status: mongoStatus === 1 ? 'connected' : 'disconnected',
          readyState: mongoStatus
        }
      }
    })
  })

  // Root route
  app.get('/', (_req, res) => {
    res.json({
      message: 'Inventory Management API',
      version: '2.0.0',
      health: '/health',
      timestamp: new Date().toISOString()
    })
  })

  // 404 handler - must be after all routes
  app.use(notFoundHandler)

  // Global error handling middleware - must be last
  app.use(errorHandler)

  httpServer.listen(PORT, () => {
    logger.info(`🚀 Server ready on port ${PORT}`)
    logger.info(`📦 REST API available at /api`)
    logger.info(`❤️  Health check available at /health`)
    logger.info(`🌍 Environment: ${process.env.NODE_ENV}`)
  })
}

startServer().catch(err => {
  logger.error('Failed to start server:', err)
  process.exit(1)
})