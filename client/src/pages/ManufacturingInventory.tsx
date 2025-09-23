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
  quantityReceive: number
  quantityRemaining: number
  itemsReceived?: number
  pricePerPiece?: number
  totalPrice?: number
  dateOfReceive: string
  tailorName: string
  status: string
  createdAt: string
}

interface CuttingRecord {
  _id: string
  id: string
  tailorItemPerPiece?: number
}

export default function ManufacturingInventory() {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [manufacturingRecords, setManufacturingRecords] = useState<ManufacturingRecord[]>([])
  const [cuttingRecords, setCuttingRecords] = useState<CuttingRecord[]>([])
  const [priceMap, setPriceMap] = useState<{[key: string]: number}>({})
  const [isLoading, setIsLoading] = useState(false)
  const [editingRecord, setEditingRecord] = useState<ManufacturingRecord | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)

  const fetchCuttingRecords = async () => {
    try {
      const response = await fetch(`${API_URL}/api/cutting-records`)
      if (response.ok) {
        const records = await response.json()
        setCuttingRecords(records)

        // Create price map from cutting records
        const map: {[key: string]: number} = {}
        records.forEach((record: CuttingRecord) => {
          if (record.id && record.tailorItemPerPiece) {
            map[record.id] = record.tailorItemPerPiece
          }
        })
        setPriceMap(map)
      }
    } catch (error) {
    }
  }

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
    fetchCuttingRecords()
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

  const handleEdit = (record: ManufacturingRecord) => {
    setEditingRecord(record)
    setShowEditModal(true)
  }

  const handleDelete = async (record: ManufacturingRecord) => {
    if (window.confirm(`Are you sure you want to delete manufacturing record ${record.manufacturingId}?`)) {
      try {
        const deleteResponse = await fetch(`${API_URL}/api/manufacturing-orders/${record._id}`, {
          method: 'DELETE'
        })
        
        if (deleteResponse.ok) {
          alert('✅ Manufacturing record deleted successfully!')
          fetchManufacturingRecords()
        } else {
          alert('❌ Error deleting manufacturing record. Please try again.')
        }
      } catch (error) {
        alert('❌ Error deleting manufacturing record. Please try again.')
      }
    }
  }

  const handleSaveEdit = async (updatedRecord: any) => {
    try {
      const updateResponse = await fetch(`${API_URL}/api/manufacturing-orders/${editingRecord?._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedRecord)
      })
      
      if (updateResponse.ok) {
        alert('✅ Manufacturing record updated successfully!')
        setShowEditModal(false)
        setEditingRecord(null)
        fetchManufacturingRecords()
      } else {
        alert('❌ Error updating manufacturing record. Please try again.')
      }
    } catch (error) {
      alert('❌ Error updating manufacturing record. Please try again.')
    }
  }

  const filteredRecords = manufacturingRecords.filter(record => {
    const matchesSearch = (record.manufacturingId || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (record.productName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (record.tailorName || '').toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = !filterStatus || record.status === filterStatus

    return matchesSearch && matchesStatus
  })


  const getStatusBadgeClass = (status: string) => {
    switch(status) {
      case 'Completed': return 'badge-success'
      case 'In Progress': return 'badge-info'
      case 'Pending': return 'badge-warning'
      case 'Cancelled': return 'badge-danger'
      default: return 'badge-info'
    }
  }


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
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="">All Status</option>
              <option value="Completed">Completed</option>
              <option value="In Progress">In Progress</option>
              <option value="Pending">Pending</option>
            </select>
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
                <th style={{ textAlign: 'center' }}>Qty Received</th>
                <th style={{ textAlign: 'center' }}>Qty Remaining</th>
                <th style={{ textAlign: 'center' }}>Price/Piece</th>
                <th style={{ textAlign: 'center' }}>Total Amount</th>
                <th style={{ textAlign: 'center' }}>Tailor</th>
                <th style={{ textAlign: 'center' }}>Date Received</th>
                <th style={{ textAlign: 'center' }}>Status</th>
                <th style={{ textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.length > 0 ? (
                filteredRecords.map((record) => {
                  // Use itemsReceived for all calculations
                  const itemsReceived = record.itemsReceived || 0
                  const quantityRemaining = record.quantity - itemsReceived
                  const status = quantityRemaining <= 0 ? 'Complete' : 'Pending'

                  // Get price from record or price map
                  const pricePerPiece = record.pricePerPiece || priceMap[record.cuttingId] || 0
                  const totalAmount = record.totalPrice || (itemsReceived * pricePerPiece)

                  return (
                    <tr key={record._id}>
                      <td style={{ fontWeight: '500', textAlign: 'center' }}>{record.manufacturingId || record.cuttingId}</td>
                      <td style={{ textAlign: 'center' }}>{record.fabricType || 'N/A'}</td>
                      <td style={{ textAlign: 'center' }}>{record.fabricColor || 'N/A'}</td>
                      <td style={{ textAlign: 'center' }}>{record.productName}</td>
                      <td style={{ textAlign: 'center' }}>{record.quantity}</td>
                      <td style={{ textAlign: 'center' }}>{record.size || 'N/A'}</td>
                      <td style={{ textAlign: 'center' }}>{itemsReceived}</td>
                      <td style={{ textAlign: 'center' }}>{quantityRemaining}</td>
                      <td style={{ textAlign: 'center' }}>₹{pricePerPiece.toFixed(2)}</td>
                      <td style={{ textAlign: 'center', fontWeight: '600' }}>₹{totalAmount.toFixed(2)}</td>
                      <td style={{ textAlign: 'center' }}>{record.tailorName}</td>
                      <td style={{ textAlign: 'center' }}>{formatDate(record.dateOfReceive)}</td>
                      <td style={{ textAlign: 'center' }}>
                        <span className={`badge ${
                          status === 'Complete' ? 'badge-success' : 'badge-warning'
                        }`}>
                          {status}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div className="action-buttons">
                          <button className="action-btn edit" onClick={() => handleEdit(record)}>✏️</button>
                          <button className="action-btn delete" onClick={() => handleDelete(record)}>🗑️</button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={14} style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                    {isLoading ? 'Loading manufacturing inventory...' : 'No manufacturing inventory records found'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && editingRecord && (
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
            maxWidth: '500px',
            maxHeight: '90vh',
            overflow: 'auto'
          }}>
            <h2 style={{ marginBottom: '20px', color: '#374151' }}>Edit Manufacturing Record</h2>
            <form onSubmit={(e) => {
              e.preventDefault()
              const formData = new FormData(e.target as HTMLFormElement)
              const itemsReceived = parseInt(formData.get('itemsReceived') as string) || 0
              const pricePerPiece = parseFloat(formData.get('pricePerPiece') as string) || 0
              const updatedRecord = {
                itemsReceived: itemsReceived,
                pricePerPiece: pricePerPiece,
                totalPrice: itemsReceived * pricePerPiece,
                tailorName: formData.get('tailorName') as string,
                dateOfReceive: formData.get('dateOfReceive') as string,
                status: formData.get('status') as string
              }
              handleSaveEdit(updatedRecord)
            }}>
              <div className="form-group">
                <label htmlFor="itemsReceived">Items Received *</label>
                <input
                  type="number"
                  id="itemsReceived"
                  name="itemsReceived"
                  defaultValue={editingRecord.itemsReceived || 0}
                  min="0"
                  max={editingRecord.quantity}
                  required
                />
                <small style={{ color: '#6b7280' }}>
                  Maximum: {editingRecord.quantity} (Total ordered)
                </small>
              </div>

              <div className="form-group">
                <label htmlFor="pricePerPiece">Price Per Piece (₹)</label>
                <input
                  type="number"
                  id="pricePerPiece"
                  name="pricePerPiece"
                  defaultValue={editingRecord.pricePerPiece || priceMap[editingRecord.cuttingId] || 0}
                  min="0"
                  step="0.01"
                />
              </div>

              <div className="form-group">
                <label htmlFor="tailorName">Tailor Name *</label>
                <input
                  type="text"
                  id="tailorName"
                  name="tailorName"
                  defaultValue={editingRecord.tailorName}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="dateOfReceive">Date Received *</label>
                <input
                  type="date"
                  id="dateOfReceive"
                  name="dateOfReceive"
                  defaultValue={editingRecord.dateOfReceive}
                  required
                />
              </div>


              <div className="form-group">
                <label htmlFor="status">Status *</label>
                <select
                  id="status"
                  name="status"
                  defaultValue={editingRecord.status}
                  required
                >
                  <option value="Pending">Pending</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>

              <div className="btn-group">
                <button type="submit" className="btn btn-primary">
                  Save Changes
                </button>
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowEditModal(false)
                    setEditingRecord(null)
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