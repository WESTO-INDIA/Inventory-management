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
  completionDate?: string
  updatedAt?: string
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
            completionDate: order.completionDate,
            updatedAt: order.updatedAt,
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
            completionDate: product.completionDate,
            updatedAt: product.updatedAt,
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
          <div>
            <h2 className="text-2xl font-bold text-black">Stock Inventory</h2>
            {(() => {
              // Calculate total unique garments
              const uniqueGarments = new Set<string>()
              Array.isArray(garmentStocks) && garmentStocks.forEach((g: any) => {
                if (g.productName) uniqueGarments.add(g.productName)
              })
              return (
                <p className="text-sm text-gray-600 mt-1">
                  Total Unique Garments: <span className="font-bold text-black">{uniqueGarments.size}</span>
                </p>
              )
            })()}
          </div>
          <button
            onClick={fetchStockData}
            className="bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors"
          >
            Refresh
          </button>
        </div>

        {/* Filter Section */}
        <div className="mb-6">
          {/* Filter Text Inputs */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <input
              type="text"
              value={filterGarment}
              onChange={(e) => setFilterGarment(e.target.value)}
              placeholder="Search Garment..."
              className="px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-black transition-colors"
            />

            <input
              type="text"
              value={filterColor}
              onChange={(e) => setFilterColor(e.target.value)}
              placeholder="Search Color..."
              className="px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-black transition-colors"
            />

            <input
              type="text"
              value={filterFabricType}
              onChange={(e) => setFilterFabricType(e.target.value)}
              placeholder="Search Fabric Type..."
              className="px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-black transition-colors"
            />

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
                <th className="px-4 py-3 text-center font-bold text-black">Manufacturing ID</th>
                <th className="px-4 py-3 text-center font-bold text-black">Garment</th>
                <th className="px-4 py-3 text-center font-bold text-black">Color</th>
                <th className="px-4 py-3 text-center font-bold text-black">Fabric Type</th>
                <th className="px-4 py-3 text-center font-bold text-black">Size</th>
                <th className="px-4 py-3 text-center font-bold text-black">Quantity</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                // Create a map to track stock by manufacturing ID
                const stockByManufacturingId = new Map<string, {
                  manufacturingId: string
                  garment: string
                  color: string
                  fabricType: string
                  size: string
                  quantity: number
                  lastUpdated: string
                }>()

                // Collect data from garmentStocks (base manufacturing orders)
                // Multiple records might share the same manufacturingId (different tailors)
                // We need to aggregate them by manufacturingId
                Array.isArray(garmentStocks) && garmentStocks.forEach((g: any) => {
                  const id = g.productId
                  // Determine the last updated time - priority: completionDate > updatedAt > generatedDate
                  const lastUpdated = g.completionDate || g.updatedAt || g.generatedDate || new Date().toISOString()

                  if (stockByManufacturingId.has(id)) {
                    // If this manufacturing ID already exists, add to its quantity
                    const existing = stockByManufacturingId.get(id)!
                    existing.quantity += g.quantity || 0
                    // Update lastUpdated to the most recent one
                    if (new Date(lastUpdated) > new Date(existing.lastUpdated)) {
                      existing.lastUpdated = lastUpdated
                    }
                  } else {
                    // Create new entry
                    stockByManufacturingId.set(id, {
                      manufacturingId: id,
                      garment: g.productName,
                      color: g.color || 'N/A',
                      fabricType: g.fabricType || 'N/A',
                      size: g.size || 'N/A',
                      quantity: g.quantity || 0,
                      lastUpdated: lastUpdated
                    })
                  }
                })

                // Apply transactions to adjust quantities
                Array.isArray(transactions) && transactions.forEach((t: any) => {
                  if (t.itemType === 'MANUFACTURING' || t.itemType === 'QR_GENERATED') {
                    const id = t.itemId
                    const transactionTime = t.timestamp || new Date().toISOString()

                    // If manufacturing ID doesn't exist, create it from transaction
                    if (!stockByManufacturingId.has(id)) {
                      stockByManufacturingId.set(id, {
                        manufacturingId: id,
                        garment: t.itemName,
                        color: t.color || 'N/A',
                        fabricType: t.fabricType || 'N/A',
                        size: t.size || 'N/A',
                        quantity: 0,
                        lastUpdated: transactionTime
                      })
                    }

                    const item = stockByManufacturingId.get(id)!
                    if (t.action === 'STOCK_IN') {
                      item.quantity += t.quantity
                    } else if (t.action === 'STOCK_OUT') {
                      item.quantity -= t.quantity
                    }
                    // Update lastUpdated to the transaction time if it's more recent
                    if (new Date(transactionTime) > new Date(item.lastUpdated)) {
                      item.lastUpdated = transactionTime
                    }
                  }
                })

                // Convert to array and sort by last updated time (newest first)
                let stockArray = Array.from(stockByManufacturingId.values()).sort((a, b) => {
                  // Sort by lastUpdated in descending order (newest first)
                  const dateA = new Date(a.lastUpdated).getTime()
                  const dateB = new Date(b.lastUpdated).getTime()
                  return dateB - dateA
                })

                // Apply filters (case-insensitive partial matching)
                stockArray = stockArray.filter(item => {
                  // Filter by garment text input
                  if (filterGarment && !item.garment.toLowerCase().includes(filterGarment.toLowerCase())) return false

                  // Filter by color text input
                  if (filterColor && !item.color.toLowerCase().includes(filterColor.toLowerCase())) return false

                  // Filter by fabric type text input
                  if (filterFabricType && !item.fabricType.toLowerCase().includes(filterFabricType.toLowerCase())) return false

                  return true
                })

                return stockArray.length > 0 ? (
                  stockArray.map((item, index) => (
                    <tr
                      key={index}
                      className="border-b border-gray-200 hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-4 py-3 text-center font-semibold text-black">{item.manufacturingId}</td>
                      <td className="px-4 py-3 text-center text-gray-700">{item.garment}</td>
                      <td className="px-4 py-3 text-center text-gray-700">{item.color}</td>
                      <td className="px-4 py-3 text-center text-gray-700">{item.fabricType}</td>
                      <td className="px-4 py-3 text-center text-gray-700">{item.size}</td>
                      <td className="px-4 py-3 text-center font-bold text-green-600">{item.quantity}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
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
