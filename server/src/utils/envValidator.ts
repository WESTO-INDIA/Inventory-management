import { logger } from './logger'

/**
 * Environment variable validation
 * Ensures all required environment variables are set before starting the server
 */

interface EnvConfig {
  PORT?: string
  NODE_ENV?: string
  MONGODB_URI?: string
  JWT_SECRET?: string
  SESSION_SECRET?: string
  ADMIN_USERNAME?: string
  ADMIN_PASSWORD?: string
  ADMIN_EMAIL?: string
  CLIENT_URL?: string
}

const requiredEnvVars = [
  'MONGODB_URI',
  'JWT_SECRET',
  'ADMIN_USERNAME',
  'ADMIN_PASSWORD'
]

const optionalEnvVars = [
  'PORT',
  'NODE_ENV',
  'SESSION_SECRET',
  'ADMIN_EMAIL',
  'CLIENT_URL'
]

/**
 * Validate that all required environment variables are set
 */
export const validateEnvironment = (): void => {
  const missingVars: string[] = []
  const warnings: string[] = []

  // Check required variables
  for (const varName of requiredEnvVars) {
    if (!process.env[varName]) {
      missingVars.push(varName)
    }
  }

  // Warn about optional but recommended variables
  for (const varName of optionalEnvVars) {
    if (!process.env[varName]) {
      warnings.push(varName)
    }
  }

  // Check JWT_SECRET strength
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    warnings.push('JWT_SECRET should be at least 32 characters long for better security')
  }

  // Check ADMIN_PASSWORD strength
  if (process.env.ADMIN_PASSWORD && process.env.ADMIN_PASSWORD.length < 8) {
    warnings.push('ADMIN_PASSWORD should be at least 8 characters long for better security')
  }

  // Check if running in production without proper config
  if (process.env.NODE_ENV === 'production') {
    if (!process.env.CLIENT_URL) {
      warnings.push('CLIENT_URL should be set in production for proper CORS configuration')
    }
  }

  // Log warnings
  if (warnings.length > 0) {
    logger.warn('Environment configuration warnings:', { warnings })
  }

  // Fail if required variables are missing
  if (missingVars.length > 0) {
    logger.error('Missing required environment variables:', { missingVars })
    throw new Error(
      `Missing required environment variables: ${missingVars.join(', ')}\n` +
      'Please create a .env file based on .env.example and set all required variables.'
    )
  }

  logger.info('Environment validation passed', {
    nodeEnv: process.env.NODE_ENV || 'development',
    port: process.env.PORT || '4000'
  })
}

/**
 * Get typed environment configuration
 */
export const getEnvConfig = (): EnvConfig => {
  return {
    PORT: process.env.PORT,
    NODE_ENV: process.env.NODE_ENV,
    MONGODB_URI: process.env.MONGODB_URI,
    JWT_SECRET: process.env.JWT_SECRET,
    SESSION_SECRET: process.env.SESSION_SECRET,
    ADMIN_USERNAME: process.env.ADMIN_USERNAME,
    ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
    ADMIN_EMAIL: process.env.ADMIN_EMAIL,
    CLIENT_URL: process.env.CLIENT_URL
  }
}
