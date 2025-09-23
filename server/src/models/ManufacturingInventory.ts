import mongoose, { Document, Schema } from 'mongoose'

export interface IManufacturingInventory extends Document {
  id: string
  productId: string
  productName: string
  cuttingId: string
  quantity: number
  quantityProduced: number
  quantityRemaining: number
  tailorName: string
  tailorMobile: string
  startDate: string
  completedDate?: string
  dueDate: string
  priority: 'Low' | 'Normal' | 'High' | 'Urgent'
  status: 'Pending' | 'In Progress' | 'Completed' | 'Cancelled'
  notes?: string
  createdAt: Date
  updatedAt: Date
}

const ManufacturingInventorySchema: Schema = new Schema({
  id: {
    type: String,
    required: true,
    unique: true
  },
  productId: {
    type: String,
    required: true,
    trim: true
  },
  productName: {
    type: String,
    required: true,
    trim: true
  },
  cuttingId: {
    type: String,
    required: true,
    trim: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  quantityProduced: {
    type: Number,
    default: 0,
    min: 0
  },
  quantityRemaining: {
    type: Number,
    required: true,
    min: 0
  },
  tailorName: {
    type: String,
    required: true,
    trim: true
  },
  tailorMobile: {
    type: String,
    required: true,
    trim: true
  },
  startDate: {
    type: String,
    required: true
  },
  completedDate: {
    type: String
  },
  dueDate: {
    type: String,
    required: true
  },
  priority: {
    type: String,
    required: true,
    enum: ['Low', 'Normal', 'High', 'Urgent'],
    default: 'Normal'
  },
  status: {
    type: String,
    required: true,
    enum: ['Pending', 'In Progress', 'Completed', 'Cancelled'],
    default: 'Pending'
  },
  notes: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
})

// Generate unique manufacturing inventory ID before saving
ManufacturingInventorySchema.pre('save', async function(next) {
  if (this.isNew && !this.id) {
    try {
      const productCode = (this.productName as string).substring(0, 3).toUpperCase()
      const tailorCode = (this.tailorName as string).substring(0, 2).toUpperCase()
      const randomNumber = Math.floor(Math.random() * 9000) + 1000
      
      let baseId = `MFG${productCode}${tailorCode}${randomNumber}`
      let finalId = baseId
      let attempt = 0
      
      // Check for duplicates and generate new ID if needed
      while (await mongoose.models.ManufacturingInventory.findOne({ id: finalId })) {
        attempt++
        const newRandomNumber = Math.floor(Math.random() * 9000) + 1000
        finalId = `MFG${productCode}${tailorCode}${newRandomNumber}`
        
        if (attempt > 10) {
          // Fallback with timestamp
          finalId = `MFG${productCode}${Date.now().toString().slice(-6)}`
          break
        }
      }
      
      this.id = finalId
      this.quantityRemaining = (this.quantity as number) - (this.quantityProduced as number)
    } catch (error) {
      this.id = `MFG${Date.now()}`
    }
  }
  
  // Update quantity remaining when quantity produced changes
  if (this.isModified('quantityProduced') || this.isModified('quantity')) {
    this.quantityRemaining = (this.quantity as number) - (this.quantityProduced as number)
  }
  
  next()
})

export const ManufacturingInventory = mongoose.model<IManufacturingInventory>('ManufacturingInventory', ManufacturingInventorySchema)