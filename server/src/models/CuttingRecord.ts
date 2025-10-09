import mongoose, { Document, Schema } from 'mongoose'

export interface ISizeBreakdown {
  size: string
  quantity: number
}

export interface ICuttingRecord extends Document {
  id: string
  fabricType: string
  fabricColor: string
  productName: string
  piecesCount: number
  totalLengthUsed: number
  sizeType: string
  sizeBreakdown?: ISizeBreakdown[]
  cuttingMaster: string
  cuttingPricePerPiece?: number
  cuttingGivenTo?: string        // ✅ Added
  notes?: string
  date: string
  createdAt: Date
  updatedAt: Date
}

const CuttingRecordSchema: Schema = new Schema({
  id: {
    type: String,
    required: true,
    unique: true
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
  piecesCount: {
    type: Number,
    required: true,
    min: 1
  },
  totalLengthUsed: {
    type: Number,
    required: true,
    min: 0.1
  },
  sizeType: {
    type: String,
    required: false,
    enum: ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'Mixed']
  },
  sizeBreakdown: [{
    size: {
      type: String,
      enum: ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL']
    },
    quantity: {
      type: Number,
      min: 0
    }
  }],
  cuttingMaster: {
    type: String,
    required: true,
    trim: true
  },
  cuttingPricePerPiece: {
    type: Number,
    min: 0,
    default: 0
  },
  date: {
    type: String,
    required: true
  }
}, {
  timestamps: true
})

export const CuttingRecord = mongoose.model<ICuttingRecord>('CuttingRecord', CuttingRecordSchema)