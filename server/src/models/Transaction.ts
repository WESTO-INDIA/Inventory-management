import mongoose, { Document, Schema } from 'mongoose'

export interface ITransaction extends Document {
  transactionId: string
  timestamp: Date
  itemType: 'FABRIC' | 'MANUFACTURING' | 'CUTTING' | 'QR_GENERATED' | 'UNKNOWN'
  itemId: string
  itemName: string
  action: 'ADD' | 'REMOVE' | 'STOCK_IN' | 'STOCK_OUT' | 'QR_GENERATED'
  quantity: number
  previousStock: number
  newStock: number
  performedBy: string
  source: 'QR_SCANNER' | 'MANUAL' | 'QR_GENERATION'
  createdAt: Date
  updatedAt: Date
}

const TransactionSchema: Schema = new Schema({
  transactionId: {
    type: String,
    unique: true
  },
  timestamp: {
    type: Date,
    required: true,
    default: Date.now
  },
  itemType: {
    type: String,
    required: true,
    enum: ['FABRIC', 'MANUFACTURING', 'CUTTING', 'QR_GENERATED', 'UNKNOWN'],
    default: 'UNKNOWN'
  },
  itemId: {
    type: String,
    required: true,
    trim: true
  },
  itemName: {
    type: String,
    required: true,
    trim: true
  },
  action: {
    type: String,
    required: true,
    enum: ['ADD', 'REMOVE', 'STOCK_IN', 'STOCK_OUT', 'QR_GENERATED']
  },
  quantity: {
    type: Number,
    required: true,
    min: 0
  },
  previousStock: {
    type: Number,
    required: true,
    min: 0
  },
  newStock: {
    type: Number,
    required: true,
    min: 0
  },
  performedBy: {
    type: String,
    required: true,
    trim: true
  },
  source: {
    type: String,
    required: true,
    enum: ['QR_SCANNER', 'MANUAL', 'QR_GENERATION'],
    default: 'MANUAL'
  }
}, {
  timestamps: true
})

// Generate unique transaction ID before saving
TransactionSchema.pre('save', async function(next) {
  if (this.isNew && !this.transactionId) {
    try {
      let actionCode = 'T'
      switch(this.action) {
        case 'ADD': actionCode = 'A'; break
        case 'REMOVE': actionCode = 'R'; break
        case 'STOCK_IN': actionCode = 'I'; break
        case 'STOCK_OUT': actionCode = 'O'; break
        case 'QR_GENERATED': actionCode = 'Q'; break
      }
      const typeCode = (this.itemType as string).charAt(0)
      const timestamp = Date.now().toString().slice(-6)
      const randomNumber = Math.floor(Math.random() * 999) + 1

      let baseId = `TXN${actionCode}${typeCode}${timestamp}${randomNumber.toString().padStart(3, '0')}`
      let finalId = baseId
      let attempt = 0

      // Check for duplicates and generate new ID if needed
      while (await mongoose.models.Transaction.findOne({ transactionId: finalId })) {
        attempt++
        const newRandomNumber = Math.floor(Math.random() * 999) + 1
        finalId = `TXN${actionCode}${typeCode}${timestamp}${newRandomNumber.toString().padStart(3, '0')}`

        if (attempt > 10) {
          // Fallback with extended timestamp
          finalId = `TXN${actionCode}${typeCode}${Date.now().toString().slice(-8)}`
          break
        }
      }

      this.transactionId = finalId
    } catch (error) {
      this.transactionId = `TXN${Date.now()}`
    }
  }

  next()
})

// Index for better query performance
TransactionSchema.index({ timestamp: -1 })
TransactionSchema.index({ itemId: 1, timestamp: -1 })
TransactionSchema.index({ itemType: 1, timestamp: -1 })
TransactionSchema.index({ performedBy: 1, timestamp: -1 })

export const Transaction = mongoose.model<ITransaction>('Transaction', TransactionSchema)