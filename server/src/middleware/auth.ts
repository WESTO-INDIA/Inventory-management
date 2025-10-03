import jwt from 'jsonwebtoken'
import { User } from '../models/User'
import { Employee } from '../models/Employee'
import { logger } from '../utils/logger'

export const authMiddleware = {
  async verifyToken(token: string) {
    try {
      const decoded: any = jwt.verify(token, process.env.JWT_SECRET || 'secret-key')

      // Check if it's admin (special case - id is 'admin')
      if (decoded.id === 'admin') {
        return { id: 'admin', role: 'admin', username: decoded.username }
      }

      // Try to find user in Employee table first
      let user = await Employee.findById(decoded.id).select('-password')
      if (user) return user

      // Then try User table
      user = await User.findById(decoded.id).select('-password')
      return user
    } catch (error) {
      return null
    }
  },

  async authenticate(req: any, res: any, next: any) {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '')

      if (!token) {
        logger.warn('Authentication failed: No token provided')
        return res.status(401).json({ message: 'Authentication required' })
      }

      const decoded: any = jwt.verify(token, process.env.JWT_SECRET || 'secret-key')
      logger.info('Token decoded:', { id: decoded.id, role: decoded.role, username: decoded.username })

      // Check if it's admin (special case - id is 'admin')
      if (decoded.id === 'admin') {
        req.user = {
          id: 'admin',
          role: 'admin',
          username: decoded.username,
          name: 'Administrator'
        }
        logger.info('Admin authenticated successfully')
        return next()
      }

      // Try to find user in Employee table first
      let user = await Employee.findById(decoded.id).select('-password')

      // If not found in Employee, try User table
      if (!user) {
        user = await User.findById(decoded.id).select('-password')
      }

      if (!user) {
        logger.warn('Authentication failed: User not found', { id: decoded.id })
        return res.status(401).json({ message: 'User not found' })
      }

      req.user = user
      logger.info('User authenticated successfully', { id: user._id, role: decoded.role })
      next()
    } catch (error: any) {
      logger.error('Authentication error:', error.message)
      res.status(401).json({ message: 'Invalid token' })
    }
  }
}