import { Request, Response, NextFunction } from 'express'

/**
 * Middleware to sanitize request inputs to prevent XSS and injection attacks
 */

/**
 * Remove potential XSS characters from string
 */
const sanitizeValue = (value: any): any => {
  if (typeof value === 'string') {
    // Remove HTML tags and script content
    return value
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<[^>]*>/g, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .trim()
  }

  if (Array.isArray(value)) {
    return value.map(sanitizeValue)
  }

  if (value !== null && typeof value === 'object') {
    const sanitized: any = {}
    for (const key in value) {
      if (Object.prototype.hasOwnProperty.call(value, key)) {
        sanitized[key] = sanitizeValue(value[key])
      }
    }
    return sanitized
  }

  return value
}

/**
 * Sanitize request body
 */
export const sanitizeBody = (req: Request, res: Response, next: NextFunction) => {
  if (req.body) {
    req.body = sanitizeValue(req.body)
  }
  next()
}

/**
 * Sanitize request query parameters
 */
export const sanitizeQuery = (req: Request, res: Response, next: NextFunction) => {
  if (req.query) {
    req.query = sanitizeValue(req.query)
  }
  next()
}

/**
 * Sanitize request params
 */
export const sanitizeParams = (req: Request, res: Response, next: NextFunction) => {
  if (req.params) {
    req.params = sanitizeValue(req.params)
  }
  next()
}

/**
 * Sanitize all request inputs (body, query, params)
 */
export const sanitizeRequest = (req: Request, res: Response, next: NextFunction) => {
  if (req.body) {
    req.body = sanitizeValue(req.body)
  }
  if (req.query) {
    req.query = sanitizeValue(req.query)
  }
  if (req.params) {
    req.params = sanitizeValue(req.params)
  }
  next()
}

/**
 * Prevent NoSQL injection by checking for operators in request
 */
export const preventNoSQLInjection = (req: Request, res: Response, next: NextFunction) => {
  const checkForOperators = (obj: any): boolean => {
    if (typeof obj === 'string') {
      return /^\$/.test(obj)
    }

    if (Array.isArray(obj)) {
      return obj.some(checkForOperators)
    }

    if (obj !== null && typeof obj === 'object') {
      return Object.keys(obj).some(key => {
        // Check if key starts with $ (MongoDB operator)
        if (key.startsWith('$')) {
          return true
        }
        return checkForOperators(obj[key])
      })
    }

    return false
  }

  if (checkForOperators(req.body) || checkForOperators(req.query) || checkForOperators(req.params)) {
    return res.status(400).json({
      message: 'Invalid request: potential injection detected'
    })
  }

  next()
}
