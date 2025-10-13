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
  fabricType: string
  fabricColor: string
  productName: string
  piecesCount: number
  totalLengthUsed: number
  sizeType: string
  sizeBreakdown?: SizeBreakdown[]
  cuttingMaster: string
  cuttingPricePerPiece?: number
  date: string
}

interface CuttingForm {
  fabricType: string
  fabricColor: string
  productName: string
  piecesCount: string
  totalLengthUsed: string
  cuttingMaster: string
  cuttingPricePerPiece: string
  cuttingDate: string
}

export default function CuttingInventory() {
  const [searchTerm, setSearchTerm] = useState('')
  const [cuttingRecords, setCuttingRecords] = useState<CuttingRecord[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [sizeBreakdown, setSizeBreakdown] = useState<SizeBreakdown[]>([])
  const [currentSize, setCurrentSize] = useState('')
  const [currentQuantity, setCurrentQuantity] = useState('')
  const [formData, setFormData] = useState<CuttingForm>({
    fabricType: '',
    fabricColor: '',
    productName: '',
    piecesCount: '',
    totalLengthUsed: '',
    cuttingMaster: '',
    cuttingPricePerPiece: '',
    cuttingDate: new Date().toISOString().split('T')[0]
  })

  // Helper function to sort sizes in proper order
  const sortSizeBreakdown = (sizeBreakdown: SizeBreakdown[]) => {
    const sizeOrder = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL']
    return [...sizeBreakdown].sort((a, b) => {
      const indexA = sizeOrder.indexOf(a.size)
      const indexB = sizeOrder.indexOf(b.size)
      return indexA - indexB
    })
  }

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

        // Format as CUT0001, CUT0002, etc. (supports beyond CUT9999)
        return `CUT${nextNum.toString().padStart(Math.max(4, nextNum.toString().length), '0')}`
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

  const handleDelete = async (record: CuttingRecord) => {
    const confirmMessage = `⚠️ WARNING: This will delete cutting record ${record.id} and ALL related data:\n\n` +
      `• All manufacturing orders linked to this cutting ID\n` +
      `• All QR products generated from these manufacturing orders\n` +
      `• All transactions for cutting and manufacturing\n\n` +
      `This action cannot be undone. Are you sure?`

    if (window.confirm(confirmMessage)) {
      try {
        const deleteResponse = await fetch(`${API_URL}/api/cutting-records/${record._id}`, {
          method: 'DELETE'
        })

        if (deleteResponse.ok) {
          const result = await deleteResponse.json()
          const details = result.details

          let successMessage = `✅ Cutting record deleted successfully!\n\n` +
            `Cutting ID: ${details.cuttingId}\n` +
            `Manufacturing Orders Deleted: ${details.deletedManufacturingOrders}\n` +
            `QR Products Deleted: ${details.deletedQRProducts}\n` +
            `Transactions Deleted: ${details.deletedTransactions}`

          alert(successMessage)
          fetchCuttingRecords()
        } else {
          const errorData = await deleteResponse.json().catch(() => ({ message: 'Unknown error' }))
          alert(`❌ Error deleting cutting record: ${errorData.message}`)
        }
      } catch (error) {
        alert('❌ Error deleting cutting record. Please try again.')
      }
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    const newFormData = { ...formData, [name]: value }

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

    try {
      const cuttingId = await generateCuttingId()

      const cuttingRecord = {
        id: cuttingId,
        fabricType: formData.fabricType,
        fabricColor: formData.fabricColor,
        productName: formData.productName,
        piecesCount: parseInt(formData.piecesCount),
        totalLengthUsed: parseFloat(formData.totalLengthUsed),
        sizeType: 'Mixed',
        sizeBreakdown: sizeBreakdown,
        cuttingMaster: formData.cuttingMaster,
        cuttingPricePerPiece: parseFloat(formData.cuttingPricePerPiece) || 0,
        date: formData.cuttingDate
      }


      const cuttingResponse = await fetch(`${API_URL}/api/cutting-records`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cuttingRecord)
      })

      if (cuttingResponse.ok) {
        const result = await cuttingResponse.json()
        alert(`✅ Cutting record ${cuttingId} added successfully!\nNote: Please update fabric quantity manually if needed.`)

        setFormData({
          fabricType: '',
          fabricColor: '',
          productName: '',
          piecesCount: '',
          totalLengthUsed: '',
          cuttingMaster: '',
          cuttingPricePerPiece: '',
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
                <th style={{ textAlign: 'center' }}>Total Length Used</th>
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
                          {sortSizeBreakdown(record.sizeBreakdown).map((sb, idx) => (
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
                    <td style={{ textAlign: 'center', fontWeight: '500', color: '#059669' }}>
                      {record.totalLengthUsed} m
                    </td>
                    <td style={{ textAlign: 'center' }}>{record.cuttingMaster}</td>
                    <td style={{ textAlign: 'center' }}>₹{record.cuttingPricePerPiece || 0}</td>
                    <td style={{ textAlign: 'center', fontWeight: '600', color: '#059669' }}>
                      ₹{((record.cuttingPricePerPiece || 0) * record.piecesCount).toFixed(2)}
                    </td>
                    <td style={{ textAlign: 'center' }}>{formatDate(record.date)}</td>
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
                    {isLoading ? 'Loading cutting records...' : 'No cutting records found'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

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
                  <label htmlFor="modal-piecesCount" style={{ fontSize: '14px', fontWeight: '500', color: '#374151' }}>
                    Total Number of Pieces *
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
                    style={{ fontSize: '14px' }}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="modal-totalLengthUsed">Total Length Used (meters) *</label>
                  <input
                    type="number"
                    id="modal-totalLengthUsed"
                    name="totalLengthUsed"
                    value={formData.totalLengthUsed}
                    onChange={handleChange}
                    placeholder="Enter total length used"
                    min="0.1"
                    step="0.1"
                    required
                  />
                </div>
              </div>

              {/* Size Breakdown Section */}
              <div style={{ marginTop: '20px', marginBottom: '20px' }}>
                <div style={{ padding: '15px', border: '2px solid #e5e7eb', borderRadius: '8px', backgroundColor: '#f9fafb' }}>
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
                      {['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL'].map(size => {
                        const isUsed = sizeBreakdown.some(s => s.size === size)
                        return (
                          <option key={size} value={size} disabled={isUsed}>
                            {size} {isUsed ? '(Not Available)' : ''}
                          </option>
                        )
                      })}
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
                      {sortSizeBreakdown(sizeBreakdown).map((item) => (
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
                  <label htmlFor="modal-cuttingPricePerPiece">Cutting Price per Piece (₹)</label>
                  <input
                    type="number"
                    id="modal-cuttingPricePerPiece"
                    name="cuttingPricePerPiece"
                    value={formData.cuttingPricePerPiece}
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
                      piecesCount: '',
                      totalLengthUsed: '',
                      cuttingMaster: '',
                      cuttingPricePerPiece: '',
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