import { Router } from 'express'
import { ManufacturingOrder } from '../models/ManufacturingOrder'
import { CuttingRecord } from '../models/CuttingRecord'

const router = Router()

// GET all manufacturing orders
router.get('/', async (req, res) => {
  try {
    const manufacturingOrders = await ManufacturingOrder.find().sort({ createdAt: -1 })
    res.json(manufacturingOrders)
  } catch (error: any) {
    res.status(500).json({ message: 'Server error' })
  }
})

// GET manufacturing order by ID
router.get('/:id', async (req, res) => {
  try {
    const manufacturingOrder = await ManufacturingOrder.findById(req.params.id)
    if (!manufacturingOrder) {
      return res.status(404).json({ message: 'Manufacturing order not found' })
    }
    res.json(manufacturingOrder)
  } catch (error: any) {
    res.status(500).json({ message: 'Server error' })
  }
})

// POST new manufacturing order
router.post('/', async (req, res) => {
  try {
    const {
      manufacturingId,
      cuttingId,
      fabricType,
      fabricColor,
      productName,
      quantity,
      size,
      tailorName,
      pricePerPiece,
      totalAmount,
      status,
      dateOfReceive
    } = req.body

    // Validate required fields
    if (!cuttingId || !productName || !quantity || !size || !tailorName || !fabricType || !fabricColor) {
      return res.status(400).json({ message: 'Missing required fields' })
    }

    // Validate that cutting record exists (for reference only, not for quantity checking)
    const cuttingRecord = await CuttingRecord.findOne({ id: cuttingId })
    if (!cuttingRecord) {
      return res.status(404).json({ message: 'Cutting record not found' })
    }

    // Note: We do NOT check or update cutting record quantities
    // Cutting inventory remains unchanged

    // Use provided manufacturing ID or generate one
    let finalManufacturingId = manufacturingId
    if (!finalManufacturingId) {
      const allOrders = await ManufacturingOrder.find()
      const mfgIds = allOrders
        .filter(o => o.manufacturingId && o.manufacturingId.startsWith('MFG'))
        .map(o => {
          const numPart = o.manufacturingId.replace('MFG', '')
          return parseInt(numPart) || 0
        })
      const maxNum = mfgIds.length > 0 ? Math.max(...mfgIds) : 0
      const nextNum = maxNum + 1
      // Use at least 4 digits, but allow more if needed (supports beyond MFG9999)
      finalManufacturingId = `MFG${nextNum.toString().padStart(Math.max(4, nextNum.toString().length), '0')}`
    }

    const manufacturingOrder = new ManufacturingOrder({
      manufacturingId: finalManufacturingId,
      cuttingId,
      fabricType,
      fabricColor,
      productName,
      quantity: parseInt(quantity),
      size,
      tailorName,
      pricePerPiece: parseFloat(pricePerPiece) || 0,
      totalAmount: parseFloat(totalAmount) || 0,
      status: status || 'Pending'
    })

    await manufacturingOrder.save()

    // Note: Cutting record quantities are NOT automatically updated
    // They remain unchanged in the cutting inventory

    res.status(201).json({
      message: 'Manufacturing order created successfully',
      manufacturingOrder
    })
  } catch (error: any) {
    res.status(500).json({ message: 'Server error: ' + error.message })
  }
})

