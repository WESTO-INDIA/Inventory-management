import { Request, Response, NextFunction } from 'express'
import { logger } from './logger'

/**
 * Custom error classes for better error handling
 */

export class AppError extends Error {
  statusCode: number
  isOperational: boolean

  constructor(message: string, statusCode: number) {
    super(message)
    this.statusCode = statusCode
    this.isOperational = true

    Error.captureStackTrace(this, this.constructor)
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400)
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 401)
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Access denied') {
    super(message, 403)
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(message, 404)
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Resource already exists') {
    super(message, 409)
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Too many requests') {
    super(message, 429)
  }
}

export class InternalServerError extends AppError {
  constructor(message: string = 'Internal server error') {
    super(message, 500)
  }
}

/**
 * Global error handler middleware
 */
export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Default error values
  let statusCode = 500
  let message = 'Internal Server Error'
  let isOperational = false

  // Check if it's an AppError
  if (err instanceof AppError) {
    statusCode = err.statusCode
    message = err.message
    isOperational = err.isOperational
  } else if (err.name === 'ValidationError') {
    // Mongoose validation error
    statusCode = 400
    message = 'Validation Error'
    isOperational = true
  } else if (err.name === 'CastError') {
    // Mongoose cast error (invalid ObjectId)
    statusCode = 400
    message = 'Invalid ID format'
    isOperational = true
  } else if ((err as any).code === 11000) {
    // Mongoose duplicate key error
    statusCode = 409
    message = 'Duplicate field value'
    isOperational = true
  } else if (err.name === 'JsonWebTokenError') {
    // JWT error
    statusCode = 401
    message = 'Invalid token'
    isOperational = true
  } else if (err.name === 'TokenExpiredError') {
    // JWT expired error
    statusCode = 401
    message = 'Token expired'
    isOperational = true
  }

  // Log error
  if (!isOperational || statusCode >= 500) {
    logger.error('Error occurred:', {
      message: err.message,
      stack: err.stack,
      statusCode,
      path: req.path,
      method: req.method,
      ip: req.ip,
      user: (req as any).user?.id
    })
  } else {
    logger.warn('Operational error:', {
      message: err.message,
      statusCode,
      path: req.path,
      method: req.method,
      ip: req.ip
    })
  }

  // Send error response
  res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' && {
      details: err.message,
      stack: err.stack
    })
  })
}

/**
 * Async handler wrapper to catch errors in async route handlers
 */
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}

/**
 * Handle 404 errors
 */
export const notFoundHandler = (req: Request, res: Response, next: NextFunction) => {
  next(new NotFoundError(`Route ${req.originalUrl} not found`))
}
