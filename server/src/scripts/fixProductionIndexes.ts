import mongoose from 'mongoose'
import { logger } from '../utils/logger'

/**
 * Production database index fix script
 * This script fixes the problematic productld index and ensures proper sparse indexes
 */
async function fixProductionIndexes() {
  try {
    const db = mongoose.connection.db
    const collection = db.collection('fabrics')
    
    logger.info('🔧 Starting production index fix...')
    
    // Get current indexes
    const indexes = await collection.indexes()
    logger.info('Current indexes:', indexes.map(idx => ({ name: idx.name, key: idx.key, unique: idx.unique, sparse: idx.sparse })))
    
    // List of problematic indexes to remove
    const problematicIndexes = ['productld_1', 'productId_1']
    
    // Remove problematic indexes
    for (const indexName of problematicIndexes) {
      try {
        const indexExists = indexes.find(idx => idx.name === indexName)
        if (indexExists) {
          await collection.dropIndex(indexName)
          logger.info(`✅ Dropped problematic index: ${indexName}`)
        }
      } catch (error: any) {
        if (error.code !== 27) { // Index not found is OK
          logger.warn(`⚠️  Could not drop ${indexName}:`, error.message)
        }
      }
    }
    
    // Remove non-sparse fabricId index if it exists
    const fabricIdIndex = indexes.find(idx => 
      idx.key && idx.key.fabricId && idx.unique && !idx.sparse
    )
    
    if (fabricIdIndex) {
      try {
        await collection.dropIndex(fabricIdIndex.name)
        logger.info(`✅ Dropped non-sparse fabricId index: ${fabricIdIndex.name}`)
      } catch (error: any) {
        logger.warn(`⚠️  Could not drop fabricId index:`, error.message)
      }
    }
    
    // Create the correct sparse unique index for fabricId
    try {
      await collection.createIndex({ fabricId: 1 }, { 
        unique: true, 
        sparse: true,
        name: 'fabricId_1_sparse'
      })
      logger.info('✅ Created sparse unique index on fabricId')
    } catch (error: any) {
      if (error.code === 85) { // Index already exists
        logger.info('ℹ️  Sparse fabricId index already exists')
      } else {
        logger.warn('⚠️  Error creating sparse index:', error.message)
      }
    }
    
    // Verify final indexes
    const finalIndexes = await collection.indexes()
    logger.info('Final indexes:', finalIndexes.map(idx => ({ 
      name: idx.name, 
      key: idx.key, 
      unique: idx.unique, 
      sparse: idx.sparse 
    })))
    
    logger.info('🎉 Production index fix completed successfully!')
    
  } catch (error) {
    logger.error('❌ Error fixing production indexes:', error)
    throw error
  }
}

export { fixProductionIndexes }
