import mongoose, { Document, Schema } from 'mongoose'

export interface IManufacturingOrder extends Document {
  manufacturingId: string
  cuttingId: string
  fabricType: string
  fabricColor: string
  productName: string
  quantity: number
  size: string
  quantityReceive: number
  quantityRemaining: number
  itemsReceived?: number
  pricePerPiece?: number
  totalPrice?: number
  dateOfReceive: string
  tailorName: string
  priority: 'Low' | 'Normal' | 'High' | 'Urgent'
  status: 'Pending' | 'In Progress' | 'Completed' | 'Cancelled'
  notes?: string
  createdAt: Date
  updatedAt: Date
}

const ManufacturingOrderSchema: Schema = new Schema({
  manufacturingId: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  cuttingId: {
    type: String,
    required: true,
    trim: true
  },
  fabricType: {
    type: String,
    required: true,
    trim: true
  },
  fabricColor: {
    type: String,
    required: true,
    trim: true
  },
  productName: {
    type: String,
    required: true,
    trim: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  size: {
    type: String,
    required: true,
    trim: true
  },
  quantityReceive: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  quantityRemaining: {
    type: Number,
    required: true,
    min: 0
  },
  itemsReceived: {
    type: Number,
    min: 0,
    default: 0
  },
  pricePerPiece: {
    type: Number,
    min: 0,
    default: 0
  },
  totalPrice: {
    type: Number,
    min: 0,
    default: 0
  },
  dateOfReceive: {
    type: String,
    required: true
  },
  tailorName: {
    type: String,
    required: true,
    trim: true
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

export const ManufacturingOrder = mongoose.model<IManufacturingOrder>('ManufacturingOrder', ManufacturingOrderSchema)