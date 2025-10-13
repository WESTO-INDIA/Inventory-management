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

    // Find all manufacturing orders linked to this cutting ID
    const ManufacturingOrder = require('../models/ManufacturingOrder').ManufacturingOrder
    const manufacturingOrders = await ManufacturingOrder.find({ cuttingId })

    // Collect all unique manufacturing IDs from these orders
    const manufacturingIds = [...new Set(manufacturingOrders.map((order: any) => order.manufacturingId))]

    // Delete the cutting record first
    await CuttingRecord.findByIdAndDelete(req.params.id)

    // Delete all manufacturing orders linked to this cutting ID
    let deletedManufacturingCount = 0
    if (manufacturingOrders.length > 0) {
      const deleteResult = await ManufacturingOrder.deleteMany({ cuttingId })
      deletedManufacturingCount = deleteResult.deletedCount || 0
    }

    // Delete all QR products for the manufacturing IDs
    let deletedQRProductsCount = 0
    if (manufacturingIds.length > 0) {
      const QRProduct = require('../models/QRProduct').QRProduct
      const qrDeleteResult = await QRProduct.deleteMany({
        manufacturingId: { $in: manufacturingIds }
      })
      deletedQRProductsCount = qrDeleteResult.deletedCount || 0
    }

    // Delete all transactions related to:
    // 1. The cutting record itself (itemId = cuttingId)
    // 2. All manufacturing orders (itemId in manufacturingIds)
    const Transaction = require('../models/Transaction').Transaction
    let deletedTransactionsCount = 0

    const transactionDeleteResult = await Transaction.deleteMany({
      $or: [
        { itemId: cuttingId }, // Transactions for cutting record
        { itemId: { $in: manufacturingIds } } // Transactions for manufacturing orders
      ]
    })
    deletedTransactionsCount = transactionDeleteResult.deletedCount || 0

    res.json({
      message: 'Cutting record and all related data deleted successfully',
      details: {
        cuttingId,
        deletedManufacturingOrders: deletedManufacturingCount,
        deletedQRProducts: deletedQRProductsCount,
        deletedTransactions: deletedTransactionsCount
      }
    })
  } catch (error: any) {
    console.error('Error deleting cutting record:', error)
    res.status(500).json({ message: 'Server error: ' + error.message })
  }
})

export default router