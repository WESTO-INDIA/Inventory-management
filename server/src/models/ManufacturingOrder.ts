import mongoose, { Document, Schema } from 'mongoose'

export interface IManufacturingOrder extends Document {
  manufacturingId: string
  cuttingId: string
  fabricType: string
  fabricColor: string
  productName: string
  quantity: number
  size: string
  tailorName: string
  pricePerPiece: number
  totalAmount: number
  status: 'Pending' | 'Completed' | 'QR Deleted' | 'deleted'
  completionDate?: Date
  createdAt: Date
  updatedAt: Date
}

const ManufacturingOrderSchema: Schema = new Schema({
  manufacturingId: {
    type: String,
    required: true,
    trim: true,
    index: true // Keep index for performance, but not unique
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
  tailorName: {
    type: String,
    required: true,
    trim: true
  },
  pricePerPiece: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  totalAmount: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  status: {
    type: String,
    required: true,
    enum: ['Pending', 'Completed', 'QR Deleted', 'deleted'],
    default: 'Pending'
  },
  completionDate: {
    type: Date,
    required: false
  }
}, {
  timestamps: true
})

export const ManufacturingOrder = mongoose.model<IManufacturingOrder>('ManufacturingOrder', ManufacturingOrderSchema)