// PUT update manufacturing order
router.put('/:id', async (req, res) => {
  try {
    const manufacturingOrder = await ManufacturingOrder.findById(req.params.id)
    if (!manufacturingOrder) {
      return res.status(404).json({ message: 'Manufacturing order not found' })
    }

    const {
      fabricType,
      fabricColor,
      productName,
      quantity,
      size,
      tailorName,
      pricePerPiece,
      totalAmount,
      status
    } = req.body

    // Update fields
    if (fabricType) manufacturingOrder.fabricType = fabricType
    if (fabricColor) manufacturingOrder.fabricColor = fabricColor
    if (productName) manufacturingOrder.productName = productName
    if (quantity) manufacturingOrder.quantity = parseInt(quantity)
    if (size) manufacturingOrder.size = size
    if (tailorName) manufacturingOrder.tailorName = tailorName
    if (pricePerPiece !== undefined) manufacturingOrder.pricePerPiece = parseFloat(pricePerPiece)
    if (totalAmount !== undefined) manufacturingOrder.totalAmount = parseFloat(totalAmount)
    if (status) {
      manufacturingOrder.status = status

      // Set completion date when status changes to Completed or QR Deleted
      if (status === 'Completed' || status === 'QR Deleted') {
        manufacturingOrder.completionDate = new Date()
      }

      // If status is changed to "QR Deleted", delete the associated QR product from QR inventory
      if (status === 'QR Deleted') {
        const QRProduct = require('../models/QRProduct').QRProduct
        await QRProduct.deleteMany({ manufacturingId: manufacturingOrder.manufacturingId })
      }
    }

    await manufacturingOrder.save()

    res.json({
      message: 'Manufacturing order updated successfully',
      manufacturingOrder
    })
  } catch (error: any) {
    res.status(500).json({ message: 'Server error: ' + error.message })
  }
})

// PUT update all manufacturing orders with same manufacturingId to "QR Deleted"
router.put('/bulk-status/:manufacturingId', async (req, res) => {
  try {
    const { manufacturingId } = req.params
    const { status } = req.body

    // Find all manufacturing orders with this manufacturingId
    const manufacturingOrders = await ManufacturingOrder.find({ manufacturingId })

    if (!manufacturingOrders || manufacturingOrders.length === 0) {
      return res.status(404).json({ message: 'No manufacturing orders found with this ID' })
    }

    // Prepare update object
    const updateData: any = { status }

    // Set completion date when status changes to Completed or QR Deleted
    if (status === 'Completed' || status === 'QR Deleted') {
      updateData.completionDate = new Date()
    }

    // Update all records to the new status
    const updateResult = await ManufacturingOrder.updateMany(
      { manufacturingId },
      { $set: updateData }
    )

    // If status is "QR Deleted", also delete the associated QR products
    if (status === 'QR Deleted') {
      const QRProduct = require('../models/QRProduct').QRProduct
      await QRProduct.deleteMany({ manufacturingId })
    }

    res.json({
      message: `Successfully updated ${updateResult.modifiedCount} manufacturing order(s) to status: ${status}`,
      updatedCount: updateResult.modifiedCount,
      manufacturingId
    })
  } catch (error: any) {
    res.status(500).json({ message: 'Server error: ' + error.message })
  }
})

// DELETE manufacturing order
router.delete('/:id', async (req, res) => {
  try {
    const manufacturingOrder = await ManufacturingOrder.findById(req.params.id)
    if (!manufacturingOrder) {
      return res.status(404).json({ message: 'Manufacturing order not found' })
    }

    const manufacturingId = manufacturingOrder.manufacturingId

    // Check if there are OTHER records with the same manufacturingId
    const remainingRecords = await ManufacturingOrder.find({
      manufacturingId: manufacturingId,
      _id: { $ne: req.params.id } // Exclude the one being deleted
    })

    // Delete the manufacturing order first
    await ManufacturingOrder.findByIdAndDelete(req.params.id)

    // Only delete QR products and transactions if NO other records exist with this manufacturingId
    if (remainingRecords.length === 0) {
      // This is the LAST record with this manufacturingId
      // Safe to delete QR products and transactions
      const QRProduct = require('../models/QRProduct').QRProduct
      await QRProduct.deleteMany({ manufacturingId: manufacturingId })

      const Transaction = require('../models/Transaction').Transaction
      await Transaction.deleteMany({ itemId: manufacturingId })

      res.json({ message: 'Manufacturing order, QR codes, and transactions deleted successfully (last record)' })
    } else {
      // Other records still exist with this manufacturingId
      // Keep QR products and transactions
      res.json({ message: 'Manufacturing order deleted successfully (other records with same ID remain)' })
    }
  } catch (error: any) {
    res.status(500).json({ message: 'Server error: ' + error.message })
  }
})

export default router