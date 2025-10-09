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
console.log('Looking for .env file at:', envPath)

// Check if .env file exists and has content
const fs = require('fs')
try {
  const envContent = fs.readFileSync(envPath, 'utf8')
  console.log('.env file size:', envContent.length, 'bytes')
  if (envContent.length === 0) {
    console.log('⚠️  WARNING: .env file is empty! Please add your environment variables to the .env file.')
    console.log('Example content for .env file:')
    console.log('MONGODB_URI=mongodb://localhost:27017/inventory')
    console.log('JWT_SECRET=your-secret-key-here')
    console.log('ADMIN_USERNAME=your-username')
    console.log('ADMIN_PASSWORD=your-password')
  } else {
    console.log('.env file content preview (first 100 chars):', envContent.substring(0, 100))
  }
} catch (error) {
  console.log('.env file does not exist')
}

const result = dotenv.config({ path: envPath })
if (result.error) {
  console.log('Error loading .env file:', result.error.message)
} else {
  console.log('.env file loaded successfully')
  console.log('Environment variables loaded from .env:', Object.keys(result.parsed || {}))
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

console.log('Setting defaults for missing environment variables:')
for (const [key, defaultValue] of Object.entries(defaults)) {
  if (!process.env[key]) {
    process.env[key] = defaultValue
    console.log(`  ${key}: using default value`)
  } else {
    console.log(`  ${key}: using value from environment`)
  }
}

// Validate environment variables before starting
validateEnvironment()

const app = express()
const httpServer = createServer(app)
const PORT = process.env.PORT || 4000

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
  app.use(cors({
    origin: process.env.NODE_ENV === 'production'
      ? process.env.CLIENT_URL
      : true, // Allow all origins in development
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    preflightContinue: false,
    optionsSuccessStatus: 204
  }))

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
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        mongodb: mongoose.connection.readyState === 1
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
    logger.info(`🚀 Server ready at http://localhost:${PORT}`)
    logger.info(`📦 REST API available at http://localhost:${PORT}/api`)
  })
}

startServer().catch(err => {
  logger.error('Failed to start server:', err)
  process.exit(1)
})