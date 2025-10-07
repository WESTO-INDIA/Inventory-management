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

    // Get cutting record to update size breakdown
    const cuttingRecord = await CuttingRecord.findOne({ id: cuttingId })
    if (!cuttingRecord) {
      return res.status(404).json({ message: 'Cutting record not found' })
    }

    // Check if there's enough quantity for the specified size
    const sizeBreakdown = cuttingRecord.sizeBreakdown || []
    const sizeItem = sizeBreakdown.find(sb => sb.size === size)

    if (!sizeItem || sizeItem.quantity < parseInt(quantity)) {
      return res.status(400).json({
        message: `Not enough quantity for size ${size}. Available: ${sizeItem?.quantity || 0}, Requested: ${quantity}`
      })
    }

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
      quantityReceive: 0,
      quantityRemaining: parseInt(quantity),
      itemsReceived: 0,
      pricePerPiece: parseFloat(pricePerPiece) || 0,
      totalPrice: 0,
      totalAmount: parseFloat(totalAmount) || 0,
      dateOfReceive: dateOfReceive || new Date().toISOString().split('T')[0],
      tailorName,
      priority: 'Normal',
      status: status || 'Assigned'
    })

    await manufacturingOrder.save()

    // Update cutting record size breakdown - decrease the quantity for the assigned size
    const updatedSizeBreakdown = sizeBreakdown.map(sb => {
      if (sb.size === size) {
        return {
          size: sb.size,
          quantity: sb.quantity - parseInt(quantity)
        }
      }
      return sb
    }).filter(sb => sb.quantity > 0) // Remove sizes with 0 quantity

    cuttingRecord.sizeBreakdown = updatedSizeBreakdown

    // Also update piecesRemaining
    const totalRemaining = updatedSizeBreakdown.reduce((sum, sb) => sum + sb.quantity, 0)
    cuttingRecord.piecesRemaining = totalRemaining

    await cuttingRecord.save()

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