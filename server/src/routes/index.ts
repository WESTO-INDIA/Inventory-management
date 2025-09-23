import { Router } from 'express'
import authRoutes from './auth'
import fabricRoutes from './fabrics'
import cuttingRecordsRoutes from './cuttingRecords'
import manufacturingOrdersRoutes from './manufacturingOrders'
import manufacturingInventoryRoutes from './manufacturingInventory'
import employeesRoutes from './employees'
import attendanceRoutes from './attendance'
import tailorsRoutes from './tailors'
import dashboardRoutes from './dashboard'
import transactionRoutes from './transactions'
import qrProductsRoutes from './qrProducts'

const router = Router()

router.use('/auth', authRoutes)
router.use('/fabrics', fabricRoutes)
router.use('/cutting-records', cuttingRecordsRoutes)
router.use('/manufacturing-orders', manufacturingOrdersRoutes)
router.use('/manufacturing-inventory', manufacturingInventoryRoutes)
router.use('/employees', employeesRoutes)
router.use('/attendance', attendanceRoutes)
router.use('/tailors', tailorsRoutes)
router.use('/dashboard', dashboardRoutes)
router.use('/transactions', transactionRoutes)
router.use('/qr-products', qrProductsRoutes)

// Health check
router.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() })
})

export default router