import { Schema, model, Document } from 'mongoose'
import bcrypt from 'bcryptjs'

export interface IUser extends Document {
  name: string
  username: string
  email: string
  password: string
  role: 'admin' | 'manager' | 'employee'
  department?: string
  avatar?: string
  isActive: boolean
  lastLogin?: Date
  comparePassword(candidatePassword: string): Promise<boolean>
}

const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true
    },
    password: {
      type: String,
      required: true,
      minlength: 6
    },
    role: {
      type: String,
      enum: ['admin', 'manager', 'employee'],
      default: 'employee',
      index: true
    },
    department: {
      type: String,
      index: true
    },
    avatar: String,
    isActive: {
      type: Boolean,
      default: true,
      index: true
    },
    lastLogin: Date
  },
  {
    timestamps: true,
    optimisticConcurrency: true
  }
)

// Compound indexes for common queries
userSchema.index({ role: 1, department: 1 })
userSchema.index({ isActive: 1, role: 1 })
userSchema.index({ createdAt: -1 })

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next()
  
  try {
    const salt = await bcrypt.genSalt(10)
    this.password = await bcrypt.hash(this.password, salt)
    next()
  } catch (error: any) {
    next(error)
  }
})

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password)
}

export const User = model<IUser>('User', userSchema)