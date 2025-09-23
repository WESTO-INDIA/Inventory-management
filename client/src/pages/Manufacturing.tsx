import { useState, useEffect } from 'react'
import '../styles/common.css'
import { API_URL } from '@/config/api'

interface ManufacturingOrder {
  cuttingId: string
  fabricType: string
  fabricColor: string
  productName: string
  quantity: string
  itemsReceived: string
  pricePerPiece: string
  totalPrice: string
  dateOfReceive: string
  tailorName: string
  status: string
  notes: string
}

interface CuttingRecord {
  _id: string
  id: string
  productName: string
  piecesCount: number
  fabricType: string
  fabricColor: string
  cuttingGivenTo: string
  sizeType: string
  tailorItemPerPiece?: number
  totalSquareMetersUsed: number
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

export default function Manufacturing() {
  const [formData, setFormData] = useState<ManufacturingOrder>({
    cuttingId: '',
    fabricType: '',
    fabricColor: '',
    productName: '',
    quantity: '',
    itemsReceived: '',
    pricePerPiece: '',
    totalPrice: '0',
    dateOfReceive: '',
    tailorName: '',
    status: 'Pending',
    notes: ''
  })
  const [cuttingRecords, setCuttingRecords] = useState<CuttingRecord[]>([])
  const [cuttingSuggestions, setCuttingSuggestions] = useState<CuttingRecord[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [manufacturingRecords, setManufacturingRecords] = useState<ManufacturingRecord[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingRecords, setIsLoadingRecords] = useState(false)

  const fetchCuttingRecords = async () => {
    try {
      const response = await fetch(`${API_URL}/api/cutting-records`)
      if (response.ok) {
        const records = await response.json()
        setCuttingRecords(records)
      }
    } catch (error) {
    }
  }

  const fetchManufacturingRecords = async () => {
    setIsLoadingRecords(true)
    try {
      const response = await fetch(`${API_URL}/api/manufacturing-orders`)
      if (response.ok) {
        const records = await response.json()
        setManufacturingRecords(records.slice(0, 10))
      }
    } catch (error) {
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

  const handleCuttingIdChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    const newFormData = { ...formData, cuttingId: value }

    // Show suggestions if input has 2 or more characters
    if (value.length >= 2) {
      const filtered = cuttingRecords.filter(record =>
        record.id.toLowerCase().includes(value.toLowerCase()) ||
        record.productName.toLowerCase().includes(value.toLowerCase())
      ).slice(0, 5) // Show max 5 suggestions
      setCuttingSuggestions(filtered)
      setShowSuggestions(true)
    } else {
      setShowSuggestions(false)
      setCuttingSuggestions([])
    }

    // Auto-fill fields when cutting ID matches exactly
    const selectedRecord = cuttingRecords.find(record => record.id.toUpperCase() === value.toUpperCase())
    if (selectedRecord) {
      // Check existing manufacturing records for this cutting ID to calculate remaining quantity
      try {
        const response = await fetch(`${API_URL}/api/manufacturing-orders`)
        if (response.ok) {
          const manufacturingRecords = await response.json()

          // Debug: Log the data to see what we're working with

          const existingRecords = manufacturingRecords.filter((record: any) =>
            record.cuttingId === selectedRecord.id
          )


          // Calculate total quantity already manufactured/assigned
          // Use itemsReceived to get actually received pieces
          const totalReceived = existingRecords.reduce((sum: number, record: any) => {
            const received = record.itemsReceived || 0
            return sum + received
          }, 0)


          // Calculate remaining quantity
          const remainingQuantity = selectedRecord.piecesCount - totalReceived
          const displayQuantity = Math.max(0, remainingQuantity) // Ensure not negative


          // If displayQuantity is 0 and there are no existing records, use original quantity
          const finalQuantity = (displayQuantity === 0 && existingRecords.length === 0)
            ? selectedRecord.piecesCount
            : displayQuantity


          newFormData.fabricType = selectedRecord.fabricType
          newFormData.fabricColor = selectedRecord.fabricColor
          newFormData.productName = selectedRecord.productName
          newFormData.quantity = finalQuantity.toString()
          newFormData.tailorName = selectedRecord.cuttingGivenTo || ''
          newFormData.pricePerPiece = selectedRecord.tailorItemPerPiece?.toString() || ''

          // Auto-calculate total price if items received is set
          const items = parseFloat(newFormData.itemsReceived) || 0
          const price = selectedRecord.tailorItemPerPiece || 0
          newFormData.totalPrice = (items * price).toFixed(2)
        }
      } catch (error) {
        // Fallback to original quantity if API call fails
        newFormData.fabricType = selectedRecord.fabricType
        newFormData.fabricColor = selectedRecord.fabricColor
        newFormData.productName = selectedRecord.productName
        newFormData.quantity = selectedRecord.piecesCount.toString()
        newFormData.tailorName = selectedRecord.cuttingGivenTo || ''
        newFormData.pricePerPiece = selectedRecord.tailorItemPerPiece?.toString() || ''

        // Auto-calculate total price if items received is set
        const items = parseFloat(newFormData.itemsReceived) || 0
        const price = selectedRecord.tailorItemPerPiece || 0
        newFormData.totalPrice = (items * price).toFixed(2)
      }
    }

    setFormData(newFormData)
  }

  const handleSuggestionSelect = async (record: CuttingRecord) => {
    // Calculate remaining quantity for this cutting record
    try {
      const response = await fetch(`${API_URL}/api/manufacturing-orders`)
      if (response.ok) {
        const manufacturingRecords = await response.json()
        const existingRecords = manufacturingRecords.filter((mRecord: any) =>
          mRecord.cuttingId === record.id
        )

        // Calculate total quantity already received (not assigned)
        const totalReceived = existingRecords.reduce((sum: number, mRecord: any) =>
          sum + (mRecord.itemsReceived || 0), 0
        )

        // Calculate remaining quantity
        const remainingQuantity = record.piecesCount - totalReceived
        const displayQuantity = Math.max(0, remainingQuantity) // Ensure not negative

        // If displayQuantity is 0 and there are no existing records, use original quantity
        const finalQuantity = (displayQuantity === 0 && existingRecords.length === 0)
          ? record.piecesCount
          : displayQuantity

        setFormData({
          ...formData,
          cuttingId: record.id,
          fabricType: record.fabricType,
          fabricColor: record.fabricColor,
          productName: record.productName,
          quantity: finalQuantity.toString(),
          itemsReceived: '',
          pricePerPiece: record.tailorItemPerPiece?.toString() || '',
          totalPrice: '0',
          tailorName: record.cuttingGivenTo || ''
        })
      }
    } catch (error) {
      // Fallback to original quantity if API call fails
      setFormData({
        ...formData,
        cuttingId: record.id,
        fabricType: record.fabricType,
        fabricColor: record.fabricColor,
        productName: record.productName,
        quantity: record.piecesCount.toString(),
        itemsReceived: '',
        pricePerPiece: record.tailorItemPerPiece?.toString() || '',
        totalPrice: '0',
        tailorName: record.cuttingGivenTo || ''
      })
    }

    setShowSuggestions(false)
    setCuttingSuggestions([])
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData({
      ...formData,
      [name]: value
    })
  }

  useEffect(() => {
    fetchCuttingRecords()
    fetchManufacturingRecords()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate items received doesn't exceed quantity
    const itemsReceived = parseFloat(formData.itemsReceived) || 0
    const maxQuantity = parseFloat(formData.quantity) || 0

    if (itemsReceived > maxQuantity) {
      alert(`❌ Items received (${itemsReceived}) cannot exceed quantity to manufacture (${maxQuantity})`)
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)

      // First, check if there's an existing manufacturing record for this cutting ID
      const existingResponse = await fetch(`${API_URL}/api/manufacturing-orders`)
      if (!existingResponse.ok) {
        throw new Error('Failed to fetch existing manufacturing records')
      }

      const existingRecords = await existingResponse.json()
      const existingRecord = existingRecords.find((record: any) =>
        record.cuttingId === formData.cuttingId
      )

      let response
      let successMessage = ''

      if (existingRecord) {
        // Update existing record
        const newItemsReceived = (existingRecord.itemsReceived || 0) + (parseFloat(formData.itemsReceived) || 0)
        const newQuantityRemaining = Math.max(0, existingRecord.quantity - newItemsReceived)
        const newStatus = newQuantityRemaining <= 0 ? 'Completed' : 'Pending'

        const updateData = {
          itemsReceived: newItemsReceived,
          quantityRemaining: newQuantityRemaining,
          pricePerPiece: parseFloat(formData.pricePerPiece) || 0,
          totalPrice: parseFloat(formData.totalPrice) || 0,
          dateOfReceive: formData.dateOfReceive,
          status: newStatus,
          notes: formData.notes
        }

        response = await fetch(`${API_URL}/api/manufacturing-orders/${existingRecord._id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updateData)
        })

        successMessage = `✅ Manufacturing record updated successfully! Status: ${newStatus}`
      } else {
        // Create new record only if no existing record found
        const itemsReceived = parseFloat(formData.itemsReceived) || 0
        const quantity = parseInt(formData.quantity)
        const quantityRemaining = Math.max(0, quantity - itemsReceived)
        const status = quantityRemaining <= 0 ? 'Completed' : 'Pending'

        const manufacturingOrder = {
          cuttingId: formData.cuttingId,
          fabricType: formData.fabricType,
          fabricColor: formData.fabricColor,
          productName: formData.productName,
          quantity: quantity,
          quantityRemaining: quantityRemaining,
          itemsReceived: itemsReceived,
          pricePerPiece: parseFloat(formData.pricePerPiece) || 0,
          totalPrice: parseFloat(formData.totalPrice) || 0,
          dateOfReceive: formData.dateOfReceive,
          tailorName: formData.tailorName,
          priority: 'Normal',
          status: status,
          notes: formData.notes
        }

        response = await fetch(`${API_URL}/api/manufacturing-orders`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(manufacturingOrder)
        })

        successMessage = `✅ Manufacturing order created successfully! Status: ${status}`
      }

      if (response.ok) {
        // Auto-generate or update QR code for this manufacturing order
        let manufacturingId

        if (existingRecord) {
          // For updates, use the existing manufacturing ID
          manufacturingId = existingRecord.manufacturingId
        } else {
          // For new records, get the manufacturing ID from response
          const responseData = await response.json()
          const manufacturingRecord = responseData.manufacturingOrder || responseData
          manufacturingId = manufacturingRecord.manufacturingId
        }

        const itemsReceived = parseFloat(formData.itemsReceived) || 0

        if (itemsReceived > 0 && manufacturingId) {
          // Check if QR already exists for this manufacturing ID
          const qrCheckResponse = await fetch(`${API_URL}/api/qr-products`)
          if (qrCheckResponse.ok) {
            const qrProducts = await qrCheckResponse.json()
            const existingQR = qrProducts.find((qr: any) =>
              qr.manufacturingId === manufacturingId
            )

            if (existingQR) {
              // Update existing QR with accumulated quantity
              const updatedQuantity = (existingQR.quantity || 0) + itemsReceived

              await fetch(`${API_URL}/api/qr-products/${existingQR._id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  quantity: updatedQuantity,
                  generatedDate: new Date().toISOString().split('T')[0]
                })
              })
            } else {
              // Get size from cutting records if available
              let size = 'N/A'
              const cuttingRecord = cuttingRecords.find((c: CuttingRecord) => c.id === formData.cuttingId)
              if (cuttingRecord) {
                size = cuttingRecord.sizeType || 'N/A'
              } else if (existingRecord?.size) {
                size = existingRecord.size
              }

              // Create new QR product using manufacturing ID
              const qrProductData = {
                productId: manufacturingId,
                manufacturingId: manufacturingId,
                productName: formData.productName,
                color: formData.fabricColor,
                size: size,
                quantity: itemsReceived,
                tailorName: formData.tailorName,
                generatedDate: formData.dateOfReceive,
                cuttingId: formData.cuttingId,
                notes: formData.notes || ''
              }

              await fetch(`${API_URL}/api/qr-products`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(qrProductData)
              })
            }
          }

            // Create transaction record for QR generation
            const transactionData = {
              type: 'QR_GENERATED',
              itemType: 'QR_GENERATED',
              itemName: formData.productName,
              itemId: formData.cuttingId,
              action: 'QR_GENERATED',
              quantity: itemsReceived,
              previousStock: 0,
              newStock: 0,
              performedBy: 'system',
              source: 'QR_GENERATION',
              timestamp: new Date().toISOString()
            }

            await fetch(`${API_URL}/api/transactions`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(transactionData)
            })
          }

        alert(successMessage + '\n✅ QR code generated/updated automatically!')

        // Refresh manufacturing records
        fetchManufacturingRecords()

        // Reset form
        setFormData({
          cuttingId: '',
          fabricType: '',
          fabricColor: '',
          productName: '',
          quantity: '',
          itemsReceived: '',
          pricePerPiece: '',
          totalPrice: '0',
          dateOfReceive: '',
          tailorName: '',
          status: 'Pending',
          notes: ''
        })
      } else {
        alert('❌ Error updating manufacturing order. Please try again.')
      }
    } catch (error) {
      alert('❌ Error handling manufacturing order. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }


  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Manufacturing</h1>
        <p>Create and manage manufacturing orders</p>
      </div>


      {/* Assign Manufacturing to Tailor */}
      <div className="content-card">
        <h2 style={{ marginBottom: '20px', color: '#374151' }}>Assign Manufacturing to Tailor</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group" style={{ position: 'relative' }}>
              <label htmlFor="cuttingId">Cutting ID *</label>
              <input
                type="text"
                id="cuttingId"
                name="cuttingId"
                value={formData.cuttingId}
                onChange={handleCuttingIdChange}
                placeholder="Enter cutting ID (e.g., CUTTSH001)"
                required
                autoComplete="off"
              />
              {showSuggestions && cuttingSuggestions.length > 0 && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  background: 'white',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  zIndex: 1000,
                  maxHeight: '200px',
                  overflowY: 'auto'
                }}>
                  {cuttingSuggestions.map((record) => (
                    <div
                      key={record._id}
                      onClick={() => handleSuggestionSelect(record)}
                      style={{
                        padding: '8px 12px',
                        cursor: 'pointer',
                        borderBottom: '1px solid #f3f4f6',
                        fontSize: '14px'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#f3f4f6'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'white'
                      }}
                    >
                      <div style={{ fontWeight: '500' }}>{record.id}</div>
                      <div style={{ color: '#6b7280', fontSize: '12px' }}>
                        {record.productName} - {record.piecesCount} pieces - {record.fabricType} ({record.fabricColor})
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {formData.cuttingId && formData.productName && (
                <small style={{ color: '#10b981' }}>
                  ✅ Found: {formData.productName} ({formData.quantity} pieces remaining)
                </small>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="fabricType">Fabric Type</label>
              <input
                type="text"
                id="fabricType"
                name="fabricType"
                value={formData.fabricType}
                placeholder="Auto-filled from cutting record"
                readOnly
                style={{ background: '#f9fafb', color: '#6b7280' }}
              />
            </div>

            <div className="form-group">
              <label htmlFor="fabricColor">Fabric Color</label>
              <input
                type="text"
                id="fabricColor"
                name="fabricColor"
                value={formData.fabricColor}
                placeholder="Auto-filled from cutting record"
                readOnly
                style={{ background: '#f9fafb', color: '#6b7280' }}
              />
            </div>

            <div className="form-group">
              <label htmlFor="productName">Product Name</label>
              <input
                type="text"
                id="productName"
                name="productName"
                value={formData.productName}
                placeholder="Auto-filled from cutting record"
                readOnly
                style={{ background: '#f9fafb', color: '#6b7280' }}
              />
            </div>

            <div className="form-group">
              <label htmlFor="quantity">Qty to Manufacture</label>
              <input
                type="number"
                id="quantity"
                name="quantity"
                value={formData.quantity}
                placeholder="Auto-filled from cutting record"
                readOnly
                style={{ background: '#f9fafb', color: '#6b7280' }}
              />
            </div>

            <div className="form-group">
              <label htmlFor="tailorName">Tailor Name</label>
              <input
                type="text"
                id="tailorName"
                name="tailorName"
                value={formData.tailorName}
                placeholder="Auto-filled from cutting record"
                readOnly
                style={{ background: '#f9fafb', color: '#6b7280' }}
              />
            </div>

            <div className="form-group">
              <label htmlFor="itemsReceived">Items Received *</label>
              <input
                type="number"
                id="itemsReceived"
                name="itemsReceived"
                value={formData.itemsReceived}
                onChange={(e) => {
                  const items = parseFloat(e.target.value) || 0
                  const maxQty = parseFloat(formData.quantity) || 0

                  // Validate that items received doesn't exceed quantity to manufacture
                  if (items > maxQty) {
                    alert(`Items received cannot exceed quantity to manufacture (${maxQty})`)
                    return
                  }

                  handleChange(e)
                  // Calculate total price
                  const price = parseFloat(formData.pricePerPiece) || 0
                  setFormData(prev => ({
                    ...prev,
                    itemsReceived: e.target.value,
                    totalPrice: (items * price).toFixed(2)
                  }))
                }}
                placeholder="Number of items received"
                min="0"
                max={formData.quantity || undefined}
                required
              />
              {formData.quantity && (
                <small style={{ color: '#6b7280' }}>
                  Maximum: {formData.quantity} items
                </small>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="pricePerPiece">Price Per Piece (₹)</label>
              <input
                type="number"
                id="pricePerPiece"
                name="pricePerPiece"
                value={formData.pricePerPiece}
                onChange={(e) => {
                  handleChange(e)
                  // Calculate total price
                  const items = parseFloat(formData.itemsReceived) || 0
                  const price = parseFloat(e.target.value) || 0
                  setFormData(prev => ({
                    ...prev,
                    pricePerPiece: e.target.value,
                    totalPrice: (items * price).toFixed(2)
                  }))
                }}
                placeholder="Auto-filled from cutting record"
                min="0"
                step="0.01"
                readOnly={!!formData.cuttingId && !!formData.pricePerPiece}
                style={formData.cuttingId && formData.pricePerPiece ? { background: '#f9fafb', color: '#374151', fontWeight: '600' } : {}}
              />
            </div>

            <div className="form-group">
              <label htmlFor="totalPrice">Total Price (₹)</label>
              <input
                type="text"
                id="totalPrice"
                name="totalPrice"
                value={formData.totalPrice}
                readOnly
                style={{ background: '#f9fafb', color: '#374151', fontWeight: 'bold' }}
              />
            </div>

            <div className="form-group">
              <label htmlFor="dateOfReceive">Date Received *</label>
              <input
                type="date"
                id="dateOfReceive"
                name="dateOfReceive"
                value={formData.dateOfReceive}
                onChange={handleChange}
                required
              />
            </div>

          </div>

          <div className="form-group">
            <label htmlFor="notes">Special Instructions</label>
            <textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              placeholder="Any special instructions for the tailor"
              rows={3}
              style={{ resize: 'vertical' }}
            />
          </div>

          <div className="btn-group">
            <button type="submit" className="btn btn-primary" disabled={isLoading}>
              {isLoading ? 'Submitting...' : 'Submit'}
            </button>
            <button 
              type="button" 
              className="btn btn-secondary"
              onClick={() => setFormData({
                cuttingId: '',
                fabricType: '',
                fabricColor: '',
                productName: '',
                quantity: '',
                itemsReceived: '',
                pricePerPiece: '',
                totalPrice: '0',
                dateOfReceive: '',
                tailorName: '',
                status: 'Pending',
                notes: ''
              })}
            >
              Clear Form
            </button>
          </div>
        </form>
      </div>

      {/* Recent Manufacturing Assignments */}
      <div className="content-card">
        <h2 style={{ marginBottom: '20px', color: '#374151' }}>Recent Manufacturing Assignments</h2>
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
                <th style={{ textAlign: 'center' }}>Items Received</th>
                <th style={{ textAlign: 'center' }}>Qty Remaining</th>
                <th style={{ textAlign: 'center' }}>Price/Piece</th>
                <th style={{ textAlign: 'center' }}>Total Price</th>
                <th style={{ textAlign: 'center' }}>Tailor</th>
                <th style={{ textAlign: 'center' }}>Date Received</th>
                <th style={{ textAlign: 'center' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {isLoadingRecords ? (
                <tr>
                  <td colSpan={13} style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                    Loading manufacturing assignments...
                  </td>
                </tr>
              ) : manufacturingRecords.length > 0 ? (
                manufacturingRecords.map((record) => {
                  const quantityRemaining = record.quantity - (record.itemsReceived || 0)
                  const status = quantityRemaining <= 0 ? 'Complete' : 'Pending'

                  return (
                    <tr key={record._id}>
                      <td style={{ fontWeight: '500', textAlign: 'center' }}>{record.manufacturingId || record.cuttingId}</td>
                      <td style={{ textAlign: 'center' }}>{record.fabricType || 'N/A'}</td>
                      <td style={{ textAlign: 'center' }}>{record.fabricColor || 'N/A'}</td>
                      <td style={{ textAlign: 'center' }}>{record.productName}</td>
                      <td style={{ textAlign: 'center' }}>{record.quantity}</td>
                      <td style={{ textAlign: 'center' }}>{record.size || 'N/A'}</td>
                      <td style={{ textAlign: 'center' }}>{record.itemsReceived || 0}</td>
                      <td style={{ textAlign: 'center' }}>{quantityRemaining}</td>
                      <td style={{ textAlign: 'center' }}>₹{record.pricePerPiece || 0}</td>
                      <td style={{ textAlign: 'center', fontWeight: 'bold' }}>₹{record.totalPrice || 0}</td>
                      <td style={{ textAlign: 'center' }}>{record.tailorName}</td>
                      <td style={{ textAlign: 'center' }}>{formatDate(record.dateOfReceive)}</td>
                      <td style={{ textAlign: 'center' }}>
                        <span className={`badge ${
                          status === 'Complete' ? 'badge-success' : 'badge-warning'
                        }`}>
                          {status}
                        </span>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={13} style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                    No manufacturing assignments found
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