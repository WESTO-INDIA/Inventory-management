import { useState, useEffect } from 'react'
import '../styles/common.css'
import { API_URL } from '@/config/api'

interface CuttingForm {
  productId: string
  fabricType: string
  fabricColor: string
  productName: string
  pieceLength: string
  pieceWidth: string
  piecesCount: string
  totalSquareMetersUsed: string
  sizeType: string
  cuttingMaster: string
  cuttingGivenTo: string
  tailorItemPerPiece: string
  cuttingDate: string
  notes: string
}

interface Fabric {
  _id: string
  productId: string
  fabricType: string
  color: string
  length: number
  width: number
  quantity: number
  supplier: string
  purchasePrice: number
  notes: string
  status: string
}

export default function Cutting() {
  const [formData, setFormData] = useState<CuttingForm>({
    productId: '',
    fabricType: '',
    fabricColor: '',
    productName: '',
    pieceLength: '',
    pieceWidth: '',
    piecesCount: '',
    totalSquareMetersUsed: '0',
    sizeType: '',
    cuttingMaster: '',
    cuttingGivenTo: '',
    tailorItemPerPiece: '',
    cuttingDate: new Date().toISOString().split('T')[0],
    notes: ''
  })

  const [fabrics, setFabrics] = useState<Fabric[]>([])
  const [selectedFabric, setSelectedFabric] = useState<Fabric | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [recentCuttingRecords, setRecentCuttingRecords] = useState<any[]>([])
  const [isLoadingRecords, setIsLoadingRecords] = useState(false)
  const [fabricSuggestions, setFabricSuggestions] = useState<Fabric[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  
  const generateCuttingId = (productName: string, color: string) => {
    // Get first 3 letters of product name (uppercase)
    const productCode = productName.substring(0, 3).toUpperCase().padEnd(3, 'X')
    // Get first 2 letters of color (uppercase)
    const colorCode = color.substring(0, 2).toUpperCase().padEnd(2, 'X')

    // Generate 3-character alphanumeric random string
    const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    let randomString = ''
    for (let i = 0; i < 3; i++) {
      randomString += chars.charAt(Math.floor(Math.random() * chars.length))
    }

    return `${productCode}${colorCode}${randomString}` // Total 8 characters
  }

  const generateProductId = (name: string, color: string, quantity: number) => {
    // Get first 3 letters of fabric type (uppercase)
    const fabricTypeCode = name.substring(0, 3).toUpperCase().padEnd(3, 'X')

    // Generate 5-character alphanumeric serial
    const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    let serial = ''
    for (let i = 0; i < 5; i++) {
      serial += chars.charAt(Math.floor(Math.random() * chars.length))
    }

    return `${fabricTypeCode}${serial}` // Total 8 characters
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const day = date.getDate().toString().padStart(2, '0')
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const year = date.getFullYear()
    return `${day}/${month}/${year}`
  }

  const fetchFabrics = async () => {
    try {
      const response = await fetch(`${API_URL}/api/fabrics`)
      if (response.ok) {
        const fabricsData = await response.json()
        setFabrics(fabricsData)
      }
    } catch (error) {
    }
  }

  const fetchRecentCuttingRecords = async () => {
    setIsLoadingRecords(true)
    try {
      const response = await fetch(`${API_URL}/api/cutting-records`)
      if (response.ok) {
        const records = await response.json()
        // Get the 5 most recent records
        const recentRecords = records.slice(0, 5)
        setRecentCuttingRecords(recentRecords)
      }
    } catch (error) {
    } finally {
      setIsLoadingRecords(false)
    }
  }

  const fetchFabricByProductId = async (productId: string) => {
    if (!productId.trim()) {
      setSelectedFabric(null)
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch(`${API_URL}/api/fabrics`)
      if (response.ok) {
        const fabricsData = await response.json()
        const fabric = fabricsData.find((f: Fabric) => 
          f.productId === productId.toUpperCase() || 
          generateProductId(f.fabricType, f.color, Math.floor(f.quantity)) === productId.toUpperCase()
        )
        
        if (fabric) {
          setSelectedFabric(fabric)
          setFormData(prev => ({
            ...prev,
            fabricType: fabric.fabricType,
            fabricColor: fabric.color
          }))
        } else {
          setSelectedFabric(null)
          setFormData(prev => ({
            ...prev,
            fabricType: '',
            fabricColor: ''
          }))
        }
      }
    } catch (error) {
      setSelectedFabric(null)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchFabrics()
    fetchRecentCuttingRecords()
  }, [])

  const handleFabricIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    const newFormData = { ...formData, productId: value }

    // Show suggestions if input has 2 or more characters
    if (value.length >= 2) {
      const filtered = fabrics.filter(fabric =>
        fabric.productId?.toLowerCase().includes(value.toLowerCase()) ||
        fabric.fabricType.toLowerCase().includes(value.toLowerCase()) ||
        fabric.color.toLowerCase().includes(value.toLowerCase())
      ).slice(0, 5) // Show max 5 suggestions
      setFabricSuggestions(filtered)
      setShowSuggestions(true)
    } else {
      setShowSuggestions(false)
      setFabricSuggestions([])
    }

    // Fetch fabric when product ID changes
    fetchFabricByProductId(value)
    setFormData(newFormData)
  }

  const handleSuggestionSelect = (fabric: Fabric) => {
    setFormData({
      ...formData,
      productId: fabric.productId || '',
      fabricType: fabric.fabricType,
      fabricColor: fabric.color
    })
    setSelectedFabric(fabric)
    setShowSuggestions(false)
    setFabricSuggestions([])
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    const newFormData = { ...formData, [name]: value }

    // Calculate total square meters when piece dimensions or count changes
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedFabric) {
      alert('❌ Please select a valid fabric first!')
      return
    }
    
    const totalUsed = parseFloat(formData.totalSquareMetersUsed)
    if (totalUsed > selectedFabric.quantity) {
      alert('❌ Error: Not enough fabric available!')
      return
    }
    
    try {
      // Generate unique cutting ID
      const cuttingId = generateCuttingId(formData.productName, selectedFabric.color)
      
      // Create cutting record
      const cuttingRecord = {
        id: cuttingId,
        productId: formData.productId,
        fabricType: selectedFabric.fabricType,
        fabricColor: selectedFabric.color,
        productName: formData.productName,
        piecesCount: parseInt(formData.piecesCount),
        pieceLength: parseFloat(formData.pieceLength),
        pieceWidth: parseFloat(formData.pieceWidth),
        totalSquareMetersUsed: totalUsed,
        sizeType: formData.sizeType,
        cuttingMaster: formData.cuttingMaster,
        cuttingGivenTo: formData.cuttingGivenTo,
        tailorItemPerPiece: parseFloat(formData.tailorItemPerPiece) || 0,
        date: formData.cuttingDate,
        time: new Date().toLocaleTimeString(),
        notes: formData.notes
      }
      
      // Save the cutting record to database
      // The backend will automatically update the fabric quantity
      const cuttingResponse = await fetch(`${API_URL}/api/cutting-records`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cuttingRecord)
      })
      
      if (cuttingResponse.ok) {
        const result = await cuttingResponse.json()
        alert(`✅ Cutting record ${cuttingId} added successfully!\nFabric remaining: ${result.fabricRemainingQuantity} units`)
        
        // Reset form
        setFormData({
          productId: '',
          fabricType: '',
          fabricColor: '',
          productName: '',
          pieceLength: '',
          pieceWidth: '',
          piecesCount: '',
          totalSquareMetersUsed: '0',
          sizeType: '',
          cuttingMaster: '',
          cuttingGivenTo: '',
          tailorItemPerPiece: '',
          cuttingDate: new Date().toISOString().split('T')[0],
          notes: ''
        })
        setSelectedFabric(null)
        
        // Refresh fabric list and recent records
        fetchFabrics()
        fetchRecentCuttingRecords()
      } else {
        const error = await cuttingResponse.text()
        alert('❌ Error creating cutting record: ' + error)
      }
    } catch (error) {
      alert('❌ Error updating fabric inventory. Please try again.')
    }
  }


  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Fabric Cutting</h1>
        <p>Record fabric cutting operations</p>
      </div>

      <div className="content-card">
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group" style={{ position: 'relative' }}>
              <label htmlFor="productId">Fabric ID *</label>
              <input
                type="text"
                id="productId"
                name="productId"
                value={formData.productId}
                onChange={handleFabricIdChange}
                placeholder="Enter Fabric ID (e.g., COTBL025)"
                required
                autoComplete="off"
              />
              {showSuggestions && fabricSuggestions.length > 0 && (
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
                  {fabricSuggestions.map((fabric) => (
                    <div
                      key={fabric._id}
                      onClick={() => handleSuggestionSelect(fabric)}
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
                      <div style={{ fontWeight: '500' }}>{fabric.productId}</div>
                      <div style={{ color: '#6b7280', fontSize: '12px' }}>
                        {fabric.fabricType} - {fabric.color} ({fabric.quantity} sq.m)
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {isLoading && <small style={{ color: '#6b7280' }}>Looking up fabric...</small>}
              {selectedFabric && (
                <small style={{ color: '#10b981', fontWeight: '500' }}>
                  ✓ Found: {selectedFabric.fabricType} - {selectedFabric.color} ({selectedFabric.quantity} sq.m available)
                </small>
              )}
              {!isLoading && !selectedFabric && formData.productId.length >= 6 && !showSuggestions && (
                <small style={{ color: '#ef4444', fontWeight: '500' }}>
                  ❌ Fabric not found with this ID
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
                onChange={handleChange}
                placeholder="Auto-populated from Fabric ID"
                readOnly
                style={{ backgroundColor: '#f9fafb', color: '#6b7280' }}
              />
            </div>

            <div className="form-group">
              <label htmlFor="fabricColor">Fabric Color</label>
              <input
                type="text"
                id="fabricColor"
                name="fabricColor"
                value={formData.fabricColor}
                onChange={handleChange}
                placeholder="Auto-populated from Fabric ID"
                readOnly
                style={{ backgroundColor: '#f9fafb', color: '#6b7280' }}
              />
            </div>

            <div className="form-group">
              <label htmlFor="productName">Product Name *</label>
              <input
                type="text"
                id="productName"
                name="productName"
                value={formData.productName}
                onChange={handleChange}
                placeholder="e.g., T-Shirt, Dress, Pants"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="pieceLength">Piece Length (meters) *</label>
              <input
                type="number"
                id="pieceLength"
                name="pieceLength"
                value={formData.pieceLength}
                onChange={handleChange}
                placeholder="Length of each piece"
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
                value={formData.pieceWidth}
                onChange={handleChange}
                placeholder="Width of each piece"
                min="0.1"
                step="0.1"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="piecesCount">Number of Pieces *</label>
              <input
                type="number"
                id="piecesCount"
                name="piecesCount"
                value={formData.piecesCount}
                onChange={handleChange}
                placeholder="How many pieces to cut"
                min="1"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="totalSquareMetersUsed">Total Square Meters Used</label>
              <input
                type="text"
                id="totalSquareMetersUsed"
                name="totalSquareMetersUsed"
                value={formData.totalSquareMetersUsed + ' sq.m'}
                placeholder="Calculated automatically"
                readOnly
              />
            </div>

            <div className="form-group">
              <label htmlFor="sizeType">Size Type *</label>
              <select
                id="sizeType"
                name="sizeType"
                value={formData.sizeType}
                onChange={handleChange}
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
              <label htmlFor="cuttingMaster">Cutting Master *</label>
              <input
                type="text"
                id="cuttingMaster"
                name="cuttingMaster"
                value={formData.cuttingMaster}
                onChange={handleChange}
                placeholder="Cutting master name"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="cuttingGivenTo">Cutting Given To (Tailor) *</label>
              <input
                type="text"
                id="cuttingGivenTo"
                name="cuttingGivenTo"
                value={formData.cuttingGivenTo}
                onChange={handleChange}
                placeholder="Tailor name for manufacturing"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="tailorItemPerPiece">Tailor Item Per Piece (₹)</label>
              <input
                type="number"
                id="tailorItemPerPiece"
                name="tailorItemPerPiece"
                value={formData.tailorItemPerPiece}
                onChange={handleChange}
                placeholder="Price per piece for tailor"
                min="0"
                step="0.01"
              />
            </div>

            <div className="form-group">
              <label htmlFor="cuttingDate">Cutting Date *</label>
              <input
                type="date"
                id="cuttingDate"
                name="cuttingDate"
                value={formData.cuttingDate}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="notes">Notes</label>
            <textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              placeholder="Any additional notes about the cutting operation"
              rows={3}
              style={{ resize: 'vertical' }}
            />
          </div>

          {selectedFabric && parseFloat(formData.totalSquareMetersUsed) > 0 && (
            <div className="content-card" style={{ background: '#f0f9ff', border: '1px solid #0284c7', marginBottom: '20px' }}>
              <h3 style={{ marginTop: 0, color: '#0284c7' }}>Fabric Availability Check</h3>
              <p>Selected Fabric: <strong>{selectedFabric.fabricType} - {selectedFabric.color}</strong></p>
              <p>Available: <strong>{selectedFabric.quantity} sq.m</strong></p>
              <p>Required: <strong>{formData.totalSquareMetersUsed} sq.m</strong></p>
              <p>Remaining After Cut: <strong>{(selectedFabric.quantity - parseFloat(formData.totalSquareMetersUsed)).toFixed(2)} sq.m</strong></p>
              {parseFloat(formData.totalSquareMetersUsed) > selectedFabric.quantity && (
                <p style={{ color: '#dc2626', fontWeight: 'bold' }}>
                  ⚠️ Not enough fabric available!
                </p>
              )}
              {formData.pieceLength && formData.pieceWidth && formData.piecesCount && (
                <div style={{ marginTop: '10px', padding: '10px', background: '#ffffff', borderRadius: '5px' }}>
                  <strong>Cutting Details:</strong>
                  <p>Each piece: {formData.pieceLength}m × {formData.pieceWidth}m = {(parseFloat(formData.pieceLength) * parseFloat(formData.pieceWidth)).toFixed(2)} sq.m</p>
                  <p>Total pieces: {formData.piecesCount}</p>
                  <p>Product: {formData.productName}</p>
                </div>
              )}
            </div>
          )}

          <div className="btn-group">
            <button type="submit" className="btn btn-primary">
              Submit Cutting Record
            </button>
            <button 
              type="button" 
              className="btn btn-secondary"
              onClick={() => {
                setFormData({
                  productId: '',
                  fabricType: '',
                  fabricColor: '',
                  productName: '',
                  pieceLength: '',
                  pieceWidth: '',
                  piecesCount: '',
                  totalSquareMetersUsed: '0',
                  sizeType: '',
                  cuttingMaster: '',
                  cuttingGivenTo: '',
                  tailorItemPerPiece: '',
                  cuttingDate: new Date().toISOString().split('T')[0],
                  notes: ''
                })
                setSelectedFabric(null)
              }}
            >
              Clear Form
            </button>
          </div>
        </form>
      </div>

      {/* Recent Cutting Records */}
      <div className="content-card">
        <h2 style={{ marginBottom: '20px', color: '#374151' }}>Recent Cutting Records</h2>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ textAlign: 'center' }}>Cutting ID</th>
                <th style={{ textAlign: 'center' }}>Fabric Type</th>
                <th style={{ textAlign: 'center' }}>Fabric Color</th>
                <th style={{ textAlign: 'center' }}>Product</th>
                <th style={{ textAlign: 'center' }}>Size</th>
                <th style={{ textAlign: 'center' }}>Pieces</th>
                <th style={{ textAlign: 'center' }}>Total Used</th>
                <th style={{ textAlign: 'center' }}>Cutting Master</th>
                <th style={{ textAlign: 'center' }}>Given To Tailor</th>
                <th style={{ textAlign: 'center' }}>Tailor Price/Piece</th>
                <th style={{ textAlign: 'center' }}>Date</th>
              </tr>
            </thead>
            <tbody>
              {isLoadingRecords ? (
                <tr>
                  <td colSpan={11} style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                    Loading recent records...
                  </td>
                </tr>
              ) : recentCuttingRecords.length > 0 ? (
                recentCuttingRecords.map((record) => (
                  <tr key={record._id}>
                    <td style={{ fontWeight: '500', textAlign: 'center' }}>{record.id}</td>
                    <td style={{ textAlign: 'center' }}>{record.fabricType}</td>
                    <td style={{ textAlign: 'center' }}>{record.fabricColor}</td>
                    <td style={{ textAlign: 'center' }}>{record.productName}</td>
                    <td style={{ textAlign: 'center' }}>{record.sizeType || 'N/A'}</td>
                    <td style={{ textAlign: 'center' }}>{record.piecesCount}</td>
                    <td style={{ textAlign: 'center' }}>{record.totalSquareMetersUsed} sq.m</td>
                    <td style={{ textAlign: 'center' }}>{record.cuttingMaster || record.cuttingEmployee}</td>
                    <td style={{ textAlign: 'center' }}>{record.cuttingGivenTo || 'N/A'}</td>
                    <td style={{ textAlign: 'center' }}>₹{record.tailorItemPerPiece || 0}</td>
                    <td style={{ textAlign: 'center' }}>{formatDate(record.date)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={11} style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                    No cutting records found
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