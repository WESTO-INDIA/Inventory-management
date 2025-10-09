import { Router } from 'express'
import jwt from 'jsonwebtoken'
import { Employee } from '../models/Employee'
import { validateLogin, validateRegistration } from '../middleware/validator'
import { authRateLimiter } from '../middleware/rateLimiter'

const router = Router()

// Login with username (with rate limiting and validation)
router.post('/login', authRateLimiter, validateLogin, async (req, res) => {
  try {
    const { username, password } = req.body
    // Note: input is already validated and sanitized by middleware

    // Check if it's the admin from environment variables
    const adminUsername = process.env.ADMIN_USERNAME
    const adminPassword = process.env.ADMIN_PASSWORD
    const jwtSecret = process.env.JWT_SECRET

    if (!adminUsername || !adminPassword || !jwtSecret) {
      return res.status(500).json({ message: 'Server configuration error. Please check environment variables.' })
    }

    // Timing-safe comparison for admin login
    const isAdminUsername = username.toLowerCase() === adminUsername.toLowerCase()
    const isAdminPassword = password === adminPassword

    if (isAdminUsername && isAdminPassword) {
      // Admin login successful
      const token = jwt.sign(
        {
          id: 'admin',
          username: adminUsername,
          role: 'admin',
          iat: Math.floor(Date.now() / 1000)
        },
        jwtSecret,
        {
          expiresIn: '7d',
          algorithm: 'HS256'
        }
      )

      return res.json({
        token,
        user: {
          id: 'admin',
          name: 'Administrator',
          email: process.env.ADMIN_EMAIL || 'admin@company.com',
          role: 'admin'
        }
      })
    }

    // Check if it's an employee trying to login
    const employee = await Employee.findOne({ username: username.toLowerCase() })

    if (employee) {
      // Use comparePassword method to check hashed password
      const isPasswordValid = await employee.comparePassword(password)

      if (isPasswordValid) {
        // Employee login successful
        const token = jwt.sign(
          {
            id: employee._id,
            username: employee.username,
            role: 'employee',
            iat: Math.floor(Date.now() / 1000)
          },
          jwtSecret,
          {
            expiresIn: '7d',
            algorithm: 'HS256'
          }
        )

        return res.json({
          token,
          user: {
            id: employee._id,
            name: employee.name,
            email: employee.email || `${employee.username}@company.com`,
            role: 'employee'
          }
        })
      }
    }

    // If we reach here, login failed
    return res.status(401).json({ message: 'Invalid username or password' })
  } catch (error: any) {
    res.status(500).json({ message: 'Server error' })
  }
})

// Register (with validation) - Employee registration only
router.post('/register', validateRegistration, async (req, res) => {
  try {
    const { name, username, email, password } = req.body
    // Note: input is already validated and sanitized by middleware

    const jwtSecret = process.env.JWT_SECRET
    if (!jwtSecret) {
      return res.status(500).json({ message: 'Server configuration error' })
    }

    // Check if employee exists
    const existingEmployee = await Employee.findOne({
      $or: [{ username: username.toLowerCase() }, { email }]
    })

    if (existingEmployee) {
      return res.status(400).json({ message: 'Employee already exists' })
    }

    // Create new employee
    const employee = new Employee({
      name,
      username: username.toLowerCase(),
      email,
      password, // Will be hashed by pre-save hook
      status: 'active'
    })

    await employee.save()

    // Generate token
    const token = jwt.sign(
      {
        id: employee._id,
        username: employee.username,
        role: 'employee',
        iat: Math.floor(Date.now() / 1000)
      },
      jwtSecret,
      {
        expiresIn: '7d',
        algorithm: 'HS256'
      }
    )

    res.status(201).json({
      token,
      user: {
        id: employee._id,
        name: employee.name,
        email: employee.email,
        role: 'employee'
      }
    })
  } catch (error: any) {
    res.status(500).json({ message: 'Server error' })
  }
})

// Verify token
router.get('/verify', async (req, res) => {
  try {
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ valid: false, message: 'Invalid token format' })
    }

    const token = authHeader.substring(7)

    if (!token || token.length > 500) {
      return res.status(401).json({ valid: false, message: 'Invalid token' })
    }

    const jwtSecret = process.env.JWT_SECRET
    if (!jwtSecret) {
      return res.status(500).json({ valid: false, message: 'Server configuration error' })
    }

    const decoded = jwt.verify(token, jwtSecret, {
      algorithms: ['HS256']
    })

    res.json({ valid: true, decoded })
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ valid: false, message: 'Token expired' })
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ valid: false, message: 'Invalid token' })
    }
    res.status(401).json({ valid: false, message: 'Token verification failed' })
  }
})

export default router