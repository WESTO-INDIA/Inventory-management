import mongoose from 'mongoose'
import { logger } from './logger'

// Helper function to create indexes safely
async function createIndexesSafely(db: any, collectionName: string, indexSpecs: any[]) {
  try {
    await db.collection(collectionName).createIndexes(indexSpecs)
  } catch (error: any) {
    // If error is about index already existing with different options, ignore it
    if (error.code === 85 || error.code === 86) {
      logger.info(`Some indexes for ${collectionName} already exist, skipping...`)
    } else {
      logger.error(`Error creating indexes for ${collectionName}:`, error.message)
      throw error
    }
  }
}

export async function setupMongoIndexes() {
  try {
    const db = mongoose.connection.db

    // Clean up any problematic indexes first
    await cleanupProblematicIndexes(db)

    // Users collection indexes
    await createIndexesSafely(db, 'users', [
      { key: { email: 1 }, unique: true },
      { key: { role: 1, department: 1 } },
      { key: { isActive: 1, role: 1 } },
      { key: { createdAt: -1 } }
    ])

    // Fabrics collection indexes
    await createIndexesSafely(db, 'fabrics', [
      { key: { fabricId: 1 }, unique: true, sparse: true, name: 'fabricId_1_sparse' },
      { key: { fabricType: 1, color: 1 } },
      { key: { status: 1 } },
      { key: { quantity: 1 } },
      { key: { createdAt: -1 } },
      { key: { 'fabricType': 'text', 'color': 'text' } } // Text search index
    ])


    // Products collection indexes
    await createIndexesSafely(db, 'products', [
      { key: { productId: 1 }, unique: true },
      { key: { category: 1, status: 1 } },
      { key: { manufacturingDate: -1 } },
      { key: { price: 1 } },
      { key: { 'name': 'text', 'category': 'text', 'design': 'text' } }
    ])

    // Employees collection indexes
    await createIndexesSafely(db, 'employees', [
      { key: { employeeId: 1 }, unique: true },
      { key: { email: 1 }, unique: true },
      { key: { department: 1, status: 1 } },
      { key: { position: 1 } },
      { key: { joinDate: -1 } },
      { key: { 'name': 'text', 'position': 'text', 'department': 'text' } }
    ])

    // Manufacturing collection indexes
    await createIndexesSafely(db, 'manufacturings', [
      { key: { orderId: 1 }, unique: true },
      { key: { productId: 1 } },
      { key: { status: 1, expectedCompletion: 1 } },
      { key: { assignedTo: 1 } },
      { key: { startDate: -1 } }
    ])

    // Transactions collection indexes
    await createIndexesSafely(db, 'transactions', [
      { key: { type: 1, date: -1 } },
      { key: { userId: 1, date: -1 } },
      { key: { relatedId: 1 } },
      { key: { amount: 1 } }
    ])

    // Attendance collection indexes
    await createIndexesSafely(db, 'attendances', [
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

// Clean up problematic indexes
async function cleanupProblematicIndexes(db: any) {
  try {
    // Check and remove the problematic productld_1 index from fabrics collection
    const fabricsIndexes = await db.collection('fabrics').indexes()
    const problematicIndex = fabricsIndexes.find((index: any) => index.name === 'productld_1')
    
    if (problematicIndex) {
      logger.info('Found problematic index productld_1, removing it...')
      await db.collection('fabrics').dropIndex('productld_1')
      logger.info('Problematic index productld_1 removed successfully')
    }
    
    // Also check for any other problematic indexes that might cause issues
    // Remove any fabricId index that is not our desired sparse index
    const fabricIdIndexes = fabricsIndexes.filter((index: any) =>
      index.key && index.key.fabricId
    )

    for (const fabricIdIndex of fabricIdIndexes) {
      // Keep only the fabricId_1_sparse index, remove all others
      if (fabricIdIndex.name !== 'fabricId_1_sparse') {
        try {
          logger.info(`Found unwanted fabricId index: ${fabricIdIndex.name}, removing it...`)
          await db.collection('fabrics').dropIndex(fabricIdIndex.name)
          logger.info(`Unwanted fabricId index removed successfully`)
        } catch (error: any) {
          if (error.code !== 27) {
            logger.warn(`Could not drop ${fabricIdIndex.name}:`, error.message)
          }
        }
      }
    }
    
  } catch (error: any) {
    // Index might not exist, which is fine
    if (error.code !== 27 && !error.message.includes('index not found')) {
      logger.warn('Error during index cleanup:', error.message)
    }
  }
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