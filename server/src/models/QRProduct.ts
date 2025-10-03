import mongoose, { Document, Schema } from 'mongoose'

export interface IQRProduct extends Document {
  productId: string
  manufacturingId: string
  productName: string
  fabricType?: string
  color: string
  size: string
  quantity: number
  tailorName: string
  qrCodeData?: string
  isGenerated: boolean
  generatedDate: string
  cuttingId?: string
  notes?: string
  pricePerPiece?: number
  totalPrice?: number
  companyName?: string
  companyLogo?: string
  createdAt: Date
  updatedAt: Date
}

const QRProductSchema: Schema = new Schema({
  productId: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  manufacturingId: {
    type: String,
    required: true,
    trim: true
  },
  productName: {
    type: String,
    required: true,
    trim: true
  },
  fabricType: {
    type: String,
    trim: true,
    default: 'N/A'
  },
  color: {
    type: String,
    required: true,
    trim: true
  },
  size: {
    type: String,
    required: true,
    trim: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  tailorName: {
    type: String,
    required: true,
    trim: true
  },
  qrCodeData: {
    type: String,
    required: false,
    default: ''
  },
  isGenerated: {
    type: Boolean,
    default: true
  },
  generatedDate: {
    type: String,
    required: true
  },
  cuttingId: {
    type: String,
    trim: true
  },
  notes: {
    type: String,
    trim: true
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
  companyName: {
    type: String,
    default: 'Westo-India',
    trim: true
  },
  companyLogo: {
    type: String,
    default: '🏢',
    trim: true
  }
}, {
  timestamps: true
})

export const QRProduct = mongoose.model<IQRProduct>('QRProduct', QRProductSchema)