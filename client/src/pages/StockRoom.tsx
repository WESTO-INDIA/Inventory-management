import { useState, useEffect } from 'react'
import { API_URL } from '@/config/api'
import '../styles/common.css'

interface GarmentStock {
  _id: string
  productId: string
  productName: string
  color: string
  size: string
  quantity: number
  tailorName: string
  generatedDate: string
}

interface Transaction {
  _id: string
  transactionId: string
  timestamp: string
  itemType: string
  itemId: string
  itemName: string
  action: string
  quantity: number
  previousStock: number
  newStock: number
  performedBy: string
  source: string
}

export default function StockRoom() {
  const [currentTime, setCurrentTime] = useState(new Date())
  const [garmentStocks, setGarmentStocks] = useState<GarmentStock[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filterGarment, setFilterGarment] = useState('')
  const [filterColor, setFilterColor] = useState('')
  const [filterFabricType, setFilterFabricType] = useState('')

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    fetchStockData()
    // Refresh data every 30 seconds for real-time updates
    const interval = setInterval(fetchStockData, 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchStockData = async () => {
    try {
      // Fetch manufacturing orders for garment stock
      const garmentResponse = await fetch(`${API_URL}/api/manufacturing-orders`)
      const garmentList: GarmentStock[] = []

      if (garmentResponse.ok) {
        const garmentData = await garmentResponse.json()
        // Convert manufacturing orders to garment stock format
        const manufacturingList = Array.isArray(garmentData) ? garmentData
          .filter((order: any) => order.status === 'Completed')
          .map((order: any) => ({
            _id: order._id,
            productId: order.manufacturingId,
            productName: order.productName,
            color: order.fabricColor || 'N/A',
            size: order.size || 'N/A',
            quantity: order.quantity || 0,
            tailorName: order.tailorName,
            generatedDate: order.createdAt,
            fabricType: order.fabricType || 'N/A'
          })) : []
        garmentList.push(...manufacturingList)
      }

      // Also fetch QR Products to get manual entries and products not in manufacturing
      const qrProductsResponse = await fetch(`${API_URL}/api/qr-products`)
      if (qrProductsResponse.ok) {
        const qrProductsData = await qrProductsResponse.json()

        // Get existing manufacturing IDs to avoid duplicates
        const existingManufacturingIds = new Set(
          garmentList.map(item => item.productId)
        )

        // Add only QR products that are not already in manufacturing list
        // This includes manual entries (cuttingId=MANUAL) and any QR products not linked to manufacturing
        const qrEntries = Array.isArray(qrProductsData) ? qrProductsData
          .filter((product: any) => {
            // For truly manual products (created in QR Inventory with MANUAL cutting ID)
            // Always include them even if they don't exist in manufacturing
            if (product.cuttingId === 'MANUAL' && product.manufacturingId && product.manufacturingId.startsWith('MAN')) {
              return !existingManufacturingIds.has(product.manufacturingId)
            }

            // For other QR products, check if they're already in manufacturing list
            const pid = product.productId || product.manufacturingId
            const mid = product.manufacturingId

            // Exclude if either ID already exists in manufacturing list (to avoid duplicates)
            return !existingManufacturingIds.has(pid) && !existingManufacturingIds.has(mid)
          })
          .map((product: any) => ({
            _id: product._id,
            productId: product.productId || product.manufacturingId,
            productName: product.productName,
            color: product.color || 'N/A',
            size: product.size || 'N/A',
            quantity: product.quantity || 0,
            tailorName: product.tailorName || 'N/A',
            generatedDate: product.createdAt || product.generatedDate,
            fabricType: product.fabricType || 'N/A'
          })) : []
        garmentList.push(...qrEntries)
      }

      setGarmentStocks(garmentList)

      // Fetch transactions
      const transactionResponse = await fetch(`${API_URL}/api/transactions`)
      if (transactionResponse.ok) {
        const transactionData = await transactionResponse.json()
        const txData = Array.isArray(transactionData) ? transactionData : (transactionData.transactions || [])
        setTransactions(txData)
      } else {
        setTransactions([])
      }
    } catch (error) {
      setGarmentStocks([])
      setTransactions([])
    } finally {
      setIsLoading(false)
    }
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }


  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-black mx-auto"></div>
          <p className="mt-4 text-black">Loading Stock Room...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8 animate-fadeIn">
        <div className="bg-white rounded-2xl shadow-xl p-6 backdrop-blur-lg bg-opacity-90">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-4xl font-bold text-black">Stock Room</h1>
              <p className="mt-2 text-black">Real-time Inventory Management System</p>
            </div>
            <div className="mt-4 sm:mt-0 text-right">
              <div className="bg-white border-2 border-black text-black px-4 py-2 rounded-lg">
                <div className="flex items-center justify-end">
                  <span className="text-xl font-bold">{formatTime(currentTime)}</span>
                </div>
                <p className="text-sm">{formatDate(currentTime)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stock Inventory Table */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-black">Stock Inventory</h2>
          <button
            onClick={fetchStockData}
            className="bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors"
          >
            Refresh
          </button>
        </div>

        {/* Filter Section */}
        <div className="mb-6">
          {/* Filter Dropdowns */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <select
              value={filterGarment}
              onChange={(e) => setFilterGarment(e.target.value)}
              className="px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-black transition-colors"
            >
              <option value="">All Garments</option>
              {(() => {
                const garments = new Set<string>()
                Array.isArray(garmentStocks) && garmentStocks.forEach((g: any) => {
                  if (g.productName) garments.add(g.productName)
                })
                return Array.from(garments).sort().map(garment => (
                  <option key={garment} value={garment}>{garment}</option>
                ))
              })()}
            </select>

            <select
              value={filterColor}
              onChange={(e) => setFilterColor(e.target.value)}
              className="px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-black transition-colors"
            >
              <option value="">All Colors</option>
              {(() => {
                const colors = new Set<string>()
                Array.isArray(garmentStocks) && garmentStocks.forEach((g: any) => {
                  if (g.color && g.color !== 'N/A') colors.add(g.color)
                })
                return Array.from(colors).sort().map(color => (
                  <option key={color} value={color}>{color}</option>
                ))
              })()}
            </select>

            <select
              value={filterFabricType}
              onChange={(e) => setFilterFabricType(e.target.value)}
              className="px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-black transition-colors"
            >
              <option value="">All Fabric Types</option>
              {(() => {
                const fabricTypes = new Set<string>()
                Array.isArray(garmentStocks) && garmentStocks.forEach((g: any) => {
                  if (g.fabricType && g.fabricType !== 'N/A') fabricTypes.add(g.fabricType)
                })
                return Array.from(fabricTypes).sort().map(fabricType => (
                  <option key={fabricType} value={fabricType}>{fabricType}</option>
                ))
              })()}
            </select>

            <button
              onClick={() => {
                setFilterGarment('')
                setFilterColor('')
                setFilterFabricType('')
              }}
              className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors font-semibold"
            >
              Clear Filters
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-100 border-b-2 border-gray-300">
                <th className="px-4 py-3 text-center font-bold text-black">Garment</th>
                <th className="px-4 py-3 text-center font-bold text-black">Color</th>
                <th className="px-4 py-3 text-center font-bold text-black">Fabric Type</th>
                <th className="px-4 py-3 text-center font-bold text-black">XXS</th>
                <th className="px-4 py-3 text-center font-bold text-black">XS</th>
                <th className="px-4 py-3 text-center font-bold text-black">S</th>
                <th className="px-4 py-3 text-center font-bold text-black">M</th>
                <th className="px-4 py-3 text-center font-bold text-black">L</th>
                <th className="px-4 py-3 text-center font-bold text-black">XL</th>
                <th className="px-4 py-3 text-center font-bold text-black">XXL</th>
                <th className="px-4 py-3 text-center font-bold text-black">Total</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                // Create a map to aggregate quantities by garment+color+fabricType combination
                const aggregatedStock = new Map<string, {
                  garment: string
                  color: string
                  fabricType: string
                  sizes: { [key: string]: number }
                }>()

                // Collect data from garmentStocks
                Array.isArray(garmentStocks) && garmentStocks.forEach((g: any) => {
                  const key = `${g.productName}|${g.color || 'N/A'}|${g.fabricType || 'N/A'}`

                  if (!aggregatedStock.has(key)) {
                    aggregatedStock.set(key, {
                      garment: g.productName,
                      color: g.color || 'N/A',
                      fabricType: g.fabricType || 'N/A',
                      sizes: { XXS: 0, XS: 0, S: 0, M: 0, L: 0, XL: 0, XXL: 0 }
                    })
                  }

                  const entry = aggregatedStock.get(key)!
                  const size = (g.size || '').toUpperCase()
                  if (entry.sizes.hasOwnProperty(size)) {
                    entry.sizes[size] += g.quantity || 0
                  }
                })

                // Apply transactions to adjust quantities
                Array.isArray(transactions) && transactions.forEach((t: any) => {
                  if (t.itemType === 'MANUFACTURING' || t.itemType === 'QR_GENERATED') {
                    const key = `${t.itemName}|${t.color || 'N/A'}|${t.fabricType || 'N/A'}`

                    if (!aggregatedStock.has(key)) {
                      aggregatedStock.set(key, {
                        garment: t.itemName,
                        color: t.color || 'N/A',
                        fabricType: t.fabricType || 'N/A',
                        sizes: { XXS: 0, XS: 0, S: 0, M: 0, L: 0, XL: 0, XXL: 0 }
                      })
                    }

                    const entry = aggregatedStock.get(key)!
                    const size = (t.size || '').toUpperCase()
                    if (entry.sizes.hasOwnProperty(size)) {
                      if (t.action === 'STOCK_IN') {
                        entry.sizes[size] += t.quantity
                      } else if (t.action === 'STOCK_OUT') {
                        entry.sizes[size] -= t.quantity
                      }
                    }
                  }
                })

                // Convert to array and sort by garment name
                let stockArray = Array.from(aggregatedStock.values()).sort((a, b) =>
                  a.garment.localeCompare(b.garment)
                )

                // Apply filters
                stockArray = stockArray.filter(item => {
                  // Filter by garment dropdown
                  if (filterGarment && item.garment !== filterGarment) return false

                  // Filter by color dropdown
                  if (filterColor && item.color !== filterColor) return false

                  // Filter by fabric type dropdown
                  if (filterFabricType && item.fabricType !== filterFabricType) return false

                  return true
                })

                return stockArray.length > 0 ? (
                  stockArray.map((item, index) => {
                    const total = Object.values(item.sizes).reduce((sum, qty) => sum + qty, 0)

                    return (
                      <tr
                        key={index}
                        className="border-b border-gray-200 hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-4 py-3 text-center font-semibold text-black">{item.garment}</td>
                        <td className="px-4 py-3 text-center text-gray-700">{item.color}</td>
                        <td className="px-4 py-3 text-center text-gray-700">{item.fabricType}</td>
                        <td className="px-4 py-3 text-center text-gray-700">{item.sizes.XXS || '-'}</td>
                        <td className="px-4 py-3 text-center text-gray-700">{item.sizes.XS || '-'}</td>
                        <td className="px-4 py-3 text-center text-gray-700">{item.sizes.S || '-'}</td>
                        <td className="px-4 py-3 text-center text-gray-700">{item.sizes.M || '-'}</td>
                        <td className="px-4 py-3 text-center text-gray-700">{item.sizes.L || '-'}</td>
                        <td className="px-4 py-3 text-center text-gray-700">{item.sizes.XL || '-'}</td>
                        <td className="px-4 py-3 text-center text-gray-700">{item.sizes.XXL || '-'}</td>
                        <td className="px-4 py-3 text-center font-bold text-green-600">{total}</td>
                      </tr>
                    )
                  })
                ) : (
                  <tr>
                    <td colSpan={11} className="px-4 py-8 text-center text-gray-500">
                      No stock available
                    </td>
                  </tr>
                )
              })()}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
