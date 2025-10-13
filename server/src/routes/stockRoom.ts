import express from 'express'
import { ManufacturingOrder } from '../models/ManufacturingOrder'
import { QRProduct } from '../models/QRProduct'
import { Transaction } from '../models/Transaction'

const router = express.Router()

// Get aggregated stock room data
router.get('/data', async (req, res) => {
  try {
    // Fetch completed manufacturing orders
    const manufacturingOrders = await ManufacturingOrder.find({ status: 'Completed' })

    // Fetch QR products (for manual entries)
    const qrProducts = await QRProduct.find()

    // Fetch all transactions
    const transactions = await Transaction.find()

    // Build garment stocks list
    const garmentList: any[] = []

    // Add manufacturing orders
    manufacturingOrders.forEach(order => {
      garmentList.push({
        _id: order._id,
        productId: order.manufacturingId,
        productName: order.productName,
        color: order.fabricColor || 'N/A',
        size: order.size || 'N/A',
        quantity: order.quantity || 0,
        tailorName: order.tailorName,
        generatedDate: order.createdAt,
        fabricType: order.fabricType || 'N/A'
      })
    })

    // Get existing manufacturing IDs to avoid duplicates
    const existingManufacturingIds = new Set(
      garmentList.map(item => item.productId)
    )

    // Add QR products that are not already in manufacturing list
    qrProducts.forEach(product => {
      // For manual products
      if (product.cuttingId === 'MANUAL' && product.manufacturingId && product.manufacturingId.startsWith('MAN')) {
        if (!existingManufacturingIds.has(product.manufacturingId)) {
          garmentList.push({
            _id: product._id,
            productId: product.productId || product.manufacturingId,
            productName: product.productName,
            color: product.color || 'N/A',
            size: product.size || 'N/A',
            quantity: product.quantity || 0,
            tailorName: product.tailorName || 'N/A',
            generatedDate: product.createdAt || product.generatedDate,
            fabricType: product.fabricType || 'N/A'
          })
        }
      } else {
        // For other QR products
        const pid = product.productId || product.manufacturingId
        const mid = product.manufacturingId

        if (!existingManufacturingIds.has(pid) && !existingManufacturingIds.has(mid)) {
          garmentList.push({
            _id: product._id,
            productId: product.productId || product.manufacturingId,
            productName: product.productName,
            color: product.color || 'N/A',
            size: product.size || 'N/A',
            quantity: product.quantity || 0,
            tailorName: product.tailorName || 'N/A',
            generatedDate: product.createdAt || product.generatedDate,
            fabricType: product.fabricType || 'N/A'
          })
        }
      }
    })

    // Create a map to aggregate by manufacturing ID
    const stockByManufacturingId = new Map<string, {
      manufacturingId: string
      garment: string
      color: string
      fabricType: string
      size: string
      quantity: number
      tailorName: string
    }>()

    // Aggregate quantities from multiple records with same manufacturingId
    garmentList.forEach(g => {
      const id = g.productId

      if (stockByManufacturingId.has(id)) {
        const existing = stockByManufacturingId.get(id)!
        existing.quantity += g.quantity || 0
      } else {
        stockByManufacturingId.set(id, {
          manufacturingId: id,
          garment: g.productName,
          color: g.color || 'N/A',
          fabricType: g.fabricType || 'N/A',
          size: g.size || 'N/A',
          quantity: g.quantity || 0,
          tailorName: g.tailorName || 'N/A'
        })
      }
    })

    // Apply transactions to adjust quantities
    transactions.forEach(t => {
      if (t.itemType === 'MANUFACTURING' || t.itemType === 'QR_GENERATED') {
        const id = t.itemId

        if (!stockByManufacturingId.has(id)) {
          stockByManufacturingId.set(id, {
            manufacturingId: id,
            garment: t.itemName,
            color: t.color || 'N/A',
            fabricType: t.fabricType || 'N/A',
            size: t.size || 'N/A',
            quantity: 0,
            tailorName: 'N/A'
          })
        }

        const item = stockByManufacturingId.get(id)!
        if (t.action === 'STOCK_IN') {
          item.quantity += t.quantity
        } else if (t.action === 'STOCK_OUT') {
          item.quantity -= t.quantity
        }
      }
    })

    // Convert map to array
    const stockArray = Array.from(stockByManufacturingId.values())

    res.json(stockArray)
  } catch (error) {
    console.error('Error fetching stock room data:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

// Get specific item by manufacturing ID
router.get('/item/:manufacturingId', async (req, res) => {
  try {
    const { manufacturingId } = req.params

    // Fetch completed manufacturing orders
    const manufacturingOrders = await ManufacturingOrder.find({ status: 'Completed' })

    // Fetch QR products (for manual entries)
    const qrProducts = await QRProduct.find()

    // Fetch all transactions
    const transactions = await Transaction.find()

    // Build garment stocks list
    const garmentList: any[] = []

    // Add manufacturing orders
    manufacturingOrders.forEach(order => {
      garmentList.push({
        _id: order._id,
        productId: order.manufacturingId,
        productName: order.productName,
        color: order.fabricColor || 'N/A',
        size: order.size || 'N/A',
        quantity: order.quantity || 0,
        tailorName: order.tailorName,
        generatedDate: order.createdAt,
        fabricType: order.fabricType || 'N/A'
      })
    })

    // Get existing manufacturing IDs to avoid duplicates
    const existingManufacturingIds = new Set(
      garmentList.map(item => item.productId)
    )

    // Add QR products that are not already in manufacturing list
    qrProducts.forEach(product => {
      // For manual products
      if (product.cuttingId === 'MANUAL' && product.manufacturingId && product.manufacturingId.startsWith('MAN')) {
        if (!existingManufacturingIds.has(product.manufacturingId)) {
          garmentList.push({
            _id: product._id,
            productId: product.productId || product.manufacturingId,
            productName: product.productName,
            color: product.color || 'N/A',
            size: product.size || 'N/A',
            quantity: product.quantity || 0,
            tailorName: product.tailorName || 'N/A',
            generatedDate: product.createdAt || product.generatedDate,
            fabricType: product.fabricType || 'N/A'
          })
        }
      } else {
        // For other QR products
        const pid = product.productId || product.manufacturingId
        const mid = product.manufacturingId

        if (!existingManufacturingIds.has(pid) && !existingManufacturingIds.has(mid)) {
          garmentList.push({
            _id: product._id,
            productId: product.productId || product.manufacturingId,
            productName: product.productName,
            color: product.color || 'N/A',
            size: product.size || 'N/A',
            quantity: product.quantity || 0,
            tailorName: product.tailorName || 'N/A',
            generatedDate: product.createdAt || product.generatedDate,
            fabricType: product.fabricType || 'N/A'
          })
        }
      }
    })

    // Create a map to aggregate by manufacturing ID
    const stockByManufacturingId = new Map<string, {
      manufacturingId: string
      garment: string
      color: string
      fabricType: string
      size: string
      quantity: number
      tailorName: string
    }>()

    // Aggregate quantities from multiple records with same manufacturingId
    garmentList.forEach(g => {
      const id = g.productId

      if (stockByManufacturingId.has(id)) {
        const existing = stockByManufacturingId.get(id)!
        existing.quantity += g.quantity || 0
      } else {
        stockByManufacturingId.set(id, {
          manufacturingId: id,
          garment: g.productName,
          color: g.color || 'N/A',
          fabricType: g.fabricType || 'N/A',
          size: g.size || 'N/A',
          quantity: g.quantity || 0,
          tailorName: g.tailorName || 'N/A'
        })
      }
    })

    // Apply transactions to adjust quantities
    transactions.forEach(t => {
      if (t.itemType === 'MANUFACTURING' || t.itemType === 'QR_GENERATED') {
        const id = t.itemId

        if (!stockByManufacturingId.has(id)) {
          stockByManufacturingId.set(id, {
            manufacturingId: id,
            garment: t.itemName,
            color: t.color || 'N/A',
            fabricType: t.fabricType || 'N/A',
            size: t.size || 'N/A',
            quantity: 0,
            tailorName: 'N/A'
          })
        }

        const item = stockByManufacturingId.get(id)!
        if (t.action === 'STOCK_IN') {
          item.quantity += t.quantity
        } else if (t.action === 'STOCK_OUT') {
          item.quantity -= t.quantity
        }
      }
    })

    // Get the specific item
    const stockItem = stockByManufacturingId.get(manufacturingId)

    if (stockItem) {
      res.json(stockItem)
    } else {
      res.status(404).json({ message: 'Item not found' })
    }
  } catch (error) {
    console.error('Error fetching stock room item:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

export default router
