import mongoose, { Document, Schema } from 'mongoose'

export interface ICuttingRecord extends Document {
  id: string
  productId: string
  fabricType: string
  fabricColor: string
  productName: string
  piecesCount: number
  piecesRemaining: number
  piecesManufactured: number
  pieceLength: number
  pieceWidth: number
  totalSquareMetersUsed: number
  sizeType: string
  cuttingMaster: string
  cuttingGivenTo: string
  tailorItemPerPiece?: number
  date: string
  time: string
  notes?: string
  createdAt: Date
  updatedAt: Date
}

const CuttingRecordSchema: Schema = new Schema({
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
  piecesRemaining: {
    type: Number,
    required: true,
    min: 0
  },
  piecesManufactured: {
    type: Number,
    default: 0,
    min: 0
  },
  pieceLength: {
    type: Number,
    required: true,
    min: 0.1
  },
  pieceWidth: {
    type: Number,
    required: true,
    min: 0.1
  },
  totalSquareMetersUsed: {
    type: Number,
    required: true,
    min: 0
  },
  sizeType: {
    type: String,
    required: true,
    enum: ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL']
  },
  cuttingMaster: {
    type: String,
    required: true,
    trim: true
  },
  cuttingGivenTo: {
    type: String,
    required: true,
    trim: true
  },
  tailorItemPerPiece: {
    type: Number,
    min: 0,
    default: 0
  },
  date: {
    type: String,
    required: true
  },
  time: {
    type: String,
    required: true
  },
  notes: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
})

// Initialize piecesRemaining when creating new record
CuttingRecordSchema.pre('save', async function(next) {
  if (this.isNew && this.piecesRemaining === undefined) {
    this.piecesRemaining = this.piecesCount
  }
  next()
})

export const CuttingRecord = mongoose.model<ICuttingRecord>('CuttingRecord', CuttingRecordSchema)