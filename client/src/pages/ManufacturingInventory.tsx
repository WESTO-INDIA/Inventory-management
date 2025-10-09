import { useState, useEffect } from 'react'
import '../styles/common.css'
import { API_URL } from '@/config/api'

interface ManufacturingRecord {
  _id: string
  manufacturingId: string
  cuttingId: string
  fabricType: string
  fabricColor: string
  productName: string
  quantity: number
  size: string
  pricePerPiece: number
  totalAmount: number
  tailorName: string
  status: 'Pending' | 'Completed' | 'QR Deleted' | 'deleted'
  createdAt: string
}

interface CuttingRecord {
  _id: string
  id: string
  cuttingPricePerPiece?: number
}

export default function ManufacturingInventory() {
  const [searchTerm, setSearchTerm] = useState('')
  const [manufacturingRecords, setManufacturingRecords] = useState<ManufacturingRecord[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const fetchManufacturingRecords = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`${API_URL}/api/manufacturing-orders`)
      if (response.ok) {
        const records = await response.json()
        setManufacturingRecords(records)
      } else {
        setManufacturingRecords([])
      }
    } catch (error) {
      setManufacturingRecords([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchManufacturingRecords()
  }, [])

  const formatDate = (dateString: string) => {
    if (!dateString) return ''
    try {
      const date = new Date(dateString)
      const day = date.getDate().toString().padStart(2, '0')
      const month = (date.getMonth() + 1).toString().padStart(2, '0')
      const year = date.getFullYear()
      return `${day}/${month}/${year}`
    } catch (error) {
      return dateString
    }
  }

  const handleDelete = async (record: ManufacturingRecord) => {
    if (!window.confirm(`Permanently delete ${record.manufacturingId}? This will also delete any associated QR codes.`)) {
      return
    }

    try {
      const deleteResponse = await fetch(`${API_URL}/api/manufacturing-orders/${record._id}`, {
        method: 'DELETE'
      })

      if (deleteResponse.ok) {
        alert('✅ Manufacturing record permanently deleted!')
        fetchManufacturingRecords()
      } else {
        alert('❌ Error deleting record. Please try again.')
      }
    } catch (error) {
      alert('❌ Error deleting record. Please try again.')
    }
  }

  const handleStatusChange = async (record: ManufacturingRecord, newStatus: 'Pending' | 'Completed' | 'QR Deleted') => {
    if (newStatus === 'Completed') {
      if (!window.confirm(`Mark ${record.manufacturingId} as completed and generate QR code?`)) {
        return
      }
    }

    if (newStatus === 'QR Deleted') {
      if (!window.confirm(`Mark ${record.manufacturingId} as QR Deleted? This will remove it from Garment Inventory.`)) {
        return
      }
    }

    try {
      // Update status
      const updateResponse = await fetch(`${API_URL}/api/manufacturing-orders/${record._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus })
      })

      if (!updateResponse.ok) {
        alert('❌ Error updating status')
        return
      }

      // If completed, generate QR code
      if (newStatus === 'Completed') {
        const qrProductData = {
          productId: record.manufacturingId,
          manufacturingId: record.manufacturingId,
          productName: record.productName,
          color: record.fabricColor,
          size: record.size,
          quantity: record.quantity,
          tailorName: record.tailorName,
          generatedDate: new Date().toISOString().split('T')[0],
          cuttingId: record.cuttingId,
          notes: `Completed on ${new Date().toLocaleDateString()}`
        }

        const qrResponse = await fetch(`${API_URL}/api/qr-products`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(qrProductData)
        })

        if (qrResponse.ok) {
          alert('✅ Status updated and QR code generated successfully!')
        } else {
          alert('✅ Status updated but failed to generate QR code')
        }
      } else if (newStatus === 'QR Deleted') {
        alert('✅ Status updated to QR Deleted')
      } else {
        alert('✅ Status updated to Pending')
      }

      fetchManufacturingRecords()
    } catch (error) {
      alert('❌ Error updating status')
    }
  }

  const filteredRecords = manufacturingRecords.filter(record => {
    // Filter out deleted records
    if (record.status === 'deleted') {
      return false
    }

    const matchesSearch = (record.manufacturingId || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (record.productName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (record.tailorName || '').toLowerCase().includes(searchTerm.toLowerCase())

    return matchesSearch
  })


  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Manufacturing Inventory</h1>
        <p>Track all manufacturing orders and production history</p>
      </div>


      {/* Filters */}
      <div className="content-card">
        <div className="toolbar">
          <div className="search-box">
            <input
              type="text"
              placeholder="Search by ID, product, cutting ID, or tailor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="filter-group">
            <button
              className="btn btn-secondary"
              onClick={fetchManufacturingRecords}
              disabled={isLoading}
            >
              {isLoading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>
      </div>

      {/* Manufacturing Records Table */}
      <div className="content-card">
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ textAlign: 'center' }}>Manufacturing ID</th>
                <th style={{ textAlign: 'center' }}>Fabric Type</th>
                <th style={{ textAlign: 'center' }}>Fabric Color</th>
                <th style={{ textAlign: 'center' }}>Product</th>
                <th style={{ textAlign: 'center' }}>Qty</th>
                <th style={{ textAlign: 'center' }}>Size</th>
                <th style={{ textAlign: 'center' }}>Tailor Name</th>
                <th style={{ textAlign: 'center' }}>Price/Piece</th>
                <th style={{ textAlign: 'center' }}>Total Amount</th>
                <th style={{ textAlign: 'center' }}>Date</th>
                <th style={{ textAlign: 'center' }}>Status</th>
                <th style={{ textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.length > 0 ? (
                filteredRecords.map((record) => (
                  <tr key={record._id}>
                    <td style={{ fontWeight: '500', textAlign: 'center' }}>{record.manufacturingId}</td>
                    <td style={{ textAlign: 'center' }}>{record.fabricType}</td>
                    <td style={{ textAlign: 'center' }}>{record.fabricColor}</td>
                    <td style={{ textAlign: 'center' }}>{record.productName}</td>
                    <td style={{ textAlign: 'center' }}>{record.quantity}</td>
                    <td style={{ textAlign: 'center' }}>{record.size}</td>
                    <td style={{ textAlign: 'center' }}>{record.tailorName}</td>
                    <td style={{ textAlign: 'center' }}>₹{record.pricePerPiece.toFixed(2)}</td>
                    <td style={{ textAlign: 'center', fontWeight: '600', color: '#059669' }}>
                      ₹{record.totalAmount.toFixed(2)}
                    </td>
                    <td style={{ textAlign: 'center' }}>{formatDate(record.createdAt)}</td>
                    <td style={{ textAlign: 'center' }}>
                      <select
                        value={record.status}
                        onChange={(e) => handleStatusChange(record, e.target.value as 'Pending' | 'Completed' | 'QR Deleted')}
                        style={{
                          padding: '4px 8px',
                          borderRadius: '4px',
                          border: '1px solid #d1d5db',
                          backgroundColor:
                            record.status === 'Completed' ? '#dcfce7' :
                            record.status === 'QR Deleted' ? '#fee2e2' :
                            '#fef3c7',
                          color:
                            record.status === 'Completed' ? '#059669' :
                            record.status === 'QR Deleted' ? '#dc2626' :
                            '#d97706',
                          fontWeight: '500',
                          cursor: 'pointer'
                        }}
                      >
                        <option value="Pending">Pending</option>
                        <option value="Completed">Completed</option>
                        <option value="QR Deleted">QR Deleted</option>
                      </select>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div className="action-buttons">
                        <button className="action-btn delete" onClick={() => handleDelete(record)}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={12} style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                    {isLoading ? 'Loading manufacturing inventory...' : 'No manufacturing inventory records found'}
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
