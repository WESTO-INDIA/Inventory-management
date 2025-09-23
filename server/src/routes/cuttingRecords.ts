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
      productId,
      fabricType,
      fabricColor,
      productName,
      piecesCount,
      pieceLength,
      pieceWidth,
      totalSquareMetersUsed,
      sizeType,
      cuttingMaster,
      cuttingGivenTo,
      tailorItemPerPiece,
      date,
      time,
      notes
    } = req.body

    // Validate required fields
    if (!id || !productId || !fabricType || !fabricColor || !productName ||
        !piecesCount || !pieceLength || !pieceWidth || !totalSquareMetersUsed ||
        !sizeType || !cuttingMaster || !cuttingGivenTo || !date || !time) {
      return res.status(400).json({ message: 'Missing required fields' })
    }

    // Check if fabric exists and has enough quantity
    const fabric = await Fabric.findOne({ 
      $or: [
        { productId: productId },
        { fabricId: productId }
      ]
    })
    
    if (!fabric) {
      return res.status(404).json({ message: 'Fabric not found with the given product ID' })
    }
    
    // Calculate area to decrease (length × width × pieces count)
    const areaToDecrease = parseFloat(totalSquareMetersUsed)
    
    if (fabric.quantity < areaToDecrease) {
      return res.status(400).json({ 
        message: `Insufficient fabric quantity. Available: ${fabric.quantity} sq.m, Required: ${areaToDecrease} sq.m` 
      })
    }

    const cuttingRecord = new CuttingRecord({
      id,
      productId,
      fabricType,
      fabricColor,
      productName,
      piecesCount: parseInt(piecesCount),
      piecesRemaining: parseInt(piecesCount), // Initialize with full count
      piecesManufactured: 0,
      pieceLength: parseFloat(pieceLength),
      pieceWidth: parseFloat(pieceWidth),
      totalSquareMetersUsed: parseFloat(totalSquareMetersUsed),
      sizeType,
      cuttingMaster,
      cuttingGivenTo,
      tailorItemPerPiece: parseFloat(tailorItemPerPiece) || 0,
      date,
      time,
      notes
    })

    // Save cutting record first
    await cuttingRecord.save()
    
    // Update fabric quantity (subtract the area used)
    fabric.quantity -= areaToDecrease
    await fabric.save()
    
    res.status(201).json({
      message: 'Cutting record created successfully and fabric quantity updated',
      cuttingRecord,
      fabricRemainingQuantity: fabric.quantity
    })
  } catch (error: any) {
    if (error.code === 11000) {
      res.status(400).json({ message: 'Cutting record with this ID already exists' })
    } else {
      res.status(500).json({ message: 'Server error' })
    }
  }
})

// PATCH update cutting record (partial update)
router.patch('/:id', async (req, res) => {
  try {
    const cuttingRecord = await CuttingRecord.findById(req.params.id)
    if (!cuttingRecord) {
      return res.status(404).json({ message: 'Cutting record not found' })
    }

    // Update only the fields provided
    Object.keys(req.body).forEach(key => {
      if (req.body[key] !== undefined && key !== '_id') {
        (cuttingRecord as any)[key] = req.body[key]
      }
    })

    await cuttingRecord.save()
    res.json(cuttingRecord)
  } catch (error) {
    res.status(500).json({ message: 'Server error' })
  }
})

// PUT update cutting record
router.put('/:id', async (req, res) => {
  try {
    const cuttingRecord = await CuttingRecord.findById(req.params.id)
    if (!cuttingRecord) {
      return res.status(404).json({ message: 'Cutting record not found' })
    }

    const {
      productName,
      piecesCount,
      pieceLength,
      pieceWidth,
      sizeType,
      cuttingMaster,
      cuttingGivenTo,
      tailorItemPerPiece,
      notes
    } = req.body

    // Update fields
    if (productName) cuttingRecord.productName = productName
    if (piecesCount) cuttingRecord.piecesCount = parseInt(piecesCount)
    if (pieceLength) cuttingRecord.pieceLength = parseFloat(pieceLength)
    if (pieceWidth) cuttingRecord.pieceWidth = parseFloat(pieceWidth)
    if (sizeType) cuttingRecord.sizeType = sizeType
    if (cuttingMaster) cuttingRecord.cuttingMaster = cuttingMaster
    if (cuttingGivenTo) cuttingRecord.cuttingGivenTo = cuttingGivenTo
    if (tailorItemPerPiece !== undefined) cuttingRecord.tailorItemPerPiece = parseFloat(tailorItemPerPiece) || 0
    if (notes !== undefined) cuttingRecord.notes = notes

    // Recalculate total square meters used
    cuttingRecord.totalSquareMetersUsed = cuttingRecord.piecesCount * cuttingRecord.pieceLength * cuttingRecord.pieceWidth

    await cuttingRecord.save()
    res.json({
      message: 'Cutting record updated successfully',
      cuttingRecord
    })
  } catch (error: any) {
    res.status(500).json({ message: 'Server error' })
  }
})

// DELETE cutting record
router.delete('/:id', async (req, res) => {
  try {
    const cuttingRecord = await CuttingRecord.findById(req.params.id)
    if (!cuttingRecord) {
      return res.status(404).json({ message: 'Cutting record not found' })
    }

    await CuttingRecord.findByIdAndDelete(req.params.id)
    res.json({ message: 'Cutting record deleted successfully' })
  } catch (error: any) {
    res.status(500).json({ message: 'Server error' })
  }
})

export default router