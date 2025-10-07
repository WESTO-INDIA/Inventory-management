import { useState, useEffect } from 'react'
import '../styles/common.css'
import { API_URL } from '@/config/api'

interface SizeBreakdown {
  size: string
  quantity: number
}

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
  sizeBreakdown?: SizeBreakdown[]
  cuttingMaster: string
  cuttingGivenTo: string
  tailorItemPerPiece?: number
  date: string
  time: string
  notes?: string
}

interface CuttingForm {
  fabricType: string
  fabricColor: string
  productName: string
  pieceLength: string
  pieceWidth: string
  piecesCount: string
  totalSquareMetersUsed: string
  cuttingMaster: string
  tailorItemPerPiece: string
  cuttingDate: string
}

export default function CuttingInventory() {
  const [searchTerm, setSearchTerm] = useState('')
  const [cuttingRecords, setCuttingRecords] = useState<CuttingRecord[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [editingRecord, setEditingRecord] = useState<CuttingRecord | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [sizeBreakdown, setSizeBreakdown] = useState<SizeBreakdown[]>([])
  const [currentSize, setCurrentSize] = useState('')
  const [currentQuantity, setCurrentQuantity] = useState('')
  const [formData, setFormData] = useState<CuttingForm>({
    fabricType: '',
    fabricColor: '',
    productName: '',
    pieceLength: '',
    pieceWidth: '',
    piecesCount: '',
    totalSquareMetersUsed: '0',
    cuttingMaster: '',
    tailorItemPerPiece: '',
    cuttingDate: new Date().toISOString().split('T')[0]
  })
  const [editFormData, setEditFormData] = useState<CuttingForm>({
    fabricType: '',
    fabricColor: '',
    productName: '',
    pieceLength: '',
    pieceWidth: '',
    piecesCount: '',
    totalSquareMetersUsed: '0',
    cuttingMaster: '',
    tailorItemPerPiece: '',
    cuttingDate: new Date().toISOString().split('T')[0]
  })
  const [editSizeBreakdown, setEditSizeBreakdown] = useState<SizeBreakdown[]>([])
  const [editCurrentSize, setEditCurrentSize] = useState('')
  const [editCurrentQuantity, setEditCurrentQuantity] = useState('')

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

  const generateCuttingId = async () => {
    try {
      // Get the latest cutting record to determine the next serial number
      const response = await fetch(`${API_URL}/api/cutting-records`)
      if (response.ok) {
        const records = await response.json()

        // Filter records that start with 'CUT' and extract numbers
        const cutRecords = records
          .filter((r: CuttingRecord) => r.id && r.id.startsWith('CUT'))
          .map((r: CuttingRecord) => {
            const numPart = r.id.replace('CUT', '')
            return parseInt(numPart) || 0
          })

        // Find the maximum number
        const maxNum = cutRecords.length > 0 ? Math.max(...cutRecords) : 0
        const nextNum = maxNum + 1

        // Format as CUT0001, CUT0002, etc.
        return `CUT${nextNum.toString().padStart(4, '0')}`
      }

      // If fetch fails, start from CUT0001
      return 'CUT0001'
    } catch (error) {
      console.error('Error generating cutting ID:', error)
      return 'CUT0001'
    }
  }

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
    setEditFormData({
      fabricType: record.fabricType,
      fabricColor: record.fabricColor,
      productName: record.productName,
      pieceLength: record.pieceLength.toString(),
      pieceWidth: record.pieceWidth.toString(),
      piecesCount: record.piecesCount.toString(),
      totalSquareMetersUsed: record.totalSquareMetersUsed.toString(),
      cuttingMaster: record.cuttingMaster,
      tailorItemPerPiece: (record.tailorItemPerPiece || 0).toString(),
      cuttingDate: record.date
    })
    setEditSizeBreakdown(record.sizeBreakdown || [])
    setEditCurrentSize('')
    setEditCurrentQuantity('')
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

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!editFormData.fabricType || !editFormData.fabricColor) {
      alert('❌ Please enter fabric type and color!')
      return
    }

    if (editSizeBreakdown.length === 0) {
      alert('❌ Please add at least one size to the breakdown!')
      return
    }

    const sizeBreakdownTotal = editSizeBreakdown.reduce((sum, item) => sum + item.quantity, 0)
    const totalPieces = parseInt(editFormData.piecesCount) || 0

    if (sizeBreakdownTotal !== totalPieces) {
      alert(`❌ Size breakdown total (${sizeBreakdownTotal}) must equal total pieces (${totalPieces})!\nPlease add ${totalPieces - sizeBreakdownTotal} more pieces.`)
      return
    }

    try {
      const updatedRecord = {
        ...editingRecord,
        fabricType: editFormData.fabricType,
        fabricColor: editFormData.fabricColor,
        productName: editFormData.productName,
        piecesCount: parseInt(editFormData.piecesCount),
        pieceLength: parseFloat(editFormData.pieceLength),
        pieceWidth: parseFloat(editFormData.pieceWidth),
        totalSquareMetersUsed: parseFloat(editFormData.totalSquareMetersUsed),
        sizeType: 'Mixed',
        sizeBreakdown: editSizeBreakdown,
        cuttingMaster: editFormData.cuttingMaster,
        tailorItemPerPiece: parseFloat(editFormData.tailorItemPerPiece) || 0,
        date: editFormData.cuttingDate
      }

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
        const errorText = await updateResponse.text()
        let errorMessage = errorText
        try {
          const errorJson = JSON.parse(errorText)
          errorMessage = errorJson.message || errorText
        } catch (e) {
          // If not JSON, use text as is
        }
        alert('❌ Error updating cutting record: ' + errorMessage)
      }
    } catch (error) {
      alert('❌ Error updating cutting record: ' + (error instanceof Error ? error.message : 'Please try again.'))
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    const newFormData = { ...formData, [name]: value }

    if (name === 'pieceLength' || name === 'pieceWidth' || name === 'piecesCount') {
      const length = name === 'pieceLength' ? parseFloat(value) : parseFloat(formData.pieceLength)
      const width = name === 'pieceWidth' ? parseFloat(value) : parseFloat(formData.pieceWidth)
      const pieces = name === 'piecesCount' ? parseFloat(value) : parseFloat(formData.piecesCount)

      if (!isNaN(length) && !isNaN(width) && !isNaN(pieces) && length > 0 && width > 0 && pieces > 0) {
        const squareMetersPerPiece = length * width
        const totalSquareMeters = squareMetersPerPiece * pieces
        newFormData.totalSquareMetersUsed = totalSquareMeters.toFixed(2)
      } else {
        newFormData.totalSquareMetersUsed = '0'
      }
    }

    setFormData(newFormData)
  }

  const addSizeToBreakdown = () => {
    if (!currentSize || !currentQuantity || parseInt(currentQuantity) <= 0) {
      alert('Please select a size and enter a valid quantity')
      return
    }

    const existingSize = sizeBreakdown.find(s => s.size === currentSize)
    if (existingSize) {
      alert('This size is already added. Please remove it first to update.')
      return
    }

    // Check if adding this size would exceed total pieces
    const currentTotal = sizeBreakdown.reduce((sum, item) => sum + item.quantity, 0)
    const newQuantity = parseInt(currentQuantity)
    const totalPieces = parseInt(formData.piecesCount) || 0

    if (currentTotal + newQuantity > totalPieces) {
      alert(`❌ Cannot add ${newQuantity} pieces. You can only add ${totalPieces - currentTotal} more pieces (Total: ${totalPieces}, Already added: ${currentTotal})`)
      return
    }

    const newBreakdown = [...sizeBreakdown, { size: currentSize, quantity: newQuantity }]
    setSizeBreakdown(newBreakdown)

    setCurrentSize('')
    setCurrentQuantity('')
  }

  const removeSizeFromBreakdown = (size: string) => {
    const newBreakdown = sizeBreakdown.filter(s => s.size !== size)
    setSizeBreakdown(newBreakdown)
  }

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    const newEditFormData = { ...editFormData, [name]: value }

    if (name === 'pieceLength' || name === 'pieceWidth' || name === 'piecesCount') {
      const length = name === 'pieceLength' ? parseFloat(value) : parseFloat(editFormData.pieceLength)
      const width = name === 'pieceWidth' ? parseFloat(value) : parseFloat(editFormData.pieceWidth)
      const pieces = name === 'piecesCount' ? parseFloat(value) : parseFloat(editFormData.piecesCount)

      if (!isNaN(length) && !isNaN(width) && !isNaN(pieces) && length > 0 && width > 0 && pieces > 0) {
        const squareMetersPerPiece = length * width
        const totalSquareMeters = squareMetersPerPiece * pieces
        newEditFormData.totalSquareMetersUsed = totalSquareMeters.toFixed(2)
      } else {
        newEditFormData.totalSquareMetersUsed = '0'
      }
    }

    setEditFormData(newEditFormData)
  }

  const addSizeToEditBreakdown = () => {
    if (!editCurrentSize || !editCurrentQuantity || parseInt(editCurrentQuantity) <= 0) {
      alert('Please select a size and enter a valid quantity')
      return
    }

    const existingSize = editSizeBreakdown.find(s => s.size === editCurrentSize)
    if (existingSize) {
      alert('This size is already added. Please remove it first to update.')
      return
    }

    const currentTotal = editSizeBreakdown.reduce((sum, item) => sum + item.quantity, 0)
    const newQuantity = parseInt(editCurrentQuantity)
    const totalPieces = parseInt(editFormData.piecesCount) || 0

    if (currentTotal + newQuantity > totalPieces) {
      alert(`❌ Cannot add ${newQuantity} pieces. You can only add ${totalPieces - currentTotal} more pieces (Total: ${totalPieces}, Already added: ${currentTotal})`)
      return
    }

    const newBreakdown = [...editSizeBreakdown, { size: editCurrentSize, quantity: newQuantity }]
    setEditSizeBreakdown(newBreakdown)

    setEditCurrentSize('')
    setEditCurrentQuantity('')
  }

  const removeSizeFromEditBreakdown = (size: string) => {
    const newBreakdown = editSizeBreakdown.filter(s => s.size !== size)
    setEditSizeBreakdown(newBreakdown)
  }

  const handleAddCutting = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.fabricType || !formData.fabricColor) {
      alert('❌ Please enter fabric type and color!')
      return
    }

    if (sizeBreakdown.length === 0) {
      alert('❌ Please add at least one size to the breakdown!')
      return
    }

    // Validate that size breakdown sum equals total pieces
    const sizeBreakdownTotal = sizeBreakdown.reduce((sum, item) => sum + item.quantity, 0)
    const totalPieces = parseInt(formData.piecesCount) || 0

    if (sizeBreakdownTotal !== totalPieces) {
      alert(`❌ Size breakdown total (${sizeBreakdownTotal}) must equal total pieces (${totalPieces})!\nPlease add ${totalPieces - sizeBreakdownTotal} more pieces.`)
      return
    }

    const totalUsed = parseFloat(formData.totalSquareMetersUsed)

    try {
      const cuttingId = await generateCuttingId()

      const cuttingRecord = {
        id: cuttingId,
        productId: cuttingId, // Use cutting ID as product ID
        fabricType: formData.fabricType,
        fabricColor: formData.fabricColor,
        productName: formData.productName,
        piecesCount: parseInt(formData.piecesCount),
        pieceLength: parseFloat(formData.pieceLength),
        pieceWidth: parseFloat(formData.pieceWidth),
        totalSquareMetersUsed: totalUsed,
        sizeType: 'Mixed',
        sizeBreakdown: sizeBreakdown,
        cuttingMaster: formData.cuttingMaster,
        cuttingGivenTo: '', // Empty string for backend compatibility
        tailorItemPerPiece: parseFloat(formData.tailorItemPerPiece) || 0,
        date: formData.cuttingDate,
        time: new Date().toLocaleTimeString(),
        notes: '' // Empty string for backend compatibility
      }

      console.log('Sending cutting record:', cuttingRecord)

      const cuttingResponse = await fetch(`${API_URL}/api/cutting-records`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cuttingRecord)
      })

      if (cuttingResponse.ok) {
        const result = await cuttingResponse.json()
        console.log('Success response:', result)
        alert(`✅ Cutting record ${cuttingId} added successfully!\nNote: Please update fabric quantity manually if needed.`)

        setFormData({
          fabricType: '',
          fabricColor: '',
          productName: '',
          pieceLength: '',
          pieceWidth: '',
          piecesCount: '',
          totalSquareMetersUsed: '0',
          cuttingMaster: '',
          tailorItemPerPiece: '',
          cuttingDate: new Date().toISOString().split('T')[0]
        })
        setSizeBreakdown([])
        setShowAddModal(false)
        fetchCuttingRecords()
      } else {
        const errorText = await cuttingResponse.text()
        console.error('Error response:', errorText)
        let errorMessage = errorText
        try {
          const errorJson = JSON.parse(errorText)
          errorMessage = errorJson.message || errorText
        } catch (e) {
          // If not JSON, use text as is
        }
        alert('❌ Error creating cutting record: ' + errorMessage)
      }
    } catch (error) {
      console.error('Caught error:', error)
      alert('❌ Error creating cutting record: ' + (error instanceof Error ? error.message : 'Please try again.'))
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
            <button
              className="btn btn-primary"
              onClick={() => setShowAddModal(true)}
            >
              Add Cutting
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
                <th style={{ textAlign: 'center' }}>Size Breakdown</th>
                <th style={{ textAlign: 'center' }}>Total Quantity</th>
                <th style={{ textAlign: 'center' }}>Cutting Master</th>
                <th style={{ textAlign: 'center' }}>Cutting Price/Piece</th>
                <th style={{ textAlign: 'center' }}>Total Price</th>
                <th style={{ textAlign: 'center' }}>Date</th>
                <th style={{ textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.length > 0 ? (
                filteredRecords.map((record, index) => (
                  <tr key={record.id}>
                    <td style={{ fontWeight: '500', textAlign: 'center' }}>{record.id}</td>
                    <td style={{ textAlign: 'center' }}>{record.productName}</td>
                    <td style={{ textAlign: 'center' }}>{record.fabricType}</td>
                    <td style={{ textAlign: 'center' }}>{record.fabricColor}</td>
                    <td style={{ textAlign: 'center' }}>
                      {record.sizeBreakdown && record.sizeBreakdown.length > 0 ? (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', justifyContent: 'center' }}>
                          {record.sizeBreakdown.map((sb, idx) => (
                            <span key={idx} style={{
                              backgroundColor: '#e0f2fe',
                              color: '#0369a1',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontSize: '12px',
                              fontWeight: '500'
                            }}>
                              {sb.size}:{sb.quantity}
                            </span>
                          ))}
                        </div>
                      ) : (
                        record.sizeType || 'N/A'
                      )}
                    </td>
                    <td style={{ textAlign: 'center' }}>{record.piecesCount}</td>
                    <td style={{ textAlign: 'center' }}>{record.cuttingMaster}</td>
                    <td style={{ textAlign: 'center' }}>₹{record.tailorItemPerPiece || 0}</td>
                    <td style={{ textAlign: 'center', fontWeight: '600', color: '#059669' }}>
                      ₹{((record.tailorItemPerPiece || 0) * record.piecesCount).toFixed(2)}
                    </td>
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
            zIndex: 1000,
          }}
          onClick={() => setShowEditModal(false)}
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              padding: '24px',
              maxWidth: '700px',
              width: '90%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, color: '#374151', fontSize: '20px', fontWeight: 'bold' }}>Edit Cutting Record - {editingRecord.id}</h2>
              <button
                onClick={() => setShowEditModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#6b7280',
                }}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSaveEdit}>
              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="edit-fabricType">Fabric Type *</label>
                  <input
                    type="text"
                    id="edit-fabricType"
                    name="fabricType"
                    value={editFormData.fabricType}
                    onChange={handleEditChange}
                    placeholder="e.g., Cotton, Silk, Denim"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="edit-fabricColor">Fabric Color *</label>
                  <input
                    type="text"
                    id="edit-fabricColor"
                    name="fabricColor"
                    value={editFormData.fabricColor}
                    onChange={handleEditChange}
                    placeholder="e.g., Red, Blue, White"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="edit-productName">Product Name *</label>
                  <input
                    type="text"
                    id="edit-productName"
                    name="productName"
                    value={editFormData.productName}
                    onChange={handleEditChange}
                    placeholder="e.g., T-Shirt, Dress"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="edit-pieceLength">Piece Length (meters) *</label>
                  <input
                    type="number"
                    id="edit-pieceLength"
                    name="pieceLength"
                    value={editFormData.pieceLength}
                    onChange={handleEditChange}
                    placeholder="Length"
                    min="0.1"
                    step="0.1"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="edit-pieceWidth">Piece Width (meters) *</label>
                  <input
                    type="number"
                    id="edit-pieceWidth"
                    name="pieceWidth"
                    value={editFormData.pieceWidth}
                    onChange={handleEditChange}
                    placeholder="Width"
                    min="0.1"
                    step="0.1"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="edit-totalSquareMetersUsed">Total Square Meters Used</label>
                  <input
                    type="text"
                    id="edit-totalSquareMetersUsed"
                    value={editFormData.totalSquareMetersUsed + ' sq.m'}
                    placeholder="Calculated automatically"
                    readOnly
                  />
                </div>
              </div>

              {/* Number of Pieces - Manual Input */}
              <div style={{ marginTop: '20px', marginBottom: '20px' }}>
                <div className="form-group">
                  <label htmlFor="edit-piecesCount" style={{ fontSize: '16px', fontWeight: '600', color: '#374151' }}>
                    Total Number of Pieces *
                    <span style={{ fontSize: '14px', fontWeight: '400', color: '#6b7280', marginLeft: '8px' }}>
                      (Enter total, then distribute across sizes below)
                    </span>
                  </label>
                  <input
                    type="number"
                    id="edit-piecesCount"
                    name="piecesCount"
                    value={editFormData.piecesCount}
                    onChange={handleEditChange}
                    placeholder="e.g., 50"
                    min="1"
                    required
                    style={{ fontSize: '16px', fontWeight: '500' }}
                  />
                </div>
              </div>

              {/* Size Breakdown Section */}
              <div style={{ marginTop: '20px', marginBottom: '20px', padding: '15px', border: '2px solid #e5e7eb', borderRadius: '8px', backgroundColor: '#f9fafb' }}>
                <h3 style={{ margin: '0 0 15px 0', color: '#374151', fontSize: '16px', fontWeight: '600' }}>Size Breakdown *</h3>

                <div style={{ display: 'flex', gap: '10px', marginBottom: '15px', alignItems: 'flex-end' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '5px' }}>Size</label>
                    <select
                      value={editCurrentSize}
                      onChange={(e) => setEditCurrentSize(e.target.value)}
                      style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '14px' }}
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

                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '5px' }}>Quantity</label>
                    <input
                      type="number"
                      value={editCurrentQuantity}
                      onChange={(e) => setEditCurrentQuantity(e.target.value)}
                      placeholder="Enter quantity"
                      min="1"
                      style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '14px' }}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={addSizeToEditBreakdown}
                    style={{ padding: '8px 16px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px', fontWeight: '500' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#059669'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#10b981'}
                  >
                    + Add
                  </button>
                </div>

                {/* Display added sizes */}
                {editSizeBreakdown.length > 0 && (
                  <div style={{ marginTop: '15px' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                      {editSizeBreakdown.map((item) => (
                        <div
                          key={item.size}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '8px 12px',
                            backgroundColor: '#3b82f6',
                            color: 'white',
                            borderRadius: '6px',
                            fontSize: '14px',
                            fontWeight: '500'
                          }}
                        >
                          <span>{item.size}: {item.quantity}</span>
                          <button
                            type="button"
                            onClick={() => removeSizeFromEditBreakdown(item.size)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: 'white',
                              cursor: 'pointer',
                              fontSize: '18px',
                              padding: '0',
                              lineHeight: '1'
                            }}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                    <div style={{ marginTop: '10px', padding: '8px', backgroundColor: '#e0f2fe', borderRadius: '4px', display: 'flex', justifyContent: 'space-between' }}>
                      <strong style={{ color: '#0369a1' }}>Breakdown Total: {editSizeBreakdown.reduce((sum, item) => sum + item.quantity, 0)}</strong>
                      <strong style={{ color: editFormData.piecesCount && editSizeBreakdown.reduce((sum, item) => sum + item.quantity, 0) === parseInt(editFormData.piecesCount) ? '#059669' : '#dc2626' }}>
                        {editFormData.piecesCount ? `Remaining: ${parseInt(editFormData.piecesCount) - editSizeBreakdown.reduce((sum, item) => sum + item.quantity, 0)}` : 'Set total pieces first'}
                      </strong>
                    </div>
                  </div>
                )}
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="edit-cuttingMaster">Cutting Master *</label>
                  <input
                    type="text"
                    id="edit-cuttingMaster"
                    name="cuttingMaster"
                    value={editFormData.cuttingMaster}
                    onChange={handleEditChange}
                    placeholder="Cutting master name"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="edit-tailorItemPerPiece">Cutting Price Per Piece (₹)</label>
                  <input
                    type="number"
                    id="edit-tailorItemPerPiece"
                    name="tailorItemPerPiece"
                    value={editFormData.tailorItemPerPiece}
                    onChange={handleEditChange}
                    placeholder="Price per piece"
                    min="0"
                    step="0.01"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="edit-cuttingDate">Cutting Date *</label>
                  <input
                    type="date"
                    id="edit-cuttingDate"
                    name="cuttingDate"
                    value={editFormData.cuttingDate}
                    onChange={handleEditChange}
                    required
                  />
                </div>
              </div>

              <div className="btn-group" style={{ marginTop: '20px' }}>
                <button type="submit" className="btn btn-primary">
                  Update Cutting Record
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

      {/* Add Cutting Modal */}
      {showAddModal && (
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
            zIndex: 1000,
          }}
          onClick={() => setShowAddModal(false)}
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              padding: '24px',
              maxWidth: '700px',
              width: '90%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, color: '#374151', fontSize: '20px', fontWeight: 'bold' }}>Add New Cutting Record</h2>
              <button
                onClick={() => setShowAddModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#6b7280',
                }}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleAddCutting}>
              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="modal-fabricType">Fabric Type *</label>
                  <input
                    type="text"
                    id="modal-fabricType"
                    name="fabricType"
                    value={formData.fabricType}
                    onChange={handleChange}
                    placeholder="e.g., Cotton, Silk, Denim"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="modal-fabricColor">Fabric Color *</label>
                  <input
                    type="text"
                    id="modal-fabricColor"
                    name="fabricColor"
                    value={formData.fabricColor}
                    onChange={handleChange}
                    placeholder="e.g., Red, Blue, White"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="modal-productName">Product Name *</label>
                  <input
                    type="text"
                    id="modal-productName"
                    name="productName"
                    value={formData.productName}
                    onChange={handleChange}
                    placeholder="e.g., T-Shirt, Dress"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="modal-pieceLength">Piece Length (meters) *</label>
                  <input
                    type="number"
                    id="modal-pieceLength"
                    name="pieceLength"
                    value={formData.pieceLength}
                    onChange={handleChange}
                    placeholder="Length"
                    min="0.1"
                    step="0.1"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="modal-pieceWidth">Piece Width (meters) *</label>
                  <input
                    type="number"
                    id="modal-pieceWidth"
                    name="pieceWidth"
                    value={formData.pieceWidth}
                    onChange={handleChange}
                    placeholder="Width"
                    min="0.1"
                    step="0.1"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="modal-totalSquareMetersUsed">Total Square Meters Used</label>
                  <input
                    type="text"
                    id="modal-totalSquareMetersUsed"
                    value={formData.totalSquareMetersUsed + ' sq.m'}
                    placeholder="Calculated automatically"
                    readOnly
                  />
                </div>
              </div>

              {/* Number of Pieces - Manual Input */}
              <div style={{ marginTop: '20px', marginBottom: '20px' }}>
                <div className="form-group">
                  <label htmlFor="modal-piecesCount" style={{ fontSize: '16px', fontWeight: '600', color: '#374151' }}>
                    Total Number of Pieces *
                    <span style={{ fontSize: '14px', fontWeight: '400', color: '#6b7280', marginLeft: '8px' }}>
                      (Enter total, then distribute across sizes below)
                    </span>
                  </label>
                  <input
                    type="number"
                    id="modal-piecesCount"
                    name="piecesCount"
                    value={formData.piecesCount}
                    onChange={handleChange}
                    placeholder="e.g., 50"
                    min="1"
                    required
                    style={{ fontSize: '16px', fontWeight: '500' }}
                  />
                </div>
              </div>

              {/* Size Breakdown Section */}
              <div style={{ marginTop: '20px', marginBottom: '20px', padding: '15px', border: '2px solid #e5e7eb', borderRadius: '8px', backgroundColor: '#f9fafb' }}>
                <h3 style={{ margin: '0 0 15px 0', color: '#374151', fontSize: '16px', fontWeight: '600' }}>Size Breakdown *</h3>

                <div style={{ display: 'flex', gap: '10px', marginBottom: '15px', alignItems: 'flex-end' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '5px' }}>Size</label>
                    <select
                      value={currentSize}
                      onChange={(e) => setCurrentSize(e.target.value)}
                      style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '14px' }}
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

                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '5px' }}>Quantity</label>
                    <input
                      type="number"
                      value={currentQuantity}
                      onChange={(e) => setCurrentQuantity(e.target.value)}
                      placeholder="Enter quantity"
                      min="1"
                      style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '14px' }}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={addSizeToBreakdown}
                    style={{ padding: '8px 16px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px', fontWeight: '500' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#059669'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#10b981'}
                  >
                    + Add
                  </button>
                </div>

                {/* Display added sizes */}
                {sizeBreakdown.length > 0 && (
                  <div style={{ marginTop: '15px' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                      {sizeBreakdown.map((item) => (
                        <div
                          key={item.size}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '8px 12px',
                            backgroundColor: '#3b82f6',
                            color: 'white',
                            borderRadius: '6px',
                            fontSize: '14px',
                            fontWeight: '500'
                          }}
                        >
                          <span>{item.size}: {item.quantity}</span>
                          <button
                            type="button"
                            onClick={() => removeSizeFromBreakdown(item.size)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: 'white',
                              cursor: 'pointer',
                              fontSize: '18px',
                              padding: '0',
                              lineHeight: '1'
                            }}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                    <div style={{ marginTop: '10px', padding: '8px', backgroundColor: '#e0f2fe', borderRadius: '4px', display: 'flex', justifyContent: 'space-between' }}>
                      <strong style={{ color: '#0369a1' }}>Breakdown Total: {sizeBreakdown.reduce((sum, item) => sum + item.quantity, 0)}</strong>
                      <strong style={{ color: formData.piecesCount && sizeBreakdown.reduce((sum, item) => sum + item.quantity, 0) === parseInt(formData.piecesCount) ? '#059669' : '#dc2626' }}>
                        {formData.piecesCount ? `Remaining: ${parseInt(formData.piecesCount) - sizeBreakdown.reduce((sum, item) => sum + item.quantity, 0)}` : 'Set total pieces first'}
                      </strong>
                    </div>
                  </div>
                )}
              </div>

              <div className="form-grid">

                <div className="form-group">
                  <label htmlFor="modal-cuttingMaster">Cutting Master *</label>
                  <input
                    type="text"
                    id="modal-cuttingMaster"
                    name="cuttingMaster"
                    value={formData.cuttingMaster}
                    onChange={handleChange}
                    placeholder="Cutting master name"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="modal-tailorItemPerPiece">Cutting Item Per Price (₹)</label>
                  <input
                    type="number"
                    id="modal-tailorItemPerPiece"
                    name="tailorItemPerPiece"
                    value={formData.tailorItemPerPiece}
                    onChange={handleChange}
                    placeholder="Price per piece"
                    min="0"
                    step="0.01"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="modal-cuttingDate">Cutting Date *</label>
                  <input
                    type="date"
                    id="modal-cuttingDate"
                    name="cuttingDate"
                    value={formData.cuttingDate}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="btn-group" style={{ marginTop: '20px' }}>
                <button type="submit" className="btn btn-primary">
                  Add Cutting Record
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowAddModal(false)
                    setFormData({
                      fabricType: '',
                      fabricColor: '',
                      productName: '',
                      pieceLength: '',
                      pieceWidth: '',
                      piecesCount: '',
                      totalSquareMetersUsed: '0',
                      cuttingMaster: '',
                      tailorItemPerPiece: '',
                      cuttingDate: new Date().toISOString().split('T')[0]
                    })
                    setSizeBreakdown([])
                    setCurrentSize('')
                    setCurrentQuantity('')
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