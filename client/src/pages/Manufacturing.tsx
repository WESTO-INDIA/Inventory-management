import { useState, useEffect } from 'react'
import '../styles/common.css'
import { API_URL } from '@/config/api'

interface SizeBreakdown {
  size: string
  quantity: number
  remainingQuantity: number
}

interface CuttingRecord {
  _id: string
  id: string
  productName: string
  piecesCount: number
  fabricType: string
  fabricColor: string
  sizeBreakdown?: SizeBreakdown[]
  cuttingPricePerPiece?: number
}

interface ManufacturingRecord {
  _id: string
  manufacturingId: string
  cuttingId: string
  fabricType: string
  fabricColor: string
  productName: string
  quantity: number
  size: string
  tailorName: string
  pricePerPiece: number
  totalAmount: number
  status?: string
  createdAt: string
  completionDate?: string
}

interface EditPriceForm {
  recordId: string
  pricePerPiece: string
}

interface ManufacturingForm {
  cuttingId: string
  fabricType: string
  fabricColor: string
  productName: string
  quantity: string
  size: string
  tailorName: string
  pricePerPiece: string
}

export default function Manufacturing() {
  const [formData, setFormData] = useState<ManufacturingForm>({
    cuttingId: '',
    fabricType: '',
    fabricColor: '',
    productName: '',
    quantity: '',
    size: '',
    tailorName: '',
    pricePerPiece: ''
  })
  const [availableSizes, setAvailableSizes] = useState<SizeBreakdown[]>([])
  const [manufacturingRecords, setManufacturingRecords] = useState<ManufacturingRecord[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingRecords, setIsLoadingRecords] = useState(false)
  const [editingRecord, setEditingRecord] = useState<EditPriceForm | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)

  const fetchManufacturingRecords = async () => {
    setIsLoadingRecords(true)
    try {
      const response = await fetch(`${API_URL}/api/manufacturing-orders`)
      if (response.ok) {
        const records = await response.json()
        setManufacturingRecords(records)
      }
    } catch (error) {
      console.error('Error fetching manufacturing records:', error)
    } finally {
      setIsLoadingRecords(false)
    }
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

  const generateManufacturingId = async () => {
    try {
      const response = await fetch(`${API_URL}/api/manufacturing-orders`)
      if (response.ok) {
        const records = await response.json()
        const mfgRecords = records
          .filter((r: ManufacturingRecord) => r.manufacturingId && r.manufacturingId.startsWith('MFG'))
          .map((r: ManufacturingRecord) => {
            const numPart = r.manufacturingId.replace('MFG', '')
            return parseInt(numPart) || 0
          })
        const maxNum = mfgRecords.length > 0 ? Math.max(...mfgRecords) : 0
        const nextNum = maxNum + 1
        // Use at least 4 digits, but allow more if needed (supports beyond MFG9999)
        return `MFG${nextNum.toString().padStart(Math.max(4, nextNum.toString().length), '0')}`
      }
      return 'MFG0001'
    } catch (error) {
      console.error('Error generating manufacturing ID:', error)
      return 'MFG0001'
    }
  }

  const handleCuttingIdBlur = async () => {
    if (!formData.cuttingId) return

    try {
      // Fetch cutting record by ID
      const response = await fetch(`${API_URL}/api/cutting-records`)
      if (response.ok) {
        const records = await response.json()
        const cuttingRecord = records.find((r: CuttingRecord) =>
          r.id.toUpperCase() === formData.cuttingId.toUpperCase()
        )

        if (cuttingRecord) {
          // Get existing manufacturing records for this cutting ID to calculate remaining quantities
          const mfgResponse = await fetch(`${API_URL}/api/manufacturing-orders`)
          if (mfgResponse.ok) {
            const mfgRecords = await mfgResponse.json()
            const existingAssignments = mfgRecords.filter((r: ManufacturingRecord) =>
              r.cuttingId === cuttingRecord.id
            )

            // Calculate remaining quantities for each size
            const sizeBreakdownWithRemaining = (cuttingRecord.sizeBreakdown || []).map(sb => {
              const assignedForSize = existingAssignments
                .filter((r: ManufacturingRecord) => r.size === sb.size)
                .reduce((sum: number, r: ManufacturingRecord) => sum + r.quantity, 0)

              return {
                size: sb.size,
                quantity: sb.quantity,
                remainingQuantity: sb.quantity - assignedForSize
              }
            })

            const availableSizesFiltered = sizeBreakdownWithRemaining.filter(s => s.remainingQuantity > 0)
            setAvailableSizes(availableSizesFiltered)

            // Auto-fill the fields
            setFormData({
              ...formData,
              fabricType: cuttingRecord.fabricType,
              fabricColor: cuttingRecord.fabricColor,
              productName: cuttingRecord.productName
            })

            // Check if all cuttings are already assigned
            if (availableSizesFiltered.length === 0 && sizeBreakdownWithRemaining.length > 0) {
              alert('✅ All cutting assigned for this Cutting ID')
            }
          }
        } else {
          alert('❌ Cutting ID not found.')
          setAvailableSizes([])
        }
      }
    } catch (error) {
      console.error('Error fetching cutting record:', error)
      alert('❌ Error fetching cutting record.')
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData({
      ...formData,
      [name]: value
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      // Check if "Select All" is chosen
      if (formData.size === 'ALL') {
        // Assign all available sizes to the tailor
        if (availableSizes.length === 0) {
          alert('❌ No sizes available to assign')
          setIsLoading(false)
          return
        }

        let successCount = 0
        const pricePerPiece = parseFloat(formData.pricePerPiece) || 0

        // Get existing manufacturing records
        const mfgResponse = await fetch(`${API_URL}/api/manufacturing-orders`)
        const existingRecords = mfgResponse.ok ? await mfgResponse.json() : []

        // Create manufacturing order for each available size
        for (const sizeOption of availableSizes) {
          // Check if a manufacturing order already exists for this combination
          const matchingRecord = existingRecords.find((r: ManufacturingRecord) =>
            r.cuttingId === formData.cuttingId &&
            r.productName === formData.productName &&
            r.size === sizeOption.size &&
            r.fabricColor === formData.fabricColor &&
            r.fabricType === formData.fabricType
          )

          const manufacturingId = matchingRecord
            ? matchingRecord.manufacturingId
            : await generateManufacturingId()

          const quantity = sizeOption.remainingQuantity
          const totalAmount = quantity * pricePerPiece

          const manufacturingOrder = {
            manufacturingId,
            cuttingId: formData.cuttingId,
            fabricType: formData.fabricType,
            fabricColor: formData.fabricColor,
            productName: formData.productName,
            quantity: quantity,
            size: sizeOption.size,
            tailorName: formData.tailorName,
            pricePerPiece: pricePerPiece,
            totalAmount: totalAmount,
            status: 'Pending'
          }

          const response = await fetch(`${API_URL}/api/manufacturing-orders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(manufacturingOrder)
          })

          if (response.ok) {
            successCount++
          }
        }

        if (successCount === availableSizes.length) {
          alert(`✅ All ${successCount} sizes assigned to ${formData.tailorName} successfully!`)
        } else {
          alert(`⚠️ ${successCount} out of ${availableSizes.length} sizes assigned successfully`)
        }

        // Reset form
        setFormData({
          cuttingId: '',
          fabricType: '',
          fabricColor: '',
          productName: '',
          quantity: '',
          size: '',
          tailorName: '',
          pricePerPiece: ''
        })
        setAvailableSizes([])

        // Refresh records
        fetchManufacturingRecords()
      } else {
        // Original logic for single size assignment
        // Validate that quantity doesn't exceed available quantity for selected size
        if (formData.size && availableSizes.length > 0) {
          const selectedSize = availableSizes.find(s => s.size === formData.size)
          if (selectedSize && parseInt(formData.quantity) > selectedSize.remainingQuantity) {
            alert(`❌ Quantity (${formData.quantity}) exceeds remaining quantity for size ${formData.size} (${selectedSize.remainingQuantity})`)
            setIsLoading(false)
            return
          }
        }

        // Check if a manufacturing order already exists for this cutting ID + product + size + color
        // If yes, reuse the same manufacturing ID instead of creating a new one
        let manufacturingId: string
        const mfgResponse = await fetch(`${API_URL}/api/manufacturing-orders`)
        if (mfgResponse.ok) {
          const existingRecords = await mfgResponse.json()
          const matchingRecord = existingRecords.find((r: ManufacturingRecord) =>
            r.cuttingId === formData.cuttingId &&
            r.productName === formData.productName &&
            r.size === formData.size &&
            r.fabricColor === formData.fabricColor &&
            r.fabricType === formData.fabricType
          )

          if (matchingRecord) {
            // Reuse existing manufacturing ID
            manufacturingId = matchingRecord.manufacturingId
          } else {
            // Generate new manufacturing ID only if no match found
            manufacturingId = await generateManufacturingId()
          }
        } else {
          // Fallback: generate new ID if API call fails
          manufacturingId = await generateManufacturingId()
        }

        const totalAmount = (parseFloat(formData.quantity) || 0) * (parseFloat(formData.pricePerPiece) || 0)

        const manufacturingOrder = {
          manufacturingId,
          cuttingId: formData.cuttingId,
          fabricType: formData.fabricType,
          fabricColor: formData.fabricColor,
          productName: formData.productName,
          quantity: parseInt(formData.quantity),
          size: formData.size,
          tailorName: formData.tailorName,
          pricePerPiece: parseFloat(formData.pricePerPiece) || 0,
          totalAmount: totalAmount,
          status: 'Pending'
        }

        const response = await fetch(`${API_URL}/api/manufacturing-orders`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(manufacturingOrder)
        })

        if (response.ok) {
          alert(`✅ Order ${manufacturingId} assigned to ${formData.tailorName} successfully!`)

          // Reset form
          setFormData({
            cuttingId: '',
            fabricType: '',
            fabricColor: '',
            productName: '',
            quantity: '',
            size: '',
            tailorName: '',
            pricePerPiece: ''
          })
          setAvailableSizes([])

          // Refresh records
          fetchManufacturingRecords()
        } else {
          const errorText = await response.text()
          alert('❌ Error assigning to tailor: ' + errorText)
        }
      }
    } catch (error) {
      console.error('Error:', error)
      alert('❌ Error assigning to tailor. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchManufacturingRecords()
  }, [])

  const totalAmount = formData.size === 'ALL'
    ? availableSizes.reduce((sum, s) => sum + s.remainingQuantity, 0) * (parseFloat(formData.pricePerPiece) || 0)
    : (parseFloat(formData.quantity) || 0) * (parseFloat(formData.pricePerPiece) || 0)

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Assign to Tailor</h1>
        <p>Assign cutting items to tailors for production</p>
      </div>

      {/* Assign to Tailor Form */}
      <div className="content-card">
        <h2 style={{ marginBottom: '20px', color: '#374151' }}>Assign to Tailor</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="cuttingId">Cutting ID *</label>
              <input
                type="text"
                id="cuttingId"
                name="cuttingId"
                value={formData.cuttingId}
                onChange={handleChange}
                onBlur={handleCuttingIdBlur}
                placeholder="Enter cutting ID (e.g., CUT0001)"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="fabricType">Fabric Type *</label>
              <input
                type="text"
                id="fabricType"
                name="fabricType"
                value={formData.fabricType}
                onChange={handleChange}
                placeholder="e.g., Cotton, Silk, Denim"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="fabricColor">Fabric Color *</label>
              <input
                type="text"
                id="fabricColor"
                name="fabricColor"
                value={formData.fabricColor}
                onChange={handleChange}
                placeholder="e.g., Red, Blue, White"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="productName">Product *</label>
              <input
                type="text"
                id="productName"
                name="productName"
                value={formData.productName}
                onChange={handleChange}
                placeholder="e.g., T-Shirt, Dress"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="size">Size *</label>
              {availableSizes.length > 0 ? (
                <select
                  id="size"
                  name="size"
                  value={formData.size}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select Size</option>
                  <option value="ALL">Select All</option>
                  {availableSizes.map((sizeOption) => (
                    <option key={sizeOption.size} value={sizeOption.size}>
                      {sizeOption.size} (Available: {sizeOption.remainingQuantity})
                    </option>
                  ))}
                </select>
              ) : formData.cuttingId && formData.fabricType ? (
                <div>
                  <input
                    type="text"
                    value="All cutting assigned"
                    readOnly
                    style={{ background: '#f9fafb', color: '#059669', fontWeight: 'bold' }}
                  />
                </div>
              ) : (
                <input
                  type="text"
                  id="size"
                  name="size"
                  value={formData.size}
                  onChange={handleChange}
                  placeholder="Enter size manually"
                  required
                />
              )}
            </div>

            <div className="form-group">
              <label htmlFor="quantity">Qty *</label>
              {formData.size === 'ALL' ? (
                <input
                  type="text"
                  value={`Total: ${availableSizes.reduce((sum, s) => sum + s.remainingQuantity, 0)} pcs`}
                  readOnly
                  style={{ background: '#f9fafb', color: '#000000', fontWeight: 'bold' }}
                />
              ) : (
                <>
                  <input
                    type="number"
                    id="quantity"
                    name="quantity"
                    value={formData.quantity}
                    onChange={handleChange}
                    placeholder="Enter quantity"
                    min="1"
                    required
                  />
                  {formData.size && availableSizes.length > 0 && formData.size !== 'ALL' && (
                    <small style={{ color: '#000000', fontSize: '12px' }}>
                      Available for {formData.size}: {availableSizes.find(s => s.size === formData.size)?.remainingQuantity || 0}
                    </small>
                  )}
                </>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="tailorName">Tailor Name *</label>
              <input
                type="text"
                id="tailorName"
                name="tailorName"
                value={formData.tailorName}
                onChange={handleChange}
                placeholder="Enter tailor name"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="pricePerPiece">Price Per Piece (₹) *</label>
              <input
                type="number"
                id="pricePerPiece"
                name="pricePerPiece"
                value={formData.pricePerPiece}
                onChange={handleChange}
                placeholder="Enter price per piece"
                min="0"
                step="0.01"
                required
              />
            </div>

            <div className="form-group">
              <label>Total Amount (₹)</label>
              <input
                type="text"
                value={`₹${totalAmount.toFixed(2)}`}
                readOnly
                style={{ background: '#f9fafb', color: '#000000', fontWeight: 'bold', fontSize: '16px' }}
              />
            </div>
          </div>

          <div className="btn-group" style={{ marginTop: '20px' }}>
            <button type="submit" className="btn btn-primary" disabled={isLoading}>
              {isLoading ? 'Assigning...' : 'Assign to Tailor'}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setFormData({
                  cuttingId: '',
                  fabricType: '',
                  fabricColor: '',
                  productName: '',
                  quantity: '',
                  size: '',
                  tailorName: '',
                  pricePerPiece: ''
                })
                setAvailableSizes([])
              }}
            >
              Clear Form
            </button>
          </div>
        </form>
      </div>

      {/* Tailor Assignments Table */}
      <div className="content-card">
        <h2 style={{ marginBottom: '20px', color: '#374151' }}>Tailor Assignments</h2>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ textAlign: 'center' }}>Assignment ID</th>
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
                <th style={{ textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoadingRecords ? (
                <tr>
                  <td colSpan={12} style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                    Loading tailor assignments...
                  </td>
                </tr>
              ) : manufacturingRecords.length > 0 ? (
                manufacturingRecords.map((record) => (
                  <tr key={record._id}>
                    <td style={{ fontWeight: '500', textAlign: 'center' }}>{record.manufacturingId}</td>
                    <td style={{ textAlign: 'center' }}>{record.fabricType}</td>
                    <td style={{ textAlign: 'center' }}>{record.fabricColor}</td>
                    <td style={{ textAlign: 'center' }}>{record.productName}</td>
                    <td style={{ textAlign: 'center' }}>{record.quantity}</td>
                    <td style={{ textAlign: 'center' }}>{record.size}</td>
                    <td style={{ textAlign: 'center' }}>{record.tailorName}</td>
                    <td style={{ textAlign: 'center' }}>₹{record.pricePerPiece}</td>
                    <td style={{ textAlign: 'center', fontWeight: '600', color: '#000000' }}>
                      ₹{record.totalAmount?.toFixed(2) || '0.00'}
                    </td>
                    <td style={{ textAlign: 'center' }}>{formatDate(record.createdAt)}</td>
                    <td style={{ textAlign: 'center', color: record.completionDate ? '#059669' : '#6b7280', fontWeight: record.completionDate ? '600' : 'normal' }}>
                      {record.completionDate ? formatDate(record.completionDate) : '-'}
                    </td>
                    <td style={{ textAlign: 'center' }}>
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
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={12} style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                    No tailor assignments found
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
