import { Request, Response, NextFunction } from 'express'
import { logger } from '../utils/logger'

/**
 * Simple in-memory rate limiter
 * For production, consider using Redis-based rate limiting
 */

interface RateLimitStore {
  [key: string]: {
    count: number
    resetTime: number
  }
}

const store: RateLimitStore = {}

// Clean up old entries every 10 minutes
setInterval(() => {
  const now = Date.now()
  Object.keys(store).forEach(key => {
    if (store[key].resetTime < now) {
      delete store[key]
    }
  })
}, 10 * 60 * 1000)

export interface RateLimitOptions {
  windowMs: number  // Time window in milliseconds
  maxRequests: number  // Maximum number of requests per window
  message?: string  // Custom error message
  skipSuccessfulRequests?: boolean  // Don't count successful requests
  skipFailedRequests?: boolean  // Don't count failed requests
}

/**
 * Create a rate limiter middleware
 */
export const createRateLimiter = (options: RateLimitOptions) => {
  const {
    windowMs,
    maxRequests,
    message = 'Too many requests, please try again later',
    skipSuccessfulRequests = false,
    skipFailedRequests = false
  } = options

  return (req: Request, res: Response, next: NextFunction) => {
    // Use IP address as the key (in production, consider using user ID for authenticated routes)
    const key = `${req.ip}:${req.path}`
    const now = Date.now()

    // Initialize or get existing entry
    if (!store[key] || store[key].resetTime < now) {
      store[key] = {
        count: 0,
        resetTime: now + windowMs
      }
    }

    const entry = store[key]

    // Check if limit exceeded
    if (entry.count >= maxRequests) {
      const retryAfter = Math.ceil((entry.resetTime - now) / 1000)

      logger.warn('Rate limit exceeded', {
        ip: req.ip,
        path: req.path,
        count: entry.count,
        limit: maxRequests
      })

      return res.status(429).json({
        message,
        retryAfter
      })
    }

    // Increment counter (will be decremented if needed based on response)
    entry.count++

    // Handle skipSuccessfulRequests and skipFailedRequests
    if (skipSuccessfulRequests || skipFailedRequests) {
      const originalSend = res.send
      res.send = function(data: any) {
        const statusCode = res.statusCode

        if (
          (skipSuccessfulRequests && statusCode < 400) ||
          (skipFailedRequests && statusCode >= 400)
        ) {
          entry.count--
        }

        return originalSend.call(this, data)
      }
    }

    next()
  }
}

/**
 * Strict rate limiter for authentication routes
 * 5 attempts per 15 minutes
 */
export const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5,
  message: 'Too many login attempts, please try again after 15 minutes',
  skipSuccessfulRequests: true // Only count failed login attempts
})

/**
 * General API rate limiter
 * 1000 requests per 15 minutes
 */
export const apiRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 1000,
  message: 'Too many requests from this IP, please try again later'
})

/**
 * Strict rate limiter for sensitive operations
 * 10 requests per hour
 */
export const strictRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 10,
  message: 'Too many requests for this operation, please try again later'
})
