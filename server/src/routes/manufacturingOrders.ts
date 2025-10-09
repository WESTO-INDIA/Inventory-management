import { Router } from 'express'
import { ManufacturingOrder } from '../models/ManufacturingOrder'
import { ManufacturingInventory } from '../models/ManufacturingInventory'
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
      finalManufacturingId = `MFG${(maxNum + 1).toString().padStart(4, '0')}`
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
    console.error('Error creating manufacturing order:', error)
    res.status(500).json({ message: 'Server error: ' + error.message })
  }
})

// PUT update manufacturing order
router.put('/:id', async (req, res) => {
  try {
    console.log('PUT /manufacturing-orders/:id called')
    console.log('ID:', req.params.id)
    console.log('Request body:', req.body)

    const manufacturingOrder = await ManufacturingOrder.findById(req.params.id)
    if (!manufacturingOrder) {
      console.log('Manufacturing order not found')
      return res.status(404).json({ message: 'Manufacturing order not found' })
    }

    console.log('Current status:', manufacturingOrder.status)

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
      console.log('Updating status to:', status)
      manufacturingOrder.status = status
    }

    await manufacturingOrder.save()
    console.log('New status after save:', manufacturingOrder.status)

    res.json({
      message: 'Manufacturing order updated successfully',
      manufacturingOrder
    })
  } catch (error: any) {
    console.error('Error updating manufacturing order:', error)
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

    // Also delete any associated QR products
    const QRProduct = require('../models/QRProduct').QRProduct
    await QRProduct.deleteMany({ manufacturingId: manufacturingOrder.manufacturingId })

    // Delete the manufacturing order
    await ManufacturingOrder.findByIdAndDelete(req.params.id)

    res.json({ message: 'Manufacturing order and associated QR codes deleted successfully' })
  } catch (error: any) {
    console.error('Error deleting manufacturing order:', error)
    res.status(500).json({ message: 'Server error: ' + error.message })
  }
})

export default router