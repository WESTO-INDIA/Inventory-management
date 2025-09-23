import mongoose, { Document, Schema } from 'mongoose'

export interface IFabric extends Document {
  productId: string
  fabricId: string
  fabricType: string
  color: string
  length: number
  width: number
  quantity: number
  supplier: string
  purchasePrice?: number
  notes?: string
  status: 'In Stock' | 'Low Stock' | 'Out of Stock'
  dateReceived: Date
  createdAt: Date
  updatedAt: Date
}

const FabricSchema: Schema = new Schema({
  productId: {
    type: String,
    unique: true
  },
  fabricId: {
    type: String,
    unique: true
  },
  fabricType: {
    type: String,
    required: true,
    trim: true
  },
  color: {
    type: String,
    required: true,
    trim: true
  },
  length: {
    type: Number,
    required: true,
    min: 0.1
  },
  width: {
    type: Number,
    required: true,
    min: 0.1
  },
  quantity: {
    type: Number,
    required: true,
    min: 0
  },
  supplier: {
    type: String,
    required: true,
    trim: true
  },
  purchasePrice: {
    type: Number,
    min: 0
  },
  notes: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    required: true,
    enum: ['In Stock', 'Low Stock', 'Out of Stock'],
    default: 'In Stock'
  },
  dateReceived: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
})

// Generate unique product ID and fabricId before saving
FabricSchema.pre('save', async function(next) {
  if (this.isNew && (!this.productId || !this.fabricId)) {
    try {
      // Get first 3 letters of fabric type (uppercase)
      const fabricTypeCode = (this.fabricType as string).substring(0, 3).toUpperCase().padEnd(3, 'X')

      // Generate 5-character alphanumeric serial
      const generateAlphanumericSerial = (): string => {
        const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'
        let serial = ''
        for (let i = 0; i < 5; i++) {
          serial += chars.charAt(Math.floor(Math.random() * chars.length))
        }
        return serial
      }

      let productId = ''
      let isUnique = false
      let attempts = 0
      const maxAttempts = 10

      while (!isUnique && attempts < maxAttempts) {
        // Generate new 8-character ID: 3 letters from fabric type + 5 alphanumeric serial
        const serial = generateAlphanumericSerial()
        productId = `${fabricTypeCode}${serial}`

        // Check if this ID already exists
        const existingFabric = await (this.constructor as any).findOne({ productId })
        if (!existingFabric) {
          isUnique = true
        } else {
          attempts++
        }
      }

      // Fallback to timestamp-based ID if all attempts failed
      if (!isUnique) {
        const timestamp = String(Date.now())
        productId = `${fabricTypeCode}${timestamp.slice(-5).padStart(5, '0')}`
      }

      this.productId = productId
      this.fabricId = productId // Use same ID for both fields
    } catch (error) {
      // Ultimate fallback ID generation
      const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'
      let fallbackSerial = ''
      for (let i = 0; i < 5; i++) {
        fallbackSerial += chars.charAt(Math.floor(Math.random() * chars.length))
      }
      const fallbackId = `FAB${fallbackSerial}`
      this.productId = fallbackId
      this.fabricId = fallbackId
    }
  }
  
  // Auto-set status based on quantity
  if (this.quantity === 0) {
    this.status = 'Out of Stock'
  } else if ((this.quantity as number) <= 20) {
    this.status = 'Low Stock'
  } else {
    this.status = 'In Stock'
  }
  
  next()
})

export const Fabric = mongoose.model<IFabric>('Fabric', FabricSchema)