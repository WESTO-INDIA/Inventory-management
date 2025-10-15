import { useState, useEffect } from 'react'
import '../styles/common.css'
import { API_URL } from '@/config/api'

interface Transaction {
  _id?: string
  id?: string
  timestamp: string
  itemType: 'FABRIC' | 'MANUFACTURING' | 'CUTTING' | 'QR_GENERATED' | 'UNKNOWN'
  itemId: string
  itemName: string
  fabricType?: string
  action: 'ADD' | 'REMOVE' | 'QR_GENERATED' | 'STOCK_IN' | 'STOCK_OUT'
  quantity: number
  previousStock: number
  newStock: number
  performedBy: string
  source: 'QR_SCANNER' | 'MANUAL' | 'QR_GENERATION'
  type?: string
  productInfo?: any
  generatedBy?: string
  color?: string
  size?: string
}

interface GarmentProduct {
  _id: string
  manufacturingId: string
  productName: string
  fabricType?: string
  color: string
  size: string
  quantity: number
}

export default function Transactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [stockInFilter, setStockInFilter] = useState(false)
  const [stockOutFilter, setStockOutFilter] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [dateFilter, setDateFilter] = useState('')
  const [showAddStockModal, setShowAddStockModal] = useState(false)
  const [garmentProducts, setGarmentProducts] = useState<GarmentProduct[]>([])
  const [stockFormData, setStockFormData] = useState({
    action: 'STOCK_IN' as 'STOCK_IN' | 'STOCK_OUT',
    manufacturingId: '',
    quantity: '',
    performedBy: ''
  })

  useEffect(() => {
    loadTransactions()
    loadGarmentProducts()
  }, [])

  const loadGarmentProducts = async () => {
    try {
      // Fetch from QR products (manual entries)
      const qrResponse = await fetch(`${API_URL}/api/qr-products`)
      if (qrResponse.ok) {
        const qrProducts = await qrResponse.json()
        setGarmentProducts(qrProducts)
      }
    } catch (error) {
      console.error('Error loading garment products:', error)
    }
  }

  const loadTransactions = async () => {
    try {
      const response = await fetch(`${API_URL}/api/transactions`)
      if (response.ok) {
        const data = await response.json()
        setTransactions(data.transactions || data)
      } else {
      }
    } catch (error) {
      // Fallback to localStorage if API fails
      const savedTransactions = localStorage.getItem('inventory_transactions')
      if (savedTransactions) {
        const parsedTransactions = JSON.parse(savedTransactions)
        parsedTransactions.sort((a: Transaction, b: Transaction) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        )
        setTransactions(parsedTransactions)
      }
    }
  }

  const clearTransactions = async () => {
    if (window.confirm('Are you sure you want to clear all transaction history?')) {
      try {
        const response = await fetch(`${API_URL}/api/transactions`, {
          method: 'DELETE'
        })
        if (response.ok) {
          setTransactions([])
          localStorage.removeItem('inventory_transactions') // Also clear localStorage
        }
      } catch (error) {
        alert('Failed to clear transactions')
      }
    }
  }

  const handleStockTransaction = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!stockFormData.manufacturingId || !stockFormData.quantity || !stockFormData.performedBy) {
      alert('❌ Please fill in all required fields')
      return
    }

    try {
      // Find the selected product
      const selectedProduct = garmentProducts.find(p => p.manufacturingId === stockFormData.manufacturingId)
      if (!selectedProduct) {
        alert('❌ Product not found')
        return
      }

      const quantityChange = parseInt(stockFormData.quantity)
      const previousStock = selectedProduct.quantity
      let newStock = previousStock

      if (stockFormData.action === 'STOCK_IN') {
        newStock = previousStock + quantityChange
      } else {
        if (quantityChange > previousStock) {
          alert(`❌ Cannot remove ${quantityChange} items. Only ${previousStock} available.`)
          return
        }
        newStock = previousStock - quantityChange
      }

      // Update the QR product quantity
      const updateResponse = await fetch(`${API_URL}/api/qr-products/${selectedProduct._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity: newStock })
      })

      if (!updateResponse.ok) {
        alert('❌ Failed to update product quantity')
        return
      }

      // Create transaction record
      const transactionData = {
        itemType: 'MANUFACTURING',
        itemId: selectedProduct.manufacturingId,
        itemName: selectedProduct.productName,
        fabricType: selectedProduct.fabricType,
        color: selectedProduct.color,
        size: selectedProduct.size,
        action: stockFormData.action,
        quantity: quantityChange,
        previousStock: previousStock,
        newStock: newStock,
        performedBy: stockFormData.performedBy,
        source: 'MANUAL'
      }

      const transactionResponse = await fetch(`${API_URL}/api/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(transactionData)
      })

      if (transactionResponse.ok) {
        alert(`✅ ${stockFormData.action === 'STOCK_IN' ? 'Stock added' : 'Stock removed'} successfully!`)
        setShowAddStockModal(false)
        setStockFormData({
          action: 'STOCK_IN',
          manufacturingId: '',
          quantity: '',
          performedBy: ''
        })
        loadTransactions()
        loadGarmentProducts()
      } else {
        alert('❌ Failed to create transaction record')
      }
    } catch (error) {
      console.error('Error processing stock transaction:', error)
      alert('❌ Error processing stock transaction')
    }
  }

  const exportTransactions = () => {
    const dataStr = JSON.stringify(transactions, null, 2)
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr)

    const exportFileDefaultName = `transactions_${new Date().toISOString().split('T')[0]}.json`

    const linkElement = document.createElement('a')
    linkElement.setAttribute('href', dataUri)
    linkElement.setAttribute('download', exportFileDefaultName)
    linkElement.click()
  }

  const filteredTransactions = transactions.filter(transaction => {
    // Filter by Stock In (if enabled)
    if (stockInFilter) {
      if (transaction.action !== 'STOCK_IN' && transaction.action !== 'ADD') {
        return false
      }
    }

    // Filter by Stock Out (if enabled)
    if (stockOutFilter) {
      if (transaction.action !== 'STOCK_OUT' && transaction.action !== 'REMOVE') {
        return false
      }
    }

    // Filter by search term
    if (searchTerm && !transaction.itemName.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !transaction.itemId.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false
    }

    // Filter by date
    if (dateFilter) {
      const transactionDate = new Date(transaction.timestamp).toISOString().split('T')[0]
      if (transactionDate !== dateFilter) {
        return false
      }
    }

    return true
  })

  const getActionBadgeClass = (action: string) => {
    switch(action) {
      case 'ADD':
      case 'STOCK_IN': return 'badge-success'
      case 'REMOVE':
      case 'STOCK_OUT': return 'badge-danger'
      case 'QR_GENERATED': return 'badge-info'
      default: return 'badge-secondary'
    }
  }

  const getTypeBadgeClass = (type: string) => {
    switch(type) {
      case 'FABRIC': return 'badge-info'
      case 'MANUFACTURING': return 'badge-success'
      case 'CUTTING': return 'badge-warning'
      case 'QR_GENERATED': return 'badge-purple'
      default: return 'badge-secondary'
    }
  }

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString()
  }

  // Calculate statistics
  const stats = {
    total: transactions.length,
    stockIn: transactions.filter(t => t.action === 'ADD' || t.action === 'STOCK_IN').reduce((sum, t) => sum + t.quantity, 0),
    stockOut: transactions.filter(t => t.action === 'REMOVE' || t.action === 'STOCK_OUT').reduce((sum, t) => sum + t.quantity, 0),
    qrGenerated: transactions.filter(t => t.action === 'QR_GENERATED').length,
    today: transactions.filter(t =>
      new Date(t.timestamp).toDateString() === new Date().toDateString()
    ).length
  }

  const totalQuantity = stats.stockIn - stats.stockOut

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Inventory Transactions</h1>
        <p>Track all inventory changes from QR scanner operations and QR code generation</p>
      </div>

      {/* Statistics Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '20px',
        marginBottom: '24px'
      }}>
        <div className="content-card" style={{
          background: 'white',
          padding: '20px',
          border: '2px solid #000'
        }}>
          <h3 style={{ margin: 0, fontSize: '14px', color: '#000' }}>Total Transactions</h3>
          <p style={{ margin: '8px 0 0 0', fontSize: '32px', fontWeight: 'bold', color: '#000' }}>{stats.total}</p>
        </div>

        <div className="content-card" style={{
          background: 'white',
          padding: '20px',
          border: '2px solid #000'
        }}>
          <h3 style={{ margin: 0, fontSize: '14px', color: '#10b981' }}>Stock In</h3>
          <p style={{ margin: '8px 0 0 0', fontSize: '32px', fontWeight: 'bold', color: '#10b981' }}>{stats.stockIn}</p>
        </div>

        <div className="content-card" style={{
          background: 'white',
          padding: '20px',
          border: '2px solid #000'
        }}>
          <h3 style={{ margin: 0, fontSize: '14px', color: '#ef4444' }}>Stock Out</h3>
          <p style={{ margin: '8px 0 0 0', fontSize: '32px', fontWeight: 'bold', color: '#ef4444' }}>{stats.stockOut}</p>
        </div>

        <div className="content-card" style={{
          background: 'white',
          padding: '20px',
          border: '2px solid #000'
        }}>
          <h3 style={{ margin: 0, fontSize: '14px', color: '#8b5cf6' }}>Total Quantity</h3>
          <p style={{ margin: '8px 0 0 0', fontSize: '32px', fontWeight: 'bold', color: '#8b5cf6' }}>{totalQuantity}</p>
        </div>

        <div className="content-card" style={{
          background: 'white',
          padding: '20px',
          border: '2px solid #000'
        }}>
          <h3 style={{ margin: 0, fontSize: '14px', color: '#3b82f6' }}>Today's Transactions</h3>
          <p style={{ margin: '8px 0 0 0', fontSize: '32px', fontWeight: 'bold', color: '#3b82f6' }}>{stats.today}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="content-card">
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Search */}
          <input
            type="text"
            placeholder="Search by item name or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              flex: 1,
              minWidth: '200px',
              border: '2px solid #000',
              borderRadius: '12px',
              padding: '10px 16px',
              fontSize: '14px'
            }}
          />

          {/* Date Filter */}
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            style={{
              minWidth: '150px',
              border: '2px solid #000',
              borderRadius: '12px',
              padding: '10px 16px',
              fontSize: '14px'
            }}
          />

          {/* Stock In Filter */}
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 16px',
              border: '2px solid #000',
              borderRadius: '12px',
              cursor: 'pointer',
              backgroundColor: stockInFilter ? '#10b981' : 'white',
              color: stockInFilter ? 'white' : '#000',
              fontWeight: '600',
              fontSize: '14px',
              transition: 'all 0.2s'
            }}
          >
            <input
              type="checkbox"
              checked={stockInFilter}
              onChange={(e) => setStockInFilter(e.target.checked)}
              style={{ cursor: 'pointer', width: '16px', height: '16px' }}
            />
            Stock In
          </label>

          {/* Stock Out Filter */}
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 16px',
              border: '2px solid #000',
              borderRadius: '12px',
              cursor: 'pointer',
              backgroundColor: stockOutFilter ? '#ef4444' : 'white',
              color: stockOutFilter ? 'white' : '#000',
              fontWeight: '600',
              fontSize: '14px',
              transition: 'all 0.2s'
            }}
          >
            <input
              type="checkbox"
              checked={stockOutFilter}
              onChange={(e) => setStockOutFilter(e.target.checked)}
              style={{ cursor: 'pointer', width: '16px', height: '16px' }}
            />
            Stock Out
          </label>

          {/* Action Buttons */}
          <button
            onClick={loadTransactions}
            className="btn btn-secondary"
            style={{
              borderRadius: '12px',
              padding: '10px 20px',
              border: '2px solid #000',
              backgroundColor: '#f3f4f6',
              color: '#000',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#e5e7eb'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="content-card">
        <h2 style={{ marginBottom: '20px' }}>Transaction History</h2>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ textAlign: 'center' }}>Date & Time</th>
                <th style={{ textAlign: 'center' }}>Item ID</th>
                <th style={{ textAlign: 'center' }}>Item Name</th>
                <th style={{ textAlign: 'center' }}>Fabric Type</th>
                <th style={{ textAlign: 'center' }}>Color</th>
                <th style={{ textAlign: 'center' }}>Size</th>
                <th style={{ textAlign: 'center' }}>Action</th>
                <th style={{ textAlign: 'center' }}>Quantity</th>
                <th style={{ textAlign: 'center' }}>Total Stock</th>
                <th style={{ textAlign: 'center' }}>Performed By</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.length > 0 ? (
                filteredTransactions.map((transaction) => (
                  <tr key={transaction._id || transaction.id || Math.random()}>
                    <td style={{ textAlign: 'center' }}>{formatDate(transaction.timestamp)}</td>
                    <td style={{ fontSize: '12px', color: '#6b7280', textAlign: 'center', fontWeight: '500' }}>{transaction.itemId}</td>
                    <td style={{ fontWeight: '500', textAlign: 'center' }}>{transaction.itemName}</td>
                    <td style={{ fontSize: '13px', color: '#374151', textAlign: 'center' }}>
                      {transaction.fabricType || transaction.productInfo?.fabricType || '-'}
                    </td>
                    <td style={{ fontSize: '13px', color: '#374151', textAlign: 'center' }}>
                      {transaction.color || transaction.productInfo?.color || '-'}
                    </td>
                    <td style={{ fontSize: '13px', color: '#374151', textAlign: 'center' }}>
                      {transaction.size || transaction.productInfo?.size || '-'}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className={`badge ${getActionBadgeClass(transaction.action)}`}>
                        {transaction.action === 'ADD' || transaction.action === 'STOCK_IN' ? '↑ Stock In' :
                         transaction.action === 'REMOVE' || transaction.action === 'STOCK_OUT' ? '↓ Stock Out' :
                         '📱 QR Generated'}
                      </span>
                    </td>
                    <td style={{
                      textAlign: 'center',
                      fontWeight: '600',
                      color: (transaction.action === 'ADD' || transaction.action === 'STOCK_IN') ? '#10b981' :
                             (transaction.action === 'REMOVE' || transaction.action === 'STOCK_OUT') ? '#ef4444' : '#6b7280'
                    }}>
                      {(transaction.action === 'ADD' || transaction.action === 'STOCK_IN') ? '+' :
                       (transaction.action === 'REMOVE' || transaction.action === 'STOCK_OUT') ? '-' : ''}{transaction.quantity}
                    </td>
                    <td style={{
                      textAlign: 'center',
                      fontWeight: '600',
                      color: '#3b82f6'
                    }}>
                      {transaction.newStock}
                    </td>
                    <td style={{
                      textAlign: 'center',
                      fontWeight: '500',
                      color: '#374151'
                    }}>
                      {transaction.performedBy || 'Unknown'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={10} className="empty-state">
                    <div className="empty-state-icon">📊</div>
                    <h3>No Transactions Found</h3>
                    <p>
                      {searchTerm || dateFilter || stockInFilter || stockOutFilter
                        ? 'Try adjusting your filters'
                        : 'Transactions will appear here when you add or remove stock using QR scanner'}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Remove Stock Modal */}
      {showAddStockModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '30px',
            borderRadius: '10px',
            width: '90%',
            maxWidth: '500px'
          }}>
            <h2 style={{ marginBottom: '20px', color: '#374151' }}>Add/Remove Garment Stock</h2>
            <form onSubmit={handleStockTransaction}>
              <div className="form-group">
                <label htmlFor="action">Action *</label>
                <select
                  id="action"
                  value={stockFormData.action}
                  onChange={(e) => setStockFormData({...stockFormData, action: e.target.value as 'STOCK_IN' | 'STOCK_OUT'})}
                  required
                >
                  <option value="STOCK_IN">Stock In (Add)</option>
                  <option value="STOCK_OUT">Stock Out (Remove)</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="manufacturingId">Garment Product *</label>
                <select
                  id="manufacturingId"
                  value={stockFormData.manufacturingId}
                  onChange={(e) => setStockFormData({...stockFormData, manufacturingId: e.target.value})}
                  required
                >
                  <option value="">Select Product</option>
                  {garmentProducts.map((product) => (
                    <option key={product._id} value={product.manufacturingId}>
                      {product.manufacturingId} - {product.productName} ({product.size}) - Stock: {product.quantity}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="quantity">Quantity *</label>
                <input
                  type="number"
                  id="quantity"
                  value={stockFormData.quantity}
                  onChange={(e) => setStockFormData({...stockFormData, quantity: e.target.value})}
                  min="1"
                  placeholder="Enter quantity"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="performedBy">Performed By *</label>
                <input
                  type="text"
                  id="performedBy"
                  value={stockFormData.performedBy}
                  onChange={(e) => setStockFormData({...stockFormData, performedBy: e.target.value})}
                  placeholder="Enter your name"
                  required
                />
              </div>

              <div className="btn-group">
                <button type="submit" className="btn btn-primary">
                  {stockFormData.action === 'STOCK_IN' ? 'Add Stock' : 'Remove Stock'}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowAddStockModal(false)
                    setStockFormData({
                      action: 'STOCK_IN',
                      manufacturingId: '',
                      quantity: '',
                      performedBy: ''
                    })
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}