import { useState, useEffect } from 'react'
import '../styles/common.css'
import { API_URL } from '@/config/api'

interface CuttingRecord {
  _id?: string
  id: string
  productId: string
  fabricType: string
  fabricColor: string
  productName: string
  piecesCount: number
  pieceLength: number
  pieceWidth: number
  totalSquareMetersUsed: number
  sizeType: string
  cuttingMaster: string
  cuttingGivenTo: string
  tailorItemPerPiece?: number
  date: string
  time: string
  notes?: string
}

export default function CuttingInventory() {
  const [searchTerm, setSearchTerm] = useState('')
  const [cuttingRecords, setCuttingRecords] = useState<CuttingRecord[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [editingRecord, setEditingRecord] = useState<CuttingRecord | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)

  const formatDate = (dateString: string) => {
    if (!dateString) return ''
    try {
      const date = new Date(dateString)
      const day = date.getDate().toString().padStart(2, '0')
      const month = (date.getMonth() + 1).toString().padStart(2, '0')
      const year = date.getFullYear()
      return `${day}/${month}/${year}`
    } catch (error) {
      return dateString // Return original if parsing fails
    }
  }

  // Removed unused function

  const fetchCuttingRecords = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`${API_URL}/api/cutting-records`)
      if (response.ok) {
        const records = await response.json()
        setCuttingRecords(records)
      } else {
        setCuttingRecords([])
      }
    } catch (error) {
      setCuttingRecords([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleEdit = (record: CuttingRecord) => {
    setEditingRecord(record)
    setShowEditModal(true)
  }

  const handleDelete = async (record: CuttingRecord) => {
    if (window.confirm(`Are you sure you want to delete cutting record ${record.id}?`)) {
      try {
        const deleteResponse = await fetch(`${API_URL}/api/cutting-records/${record._id}`, {
          method: 'DELETE'
        })
        
        if (deleteResponse.ok) {
          alert('✅ Cutting record deleted successfully!')
          fetchCuttingRecords()
        } else {
          alert('❌ Error deleting cutting record. Please try again.')
        }
      } catch (error) {
        alert('❌ Error deleting cutting record. Please try again.')
      }
    }
  }

  const handleSaveEdit = async (updatedRecord: CuttingRecord) => {
    try {
      const updateResponse = await fetch(`${API_URL}/api/cutting-records/${editingRecord?._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedRecord)
      })
      
      if (updateResponse.ok) {
        alert('✅ Cutting record updated successfully!')
        setShowEditModal(false)
        setEditingRecord(null)
        fetchCuttingRecords()
      } else {
        alert('❌ Error updating cutting record. Please try again.')
      }
    } catch (error) {
      alert('❌ Error updating cutting record. Please try again.')
    }
  }

  useEffect(() => {
    fetchCuttingRecords()
  }, [])

  const filteredRecords = cuttingRecords.filter(record => {
    const matchesSearch = record.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          record.fabricType.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          record.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          record.productId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (record.sizeType && record.sizeType.toLowerCase().includes(searchTerm.toLowerCase()))

    return matchesSearch
  })

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Cutting Inventory Management</h1>
        <p>Manage your cutting records and operations</p>
      </div>

      <div className="content-card">
        <div className="toolbar">
          <div className="search-box">
            <input
              type="text"
              placeholder="Search cutting records..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="filter-group">
            <button 
              className="btn btn-secondary"
              onClick={fetchCuttingRecords}
              disabled={isLoading}
            >
              {isLoading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ textAlign: 'center' }}>Cutting ID</th>
                <th style={{ textAlign: 'center' }}>Product Name</th>
                <th style={{ textAlign: 'center' }}>Fabric Type</th>
                <th style={{ textAlign: 'center' }}>Fabric Color</th>
                <th style={{ textAlign: 'center' }}>Size Type</th>
                <th style={{ textAlign: 'center' }}>Quantity</th>
                <th style={{ textAlign: 'center' }}>Cutting Master</th>
                <th style={{ textAlign: 'center' }}>Given To Tailor</th>
                <th style={{ textAlign: 'center' }}>Tailor Price/Piece</th>
                <th style={{ textAlign: 'center' }}>Date</th>
                <th style={{ textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.length > 0 ? (
                filteredRecords.map((record) => (
                  <tr key={record.id}>
                    <td style={{ fontWeight: '500', textAlign: 'center' }}>{record.id}</td>
                    <td style={{ textAlign: 'center' }}>{record.productName}</td>
                    <td style={{ textAlign: 'center' }}>{record.fabricType}</td>
                    <td style={{ textAlign: 'center' }}>{record.fabricColor}</td>
                    <td style={{ textAlign: 'center' }}>{record.sizeType || 'N/A'}</td>
                    <td style={{ textAlign: 'center' }}>{record.piecesCount}</td>
                    <td style={{ textAlign: 'center' }}>{record.cuttingMaster}</td>
                    <td style={{ textAlign: 'center' }}>{record.cuttingGivenTo || 'N/A'}</td>
                    <td style={{ textAlign: 'center' }}>₹{record.tailorItemPerPiece || 0}</td>
                    <td style={{ textAlign: 'center' }}>{formatDate(record.date)}</td>
                    <td style={{ textAlign: 'center' }}>
                      <div className="action-buttons">
                        <button className="action-btn edit" onClick={() => handleEdit(record)}>✏️</button>
                        <button className="action-btn delete" onClick={() => handleDelete(record)}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={11} style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                    {isLoading ? 'Loading cutting records...' : 'No cutting records found'}
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
            <h2 style={{ marginBottom: '20px', color: '#374151' }}>Edit Cutting Record</h2>
            <form onSubmit={(e) => {
              e.preventDefault()
              const formData = new FormData(e.target as HTMLFormElement)
              const updatedRecord: CuttingRecord = {
                ...editingRecord,
                productName: formData.get('productName') as string,
                piecesCount: parseInt(formData.get('piecesCount') as string),
                pieceLength: parseFloat(formData.get('pieceLength') as string),
                pieceWidth: parseFloat(formData.get('pieceWidth') as string),
                totalSquareMetersUsed: parseInt(formData.get('piecesCount') as string) * parseFloat(formData.get('pieceLength') as string) * parseFloat(formData.get('pieceWidth') as string),
                sizeType: formData.get('sizeType') as string,
                cuttingMaster: formData.get('cuttingMaster') as string,
                cuttingGivenTo: formData.get('cuttingGivenTo') as string,
                tailorItemPerPiece: parseFloat(formData.get('tailorItemPerPiece') as string) || 0
              }
              handleSaveEdit(updatedRecord)
            }}>
              <div className="form-group">
                <label htmlFor="productName">Product Name *</label>
                <input
                  type="text"
                  id="productName"
                  name="productName"
                  defaultValue={editingRecord.productName}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="piecesCount">Number of Pieces *</label>
                <input
                  type="number"
                  id="piecesCount"
                  name="piecesCount"
                  defaultValue={editingRecord.piecesCount}
                  min="1"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="pieceLength">Piece Length (meters) *</label>
                <input
                  type="number"
                  id="pieceLength"
                  name="pieceLength"
                  defaultValue={editingRecord.pieceLength}
                  min="0.1"
                  step="0.1"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="pieceWidth">Piece Width (meters) *</label>
                <input
                  type="number"
                  id="pieceWidth"
                  name="pieceWidth"
                  defaultValue={editingRecord.pieceWidth}
                  min="0.1"
                  step="0.1"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="sizeType">Size Type *</label>
                <select
                  id="sizeType"
                  name="sizeType"
                  defaultValue={editingRecord.sizeType}
                  required
                >
                  <option value="">Select Size</option>
                  <option value="XXS">XXS</option>
                  <option value="XS">XS</option>
                  <option value="S">S</option>
                  <option value="M">M</option>
                  <option value="L">L</option>
                  <option value="XL">XL</option>
                  <option value="XXL">XXL</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="cuttingMaster">Cutting Master</label>
                <input
                  type="text"
                  id="cuttingMaster"
                  name="cuttingMaster"
                  defaultValue={editingRecord.cuttingMaster}
                />
              </div>

              <div className="form-group">
                <label htmlFor="cuttingGivenTo">Cutting Given To (Tailor)</label>
                <input
                  type="text"
                  id="cuttingGivenTo"
                  name="cuttingGivenTo"
                  defaultValue={editingRecord.cuttingGivenTo}
                />
              </div>

              <div className="form-group">
                <label htmlFor="tailorItemPerPiece">Tailor Price Per Piece (₹)</label>
                <input
                  type="number"
                  id="tailorItemPerPiece"
                  name="tailorItemPerPiece"
                  defaultValue={editingRecord.tailorItemPerPiece || 0}
                  min="0"
                  step="0.01"
                />
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