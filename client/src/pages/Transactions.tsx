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
  action: 'ADD' | 'REMOVE' | 'QR_GENERATED' | 'STOCK_IN' | 'STOCK_OUT'
  quantity: number
  previousStock: number
  newStock: number
  performedBy: string
  source: 'QR_SCANNER' | 'MANUAL' | 'QR_GENERATION'
  type?: string
  productInfo?: any
  generatedBy?: string
}

export default function Transactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [filter, setFilter] = useState<'all' | 'add' | 'remove' | 'qr_generated'>('all')
  const [typeFilter, setTypeFilter] = useState<'all' | 'FABRIC' | 'MANUFACTURING' | 'CUTTING' | 'QR_GENERATED'>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [dateFilter, setDateFilter] = useState('')

  useEffect(() => {
    loadTransactions()
  }, [])

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
    // Filter by action
    if (filter !== 'all') {
      if (filter === 'qr_generated' && transaction.action !== 'QR_GENERATED') {
        return false
      } else if (filter === 'add' && transaction.action !== 'ADD' && transaction.action !== 'STOCK_IN') {
        return false
      } else if (filter === 'remove' && transaction.action !== 'REMOVE' && transaction.action !== 'STOCK_OUT') {
        return false
      }
    }

    // Filter by type
    if (typeFilter !== 'all' && transaction.itemType !== typeFilter) {
      return false
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
            style={{ flex: 1, minWidth: '200px' }}
          />

          {/* Date Filter */}
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            style={{ minWidth: '150px' }}
          />

          {/* Action Filter */}
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            style={{ minWidth: '120px' }}
          >
            <option value="all">All Actions</option>
            <option value="add">Additions</option>
            <option value="remove">Removals</option>
            <option value="qr_generated">QR Generated</option>
          </select>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as any)}
            style={{ minWidth: '120px' }}
          >
            <option value="all">All Types</option>
            <option value="FABRIC">Fabric</option>
            <option value="MANUFACTURING">MFG</option>
            <option value="CUTTING">Cutting</option>
            <option value="QR_GENERATED">QR Generated</option>
          </select>

          {/* Action Buttons */}
          <button
            onClick={loadTransactions}
            className="btn btn-secondary"
          >
            🔄 Refresh
          </button>

          <button
            onClick={exportTransactions}
            className="btn btn-primary"
            disabled={transactions.length === 0}
          >
            📥 Export
          </button>

          <button
            onClick={clearTransactions}
            className="btn btn-danger"
            disabled={transactions.length === 0}
          >
            🗑️ Clear All
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
                <th style={{ textAlign: 'center' }}>Item Type</th>
                <th style={{ textAlign: 'center' }}>Item Name</th>
                <th style={{ textAlign: 'center' }}>Item ID</th>
                <th style={{ textAlign: 'center' }}>Action</th>
                <th style={{ textAlign: 'center' }}>Quantity</th>
                <th style={{ textAlign: 'center' }}>Total Stock</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.length > 0 ? (
                filteredTransactions.map((transaction) => (
                  <tr key={transaction._id || transaction.id || Math.random()}>
                    <td style={{ textAlign: 'center' }}>{formatDate(transaction.timestamp)}</td>
                    <td style={{ textAlign: 'center' }}>
                      <span className={`badge ${getTypeBadgeClass(transaction.itemType)}`}>
                        {transaction.itemType === 'MANUFACTURING' ? 'MFG' : transaction.itemType}
                      </span>
                    </td>
                    <td style={{ fontWeight: '500', textAlign: 'center' }}>{transaction.itemName}</td>
                    <td style={{ fontSize: '12px', color: '#6b7280', textAlign: 'center' }}>{transaction.itemId}</td>
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
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="empty-state">
                    <div className="empty-state-icon">📊</div>
                    <h3>No Transactions Found</h3>
                    <p>
                      {searchTerm || dateFilter || filter !== 'all' || typeFilter !== 'all'
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
    </div>
  )
}