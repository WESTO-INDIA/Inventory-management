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

      {/* Bar Chart - Product Availability by Size */}
      <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
        <h2 className="text-2xl font-bold text-black mb-8 text-center">
          📊 Product Availability by Size
        </h2>

        {(() => {
          // Prepare data from database
          const productSizeMap = new Map()
          const productDetailsMap = new Map() // Store color and fabric type by product name

          // Collect data from garmentStocks and transactions
          const garmentStockMap = new Map()

          Array.isArray(garmentStocks) && garmentStocks.forEach((g: any) => {
            garmentStockMap.set(g.productId, {
              productName: g.productName,
              size: g.size || 'N/A',
              quantity: g.quantity || 0,
              color: g.color || 'N/A',
              fabricType: g.fabricType || 'N/A'
            })

            // Store product details (color and fabric type)
            if (!productDetailsMap.has(g.productName)) {
              productDetailsMap.set(g.productName, {
                color: g.color || 'N/A',
                fabricType: g.fabricType || 'N/A'
              })
            }
          })

          Array.isArray(transactions) && transactions.forEach((t: any) => {
            if (t.itemType === 'MANUFACTURING' || t.itemType === 'QR_GENERATED') {
              if (!garmentStockMap.has(t.itemId)) {
                garmentStockMap.set(t.itemId, {
                  productName: t.itemName,
                  size: t.size || 'N/A',
                  quantity: 0,
                  color: t.color || 'N/A',
                  fabricType: t.fabricType || 'N/A'
                })

                // Store product details from transactions
                if (!productDetailsMap.has(t.itemName)) {
                  productDetailsMap.set(t.itemName, {
                    color: t.color || 'N/A',
                    fabricType: t.fabricType || 'N/A'
                  })
                }
              }
              const item = garmentStockMap.get(t.itemId)
              if (t.action === 'STOCK_IN') {
                item.quantity += t.quantity
              } else if (t.action === 'STOCK_OUT') {
                item.quantity -= t.quantity
              }
            }
          })

          // Group by product name and size
          Array.from(garmentStockMap.values()).forEach(item => {
            if (!productSizeMap.has(item.productName)) {
              productSizeMap.set(item.productName, {})
            }
            const sizeData = productSizeMap.get(item.productName) as { [key: string]: number }
            if (!sizeData[item.size]) {
              sizeData[item.size] = 0
            }
            sizeData[item.size] += item.quantity
          })

          const products = Array.from(productSizeMap.keys()).sort()
          const allSizes = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', 'Free Size']

          // Size colors for legend
          const sizeColors: { [key: string]: string } = {
            'XXS': '#ef4444',
            'XS': '#f97316',
            'S': '#f59e0b',
            'M': '#10b981',
            'L': '#3b82f6',
            'XL': '#8b5cf6',
            'XXL': '#ec4899',
            'XXXL': '#14b8a6',
            'Free Size': '#6b7280'
          }

          // Calculate max total for scaling
          let maxTotal = 0
          products.forEach(product => {
            const sizeData = productSizeMap.get(product) as { [key: string]: number } | undefined
            const total = Object.values(sizeData || {}).reduce((sum: number, qty) => sum + (Number(qty) || 0), 0)
            if (total > maxTotal) maxTotal = total
          })

          const chartHeight = 400
          const barWidth = 80

          return products.length > 0 ? (
            <div>
              {/* Legend */}
              <div className="flex flex-wrap justify-center gap-4 mb-8 pb-6 border-b-2 border-gray-200">
                {allSizes.map(size => (
                  <div key={size} className="flex items-center gap-2">
                    <div
                      style={{
                        width: '20px',
                        height: '20px',
                        backgroundColor: sizeColors[size],
                        borderRadius: '4px',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                      }}
                    ></div>
                    <span className="text-sm font-semibold text-gray-700">{size}</span>
                  </div>
                ))}
              </div>

              {/* Chart */}
              <div style={{ overflowX: 'auto' }}>
                <div style={{ minWidth: `${products.length * 150}px`, position: 'relative' }}>
                  {/* Y-axis and Grid */}
                  <div style={{
                    position: 'relative',
                    paddingLeft: '60px',
                    paddingBottom: '60px',
                    height: `${chartHeight}px`
                  }}>
                    {/* Y-axis line */}
                    <div style={{
                      position: 'absolute',
                      left: '60px',
                      bottom: '60px',
                      width: '3px',
                      height: `${chartHeight}px`,
                      backgroundColor: '#374151'
                    }}></div>

                    {/* Y-axis labels and grid lines */}
                    <div style={{
                      position: 'absolute',
                      left: '0',
                      bottom: '60px',
                      width: '100%',
                      height: `${chartHeight}px`,
                      display: 'flex',
                      flexDirection: 'column-reverse',
                      justifyContent: 'space-between'
                    }}>
                      {[0, Math.floor(maxTotal * 0.25), Math.floor(maxTotal * 0.5), Math.floor(maxTotal * 0.75), maxTotal].map((value, index) => (
                        <div key={index} style={{ display: 'flex', alignItems: 'center' }}>
                          <span className="text-sm font-bold text-gray-700" style={{
                            width: '50px',
                            textAlign: 'right',
                            paddingRight: '10px'
                          }}>
                            {value}
                          </span>
                          {index !== 0 && (
                            <div style={{
                              flexGrow: 1,
                              height: '1px',
                              backgroundColor: '#d1d5db'
                            }}></div>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* X-axis line */}
                    <div style={{
                      position: 'absolute',
                      left: '60px',
                      bottom: '60px',
                      right: '0',
                      height: '3px',
                      backgroundColor: '#374151'
                    }}></div>

                    {/* Bars */}
                    <div style={{
                      position: 'absolute',
                      left: '60px',
                      bottom: '60px',
                      height: `${chartHeight}px`,
                      display: 'flex',
                      alignItems: 'flex-end',
                      justifyContent: 'space-around',
                      gap: '20px',
                      right: '0'
                    }}>
                      {products.map(product => {
                        const sizeData = productSizeMap.get(product) as { [key: string]: number } | undefined
                        const totalQty = Object.values(sizeData || {}).reduce((sum: number, qty) => sum + (Number(qty) || 0), 0)

                        // Get color and fabric type for this product from productDetailsMap
                        const productDetails = productDetailsMap.get(product) || { color: 'N/A', fabricType: 'N/A' }

                        return (
                          <div key={product} style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '10px',
                            position: 'relative'
                          }}>
                            {/* Stacked Bar */}
                            <div style={{
                              width: `${barWidth}px`,
                              display: 'flex',
                              flexDirection: 'column-reverse',
                              position: 'relative',
                              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                              borderRadius: '8px 8px 0 0',
                              overflow: 'visible',
                              minHeight: '1px'
                            }}>
                              {allSizes.map((size, idx) => {
                                const qty = (sizeData && sizeData[size]) || 0
                                if (qty === 0) return null

                                const heightPx = maxTotal > 0 ? (qty / maxTotal) * (chartHeight - 10) : 0
                                // Ensure minimum height for hover area (at least 10px)
                                const minHeight = Math.max(heightPx, 10)

                                return (
                                  <div
                                    key={size}
                                    className="bar-segment"
                                    style={{
                                      height: `${minHeight}px`,
                                      backgroundColor: sizeColors[size],
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      cursor: 'pointer',
                                      transition: 'all 0.3s ease',
                                      position: 'relative',
                                      minHeight: '10px'
                                    }}
                                    onMouseEnter={(e) => {
                                      const tooltip = e.currentTarget.querySelector('.bar-tooltip') as HTMLElement
                                      if (tooltip) {
                                        tooltip.style.display = 'block'
                                        // Bring the parent bar and tooltip to the front
                                        const parent = e.currentTarget as HTMLElement
                                        parent.style.zIndex = '9999'

                                        // Position tooltip above the bar
                                        const rect = parent.getBoundingClientRect()
                                        tooltip.style.top = `${rect.top - 10}px`
                                        tooltip.style.left = `${rect.left + rect.width / 2}px`
                                      }
                                    }}
                                    onMouseLeave={(e) => {
                                      const tooltip = e.currentTarget.querySelector('.bar-tooltip') as HTMLElement
                                      if (tooltip) {
                                        tooltip.style.display = 'none'
                                        // Reset z-index
                                        const parent = e.currentTarget as HTMLElement
                                        parent.style.zIndex = '1'
                                      }
                                    }}
                                  >
                                    {/* Quantity label inside bar if space available */}
                                    {heightPx > 25 && (
                                      <span style={{
                                        color: 'white',
                                        fontWeight: 'bold',
                                        fontSize: '0.875rem',
                                        pointerEvents: 'none'
                                      }}>
                                        {qty}
                                      </span>
                                    )}

                                    {/* Tooltip */}
                                    <div className="bar-tooltip" style={{
                                      position: 'fixed',
                                      bottom: 'auto',
                                      left: '50%',
                                      transform: 'translateX(-50%) translateY(-110%)',
                                      zIndex: 99999,
                                      minWidth: '150px',
                                      textAlign: 'left',
                                      whiteSpace: 'nowrap',
                                      pointerEvents: 'none',
                                      display: 'none',
                                      backgroundColor: '#1f2937',
                                      color: 'white',
                                      fontSize: '0.75rem',
                                      borderRadius: '0.5rem',
                                      padding: '0.5rem 0.75rem',
                                      boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2)',
                                      border: '1px solid rgba(255, 255, 255, 0.1)'
                                    }}>
                                      <div style={{ fontWeight: 'bold', fontSize: '0.875rem', marginBottom: '0.25rem' }}>{product}</div>
                                      <div>Size: {size}</div>
                                      <div>Color: {productDetails.color}</div>
                                      <div>Fabric Type: {productDetails.fabricType}</div>
                                      <div>Qty: {qty} pcs</div>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    {/* X-axis labels */}
                    <div style={{
                      position: 'absolute',
                      left: '60px',
                      bottom: '0',
                      right: '0',
                      height: '60px',
                      display: 'flex',
                      justifyContent: 'space-around',
                      gap: '20px',
                      alignItems: 'flex-start',
                      paddingTop: '5px'
                    }}>
                      {products.map(product => {
                        const sizeData = productSizeMap.get(product) as { [key: string]: number } | undefined
                        const totalQty = Object.values(sizeData || {}).reduce((sum: number, qty) => sum + (Number(qty) || 0), 0)

                        return (
                          <div key={product} className="group relative text-center font-bold text-gray-800" style={{
                            width: `${barWidth}px`,
                            fontSize: '12px',
                            writingMode: 'vertical-rl',
                            transform: 'rotate(180deg)',
                            whiteSpace: 'nowrap',
                            height: '55px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer'
                          }}>
                            {product}

                            {/* Tooltip on hover */}
                            <div className="absolute hidden group-hover:block bg-gray-900 text-white text-xs rounded-lg py-2 px-3 whitespace-nowrap shadow-xl" style={{
                              bottom: '100%',
                              left: '50%',
                              transform: 'translateX(-50%) rotate(180deg)',
                              marginBottom: '8px',
                              zIndex: 100,
                              writingMode: 'horizontal-tb'
                            }}>
                              <div className="font-bold">{product}</div>
                              <div>Total Qty: {totalQty} pcs</div>
                              {Object.entries(sizeData || {}).map(([size, qty]: [string, any]) => {
                                const qtyNum = Number(qty) || 0
                                return qtyNum > 0 ? <div key={size}>{size}: {qty} pcs</div> : null
                              })}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-center text-gray-500 py-12">No inventory data available for chart</p>
          )
        })()}
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
