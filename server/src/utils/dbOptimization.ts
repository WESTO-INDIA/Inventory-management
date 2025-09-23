import mongoose from 'mongoose'
import { logger } from './logger'

export async function setupMongoIndexes() {
  try {
    const db = mongoose.connection.db
    
    // Users collection indexes
    await db.collection('users').createIndexes([
      { key: { email: 1 }, unique: true },
      { key: { role: 1, department: 1 } },
      { key: { isActive: 1, role: 1 } },
      { key: { createdAt: -1 } }
    ])
    
    // Fabrics collection indexes
    await db.collection('fabrics').createIndexes([
      { key: { productId: 1 }, unique: true },
      { key: { fabricType: 1, color: 1 } },
      { key: { status: 1 } },
      { key: { quantity: 1 } },
      { key: { supplier: 1 } },
      { key: { createdAt: -1 } },
      { key: { 'location': 'text', 'fabricType': 'text', 'color': 'text' } } // Text search index
    ])
    
    // Products collection indexes
    await db.collection('products').createIndexes([
      { key: { productId: 1 }, unique: true },
      { key: { category: 1, status: 1 } },
      { key: { manufacturingDate: -1 } },
      { key: { price: 1 } },
      { key: { 'name': 'text', 'category': 'text', 'design': 'text' } }
    ])
    
    // Employees collection indexes
    await db.collection('employees').createIndexes([
      { key: { employeeId: 1 }, unique: true },
      { key: { email: 1 }, unique: true },
      { key: { department: 1, status: 1 } },
      { key: { position: 1 } },
      { key: { joinDate: -1 } },
      { key: { 'name': 'text', 'position': 'text', 'department': 'text' } }
    ])
    
    // Manufacturing collection indexes
    await db.collection('manufacturings').createIndexes([
      { key: { orderId: 1 }, unique: true },
      { key: { productId: 1 } },
      { key: { status: 1, expectedCompletion: 1 } },
      { key: { assignedTo: 1 } },
      { key: { startDate: -1 } }
    ])
    
    // Transactions collection indexes
    await db.collection('transactions').createIndexes([
      { key: { type: 1, date: -1 } },
      { key: { userId: 1, date: -1 } },
      { key: { relatedId: 1 } },
      { key: { amount: 1 } }
    ])
    
    // Attendance collection indexes
    await db.collection('attendances').createIndexes([
      { key: { employeeId: 1, date: -1 } },
      { key: { status: 1, date: -1 } },
      { key: { date: -1 } }
    ])
    
    logger.info('MongoDB indexes created successfully')
    
    // Verify indexes
    const collections = ['users', 'fabrics', 'products', 'employees', 'manufacturings', 'transactions', 'attendances']
    for (const collection of collections) {
      const indexes = await db.collection(collection).indexes()
      logger.info(`${collection} indexes: ${indexes.length}`)
    }
    
  } catch (error) {
    logger.error('Error setting up MongoDB indexes:', error)
  }
}

// Aggregation pipeline optimizations
export const optimizedAggregations = {
  // Get inventory statistics with caching
  getInventoryStats: () => [
    {
      $facet: {
        fabricStats: [
          { $match: { collection: 'fabrics' } },
          {
            $group: {
              _id: '$status',
              count: { $sum: 1 },
              totalValue: { $sum: { $multiply: ['$quantity', '$price'] } }
            }
          }
        ],
        productStats: [
          { $match: { collection: 'products' } },
          {
            $group: {
              _id: '$status',
              count: { $sum: 1 },
              totalValue: { $sum: { $multiply: ['$quantity', '$price'] } }
            }
          }
        ],
        lowStockItems: [
          { $match: { quantity: { $lt: 10 }, collection: 'fabrics' } },
          { $sort: { quantity: 1 } },
          { $limit: 10 }
        ]
      }
    }
  ],
  
  // Get production efficiency
  getProductionEfficiency: (startDate: Date, endDate: Date) => [
    {
      $match: {
        completionDate: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$completionDate' } },
        totalProduced: { $sum: '$quantity' },
        avgCompletionTime: {
          $avg: {
            $subtract: ['$completionDate', '$manufacturingDate']
          }
        }
      }
    },
    { $sort: { _id: 1 } }
  ],
  
  // Get employee performance metrics
  getEmployeePerformance: (employeeId: string) => [
    {
      $match: { assignedTo: employeeId }
    },
    {
      $lookup: {
        from: 'products',
        localField: 'productId',
        foreignField: 'productId',
        as: 'product'
      }
    },
    {
      $group: {
        _id: null,
        totalTasks: { $sum: 1 },
        completedTasks: {
          $sum: { $cond: [{ $eq: ['$status', 'COMPLETED'] }, 1, 0] }
        },
        avgCompletionTime: {
          $avg: {
            $cond: [
              { $eq: ['$status', 'COMPLETED'] },
              { $subtract: ['$actualCompletion', '$startDate'] },
              null
            ]
          }
        }
      }
    }
  ]
}

// Connection pool monitoring
export function monitorConnectionPool() {
  const interval = setInterval(() => {
    const poolStats = (mongoose.connection.db as any)?.serverConfig?.s?.pool
    if (poolStats) {
      logger.info('MongoDB Connection Pool Stats:', {
        size: poolStats.size,
        available: poolStats.availableConnectionCount,
        pending: poolStats.pendingConnectionCount,
        inUse: poolStats.currentCheckedOutCount
      })
    }
  }, 60000) // Log every minute
  
  return () => clearInterval(interval)
}