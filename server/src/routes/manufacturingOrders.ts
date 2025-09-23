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
      cuttingId,
      fabricType,
      fabricColor,
      productName,
      quantity,
      quantityReceive,
      itemsReceived,
      pricePerPiece,
      totalPrice,
      dateOfReceive,
      tailorName,
      priority,
      status,
      notes
    } = req.body

    // Validate required fields
    if (!cuttingId || !productName || !quantity || !dateOfReceive || !tailorName || !fabricType || !fabricColor) {
      return res.status(400).json({ message: 'Missing required fields' })
    }

    // Get cutting record to get size and price information
    const cuttingRecord = await CuttingRecord.findOne({ id: cuttingId })
    if (!cuttingRecord) {
      return res.status(404).json({ message: 'Cutting record not found' })
    }

    // Generate manufacturing ID
    const productCode = productName.substring(0, 2).toUpperCase()
    const tailorCode = tailorName.substring(0, 2).toUpperCase()
    const randomNumber = Math.floor(Math.random() * 900) + 100
    const manufacturingId = `MFG${productCode}${tailorCode}${randomNumber}`

    const quantityReceiveNum = parseInt(quantityReceive) || 0
    const quantityRemaining = parseInt(quantity) - quantityReceiveNum

    // Auto-detect price from cutting record if not provided
    const finalPricePerPiece = pricePerPiece !== undefined ? pricePerPiece : (cuttingRecord.tailorItemPerPiece || 0)
    const finalItemsReceived = itemsReceived || quantityReceiveNum
    const finalTotalPrice = totalPrice !== undefined ? totalPrice : (finalItemsReceived * finalPricePerPiece)

    const manufacturingOrder = new ManufacturingOrder({
      manufacturingId,
      cuttingId,
      fabricType,
      fabricColor,
      productName,
      quantity: parseInt(quantity),
      size: cuttingRecord.sizeType || 'N/A',
      quantityReceive: quantityReceiveNum,
      quantityRemaining,
      itemsReceived: finalItemsReceived,
      pricePerPiece: finalPricePerPiece,
      totalPrice: finalTotalPrice,
      dateOfReceive,
      tailorName,
      priority: priority || 'Normal',
      status: status || 'Pending',
      notes
    })

    await manufacturingOrder.save()

    // Also create a manufacturing inventory record
    try {
      const productId = cuttingRecord?.productId || `PROD${Date.now()}`

      const manufacturingInventory = new ManufacturingInventory({
        id: manufacturingId,
        productId,
        productName,
        cuttingId,
        quantity: parseInt(quantity),
        quantityProduced: quantityReceiveNum,
        quantityRemaining,
        tailorName,
        startDate: new Date().toISOString().split('T')[0],
        dueDate: dateOfReceive,
        priority: priority || 'Normal',
        status: status || 'Pending',
        notes
      })

      await manufacturingInventory.save()
    } catch (inventoryError) {
      // Continue even if inventory creation fails
    }

    res.status(201).json({
      message: 'Manufacturing order created successfully',
      manufacturingOrder
    })
  } catch (error: any) {
    res.status(500).json({ message: 'Server error' })
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
      quantity,
      quantityReceive,
      quantityRemaining,
      itemsReceived,
      pricePerPiece,
      totalPrice,
      dateOfReceive,
      tailorName,
      priority,
      status,
      notes
    } = req.body

    // Update fields
    if (fabricType) manufacturingOrder.fabricType = fabricType
    if (fabricColor) manufacturingOrder.fabricColor = fabricColor
    if (quantity) manufacturingOrder.quantity = parseInt(quantity)
    if (quantityReceive !== undefined) {
      manufacturingOrder.quantityReceive = parseInt(quantityReceive)
    }
    if (quantityRemaining !== undefined) {
      manufacturingOrder.quantityRemaining = parseInt(quantityRemaining)
    }
    if (itemsReceived !== undefined) {
      manufacturingOrder.itemsReceived = itemsReceived
    }
    if (pricePerPiece !== undefined) {
      manufacturingOrder.pricePerPiece = pricePerPiece
    } else if (!manufacturingOrder.pricePerPiece) {
      // If no price, try to get from cutting record
      const cuttingRecord = await CuttingRecord.findOne({ id: manufacturingOrder.cuttingId })
      if (cuttingRecord && cuttingRecord.tailorItemPerPiece) {
        manufacturingOrder.pricePerPiece = cuttingRecord.tailorItemPerPiece
      }
    }
    if (totalPrice !== undefined) {
      manufacturingOrder.totalPrice = totalPrice
    } else {
      // Auto-calculate total price
      const items = manufacturingOrder.itemsReceived || manufacturingOrder.quantityReceive || 0
      manufacturingOrder.totalPrice = items * (manufacturingOrder.pricePerPiece || 0)
    }
    if (dateOfReceive) manufacturingOrder.dateOfReceive = dateOfReceive
    if (tailorName) manufacturingOrder.tailorName = tailorName
    if (priority) manufacturingOrder.priority = priority
    if (status) manufacturingOrder.status = status
    if (notes !== undefined) manufacturingOrder.notes = notes

    await manufacturingOrder.save()
    res.json({
      message: 'Manufacturing order updated successfully',
      manufacturingOrder
    })
  } catch (error: any) {
    res.status(500).json({ message: 'Server error' })
  }
})

// DELETE manufacturing order
router.delete('/:id', async (req, res) => {
  try {
    const manufacturingOrder = await ManufacturingOrder.findById(req.params.id)
    if (!manufacturingOrder) {
      return res.status(404).json({ message: 'Manufacturing order not found' })
    }

    await ManufacturingOrder.findByIdAndDelete(req.params.id)
    res.json({ message: 'Manufacturing order deleted successfully' })
  } catch (error: any) {
    res.status(500).json({ message: 'Server error' })
  }
})

export default router