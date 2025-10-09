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
            generatedDate: order.createdAt
          })) : []
        garmentList.push(...manufacturingList)
      }

      // Also fetch manual entries from QR Products
      const qrProductsResponse = await fetch(`${API_URL}/api/qr-products`)
      if (qrProductsResponse.ok) {
        const qrProductsData = await qrProductsResponse.json()
        // Add manual entries (those with cuttingId = 'MANUAL' or manufacturingId starting with 'MAN')
        const manualEntries = Array.isArray(qrProductsData) ? qrProductsData
          .filter((product: any) =>
            product.cuttingId === 'MANUAL' ||
            (product.manufacturingId && product.manufacturingId.startsWith('MAN'))
          )
          .map((product: any) => ({
            _id: product._id,
            productId: product.productId || product.manufacturingId,
            productName: product.productName,
            color: product.color || 'N/A',
            size: product.size || 'N/A',
            quantity: product.quantity || 0,
            tailorName: product.tailorName || 'Manual Entry',
            generatedDate: product.createdAt || product.generatedDate
          })) : []
        garmentList.push(...manualEntries)
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

      {/* Bar Chart - Product Inventory */}
      <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
        <h2 className="text-xl font-bold text-black mb-6 flex items-center">
          <span className="text-2xl mr-3">📊</span>
          Inventory Overview by Product
        </h2>
        <div className="overflow-x-auto">
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
                quantity: g.quantity || 0,
                baseQuantity: g.quantity || 0,
                tailorName: g.tailorName || 'N/A',
                lastUpdate: g.generatedDate
              })
            })

            // Then adjust quantities based on transactions (stock in/out changes)
            Array.isArray(transactions) && transactions.forEach((t: any) => {
              if (t.itemType === 'MANUFACTURING' || t.itemType === 'QR_GENERATED') {
                if (!garmentStockMap.has(t.itemId)) {
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
                if (t.action === 'STOCK_IN') {
                  item.quantity += t.quantity
                } else if (t.action === 'STOCK_OUT') {
                  item.quantity -= t.quantity
                }
                item.lastUpdate = t.timestamp
              }
            })

            const chartData = Array.from(garmentStockMap.values())

            // Group by product name, then by color
            const groupedByProduct = new Map()
            chartData.forEach(item => {
              const productName = item.itemName
              if (!groupedByProduct.has(productName)) {
                groupedByProduct.set(productName, new Map())
              }
              const colorMap = groupedByProduct.get(productName)
              const color = item.color
              if (!colorMap.has(color)) {
                colorMap.set(color, [])
              }
              colorMap.get(color).push(item)
            })

            // Sort sizes within each color, and colors alphabetically
            groupedByProduct.forEach((colorMap, productName) => {
              const sortedColors = new Map([...colorMap.entries()].sort((a, b) => a[0].localeCompare(b[0])))
              sortedColors.forEach((items, color) => {
                items.sort((a, b) => {
                  const sizeOrder = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', 'Free Size']
                  const aIndex = sizeOrder.indexOf(a.size)
                  const bIndex = sizeOrder.indexOf(b.size)
                  return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex)
                })
              })
              groupedByProduct.set(productName, sortedColors)
            })

            // Convert to array and sort by product name
            const groupedArray = Array.from(groupedByProduct.entries()).sort((a, b) =>
              a[0].localeCompare(b[0])
            )

            const maxQuantity = chartData.length > 0
              ? Math.max(...chartData.map(item => item.quantity), 1)
              : 1

            // Color palette for different SIZES
            const sizeColorMap: { [key: string]: { from: string; to: string } } = {
              'XXS': { from: '#ef4444', to: '#dc2626' },   // Red
              'XS': { from: '#f97316', to: '#ea580c' },    // Orange
              'S': { from: '#f59e0b', to: '#d97706' },     // Amber
              'M': { from: '#10b981', to: '#059669' },     // Green
              'L': { from: '#3b82f6', to: '#2563eb' },     // Blue
              'XL': { from: '#8b5cf6', to: '#7c3aed' },    // Purple
              'XXL': { from: '#ec4899', to: '#db2777' },   // Pink
              'XXXL': { from: '#14b8a6', to: '#0d9488' },  // Teal
              'Free Size': { from: '#6b7280', to: '#4b5563' } // Gray
            }

            return groupedArray.length > 0 ? (
              <div style={{ width: '100%', overflowX: 'auto', paddingBottom: '20px' }}>
                {/* Chart Container */}
                <div style={{ position: 'relative', paddingLeft: '60px', minHeight: '480px', minWidth: 'max-content' }}>
                  {/* Y-axis labels and grid lines */}
                  <div style={{
                    position: 'absolute',
                    left: '0',
                    top: '0',
                    width: '100%',
                    height: '350px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    pointerEvents: 'none'
                  }}>
                    {[maxQuantity, Math.floor(maxQuantity * 0.75), Math.floor(maxQuantity * 0.5), Math.floor(maxQuantity * 0.25), 0].map((value, index) => (
                      <div key={index} style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                        <span className="text-sm font-semibold text-gray-800" style={{ width: '50px', textAlign: 'right', paddingRight: '10px' }}>
                          {value}
                        </span>
                        <div style={{
                          flexGrow: 1,
                          height: index === 4 ? '3px' : '1px',
                          backgroundColor: index === 4 ? '#1f2937' : '#e5e7eb',
                          opacity: index === 4 ? 1 : 0.5
                        }}></div>
                      </div>
                    ))}
                  </div>

                  {/* Bars Container */}
                  <div style={{
                    position: 'relative',
                    marginLeft: '60px',
                    height: '350px',
                    display: 'flex',
                    alignItems: 'flex-end',
                    gap: '40px',
                    paddingBottom: '3px'
                  }}>
                    {groupedArray.map(([productName, colorMap]) => (
                      <div key={productName} style={{ display: 'flex', alignItems: 'flex-end', gap: '24px' }}>
                        {Array.from(colorMap.entries()).map(([color, items]) => (
                          <div key={`${productName}-${color}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            {/* Bars for each size */}
                            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px' }}>
                              {items.map((item) => {
                                const barHeightPx = maxQuantity > 0 ? (item.quantity / maxQuantity) * 347 : 0
                                const sizeColor = sizeColorMap[item.size] || { from: '#6b7280', to: '#4b5563' }
                                return (
                                  <div key={item.itemId} style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                    {/* Bar */}
                                    <div
                                      className="rounded-t-md transition-all duration-300 hover:brightness-110 relative group"
                                      style={{
                                        width: '24px',
                                        height: `${barHeightPx}px`,
                                        background: `linear-gradient(to top, ${sizeColor.from}, ${sizeColor.to})`,
                                        boxShadow: '0 -2px 10px rgba(0,0,0,0.1)',
                                        cursor: 'pointer'
                                      }}
                                    >
                                      {/* Quantity label above bar */}
                                      {item.quantity > 0 && (
                                        <span
                                          className="absolute left-1/2 transform -translate-x-1/2 font-bold text-gray-900"
                                          style={{
                                            bottom: '100%',
                                            marginBottom: '5px',
                                            fontSize: '11px',
                                            whiteSpace: 'nowrap'
                                          }}
                                        >
                                          {item.quantity}
                                        </span>
                                      )}

                                      {/* Tooltip on hover */}
                                      <div className="absolute left-1/2 transform -translate-x-1/2 hidden group-hover:block bg-gray-900 text-white text-xs rounded-lg py-3 px-4 whitespace-nowrap shadow-2xl" style={{ bottom: 'calc(100% + 20px)', zIndex: 100 }}>
                                        <div className="font-bold text-sm mb-2 border-b border-gray-700 pb-1">{item.itemName}</div>
                                        <div className="space-y-1">
                                          <div><span className="text-gray-400">Color:</span> <span className="font-semibold">{item.color}</span></div>
                                          <div><span className="text-gray-400">Size:</span> <span className="font-semibold">{item.size}</span></div>
                                          <div className="pt-1 border-t border-gray-700 mt-2"><span className="text-gray-400">Stock:</span> <span className="text-green-400 font-bold">{item.quantity} pcs</span></div>
                                        </div>
                                        {/* Arrow */}
                                        <div style={{
                                          position: 'absolute',
                                          bottom: '-6px',
                                          left: '50%',
                                          transform: 'translateX(-50%)',
                                          width: 0,
                                          height: 0,
                                          borderLeft: '6px solid transparent',
                                          borderRight: '6px solid transparent',
                                          borderTop: '6px solid #111827'
                                        }}></div>
                                      </div>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>

                  {/* X-axis Labels */}
                  <div style={{
                    marginLeft: '60px',
                    marginTop: '15px',
                    display: 'flex',
                    gap: '40px'
                  }}>
                    {groupedArray.map(([productName, colorMap]) => (
                      <div key={productName} style={{ display: 'flex', gap: '24px' }}>
                        {Array.from(colorMap.entries()).map(([color, items]) => (
                          <div key={`${productName}-${color}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: `${items.length * 27}px` }}>
                            {/* Product Name */}
                            <div className="text-sm font-bold text-gray-900 mb-1">{productName}</div>
                            {/* Color Name */}
                            <div className="text-xs font-semibold text-blue-600 mb-2 bg-blue-50 px-3 py-1 rounded-full">{color}</div>
                            {/* Size labels */}
                            <div style={{ display: 'flex', gap: '3px' }}>
                              {items.map((item) => {
                                const sizeColor = sizeColorMap[item.size] || { from: '#6b7280', to: '#4b5563' }
                                return (
                                  <div
                                    key={item.itemId}
                                    className="text-xs font-bold text-white text-center rounded px-1 py-0.5"
                                    style={{
                                      width: '24px',
                                      backgroundColor: sizeColor.from,
                                      fontSize: '10px'
                                    }}
                                  >
                                    {item.size}
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-center text-gray-500 py-8">No inventory data available</p>
            )
          })()}
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

              // Sort by manufacturing ID (itemId)
              garmentItems.sort((a, b) => {
                const aId = a.itemId || ''
                const bId = b.itemId || ''
                return aId.localeCompare(bId)
              })

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
    </div>
  )
}
