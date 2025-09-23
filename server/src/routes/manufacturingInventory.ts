import { Router } from 'express'
import { ManufacturingInventory } from '../models/ManufacturingInventory'
import { CuttingRecord } from '../models/CuttingRecord'

const router = Router()

// GET all manufacturing inventory records
router.get('/', async (req, res) => {
  try {
    const manufacturingInventory = await ManufacturingInventory.find().sort({ createdAt: -1 })
    res.json(manufacturingInventory)
  } catch (error: any) {
    res.status(500).json({ message: 'Server error' })
  }
})

// GET manufacturing inventory record by ID
router.get('/:id', async (req, res) => {
  try {
    const manufacturingInventory = await ManufacturingInventory.findById(req.params.id)
    if (!manufacturingInventory) {
      return res.status(404).json({ message: 'Manufacturing inventory record not found' })
    }
    res.json(manufacturingInventory)
  } catch (error: any) {
    res.status(500).json({ message: 'Server error' })
  }
})

// POST new manufacturing inventory record
router.post('/', async (req, res) => {
  try {
    const {
      productId,
      productName,
      cuttingId,
      quantity,
      quantityProduced,
      tailorName,
      tailorMobile,
      startDate,
      completedDate,
      dueDate,
      priority,
      status,
      notes
    } = req.body

    // Validate required fields
    if (!productId || !productName || !cuttingId || !quantity || !tailorName || !tailorMobile || !startDate || !dueDate) {
      return res.status(400).json({ message: 'Missing required fields' })
    }

    // Find the cutting record and check available pieces
    const cuttingRecord = await CuttingRecord.findOne({ id: cuttingId })
    
    if (!cuttingRecord) {
      return res.status(404).json({ message: 'Cutting record not found with the given cutting ID' })
    }
    
    const quantityToManufacture = parseInt(quantity)
    
    // Check if enough pieces are available
    if (cuttingRecord.piecesRemaining < quantityToManufacture) {
      return res.status(400).json({ 
        message: `Insufficient cutting pieces. Available: ${cuttingRecord.piecesRemaining}, Required: ${quantityToManufacture}` 
      })
    }

    const manufacturingInventory = new ManufacturingInventory({
      productId,
      productName,
      cuttingId,
      quantity: parseInt(quantity),
      quantityProduced: parseInt(quantityProduced) || 0,
      tailorName,
      tailorMobile,
      startDate,
      completedDate,
      dueDate,
      priority: priority || 'Normal',
      status: status || 'Pending',
      notes
    })

    // Save manufacturing record first
    await manufacturingInventory.save()
    
    // Update cutting record quantities
    cuttingRecord.piecesRemaining -= quantityToManufacture
    cuttingRecord.piecesManufactured += quantityToManufacture
    await cuttingRecord.save()
    
    res.status(201).json({
      message: 'Manufacturing inventory record created successfully and cutting record updated',
      manufacturingInventory,
      cuttingRecordRemaining: cuttingRecord.piecesRemaining
    })
  } catch (error: any) {
    if (error.code === 11000) {
      res.status(400).json({ message: 'Manufacturing inventory record with this ID already exists' })
    } else {
      res.status(500).json({ message: 'Server error' })
    }
  }
})

// PATCH update manufacturing inventory (partial update)
router.patch('/:id', async (req, res) => {
  try {
    const manufacturingInventory = await ManufacturingInventory.findById(req.params.id)
    if (!manufacturingInventory) {
      return res.status(404).json({ message: 'Manufacturing inventory record not found' })
    }

    // Update only the fields provided
    Object.keys(req.body).forEach(key => {
      if (req.body[key] !== undefined && key !== '_id') {
        (manufacturingInventory as any)[key] = req.body[key]
      }
    })

    await manufacturingInventory.save()
    res.json(manufacturingInventory)
  } catch (error) {
    res.status(500).json({ message: 'Server error' })
  }
})

// PUT update manufacturing inventory record
router.put('/:id', async (req, res) => {
  try {
    const manufacturingInventory = await ManufacturingInventory.findById(req.params.id)
    if (!manufacturingInventory) {
      return res.status(404).json({ message: 'Manufacturing inventory record not found' })
    }

    const {
      quantity,
      quantityProduced,
      tailorName,
      tailorMobile,
      startDate,
      completedDate,
      dueDate,
      priority,
      status,
      notes
    } = req.body

    // Store old values for quantity tracking
    const oldQuantity = manufacturingInventory.quantity
    const oldQuantityProduced = manufacturingInventory.quantityProduced

    // Update fields
    if (quantity) manufacturingInventory.quantity = parseInt(quantity)
    if (quantityProduced !== undefined) manufacturingInventory.quantityProduced = parseInt(quantityProduced)
    if (tailorName) manufacturingInventory.tailorName = tailorName
    if (tailorMobile) manufacturingInventory.tailorMobile = tailorMobile
    if (startDate) manufacturingInventory.startDate = startDate
    if (completedDate !== undefined) manufacturingInventory.completedDate = completedDate
    if (dueDate) manufacturingInventory.dueDate = dueDate
    if (priority) manufacturingInventory.priority = priority
    if (status) manufacturingInventory.status = status
    if (notes !== undefined) manufacturingInventory.notes = notes

    // If quantity changed, update cutting record accordingly
    if (quantity && parseInt(quantity) !== oldQuantity) {
      const cuttingRecord = await CuttingRecord.findOne({ id: manufacturingInventory.cuttingId })
      if (cuttingRecord) {
        const quantityDiff = parseInt(quantity) - oldQuantity
        
        // Check if enough pieces are available when increasing quantity
        if (quantityDiff > 0 && cuttingRecord.piecesRemaining < quantityDiff) {
          return res.status(400).json({ 
            message: `Insufficient cutting pieces for quantity increase. Available: ${cuttingRecord.piecesRemaining}, Required: ${quantityDiff}` 
          })
        }
        
        // Update cutting record
        cuttingRecord.piecesRemaining -= quantityDiff
        cuttingRecord.piecesManufactured += quantityDiff
        await cuttingRecord.save()
      }
    }

    await manufacturingInventory.save()
    res.json({
      message: 'Manufacturing inventory record updated successfully',
      manufacturingInventory
    })
  } catch (error: any) {
    res.status(500).json({ message: 'Server error' })
  }
})

// DELETE manufacturing inventory record
router.delete('/:id', async (req, res) => {
  try {
    const manufacturingInventory = await ManufacturingInventory.findById(req.params.id)
    if (!manufacturingInventory) {
      return res.status(404).json({ message: 'Manufacturing inventory record not found' })
    }

    await ManufacturingInventory.findByIdAndDelete(req.params.id)
    res.json({ message: 'Manufacturing inventory record deleted successfully' })
  } catch (error: any) {
    res.status(500).json({ message: 'Server error' })
  }
})

export default router