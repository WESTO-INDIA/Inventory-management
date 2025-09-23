import { Router } from 'express'
import { Transaction } from '../models/Transaction'

const router = Router()

// GET all transactions
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      itemType,
      action,
      itemId,
      performedBy,
      source,
      startDate,
      endDate
    } = req.query

    // Build query filters
    const query: any = {}

    if (itemType) {
      query.itemType = itemType
    }
    if (action) {
      query.action = action
    }
    if (itemId) {
      query.itemId = itemId
    }
    if (performedBy) {
      query.performedBy = { $regex: performedBy, $options: 'i' }
    }
    if (source) {
      query.source = source
    }

    // Date range filter
    if (startDate || endDate) {
      query.timestamp = {}
      if (startDate) {
        query.timestamp.$gte = new Date(startDate as string)
      }
      if (endDate) {
        query.timestamp.$lte = new Date(endDate as string)
      }
    }

    // Calculate pagination
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string)

    // Get transactions with pagination
    const transactions = await Transaction.find(query)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(parseInt(limit as string))

    // Get total count for pagination
    const totalCount = await Transaction.countDocuments(query)
    const totalPages = Math.ceil(totalCount / parseInt(limit as string))

    res.json({
      transactions,
      pagination: {
        currentPage: parseInt(page as string),
        totalPages,
        totalCount,
        limit: parseInt(limit as string),
        hasNextPage: parseInt(page as string) < totalPages,
        hasPrevPage: parseInt(page as string) > 1
      }
    })
  } catch (error: any) {
    res.status(500).json({ message: 'Server error' })
  }
})

// GET transaction by ID
router.get('/:id', async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id)
    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' })
    }
    res.json(transaction)
  } catch (error: any) {
    res.status(500).json({ message: 'Server error' })
  }
})

// POST new transaction
router.post('/', async (req, res) => {
  try {
    const {
      itemType,
      itemId,
      itemName,
      action,
      quantity,
      previousStock,
      newStock,
      performedBy,
      source,
      timestamp
    } = req.body

    // Validate required fields
    if (!itemId || !itemName || !action || quantity === undefined ||
        previousStock === undefined || newStock === undefined || !performedBy) {
      return res.status(400).json({
        message: 'Missing required fields: itemId, itemName, action, quantity, previousStock, newStock, performedBy'
      })
    }

    // Validate enum values
    if (!['ADD', 'REMOVE', 'STOCK_IN', 'STOCK_OUT', 'QR_GENERATED'].includes(action)) {
      return res.status(400).json({ message: 'Action must be one of: ADD, REMOVE, STOCK_IN, STOCK_OUT, QR_GENERATED' })
    }

    if (itemType && !['FABRIC', 'MANUFACTURING', 'CUTTING', 'UNKNOWN'].includes(itemType)) {
      return res.status(400).json({
        message: 'ItemType must be one of: FABRIC, MANUFACTURING, CUTTING, UNKNOWN'
      })
    }

    if (source && !['QR_SCANNER', 'MANUAL'].includes(source)) {
      return res.status(400).json({ message: 'Source must be either QR_SCANNER or MANUAL' })
    }

    const transaction = new Transaction({
      itemType: itemType || 'UNKNOWN',
      itemId,
      itemName,
      action,
      quantity: parseFloat(quantity),
      previousStock: parseFloat(previousStock),
      newStock: parseFloat(newStock),
      performedBy,
      source: source || 'MANUAL',
      timestamp: timestamp ? new Date(timestamp) : new Date()
    })

    await transaction.save()
    res.status(201).json({
      message: 'Transaction created successfully',
      transaction
    })
  } catch (error: any) {
    res.status(500).json({ message: 'Server error' })
  }
})

// DELETE transaction by ID
router.delete('/:id', async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id)
    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' })
    }

    await Transaction.findByIdAndDelete(req.params.id)
    res.json({
      message: 'Transaction deleted successfully',
      deletedTransaction: transaction
    })
  } catch (error: any) {
    res.status(500).json({ message: 'Server error' })
  }
})

// DELETE all transactions
router.delete('/', async (req, res) => {
  try {
    const result = await Transaction.deleteMany({})
    res.json({
      message: `${result.deletedCount} transactions deleted successfully`,
      deletedCount: result.deletedCount
    })
  } catch (error: any) {
    res.status(500).json({ message: 'Server error' })
  }
})

// GET transaction statistics
router.get('/stats/overview', async (req, res) => {
  try {
    const totalTransactions = await Transaction.countDocuments()
    const addTransactions = await Transaction.countDocuments({ $or: [{ action: 'ADD' }, { action: 'STOCK_IN' }] })
    const removeTransactions = await Transaction.countDocuments({ $or: [{ action: 'REMOVE' }, { action: 'STOCK_OUT' }] })

    // Count by item type
    const typeStats = await Transaction.aggregate([
      { $group: { _id: '$itemType', count: { $sum: 1 } } }
    ])

    // Count by source
    const sourceStats = await Transaction.aggregate([
      { $group: { _id: '$source', count: { $sum: 1 } } }
    ])

    // Recent transactions (last 7 days)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const recentTransactions = await Transaction.countDocuments({
      timestamp: { $gte: sevenDaysAgo }
    })

    res.json({
      totalTransactions,
      addTransactions,
      removeTransactions,
      recentTransactions,
      typeStats: typeStats.reduce((acc, item) => {
        acc[item._id] = item.count
        return acc
      }, {}),
      sourceStats: sourceStats.reduce((acc, item) => {
        acc[item._id] = item.count
        return acc
      }, {})
    })
  } catch (error: any) {
    res.status(500).json({ message: 'Server error' })
  }
})

// GET transactions by item ID
router.get('/item/:itemId', async (req, res) => {
  try {
    const { itemId } = req.params
    const { page = 1, limit = 20 } = req.query

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string)

    const transactions = await Transaction.find({ itemId })
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(parseInt(limit as string))

    const totalCount = await Transaction.countDocuments({ itemId })
    const totalPages = Math.ceil(totalCount / parseInt(limit as string))

    res.json({
      transactions,
      pagination: {
        currentPage: parseInt(page as string),
        totalPages,
        totalCount,
        limit: parseInt(limit as string),
        hasNextPage: parseInt(page as string) < totalPages,
        hasPrevPage: parseInt(page as string) > 1
      }
    })
  } catch (error: any) {
    res.status(500).json({ message: 'Server error' })
  }
})

export default router