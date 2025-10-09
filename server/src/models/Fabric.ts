import mongoose, { Document, Schema } from 'mongoose'

export interface IFabric extends Document {
  fabricId: string
  fabricType: string
  color: string
  length: number
  quantity: number
  purchasePrice?: number
  totalPrice?: number
  notes?: string
  status: 'In Stock' | 'Low Stock' | 'Out of Stock'
  dateReceived: Date
  createdAt: Date
  updatedAt: Date
}

const FabricSchema: Schema = new Schema({
  fabricId: {
    type: String,
    unique: true,
    sparse: true // Allow multiple null values, but unique non-null values
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
  quantity: {
    type: Number,
    required: true,
    min: 0
  },
  purchasePrice: {
    type: Number,
    min: 0
  },
  totalPrice: {
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

// Auto-set status based on quantity before saving
FabricSchema.pre('save', async function(next) {
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