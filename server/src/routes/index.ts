import { Router } from 'express'
import authRoutes from './auth'
import fabricRoutes from './fabrics'
import cuttingRecordsRoutes from './cuttingRecords'
import manufacturingOrdersRoutes from './manufacturingOrders'
import employeesRoutes from './employees'
import transactionRoutes from './transactions'
import qrProductsRoutes from './qrProducts'
import stockRoomRoutes from './stockRoom'

const router = Router()

router.use('/auth', authRoutes)
router.use('/fabrics', fabricRoutes)
router.use('/cutting-records', cuttingRecordsRoutes)
router.use('/manufacturing-orders', manufacturingOrdersRoutes)
router.use('/employees', employeesRoutes)
router.use('/transactions', transactionRoutes)
router.use('/qr-products', qrProductsRoutes)
router.use('/stock-room', stockRoomRoutes)

// Health check
router.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() })
})

export default router