#!/usr/bin/env tsx

/**
 * Standalone script to fix production database indexes
 * Run this script to fix the problematic productld index in production
 */

import mongoose from 'mongoose'
import dotenv from 'dotenv'
import path from 'path'
import { fixProductionIndexes } from './fixProductionIndexes'

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') })

async function runIndexFix() {
  console.log('🔧 Starting production index fix...')
  
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/inventory', {
      maxPoolSize: 10,
      minPoolSize: 5,
      socketTimeoutMS: 45000,
      serverSelectionTimeoutMS: 10000,
    })
    
    console.log('✅ Connected to MongoDB')
    
    // Run the fix
    await fixProductionIndexes()
    
    console.log('🎉 Index fix completed successfully!')
    
  } catch (error) {
    console.error('❌ Error running index fix:', error)
    process.exit(1)
  } finally {
    await mongoose.disconnect()
    console.log('✅ Disconnected from MongoDB')
    process.exit(0)
  }
}

// Run the script
runIndexFix()
