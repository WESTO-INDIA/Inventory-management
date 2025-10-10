import { Router } from 'express'
import { CuttingRecord } from '../models/CuttingRecord'
import { Fabric } from '../models/Fabric'

const router = Router()

// GET all cutting records
router.get('/', async (req, res) => {
  try {
    const cuttingRecords = await CuttingRecord.find().sort({ createdAt: -1 })
    res.json(cuttingRecords)
  } catch (error: any) {
    res.status(500).json({ message: 'Server error' })
  }
})

// GET cutting record by ID
router.get('/:id', async (req, res) => {
  try {
    const cuttingRecord = await CuttingRecord.findById(req.params.id)
    if (!cuttingRecord) {
      return res.status(404).json({ message: 'Cutting record not found' })
    }
    res.json(cuttingRecord)
  } catch (error: any) {
    res.status(500).json({ message: 'Server error' })
  }
})

// POST new cutting record
router.post('/', async (req, res) => {
  try {
    const {
      id,
      fabricType,
      fabricColor,
      productName,
      piecesCount,
      totalLengthUsed,
      sizeType,
      cuttingMaster,
      cuttingPricePerPiece,
      date
    } = req.body

    // Validate required fields
    if (!id || !fabricType || !fabricColor || !productName ||
        !piecesCount || !totalLengthUsed || !cuttingMaster || !date) {
      return res.status(400).json({ message: 'Missing required fields' })
    }

    const cuttingRecord = new CuttingRecord({
      id,
      fabricType,
      fabricColor,
      productName,
      piecesCount: parseInt(piecesCount),
      totalLengthUsed: parseFloat(totalLengthUsed),
      sizeType: sizeType || 'Mixed',
      sizeBreakdown: req.body.sizeBreakdown || [],
      cuttingMaster,
      cuttingPricePerPiece: parseFloat(cuttingPricePerPiece) || 0,
      date
    })

    // Save cutting record (no automatic fabric quantity update)
    await cuttingRecord.save()

    res.status(201).json({
      message: 'Cutting record created successfully.',
      cuttingRecord
    })
  } catch (error: any) {
    if (error.code === 11000) {
      res.status(400).json({ message: 'Cutting record with this ID already exists' })
    } else if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((err: any) => err.message).join(', ')
      res.status(400).json({ message: `Validation error: ${messages}` })
    } else {
      res.status(500).json({ message: `Server error: ${error.message}` })
    }
  }
})

// DELETE cutting record
router.delete('/:id', async (req, res) => {
  try {
    const cuttingRecord = await CuttingRecord.findById(req.params.id)
    if (!cuttingRecord) {
      return res.status(404).json({ message: 'Cutting record not found' })
    }

    const cuttingId = cuttingRecord.id

    // Delete the cutting record
    await CuttingRecord.findByIdAndDelete(req.params.id)

    // Also delete related transactions for this cutting record
    if (cuttingId) {
      const Transaction = require('../models/Transaction').Transaction
      await Transaction.deleteMany({ itemId: cuttingId })
    }

    res.json({ message: 'Cutting record and related transactions deleted successfully' })
  } catch (error: any) {
    res.status(500).json({ message: 'Server error' })
  }
})

export default router