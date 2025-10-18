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
  completionDate?: string
}

interface CuttingRecord {
  _id: string
  id: string
  cuttingPricePerPiece?: number
}

interface EditPriceForm {
  recordId: string
  pricePerPiece: string
}

export default function ManufacturingInventory() {
  const [searchTerm, setSearchTerm] = useState('')
  const [manufacturingRecords, setManufacturingRecords] = useState<ManufacturingRecord[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [editingRecord, setEditingRecord] = useState<EditPriceForm | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)

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

  const handleEditClick = (record: ManufacturingRecord) => {
    setEditingRecord({
      recordId: record._id,
      pricePerPiece: record.pricePerPiece.toString()
    })
    setIsEditModalOpen(true)
  }

  const handleEditPriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (editingRecord) {
      setEditingRecord({
        ...editingRecord,
        pricePerPiece: e.target.value
      })
    }
  }

  const handleSavePrice = async () => {
    if (!editingRecord) return

    try {
      const record = manufacturingRecords.find(r => r._id === editingRecord.recordId)
      if (!record) return

      const newPricePerPiece = parseFloat(editingRecord.pricePerPiece) || 0
      const newTotalAmount = record.quantity * newPricePerPiece

      const response = await fetch(`${API_URL}/api/manufacturing-orders/${editingRecord.recordId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pricePerPiece: newPricePerPiece,
          totalAmount: newTotalAmount
        })
      })

      if (response.ok) {
        alert('✅ Price updated successfully!')
        setIsEditModalOpen(false)
        setEditingRecord(null)
        fetchManufacturingRecords()
      } else {
        const errorText = await response.text()
        alert('❌ Error updating price: ' + errorText)
      }
    } catch (error) {
      console.error('Error updating price:', error)
      alert('❌ Error updating price. Please try again.')
    }
  }

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false)
    setEditingRecord(null)
  }

  const handleDelete = async (record: ManufacturingRecord) => {
    if (!window.confirm(`Permanently delete this manufacturing record?\n\nManufacturing ID: ${record.manufacturingId}\nTailor: ${record.tailorName}\nQuantity: ${record.quantity}\n\nNote: QR codes and transactions will only be deleted if this is the last record with this manufacturing ID.`)) {
      return
    }

    try {
      const deleteResponse = await fetch(`${API_URL}/api/manufacturing-orders/${record._id}`, {
        method: 'DELETE'
      })

      if (deleteResponse.ok) {
        const result = await deleteResponse.json()
        alert(`✅ ${result.message}`)
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
        <h1>Manufacturing</h1>
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
                <th style={{ textAlign: 'center' }}>Assigned Date</th>
                <th style={{ textAlign: 'center' }}>Completion Date</th>
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
                    <td style={{ textAlign: 'center', color: record.completionDate ? '#059669' : '#6b7280', fontWeight: record.completionDate ? '600' : 'normal' }}>
                      {record.completionDate ? formatDate(record.completionDate) : '-'}
                    </td>
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
                      <div className="action-buttons" style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        <button
                          onClick={() => handleEditClick(record)}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '8px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: '4px',
                            transition: 'background-color 0.2s'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#f3f4f6'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent'
                          }}
                          title="Edit Price"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="#3b82f6"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>
                        <button className="action-btn delete" onClick={() => handleDelete(record)}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={13} style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                    {isLoading ? 'Loading manufacturing inventory...' : 'No manufacturing inventory records found'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Price Modal */}
      {isEditModalOpen && editingRecord && (
        <div
          style={{
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
          }}
          onClick={handleCloseEditModal}
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              padding: '24px',
              width: '90%',
              maxWidth: '400px',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ marginBottom: '20px', color: '#374151', fontSize: '20px' }}>Edit Price</h2>

            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label htmlFor="editPricePerPiece">Price Per Piece (₹) *</label>
              <input
                type="number"
                id="editPricePerPiece"
                value={editingRecord.pricePerPiece}
                onChange={handleEditPriceChange}
                placeholder="Enter price per piece"
                min="0"
                step="0.01"
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              />
            </div>

            {(() => {
              const record = manufacturingRecords.find(r => r._id === editingRecord.recordId)
              const newTotal = record ? record.quantity * (parseFloat(editingRecord.pricePerPiece) || 0) : 0
              return (
                <div className="form-group" style={{ marginBottom: '20px' }}>
                  <label>Total Amount (₹)</label>
                  <input
                    type="text"
                    value={`₹${newTotal.toFixed(2)}`}
                    readOnly
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '1px solid #d1d5db',
                      borderRadius: '4px',
                      fontSize: '14px',
                      background: '#f9fafb',
                      color: '#000000',
                      fontWeight: 'bold'
                    }}
                  />
                </div>
              )
            })()}

            <div className="btn-group" style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button
                onClick={handleSavePrice}
                className="btn btn-primary"
                style={{ flex: 1 }}
              >
                Save
              </button>
              <button
                onClick={handleCloseEditModal}
                className="btn btn-secondary"
                style={{ flex: 1 }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
