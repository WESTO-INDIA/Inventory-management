import mongoose from 'mongoose'
import dotenv from 'dotenv'
import path from 'path'

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') })

/**
 * Script to clean up unused MongoDB collections
 *
 * Collections to DROP:
 * - manufacturinginventories (replaced by manufacturingorders)
 * - manufacturings (old/unused)
 * - products (not used in current app)
 * - tailors (minimal usage, can recreate if needed)
 * - users (not actively used, only fallback in auth)
 */

async function cleanupDatabase() {
  try {
    console.log('🔧 Connecting to MongoDB...')
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/inventory')
    console.log('✅ Connected to MongoDB')

    const db = mongoose.connection.db
    if (!db) {
      throw new Error('Database connection not established')
    }

    // Get all collections
    const collections = await db.listCollections().toArray()
    const collectionNames = collections.map(c => c.name)

    console.log('\n📋 Current collections:', collectionNames)

    // Collections to drop
    const collectionsToDelete = [
      'manufacturinginventories',
      'manufacturings',
      'products',
      'tailors',
      'users'
    ]

    console.log('\n🗑️  Collections marked for deletion:', collectionsToDelete)
    console.log('\n⚠️  WARNING: This will permanently delete these collections!')
    console.log('Press Ctrl+C to cancel, or wait 5 seconds to continue...\n')

    // Wait 5 seconds before proceeding
    await new Promise(resolve => setTimeout(resolve, 5000))

    // Drop each unused collection
    for (const collectionName of collectionsToDelete) {
      if (collectionNames.includes(collectionName)) {
        try {
          await db.dropCollection(collectionName)
          console.log(`✅ Dropped collection: ${collectionName}`)
        } catch (error: any) {
          console.log(`⚠️  Could not drop ${collectionName}: ${error.message}`)
        }
      } else {
        console.log(`ℹ️  Collection ${collectionName} does not exist, skipping...`)
      }
    }

    // Show remaining collections
    const remainingCollections = await db.listCollections().toArray()
    const remainingNames = remainingCollections.map(c => c.name)

    console.log('\n✅ Cleanup complete!')
    console.log('\n📋 Remaining collections:', remainingNames)
    console.log('\n🎯 Active collections for your app:')
    console.log('   - attendances (Employee attendance tracking)')
    console.log('   - cuttingrecords (Cutting inventory)')
    console.log('   - employees (Employee management)')
    console.log('   - fabrics (Fabric inventory)')
    console.log('   - manufacturingorders (Manufacturing workflow)')
    console.log('   - qrproducts (QR code products)')
    console.log('   - transactions (Stock transactions)')

  } catch (error) {
    console.error('❌ Error during cleanup:', error)
  } finally {
    await mongoose.disconnect()
    console.log('\n✅ Disconnected from MongoDB')
    process.exit(0)
  }
}

// Run the cleanup
cleanupDatabase()
