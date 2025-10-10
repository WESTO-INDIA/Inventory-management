import { Router } from 'express'
import { Fabric } from '../models/Fabric'

const router = Router()

// GET all fabrics
router.get('/', async (req, res) => {
  try {
    const fabrics = await Fabric.find().sort({ createdAt: -1 })
    res.json(fabrics)
  } catch (error: any) {
    res.status(500).json({ message: 'Server error' })
  }
})

// GET fabric by ID
router.get('/:id', async (req, res) => {
  try {
    const fabric = await Fabric.findById(req.params.id)
    if (!fabric) {
      return res.status(404).json({ message: 'Fabric not found' })
    }
    res.json(fabric)
  } catch (error: any) {
    res.status(500).json({ message: 'Server error' })
  }
})

// POST new fabric
router.post('/', async (req, res) => {
  try {
    const {
      fabricId,
      fabricType,
      color,
      length,
      quantity,
      purchasePrice,
      notes
    } = req.body

    // Validate required fields
    if (!fabricType || !color || !length) {
      return res.status(400).json({ message: 'Missing required fields' })
    }

    // Calculate quantity from length (assuming 1 meter width for square meters)
    const finalQuantity = parseFloat(length)

    // Only include fabricId if it's provided and not empty
    const fabricData: any = {
      fabricType,
      color,
      length: parseFloat(length),
      quantity: finalQuantity,
      purchasePrice: purchasePrice ? parseFloat(purchasePrice) : undefined,
      notes
    }
    
    // Only add fabricId if it's a non-empty string
    if (fabricId && typeof fabricId === 'string' && fabricId.trim().length > 0) {
      fabricData.fabricId = fabricId.trim()
    }
    
    const fabric = new Fabric(fabricData)

    await fabric.save()
    res.status(201).json({
      message: 'Fabric registered successfully',
      fabric
    })
  } catch (error: any) {
    
    // Handle duplicate key errors specifically
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern || {})[0] || 'field'
      return res.status(400).json({ 
        message: `Duplicate ${field}: A fabric with this ${field} already exists` 
      })
    }
    
    res.status(500).json({ message: 'Server error: ' + error.message })
  }
})

// PATCH update fabric (partial update)
router.patch('/:id', async (req, res) => {
  try {
    const fabric = await Fabric.findById(req.params.id)
    if (!fabric) {
      return res.status(404).json({ message: 'Fabric not found' })
    }

    // Update only the fields provided
    if (req.body.quantity !== undefined) {
      fabric.quantity = req.body.quantity
    }

    Object.keys(req.body).forEach(key => {
      if (req.body[key] !== undefined && key !== '_id') {
        (fabric as any)[key] = req.body[key]
      }
    })

    await fabric.save()
    res.json(fabric)
  } catch (error) {
    res.status(500).json({ message: 'Server error' })
  }
})

// PUT update fabric
router.put('/:id', async (req, res) => {
  try {
    const fabric = await Fabric.findById(req.params.id)
    if (!fabric) {
      return res.status(404).json({ message: 'Fabric not found' })
    }

    const {
      fabricType,
      color,
      length,
      quantity,
      purchasePrice,
      notes
    } = req.body

    // Update fields
    fabric.fabricType = fabricType || fabric.fabricType
    fabric.color = color || fabric.color
    fabric.length = length ? parseFloat(length) : fabric.length
    fabric.quantity = quantity !== undefined ? quantity : fabric.quantity
    fabric.purchasePrice = purchasePrice ? parseFloat(purchasePrice) : fabric.purchasePrice
    fabric.notes = notes || fabric.notes

    // Recalculate quantity automatically (length in square meters)
    fabric.quantity = fabric.length

    // Update status based on quantity
    if (fabric.quantity === 0) {
      fabric.status = 'Out of Stock'
    } else if (fabric.quantity <= 20) {
      fabric.status = 'Low Stock'
    } else {
      fabric.status = 'In Stock'
    }

    await fabric.save()
    res.json({
      message: 'Fabric updated successfully',
      fabric
    })
  } catch (error: any) {
    res.status(500).json({ message: 'Server error' })
  }
})

// DELETE fabric
router.delete('/:id', async (req, res) => {
  try {
    const fabric = await Fabric.findById(req.params.id)
    if (!fabric) {
      return res.status(404).json({ message: 'Fabric not found' })
    }

    const fabricId = fabric.fabricId

    // Delete the fabric
    await Fabric.findByIdAndDelete(req.params.id)

    // Also delete related transactions for this fabric
    if (fabricId) {
      const Transaction = require('../models/Transaction').Transaction
      await Transaction.deleteMany({ itemId: fabricId })
    }

    res.json({ message: 'Fabric and related transactions deleted successfully' })
  } catch (error: any) {
    res.status(500).json({ message: 'Server error' })
  }
})

// GET fabric statistics
router.get('/stats/overview', async (req, res) => {
  try {
    const totalFabrics = await Fabric.countDocuments()
    const inStock = await Fabric.countDocuments({ status: 'In Stock' })
    const lowStock = await Fabric.countDocuments({ status: 'Low Stock' })
    const outOfStock = await Fabric.countDocuments({ status: 'Out of Stock' })
    
    const totalQuantity = await Fabric.aggregate([
      { $group: { _id: null, total: { $sum: '$quantity' } } }
    ])

    res.json({
      totalFabrics,
      inStock,
      lowStock,
      outOfStock,
      totalQuantity: totalQuantity[0]?.total || 0
    })
  } catch (error: any) {
    res.status(500).json({ message: 'Server error' })
  }
})

export default router