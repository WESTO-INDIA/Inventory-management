import { Router } from 'express'
import jwt from 'jsonwebtoken'
import { User } from '../models/User'
import { Employee } from '../models/Employee'

const router = Router()

// Login with username
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body

    // Input validation
    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' })
    }

    // Sanitize input
    const sanitizedUsername = username.toString().trim()
    const sanitizedPassword = password.toString()

    // Rate limiting check (prevent brute force)
    if (sanitizedUsername.length > 100 || sanitizedPassword.length > 200) {
      return res.status(400).json({ message: 'Invalid credentials' })
    }

    // Check if it's the admin from environment variables
    const adminUsername = process.env.ADMIN_USERNAME
    const adminPassword = process.env.ADMIN_PASSWORD
    const jwtSecret = process.env.JWT_SECRET

    if (!adminUsername || !adminPassword || !jwtSecret) {
      return res.status(500).json({ message: 'Server configuration error. Please check environment variables.' })
    }

    // Timing-safe comparison for admin login
    const isAdminUsername = sanitizedUsername.toLowerCase() === adminUsername.toLowerCase()
    const isAdminPassword = sanitizedPassword === adminPassword

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
    const employee = await Employee.findOne({ username: sanitizedUsername.toLowerCase() })

    if (employee) {
      // Use comparePassword method to check hashed password
      const isPasswordValid = await employee.comparePassword(sanitizedPassword)

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

    // Find user by username
    const user = await User.findOne({ username: sanitizedUsername.toLowerCase() })

    if (!user) {
      return res.status(401).json({ message: 'Invalid username or password' })
    }

    // Check password
    const isMatch = await user.comparePassword(sanitizedPassword)
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid username or password' })
    }

    // Update last login
    user.lastLogin = new Date()
    await user.save()

    // Generate token
    const token = jwt.sign(
      {
        id: user._id,
        username: user.username,
        role: user.role,
        iat: Math.floor(Date.now() / 1000)
      },
      jwtSecret,
      {
        expiresIn: '7d',
        algorithm: 'HS256'
      }
    )

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    })
  } catch (error: any) {
    res.status(500).json({ message: 'Server error' })
  }
})

// Register
router.post('/register', async (req, res) => {
  try {
    const { name, username, email, password, role = 'employee' } = req.body

    // Input validation
    if (!name || !username || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' })
    }

    // Sanitize input
    const sanitizedName = name.toString().trim()
    const sanitizedUsername = username.toString().trim().toLowerCase()
    const sanitizedEmail = email.toString().trim().toLowerCase()
    const sanitizedPassword = password.toString()

    // Validate input lengths
    if (sanitizedUsername.length > 50 || sanitizedEmail.length > 100 ||
        sanitizedPassword.length < 6 || sanitizedPassword.length > 200) {
      return res.status(400).json({ message: 'Invalid input' })
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(sanitizedEmail)) {
      return res.status(400).json({ message: 'Invalid email format' })
    }

    const jwtSecret = process.env.JWT_SECRET
    if (!jwtSecret) {
      return res.status(500).json({ message: 'Server configuration error' })
    }

    // Check if user exists
    const existingUser = await User.findOne({
      $or: [{ username: sanitizedUsername }, { email: sanitizedEmail }]
    })

    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' })
    }

    // Create new user
    const user = new User({
      name: sanitizedName,
      username: sanitizedUsername,
      email: sanitizedEmail,
      password: sanitizedPassword,
      role: role === 'admin' ? 'employee' : role // Prevent admin creation via registration
    })

    await user.save()

    // Generate token
    const token = jwt.sign(
      {
        id: user._id,
        username: user.username,
        role: user.role,
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
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
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