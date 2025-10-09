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
      // Fetch fabric stocks
      const fabricResponse = await fetch(`${API_URL}/api/fabrics`)
      if (fabricResponse.ok) {
        const fabricData = await fabricResponse.json()
        setFabricStocks(Array.isArray(fabricData) ? fabricData : [])
      } else {
        setFabricStocks([])
      }

      // Fetch garment stocks (QR products)
      const garmentResponse = await fetch(`${API_URL}/api/qr-products`)
      if (garmentResponse.ok) {
        const garmentData = await garmentResponse.json()
        setGarmentStocks(Array.isArray(garmentData) ? garmentData : [])
      } else {
        setGarmentStocks([])
      }

      // Fetch transactions
      const transactionResponse = await fetch(`${API_URL}/api/transactions`)
      if (transactionResponse.ok) {
        const transactionData = await transactionResponse.json()
        setTransactions(Array.isArray(transactionData) ? transactionData : [])
      } else {
        setTransactions([])
      }
    } catch (error) {
      console.error('Error fetching stock data:', error)
      setFabricStocks([])
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

  // Calculate stock statistics - ensure arrays exist
  const totalFabricStock = Array.isArray(fabricStocks)
    ? fabricStocks.reduce((sum, fabric) => sum + fabric.quantity, 0)
    : 0
  const totalGarmentStock = Array.isArray(garmentStocks)
    ? garmentStocks.reduce((sum, garment) => sum + garment.quantity, 0)
    : 0

  // Filter transactions for fabric stock in/out - ensure array exists
  const fabricStockInTransactions = Array.isArray(transactions)
    ? transactions.filter(t => t.itemType === 'FABRIC' && (t.action === 'STOCK_IN' || t.action === 'ADD'))
    : []
  const fabricStockOutTransactions = Array.isArray(transactions)
    ? transactions.filter(t => t.itemType === 'FABRIC' && (t.action === 'STOCK_OUT' || t.action === 'REMOVE'))
    : []

  // Filter transactions for garment stock in/out
  const garmentStockInTransactions = Array.isArray(transactions)
    ? transactions.filter(t => (t.itemType === 'QR_GENERATED' || t.itemType === 'MANUFACTURING') && (t.action === 'ADD' || t.action === 'STOCK_IN' || t.action === 'QR_GENERATED'))
    : []
  const garmentStockOutTransactions = Array.isArray(transactions)
    ? transactions.filter(t => (t.itemType === 'QR_GENERATED' || t.itemType === 'MANUFACTURING') && (t.action === 'REMOVE' || t.action === 'STOCK_OUT'))
    : []

  // Calculate stock room statistics
  const totalFabricItems = fabricStocks.length
  const totalGarmentItems = garmentStocks.length
  const lowStockFabrics = Array.isArray(fabricStocks)
    ? fabricStocks.filter(f => f.status === 'Low Stock' || f.status === 'Out of Stock').length
    : 0

  // Calculate total value (if available)
  const totalFabricValue = Array.isArray(fabricStocks)
    ? fabricStocks.reduce((sum, fabric) => sum + ((fabric as any).totalPrice || 0), 0)
    : 0

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

      {/* Stock Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-2xl shadow-lg p-6 transform hover:scale-105 transition-all duration-300 hover:shadow-2xl border-2 border-blue-500">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-blue-100 p-3 rounded-xl">
              <span className="text-2xl">📦</span>
            </div>
            <span className="text-xs bg-blue-500 text-white px-2 py-1 rounded-full font-semibold">
              Stock In
            </span>
          </div>
          <h3 className="text-gray-600 text-sm mb-1">Fabric Stock In</h3>
          <p className="text-3xl font-bold text-black">{fabricStockInTransactions.length}</p>
          <p className="text-sm text-gray-600 mt-2">
            <span className="text-black font-semibold">{totalFabricStock}</span> meters total
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6 transform hover:scale-105 transition-all duration-300 hover:shadow-2xl border-2 border-red-500">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-red-100 p-3 rounded-xl">
              <span className="text-2xl">📤</span>
            </div>
            <span className="text-xs bg-red-500 text-white px-2 py-1 rounded-full font-semibold">
              Stock Out
            </span>
          </div>
          <h3 className="text-gray-600 text-sm mb-1">Fabric Stock Out</h3>
          <p className="text-3xl font-bold text-black">{fabricStockOutTransactions.length}</p>
          <p className="text-sm text-gray-600 mt-2">
            <span className="text-black font-semibold">{fabricStocks.length}</span> items
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6 transform hover:scale-105 transition-all duration-300 hover:shadow-2xl border-2 border-green-500">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-green-100 p-3 rounded-xl">
              <span className="text-2xl">👔</span>
            </div>
            <span className="text-xs bg-green-500 text-white px-2 py-1 rounded-full font-semibold">
              Available
            </span>
          </div>
          <h3 className="text-gray-600 text-sm mb-1">garment stock in</h3>
          <p className="text-3xl font-bold text-black">{garmentStockInTransactions.length}</p>
          <p className="text-sm text-gray-600 mt-2">
            <span className="text-black font-semibold">{totalGarmentStock}</span> pieces
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
            <span className="text-black font-semibold">{garmentStockInTransactions.length}</span> stock in
          </p>
        </div>
      </div>

      {/* Additional Stock Room Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white border-2 border-black rounded-2xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-black font-semibold">Total Fabric Items</h3>
            <span className="text-2xl">📦</span>
          </div>
          <p className="text-4xl font-bold text-black">{totalFabricItems}</p>
        </div>

        <div className="bg-white border-2 border-black rounded-2xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-black font-semibold">Total Garment Items</h3>
            <span className="text-2xl">👔</span>
          </div>
          <p className="text-4xl font-bold text-black">{totalGarmentItems}</p>
        </div>

        <div className="bg-white border-2 border-black rounded-2xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-black font-semibold">Fabric Inventory Value</h3>
            <span className="text-2xl">💰</span>
          </div>
          <p className="text-4xl font-bold text-black">₹{totalFabricValue.toFixed(0)}</p>
        </div>
      </div>

      {/* Stock Room Details - Two Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Fabric Stock */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-black">📦 Fabric Stock</h3>
            <button
              onClick={fetchStockData}
              className="text-xs bg-black text-white px-3 py-1 rounded-full hover:bg-gray-800 transition-colors"
            >
              Refresh
            </button>
          </div>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {fabricStocks.length > 0 ? (
              fabricStocks.map((fabric) => (
                <div key={fabric._id} className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="font-semibold text-black">{fabric.fabricType}</p>
                      <p className="text-sm text-gray-600">
                        {fabric.color} • ID: {fabric.fabricId}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Received: {formatDateTime(fabric.dateReceived)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-black">{fabric.quantity}m</p>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        fabric.status === 'In Stock' ? 'bg-green-100 text-green-700' :
                        fabric.status === 'Low Stock' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {fabric.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-gray-500 py-8">No fabric stock available</p>
            )}
          </div>
        </div>

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
            {garmentStocks.length > 0 ? (
              garmentStocks.map((garment) => (
                <div key={garment._id} className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="font-semibold text-black">{garment.productName}</p>
                      <p className="text-sm text-gray-600">
                        {garment.color} • Size: {garment.size}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Tailor: {garment.tailorName} • {formatDateTime(garment.generatedDate)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-green-600">{garment.quantity} pcs</p>
                      <p className="text-xs text-gray-500">ID: {garment.productId}</p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-gray-500 py-8">No garment stock available</p>
            )}
          </div>
        </div>
      </div>

      {/* Stock Room Summary */}
      <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl shadow-lg p-8">
        <h2 className="text-2xl font-bold text-black mb-6 flex items-center">
          <span className="text-3xl mr-3">📍</span>
          Stock Room Overview
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-700 mb-3">📦 Fabric Metrics</h3>
            <div className="flex justify-between items-center p-3 bg-white rounded-lg">
              <span className="text-gray-600">Total Stock:</span>
              <span className="font-bold text-blue-600">{totalFabricStock} meters</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-white rounded-lg">
              <span className="text-gray-600">Stock In Transactions:</span>
              <span className="font-bold text-green-600">{fabricStockInTransactions.length}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-white rounded-lg">
              <span className="text-gray-600">Stock Out Transactions:</span>
              <span className="font-bold text-red-600">{fabricStockOutTransactions.length}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-white rounded-lg">
              <span className="text-gray-600">Low Stock Alerts:</span>
              <span className={`font-bold ${lowStockFabrics > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {lowStockFabrics > 0 ? `${lowStockFabrics} items` : 'None'}
              </span>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold text-gray-700 mb-3">👔 Garment Metrics</h3>
            <div className="flex justify-between items-center p-3 bg-white rounded-lg">
              <span className="text-gray-600">Total Pieces:</span>
              <span className="font-bold text-green-600">{totalGarmentStock} pcs</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-white rounded-lg">
              <span className="text-gray-600">Stock In Transactions:</span>
              <span className="font-bold text-green-600">{garmentStockInTransactions.length}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-white rounded-lg">
              <span className="text-gray-600">Stock Out Transactions:</span>
              <span className="font-bold text-orange-600">{garmentStockOutTransactions.length}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-white rounded-lg">
              <span className="text-gray-600">Total Items:</span>
              <span className="font-bold text-purple-600">{totalGarmentItems}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
