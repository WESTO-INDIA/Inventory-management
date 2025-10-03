import { Request, Response, NextFunction } from 'express'
import { logger } from '../utils/logger'

/**
 * Validation middleware for request inputs
 */

// Sanitize string input
export const sanitizeString = (input: any): string => {
  if (typeof input !== 'string') {
    input = String(input)
  }
  return input.trim()
}

// Validate email format
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email) && email.length <= 254
}

// Validate username format
export const isValidUsername = (username: string): boolean => {
  const usernameRegex = /^[a-zA-Z0-9_-]+$/
  return usernameRegex.test(username) && username.length >= 3 && username.length <= 50
}

// Validate password strength
export const isValidPassword = (password: string): boolean => {
  return password.length >= 6 && password.length <= 200
}

// Validate ObjectId
export const isValidObjectId = (id: string): boolean => {
  return /^[a-f\d]{24}$/i.test(id)
}

// Middleware to validate MongoDB ObjectId in params
export const validateObjectId = (paramName: string = 'id') => {
  return (req: Request, res: Response, next: NextFunction) => {
    const id = req.params[paramName]

    if (!id || !isValidObjectId(id)) {
      return res.status(400).json({
        message: `Invalid ${paramName}. Must be a valid MongoDB ObjectId.`
      })
    }

    next()
  }
}

// Middleware to validate request body fields
export const validateBody = (requiredFields: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const missingFields: string[] = []

    for (const field of requiredFields) {
      if (!req.body[field] || (typeof req.body[field] === 'string' && !req.body[field].trim())) {
        missingFields.push(field)
      }
    }

    if (missingFields.length > 0) {
      return res.status(400).json({
        message: `Missing required fields: ${missingFields.join(', ')}`
      })
    }

    next()
  }
}

// Middleware to sanitize request body
export const sanitizeBody = (req: Request, res: Response, next: NextFunction) => {
  if (req.body && typeof req.body === 'object') {
    Object.keys(req.body).forEach(key => {
      if (typeof req.body[key] === 'string') {
        req.body[key] = sanitizeString(req.body[key])
      }
    })
  }
  next()
}

// Middleware to validate login credentials
export const validateLogin = (req: Request, res: Response, next: NextFunction) => {
  const { username, password } = req.body

  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required' })
  }

  const sanitizedUsername = sanitizeString(username)
  const sanitizedPassword = String(password)

  if (sanitizedUsername.length > 100 || sanitizedPassword.length > 200) {
    return res.status(400).json({ message: 'Invalid credentials format' })
  }

  req.body.username = sanitizedUsername
  req.body.password = sanitizedPassword

  next()
}

// Middleware to validate registration data
export const validateRegistration = (req: Request, res: Response, next: NextFunction) => {
  const { name, username, email, password } = req.body

  if (!name || !username || !email || !password) {
    return res.status(400).json({ message: 'All fields are required' })
  }

  const sanitizedName = sanitizeString(name)
  const sanitizedUsername = sanitizeString(username).toLowerCase()
  const sanitizedEmail = sanitizeString(email).toLowerCase()
  const sanitizedPassword = String(password)

  if (sanitizedName.length < 2 || sanitizedName.length > 100) {
    return res.status(400).json({ message: 'Name must be between 2 and 100 characters' })
  }

  if (!isValidUsername(sanitizedUsername)) {
    return res.status(400).json({
      message: 'Username must be 3-50 characters and contain only letters, numbers, hyphens, and underscores'
    })
  }

  if (!isValidEmail(sanitizedEmail)) {
    return res.status(400).json({ message: 'Invalid email format' })
  }

  if (!isValidPassword(sanitizedPassword)) {
    return res.status(400).json({
      message: 'Password must be between 6 and 200 characters'
    })
  }

  req.body.name = sanitizedName
  req.body.username = sanitizedUsername
  req.body.email = sanitizedEmail
  req.body.password = sanitizedPassword

  next()
}

// Middleware to validate employee creation
export const validateEmployee = (req: Request, res: Response, next: NextFunction) => {
  const { username, password, name, dob } = req.body

  if (!username || !password || !name || !dob) {
    return res.status(400).json({
      message: 'Username, password, name, and date of birth are required'
    })
  }

  const sanitizedUsername = sanitizeString(username).toLowerCase()
  const sanitizedName = sanitizeString(name)

  if (!isValidUsername(sanitizedUsername)) {
    return res.status(400).json({
      message: 'Username must be 3-50 characters and contain only letters, numbers, hyphens, and underscores'
    })
  }

  if (sanitizedName.length < 2 || sanitizedName.length > 100) {
    return res.status(400).json({ message: 'Name must be between 2 and 100 characters' })
  }

  if (!isValidPassword(String(password))) {
    return res.status(400).json({
      message: 'Password must be between 6 and 200 characters'
    })
  }

  // Validate date of birth
  const dobDate = new Date(dob)
  if (isNaN(dobDate.getTime())) {
    return res.status(400).json({ message: 'Invalid date of birth' })
  }

  const age = (Date.now() - dobDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25)
  if (age < 16 || age > 100) {
    return res.status(400).json({ message: 'Employee must be between 16 and 100 years old' })
  }

  req.body.username = sanitizedUsername
  req.body.name = sanitizedName

  next()
}

// Middleware to log validation errors
export const logValidationError = (req: Request, message: string) => {
  logger.warn('Validation failed', {
    path: req.path,
    method: req.method,
    ip: req.ip,
    message
  })
}
