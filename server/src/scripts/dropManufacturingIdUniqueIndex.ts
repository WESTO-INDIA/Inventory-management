import mongoose from 'mongoose'
import dotenv from 'dotenv'
import path from 'path'

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') })

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/inventory'

async function dropUniqueIndex() {
  try {
    console.log('Connecting to MongoDB...')
    await mongoose.connect(MONGODB_URI)
    console.log('✅ Connected to MongoDB')

    const db = mongoose.connection.db
    const collection = db.collection('manufacturingorders')

    console.log('\n📋 Existing indexes:')
    const indexes = await collection.indexes()
    indexes.forEach((idx: any) => {
      console.log(`  - ${idx.name}: ${JSON.stringify(idx.key)}`)
    })

    // Drop the unique index on manufacturingId
    try {
      await collection.dropIndex('manufacturingId_1')
      console.log('\n✅ Dropped unique index: manufacturingId_1')
    } catch (error: any) {
      if (error.code === 27 || error.message.includes('index not found')) {
        console.log('\n⚠️  Index manufacturingId_1 not found (already dropped or doesn\'t exist)')
      } else {
        throw error
      }
    }

    // Try alternate index name (with typo)
    try {
      await collection.dropIndex('manufacturingld_1')
      console.log('✅ Dropped unique index: manufacturingld_1 (typo version)')
    } catch (error: any) {
      if (error.code === 27 || error.message.includes('index not found')) {
        console.log('⚠️  Index manufacturingld_1 not found')
      }
    }

    // Create non-unique index for performance
    await collection.createIndex({ manufacturingId: 1 }, { unique: false })
    console.log('✅ Created non-unique index on manufacturingId')

    console.log('\n📋 Updated indexes:')
    const newIndexes = await collection.indexes()
    newIndexes.forEach((idx: any) => {
      console.log(`  - ${idx.name}: ${JSON.stringify(idx.key)}${idx.unique ? ' (UNIQUE)' : ''}`)
    })

    console.log('\n✅ Migration completed successfully!')
    console.log('👉 You can now assign the same garment to multiple tailors without errors.')

  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await mongoose.disconnect()
    console.log('\n🔌 Disconnected from MongoDB')
    process.exit(0)
  }
}

dropUniqueIndex()
