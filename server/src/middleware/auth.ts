import jwt from 'jsonwebtoken'
import { User } from '../models/User'

export const authMiddleware = {
  async verifyToken(token: string) {
    try {
      const decoded: any = jwt.verify(token, process.env.JWT_SECRET || 'secret-key')
      const user = await User.findById(decoded.id).select('-password')
      return user
    } catch (error) {
      return null
    }
  },

  async authenticate(req: any, res: any, next: any) {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '')
      
      if (!token) {
        return res.status(401).json({ message: 'Authentication required' })
      }

      const decoded: any = jwt.verify(token, process.env.JWT_SECRET || 'secret-key')
      const user = await User.findById(decoded.id).select('-password')
      
      if (!user) {
        return res.status(401).json({ message: 'User not found' })
      }

      req.user = user
      next()
    } catch (error) {
      res.status(401).json({ message: 'Invalid token' })
    }
  }
}