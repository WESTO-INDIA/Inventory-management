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
  tailorItemPerPiece?: number
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
  createdAt: string
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

  const generateManufacturingId = async () => {
    try {
      const response = await fetch(`${API_URL}/api/manufacturing-orders`)
      if (response.ok) {
        const records = await response.json()
        const mfgRecords = records
          .filter((r: ManufacturingRecord) => r.manufacturingId && r.manufacturingId.startsWith('MAN'))
          .map((r: ManufacturingRecord) => {
            const numPart = r.manufacturingId.replace('MAN', '')
            return parseInt(numPart) || 0
          })
        const maxNum = mfgRecords.length > 0 ? Math.max(...mfgRecords) : 0
        const nextNum = maxNum + 1
        return `MAN${nextNum.toString().padStart(4, '0')}`
      }
      return 'MAN0001'
    } catch (error) {
      console.error('Error generating manufacturing ID:', error)
      return 'MAN0001'
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

            setAvailableSizes(sizeBreakdownWithRemaining.filter(s => s.remainingQuantity > 0))

            // Auto-fill the fields
            setFormData({
              ...formData,
              fabricType: cuttingRecord.fabricType,
              fabricColor: cuttingRecord.fabricColor,
              productName: cuttingRecord.productName,
              pricePerPiece: (cuttingRecord.tailorItemPerPiece || 0).toString()
            })
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
      // Validate that quantity doesn't exceed available quantity for selected size
      if (formData.size && availableSizes.length > 0) {
        const selectedSize = availableSizes.find(s => s.size === formData.size)
        if (selectedSize && parseInt(formData.quantity) > selectedSize.remainingQuantity) {
          alert(`❌ Quantity (${formData.quantity}) exceeds remaining quantity for size ${formData.size} (${selectedSize.remainingQuantity})`)
          setIsLoading(false)
          return
        }
      }

      const manufacturingId = await generateManufacturingId()
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
        alert(`✅ Manufacturing order ${manufacturingId} assigned to ${formData.tailorName} successfully!`)

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
        alert('❌ Error creating manufacturing order: ' + errorText)
      }
    } catch (error) {
      console.error('Error:', error)
      alert('❌ Error creating manufacturing order. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchManufacturingRecords()
  }, [])

  const totalAmount = (parseFloat(formData.quantity) || 0) * (parseFloat(formData.pricePerPiece) || 0)

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Manufacturing</h1>
        <p>Assign cutting items to tailors for manufacturing</p>
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
                  {availableSizes.map((sizeOption) => (
                    <option key={sizeOption.size} value={sizeOption.size}>
                      {sizeOption.size} (Available: {sizeOption.remainingQuantity})
                    </option>
                  ))}
                </select>
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
              {formData.size && availableSizes.length > 0 && (
                <small style={{ color: '#000000', fontSize: '12px' }}>
                  Available for {formData.size}: {availableSizes.find(s => s.size === formData.size)?.remainingQuantity || 0}
                </small>
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

      {/* Manufacturing Assignments Table */}
      <div className="content-card">
        <h2 style={{ marginBottom: '20px', color: '#374151' }}>Manufacturing Assignments</h2>
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
              </tr>
            </thead>
            <tbody>
              {isLoadingRecords ? (
                <tr>
                  <td colSpan={10} style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                    Loading manufacturing assignments...
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
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={10} style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
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
