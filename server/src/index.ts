import express from 'express'
import cors from 'cors'
import { createServer } from 'http'
import mongoose from 'mongoose'
import dotenv from 'dotenv'
import path from 'path'
import { authMiddleware } from './middleware/auth'
import { logger } from './utils/logger'
import { setupMongoIndexes } from './utils/dbOptimization'
import apiRoutes from './routes'

// Load environment variables from .env file if it exists
// In production, environment variables should be set directly
const result = dotenv.config({ path: path.resolve(__dirname, '../.env') })
if (result.error) {
  // Only log a warning, don't exit - environment variables might be set directly
}

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
  // Express middleware - CORS configuration
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

  app.use(express.json({ limit: '10mb' }))
  app.use(express.urlencoded({ extended: true, limit: '10mb' }))

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

  // Error handling middleware
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    logger.error('Unhandled error:', err)
    res.status(500).json({
      error: 'Internal Server Error',
      message: process.env.NODE_ENV === 'development' ? err.message : undefined
    })
  })

  httpServer.listen(PORT, () => {
    logger.info(`🚀 Server ready at http://localhost:${PORT}`)
    logger.info(`📦 REST API available at http://localhost:${PORT}/api`)
  })
}

startServer().catch(err => {
  logger.error('Failed to start server:', err)
  process.exit(1)
})