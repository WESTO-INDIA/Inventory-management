import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { API_URL } from '@/config/api'
import '../styles/common.css'

interface FabricStock {
  _id: string
  fabricId: string
  fabricType: string
  color: string
  quantity: number
  status: string
  dateReceived: string
}

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
  const navigate = useNavigate()
  const [currentTime, setCurrentTime] = useState(new Date())
  const [fabricStocks, setFabricStocks] = useState<FabricStock[]>([])
  const [garmentStocks, setGarmentStocks] = useState<GarmentStock[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [isLoading, setIsLoading] = useState(true)

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
      if (garmentResponse.ok) {
        const garmentData = await garmentResponse.json()
        // Convert manufacturing orders to garment stock format
        const garmentList = Array.isArray(garmentData) ? garmentData
          .filter((order: any) => order.status === 'Completed')
          .map((order: any) => ({
            _id: order._id,
            productId: order.manufacturingId,
            productName: order.productName,
            color: order.fabricColor || 'N/A',
            size: order.size || 'N/A',
            quantity: order.quantity || 0,
            tailorName: order.tailorName,
            generatedDate: order.createdAt
          })) : []
        setGarmentStocks(garmentList)
      } else {
        setGarmentStocks([])
      }

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
      console.error('Error fetching stock data:', error)
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

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Calculate garment stock from base quantity + transactions
  const totalGarmentStock = (() => {
    let total = 0

    // Add base quantities from completed manufacturing orders
    if (Array.isArray(garmentStocks)) {
      total = garmentStocks.reduce((sum, g) => sum + (g.quantity || 0), 0)
    }

    // Add/subtract from transactions
    if (Array.isArray(transactions)) {
      transactions.forEach(t => {
        if (t.itemType === 'MANUFACTURING' || t.itemType === 'QR_GENERATED') {
          if (t.action === 'STOCK_IN') {
            total += t.quantity
          } else if (t.action === 'STOCK_OUT') {
            total -= t.quantity
          }
        }
      })
    }

    return total
  })()

  // Filter transactions for garment stock in/out
  const garmentStockInTransactions = Array.isArray(transactions)
    ? transactions.filter(t => (t.itemType === 'QR_GENERATED' || t.itemType === 'MANUFACTURING') && t.action === 'STOCK_IN')
    : []
  const garmentStockOutTransactions = Array.isArray(transactions)
    ? transactions.filter(t => (t.itemType === 'QR_GENERATED' || t.itemType === 'MANUFACTURING') && t.action === 'STOCK_OUT')
    : []

  // Calculate stock room statistics
  const totalGarmentItems = garmentStocks.length

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

      {/* Stock Summary Cards - Garment Only */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-2xl shadow-lg p-6 transform hover:scale-105 transition-all duration-300 hover:shadow-2xl border-2 border-green-500">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-green-100 p-3 rounded-xl">
              <span className="text-2xl">👔</span>
            </div>
            <span className="text-xs bg-green-500 text-white px-2 py-1 rounded-full font-semibold">
              Stock In
            </span>
          </div>
          <h3 className="text-gray-600 text-sm mb-1">Garment Stock In</h3>
          <p className="text-3xl font-bold text-black">{garmentStockInTransactions.length}</p>
          <p className="text-sm text-gray-600 mt-2">
            <span className="text-black font-semibold">{totalGarmentStock}</span> pieces total
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6 transform hover:scale-105 transition-all duration-300 hover:shadow-2xl border-2 border-orange-500">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-orange-100 p-3 rounded-xl">
              <span className="text-2xl">📤</span>
            </div>
            <span className="text-xs bg-orange-500 text-white px-2 py-1 rounded-full font-semibold">
              Stock Out
            </span>
          </div>
          <h3 className="text-gray-600 text-sm mb-1">Garment Stock Out</h3>
          <p className="text-3xl font-bold text-black">{garmentStockOutTransactions.length}</p>
          <p className="text-sm text-gray-600 mt-2">
            <span className="text-black font-semibold">{garmentStockOutTransactions.reduce((sum, t) => sum + t.quantity, 0)}</span> pieces out
          </p>
        </div>

        <div className="bg-white border-2 border-black rounded-2xl shadow-lg p-6 transform hover:scale-105 transition-all duration-300 hover:shadow-2xl">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-gray-100 p-3 rounded-xl">
              <span className="text-2xl">📊</span>
            </div>
            <span className="text-xs bg-black text-white px-2 py-1 rounded-full font-semibold">
              Total Items
            </span>
          </div>
          <h3 className="text-gray-600 text-sm mb-1">Total Garment Items</h3>
          <p className="text-3xl font-bold text-black">{totalGarmentItems}</p>
          <p className="text-sm text-gray-600 mt-2">Unique products</p>
        </div>
      </div>

      {/* Stock Room Details - Garment Stock Only */}
      <div className="grid grid-cols-1 gap-6 mb-8">
        {/* Garment Stock */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-black">👔 Garment Stock</h3>
            <button
              onClick={fetchStockData}
              className="text-xs bg-black text-white px-3 py-1 rounded-full hover:bg-gray-800 transition-colors"
            >
              Refresh
            </button>
          </div>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {(() => {
              // Create map from manufacturing orders (base data)
              const garmentStockMap = new Map()

              // First, add all completed manufacturing orders with their base quantity
              Array.isArray(garmentStocks) && garmentStocks.forEach((g: any) => {
                garmentStockMap.set(g.productId, {
                  itemId: g.productId,
                  itemName: g.productName,
                  color: g.color || 'N/A',
                  size: g.size || 'N/A',
                  quantity: g.quantity || 0, // Start with manufacturing order quantity
                  baseQuantity: g.quantity || 0, // Store base quantity
                  tailorName: g.tailorName || 'N/A',
                  lastUpdate: g.generatedDate
                })
              })

              // Then adjust quantities based on transactions (stock in/out changes)
              Array.isArray(transactions) && transactions.forEach((t: any) => {
                if (t.itemType === 'MANUFACTURING' || t.itemType === 'QR_GENERATED') {
                  if (!garmentStockMap.has(t.itemId)) {
                    // If no manufacturing order, create from transaction
                    garmentStockMap.set(t.itemId, {
                      itemId: t.itemId,
                      itemName: t.itemName,
                      color: t.color || 'N/A',
                      size: t.size || 'N/A',
                      quantity: 0,
                      baseQuantity: 0,
                      tailorName: 'N/A',
                      lastUpdate: t.timestamp
                    })
                  }

                  const item = garmentStockMap.get(t.itemId)
                  // Only apply STOCK_IN/STOCK_OUT transactions (from QR Scanner)
                  // Don't double count QR_GENERATED actions
                  if (t.action === 'STOCK_IN') {
                    item.quantity += t.quantity
                  } else if (t.action === 'STOCK_OUT') {
                    item.quantity -= t.quantity
                  }
                  item.lastUpdate = t.timestamp
                }
              })

              const garmentItems = Array.from(garmentStockMap.values())

              return garmentItems.length > 0 ? (
                garmentItems.map((garment) => (
                  <div key={garment.itemId} className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="font-semibold text-black">{garment.itemName}</p>
                        <p className="text-sm text-gray-600">
                          {garment.color} • Size: {garment.size}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Tailor: {garment.tailorName} • {formatDateTime(garment.lastUpdate)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-green-600">{garment.quantity} pcs</p>
                        <p className="text-xs text-gray-500">ID: {garment.itemId}</p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-gray-500 py-8">No garment stock available</p>
              )
            })()}
          </div>
        </div>
      </div>

      {/* Stock Transaction History */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <h2 className="text-xl font-bold text-black mb-4 flex items-center">
          <span className="text-2xl mr-3">📋</span>
          Recent Stock Transactions
        </h2>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {Array.isArray(transactions) && transactions
            .filter(t => t.itemType === 'MANUFACTURING' || t.itemType === 'QR_GENERATED')
            .slice(0, 20)
            .map((transaction) => (
              <div key={transaction._id} className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="font-semibold text-black">{transaction.itemName}</p>
                    <p className="text-sm text-gray-600">ID: {transaction.itemId}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatDateTime(transaction.timestamp)} • By: {transaction.performedBy}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs px-3 py-1 rounded-full font-semibold ${
                      transaction.action === 'STOCK_IN' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                    }`}>
                      {transaction.action === 'STOCK_IN' ? '+ Stock In' : '- Stock Out'}
                    </span>
                    <p className="text-lg font-bold text-black mt-1">{transaction.quantity} pcs</p>
                    <p className="text-xs text-gray-500">
                      {transaction.previousStock} → {transaction.newStock}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          {(!Array.isArray(transactions) || transactions.filter(t => t.itemType === 'MANUFACTURING' || t.itemType === 'QR_GENERATED').length === 0) && (
            <p className="text-center text-gray-500 py-8">No transactions yet</p>
          )}
        </div>
      </div>
    </div>
  )
}
