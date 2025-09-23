import { useState, useEffect } from 'react'
import '../styles/common.css'
import { API_URL } from '@/config/api'

interface Fabric {
  _id: string
  productId: string
  fabricId: string
  fabricType: string
  color: string
  quantity: number
  supplier: string
  employeeName?: string
  dateReceived: string
  status: string
}

export default function ViewFabrics() {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [fabrics, setFabrics] = useState<Fabric[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())

  useEffect(() => {
    fetchFabrics()
    // Auto-refresh every 5 seconds to show updated quantities
    const interval = setInterval(() => {
      fetchFabrics()
    }, 5000)
    
    return () => clearInterval(interval)
  }, [])

  const fetchFabrics = async () => {
    try {
      const response = await fetch(`${API_URL}/api/fabrics`)
      if (response.ok) {
        const data = await response.json()
        setFabrics(data)
        setLastUpdated(new Date())
      }
    } catch (error) {
    } finally {
      setLoading(false)
    }
  }


  const filteredFabrics = fabrics.filter(fabric => {
    const matchesSearch = fabric.fabricType.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          fabric.color.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          fabric.productId?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = !filterStatus || fabric.status === filterStatus

    return matchesSearch && matchesStatus
  })

  const getStatusBadgeClass = (status: string) => {
    switch(status) {
      case 'In Stock': return 'badge-success'
      case 'Low Stock': return 'badge-warning'
      case 'Out of Stock': return 'badge-danger'
      default: return 'badge-info'
    }
  }

  const totalValue = fabrics.reduce((sum, fabric) => sum + fabric.quantity, 0)
  const inStockCount = fabrics.filter(f => f.status === 'In Stock').length
  const lowStockCount = fabrics.filter(f => f.status === 'Low Stock').length
  const outOfStockCount = fabrics.filter(f => f.status === 'Out of Stock').length

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Fabric Inventory</h1>
        <p>View and manage all fabric inventory</p>
      </div>

      {/* Statistics */}
      <div className="stats-grid">
        <div className="stat-card">
          <h3>Total Fabrics</h3>
          <p className="stat-value">{fabrics.length}</p>
        </div>
        <div className="stat-card">
          <h3>Total Quantity</h3>
          <p className="stat-value">{totalValue.toFixed(2)} sq.m</p>
        </div>
        <div className="stat-card">
          <h3>In Stock</h3>
          <p className="stat-value">{inStockCount}</p>
        </div>
        <div className="stat-card">
          <h3>Low Stock</h3>
          <p className="stat-value">{lowStockCount}</p>
        </div>
        <div className="stat-card">
          <h3>Out of Stock</h3>
          <p className="stat-value">{outOfStockCount}</p>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="content-card">
        <div className="toolbar">
          <div className="search-box">
            <input
              type="text"
              placeholder="Search by fabric type, color, or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="filter-group">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="">All Status</option>
              <option value="In Stock">In Stock</option>
              <option value="Low Stock">Low Stock</option>
              <option value="Out of Stock">Out of Stock</option>
            </select>
            <button className="btn btn-secondary" onClick={fetchFabrics}>
              🔄 Refresh
            </button>
            <button className="btn btn-primary">
              Export
            </button>
          </div>
        </div>
        <div style={{ 
          padding: '8px 16px', 
          background: '#f8fafc', 
          borderTop: '1px solid #e2e8f0',
          fontSize: '12px',
          color: '#64748b',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span>Last Updated: {lastUpdated.toLocaleTimeString()}</span>
          <span style={{ color: '#10b981' }}>Auto-refreshing every 5 seconds</span>
        </div>
      </div>

      {/* Fabric Table */}
      <div className="content-card">
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ textAlign: 'center' }}>Fabric ID</th>
                <th style={{ textAlign: 'center' }}>Fabric Type</th>
                <th style={{ textAlign: 'center' }}>Color</th>
                <th style={{ textAlign: 'center' }}>Quantity</th>
                <th style={{ textAlign: 'center' }}>Supplier</th>
                <th style={{ textAlign: 'center' }}>Date Received</th>
                <th style={{ textAlign: 'center' }}>Status</th>
                <th style={{ textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '40px' }}>
                    Loading fabrics...
                  </td>
                </tr>
              ) : filteredFabrics.length > 0 ? (
                filteredFabrics.map((fabric) => (
                  <tr key={fabric._id}>
                    <td style={{ fontWeight: '500', textAlign: 'center' }}>{fabric.productId || fabric.fabricId}</td>
                    <td style={{ textAlign: 'center' }}>{fabric.fabricType}</td>
                    <td style={{ textAlign: 'center' }}>{fabric.color}</td>
                    <td style={{
                      fontWeight: '600',
                      color: fabric.quantity === 0 ? '#ef4444' : fabric.quantity <= 20 ? '#f59e0b' : '#10b981',
                      textAlign: 'center'
                    }}>
                      {fabric.quantity.toFixed(2)} sq.m
                    </td>
                    <td style={{ textAlign: 'center' }}>{fabric.supplier}</td>
                    <td style={{ textAlign: 'center' }}>{new Date(fabric.dateReceived).toLocaleDateString()}</td>
                    <td style={{ textAlign: 'center' }}>
                      <span className={`badge ${getStatusBadgeClass(fabric.status)}`}>
                        {fabric.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div className="action-buttons">
                        <button className="action-btn view">View</button>
                        <button className="action-btn edit">Edit</button>
                        <button className="action-btn delete">Delete</button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '40px' }}>
                    <div className="empty-state">
                      <div className="empty-state-icon">📦</div>
                      <h3>No fabrics found</h3>
                      <p>Try adjusting your search or filters</p>
                    </div>
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