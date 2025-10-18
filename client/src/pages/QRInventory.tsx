import { useState, useEffect } from 'react'
import QRCode from 'qrcode'
import '../styles/common.css'
import { API_URL } from '@/config/api'

interface QRProduct {
  _id: string
  manufacturingId: string
  productName: string
  fabricType?: string
  color: string
  size: string
  quantity: number
  generatedDate: string
  tailorName?: string
  cuttingId?: string
  isManual?: boolean
  createdAt?: string
  completionDate?: string
}

interface ManufacturingRecord {
  _id: string
  manufacturingId: string
  productName: string
  fabricType?: string
  fabricColor: string
  size: string
  quantity: number
  tailorName: string
  cuttingId: string
  status: string
  createdAt?: string
  completionDate?: string
}

export default function QRInventory() {
  const [qrProducts, setQrProducts] = useState<QRProduct[]>([])
  const [qrCodes, setQrCodes] = useState<Map<string, string>>(new Map())
  const [isLoading, setIsLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [showManualForm, setShowManualForm] = useState(false)
  const [manualFormData, setManualFormData] = useState({
    productName: '',
    fabricType: '',
    color: '',
    size: 'M',
    quantity: '',
    tailorName: ''
  })

  // Fetch manufacturing records and convert to QR products
  const fetchQRProducts = async () => {
    setIsLoading(true)
    try {
      // Fetch from manufacturing orders
      const response = await fetch(`${API_URL}/api/manufacturing-orders`)
      if (response.ok) {
        const records = await response.json()

        // Filter only completed manufacturing orders
        // This excludes: Pending, QR Deleted, deleted
        // So when a QR is deleted, it disappears from this list automatically
        const qrEligibleRecords = records.filter((record: ManufacturingRecord) =>
          record.status === 'Completed'
        )

        // Group by manufacturingId and aggregate quantities
        const groupedByManufacturingId = new Map<string, QRProduct>()

        qrEligibleRecords.forEach((record: ManufacturingRecord) => {
          const mfgId = record.manufacturingId

          if (groupedByManufacturingId.has(mfgId)) {
            // Manufacturing ID already exists, add to quantity
            const existing = groupedByManufacturingId.get(mfgId)!
            existing.quantity += record.quantity || 0
            // Update completionDate to the latest one
            if (record.completionDate && (!existing.completionDate || new Date(record.completionDate) > new Date(existing.completionDate))) {
              existing.completionDate = record.completionDate
              // Update generatedDate to match the latest completionDate
              existing.generatedDate = record.completionDate
            }
          } else {
            // Create new entry
            groupedByManufacturingId.set(mfgId, {
              _id: record._id,
              manufacturingId: record.manufacturingId,
              productName: record.productName,
              fabricType: record.fabricType || 'N/A',
              color: record.fabricColor,
              size: record.size || 'N/A',
              quantity: record.quantity || 0,
              generatedDate: record.completionDate || record.createdAt || new Date().toISOString(),
              tailorName: record.tailorName,
              cuttingId: record.cuttingId,
              createdAt: record.createdAt,
              completionDate: record.completionDate,
              isManual: false
            })
          }
        })

        // Convert map to array
        const qrProductsList: QRProduct[] = Array.from(groupedByManufacturingId.values())

        // Fetch manual QR products if any
        const manualResponse = await fetch(`${API_URL}/api/qr-products`)
        if (manualResponse.ok) {
          const manualProducts = await manualResponse.json()
          // Filter products that don't exist in manufacturing records
          const existingManufacturingIds = new Set(qrProductsList.map(p => p.manufacturingId))
          const manualOnly = manualProducts.filter((mp: any) =>
            mp.manufacturingId && !existingManufacturingIds.has(mp.manufacturingId)
          )

          manualOnly.forEach((mp: any) => {
            qrProductsList.push({
              _id: mp._id,
              manufacturingId: mp.manufacturingId,
              productName: mp.productName,
              fabricType: mp.fabricType || 'N/A',
              color: mp.color || 'N/A',
              size: mp.size || 'N/A',
              quantity: mp.quantity,
              generatedDate: mp.generatedDate || new Date().toISOString(),
              tailorName: mp.tailorName || 'Manual Entry',
              cuttingId: mp.cuttingId,
              isManual: true,
              createdAt: mp.createdAt || mp.generatedDate || new Date().toISOString()
            })
          })
        }

        // Sort by completion date - newest completed first
        const sortedProducts = qrProductsList.sort((a, b) => {
          // Parse dates properly
          let dateA = 0
          let dateB = 0

          try {
            // Priority 1: Use completionDate if available (when QR was generated)
            // Priority 2: Use createdAt for manual products
            // Priority 3: Use generatedDate
            if (a.completionDate) {
              dateA = new Date(a.completionDate).getTime()
            } else if (a.isManual && a.createdAt) {
              dateA = new Date(a.createdAt).getTime()
            } else if (a.createdAt) {
              dateA = new Date(a.createdAt).getTime()
            } else if (a.generatedDate) {
              dateA = new Date(a.generatedDate).getTime()
            } else {
              dateA = Date.now()
            }

            if (b.completionDate) {
              dateB = new Date(b.completionDate).getTime()
            } else if (b.isManual && b.createdAt) {
              dateB = new Date(b.createdAt).getTime()
            } else if (b.createdAt) {
              dateB = new Date(b.createdAt).getTime()
            } else if (b.generatedDate) {
              dateB = new Date(b.generatedDate).getTime()
            } else {
              dateB = Date.now()
            }
          } catch (error) {
          }

          return dateB - dateA // Newest first
        })

        setQrProducts(sortedProducts)
      }
    } catch (error) {
      setQrProducts([])
    } finally {
      setIsLoading(false)
    }
  }

  // Generate QR codes for all products
  useEffect(() => {
    const generateQRCodes = async () => {
      for (const product of qrProducts) {
        if (!qrCodes.has(product.manufacturingId)) {
          const qrData = {
            type: 'MANUFACTURED_PRODUCT',
            manufacturingId: product.manufacturingId,
            productName: product.productName,
            fabricType: product.fabricType,
            color: product.color,
            size: product.size,
            quantity: product.quantity,
            tailorName: product.tailorName,
            generatedDate: product.generatedDate
          }

          try {
            // Use high error correction to allow for logo overlay
            const qrCodeDataUrl = await QRCode.toDataURL(JSON.stringify(qrData), {
              errorCorrectionLevel: 'H', // High error correction allows 30% of QR code to be covered
              type: 'image/png',
              margin: 1,
              color: {
                dark: '#000000',
                light: '#FFFFFF'
              },
              width: 400
            })
            setQrCodes(prev => new Map(prev).set(product.manufacturingId, qrCodeDataUrl))
          } catch (error) {
          }
        }
      }
    }

    if (qrProducts.length > 0) {
      generateQRCodes()
    }
  }, [qrProducts])

  useEffect(() => {
    fetchQRProducts()
  }, [])

  const formatDate = (dateString: string) => {
    if (!dateString) return '-'
    try {
      const date = new Date(dateString)
      return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`
    } catch {
      return '-'
    }
  }

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate form data
    if (!manualFormData.productName || !manualFormData.fabricType || !manualFormData.color || !manualFormData.quantity) {
      alert('❌ Please fill in all required fields')
      return
    }

    try {
      // Generate MAN0001 style ID for manual products
      let manualId = 'MAN0001'

      try {
        // Check both manufacturing-orders and qr-products for existing MAN IDs
        const [mfgResponse, qrResponse] = await Promise.all([
          fetch(`${API_URL}/api/manufacturing-orders`),
          fetch(`${API_URL}/api/qr-products`)
        ])

        const manNumbers: number[] = []

        if (mfgResponse.ok) {
          const mfgRecords = await mfgResponse.json()
          mfgRecords
            .filter((r: any) => r.manufacturingId && r.manufacturingId.startsWith('MAN'))
            .forEach((r: any) => {
              const numPart = r.manufacturingId.replace('MAN', '')
              const num = parseInt(numPart)
              if (!isNaN(num)) manNumbers.push(num)
            })
        }

        if (qrResponse.ok) {
          const qrRecords = await qrResponse.json()
          qrRecords
            .filter((r: any) => r.manufacturingId && r.manufacturingId.startsWith('MAN'))
            .forEach((r: any) => {
              const numPart = r.manufacturingId.replace('MAN', '')
              const num = parseInt(numPart)
              if (!isNaN(num)) manNumbers.push(num)
            })
        }

        const maxNum = manNumbers.length > 0 ? Math.max(...manNumbers) : 0
        const nextNum = maxNum + 1
        // Use at least 4 digits, but allow more if needed (supports beyond MAN9999)
        manualId = `MAN${nextNum.toString().padStart(Math.max(4, nextNum.toString().length), '0')}`
      } catch (error) {
        console.error('Error generating manual ID:', error)
      }

      const newQRProduct = {
        productId: manualId,
        manufacturingId: manualId,
        productName: manualFormData.productName.trim(),
        fabricType: manualFormData.fabricType.trim(),
        color: manualFormData.color.trim(),
        size: manualFormData.size || 'M',
        quantity: parseInt(manualFormData.quantity),
        tailorName: manualFormData.tailorName?.trim() || 'Manual Entry',
        generatedDate: new Date().toISOString().split('T')[0],
        cuttingId: 'MANUAL',
        notes: 'Manually added product',
        qrCodeData: '', // Empty, will be generated on the fly
        isGenerated: true
      }


      const createResponse = await fetch(`${API_URL}/api/qr-products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newQRProduct)
      })

      const data = await createResponse.json()

      if (createResponse.ok) {
        alert('✅ Product added successfully!')
        setShowManualForm(false)
        setManualFormData({
          productName: '',
          fabricType: '',
          color: '',
          size: 'M',
          quantity: '',
          tailorName: ''
        })
        // Refresh the products list
        await fetchQRProducts()
      } else {
        alert(`❌ Error adding product: ${data.message || 'Unknown error'}`)
      }
    } catch (error) {
      alert(`❌ Error adding product: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const handleDelete = async (product: QRProduct) => {
    if (!window.confirm(`Delete QR for ${product.productName}?`)) {
      return
    }

    try {
      // MANUAL PRODUCTS: Delete completely from qr-products collection
      if (product.isManual || product.cuttingId === 'MANUAL') {
        const qrProductsResponse = await fetch(`${API_URL}/api/qr-products`)
        if (!qrProductsResponse.ok) {
          alert('❌ Failed to fetch QR products')
          return
        }

        const allQRProducts = await qrProductsResponse.json()
        const manualProduct = allQRProducts.find((qr: any) =>
          qr.manufacturingId === product.manufacturingId
        )

        if (!manualProduct) {
          alert('❌ Manual product not found in database')
          return
        }

        const deleteResponse = await fetch(`${API_URL}/api/qr-products/${manualProduct._id}`, {
          method: 'DELETE'
        })

        if (deleteResponse.ok) {
          alert('✅ Manual product deleted successfully!')
          await fetchQRProducts()
        } else {
          alert('❌ Failed to delete manual product')
        }
        return
      }

      // AUTO-GENERATED PRODUCTS:
      // Update ALL manufacturing orders with same manufacturingId to "QR Deleted" status
      // This will update all records (different tailors) with same manufacturing ID in one action

      const updateResponse = await fetch(`${API_URL}/api/manufacturing-orders/bulk-status/${product.manufacturingId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: 'QR Deleted'
        })
      })

      if (!updateResponse.ok) {
        const errorData = await updateResponse.json().catch(() => ({ message: 'Unknown error' }))
        alert(`❌ Failed to update status: ${errorData.message}`)
        return
      }

      const responseData = await updateResponse.json()
      alert(`✅ QR deleted successfully!\n\nManufacturing ID: ${product.manufacturingId}\nUpdated ${responseData.updatedCount} record(s) to "QR Deleted" status\n\nAll tailors assigned to this item have been updated.`)
      await fetchQRProducts()

    } catch (error) {
      console.error('Delete error:', error)
      alert('❌ Error deleting product. Please try again.')
    }
  }


  const filteredProducts = qrProducts.filter(product =>
    product.manufacturingId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.tailorName?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="page-container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>Garment Inventory</h1>
          <p>Manage garment inventory and QR codes</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="content-card">
        <div className="toolbar">
          <div className="search-box">
            <input
              type="text"
              placeholder="Search by manufacturing ID, product name, or tailor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="filter-group">
            <button
              className="btn btn-primary"
              onClick={() => setShowManualForm(true)}
              style={{ backgroundColor: '#10b981', borderColor: '#10b981', color: 'white' }}
            >
              + Add Product Manually
            </button>
            <button
              className="btn btn-secondary"
              onClick={fetchQRProducts}
              disabled={isLoading}
            >
              {isLoading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>
      </div>

      {/* Products Table */}
      <div className="content-card">
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ textAlign: 'center' }}>Manufacturing ID</th>
                <th style={{ textAlign: 'center' }}>Product Name</th>
                <th style={{ textAlign: 'center' }}>Fabric Type</th>
                <th style={{ textAlign: 'center' }}>Color</th>
                <th style={{ textAlign: 'center' }}>Size</th>
                <th style={{ textAlign: 'center' }}>Generated Date</th>
                <th style={{ textAlign: 'center' }}>QR Code</th>
                <th style={{ textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.length > 0 ? (
                filteredProducts.map((product) => (
                  <tr key={product._id}>
                    <td style={{ fontWeight: '500', textAlign: 'center' }}>
                      <span style={{
                        color: (product.isManual || product.cuttingId === 'MANUAL') ? '#10b981' : '#000000',
                        fontWeight: '600'
                      }}>
                        {product.manufacturingId}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>{product.productName}</td>
                    <td style={{ textAlign: 'center' }}>{product.fabricType || 'N/A'}</td>
                    <td style={{ textAlign: 'center' }}>{product.color}</td>
                    <td style={{ textAlign: 'center' }}>{product.size}</td>
                    <td style={{ textAlign: 'center' }}>{formatDate(product.generatedDate)}</td>
                    <td style={{ textAlign: 'center' }}>
                      {qrCodes.get(product.manufacturingId) ? (
                        <img
                          src={qrCodes.get(product.manufacturingId)}
                          alt="QR Code"
                          style={{
                            width: '60px',
                            height: '60px',
                            cursor: 'pointer',
                            border: '2px solid #e5e7eb',
                            borderRadius: '4px',
                            padding: '2px',
                            background: 'white'
                          }}
                          onClick={() => {
                            const win = window.open('', '_blank')
                            if (win) {
                              win.document.write(`
                                <html>
                                  <head>
                                    <title>QR Label - ${product.productName}</title>
                                    <style>
                                      @page { size: 3in 2.5in; margin: 0; }
                                      body {
                                        margin: 0;
                                        display: flex;
                                        justify-content: center;
                                        align-items: center;
                                        min-height: 100vh;
                                        background: #f5f5f5;
                                      }
                                      .label {
                                        width: 3in;
                                        height: 2.5in;
                                        background: white;
                                        display: flex;
                                        flex-direction: column;
                                        align-items: center;
                                        justify-content: center;
                                        padding: 0.2in;
                                        box-sizing: border-box;
                                        gap: 0.12in;
                                      }
                                      .qr-container {
                                        position: relative;
                                        width: 1.5in;
                                        height: 1.5in;
                                      }
                                      .qr {
                                        width: 100%;
                                        height: 100%;
                                        display: block;
                                      }
                                      .logo {
                                        position: absolute;
                                        top: 50%;
                                        left: 50%;
                                        transform: translate(-50%, -50%);
                                        width: 0.45in;
                                        height: 0.45in;
                                        background: #000;
                                        border: 3px solid #fff;
                                        border-radius: 50%;
                                        display: flex;
                                        align-items: center;
                                        justify-content: center;
                                        font-weight: 900;
                                        font-size: 22px;
                                        font-family: 'Arial Black', Arial, sans-serif;
                                        color: #fff;
                                        box-shadow: 0 0 0 2px #000;
                                        letter-spacing: 1px;
                                      }
                                      .info-section {
                                        width: 100%;
                                        display: flex;
                                        flex-direction: column;
                                        gap: 0.08in;
                                      }
                                      .product-name {
                                        font-size: 16px;
                                        font-weight: 900;
                                        text-align: center;
                                        margin: 0;
                                        text-transform: uppercase;
                                        letter-spacing: 0.5px;
                                        color: #000;
                                      }
                                      .details {
                                        display: flex;
                                        justify-content: center;
                                        align-items: center;
                                        gap: 0.12in;
                                        flex-wrap: wrap;
                                      }
                                      .detail-item {
                                        background: linear-gradient(135deg, #000 0%, #333 100%);
                                        color: white;
                                        padding: 0.06in 0.12in;
                                        border-radius: 0.08in;
                                        font-weight: 700;
                                        font-size: 11px;
                                        text-transform: uppercase;
                                        letter-spacing: 0.5px;
                                        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                                        white-space: nowrap;
                                      }
                                      @media print {
                                        body {
                                          margin: 0;
                                          background: white;
                                        }
                                        .no-print { display: none; }
                                      }
                                    </style>
                                  </head>
                                  <body>
                                    <div class="label">
                                      <div class="qr-container">
                                        <img src="${qrCodes.get(product.manufacturingId)}" class="qr" />
                                        <div class="logo">W</div>
                                      </div>

                                      <div class="info-section">
                                        <div class="product-name">${product.productName}</div>
                                        <div class="details">
                                          <div class="detail-item">${product.fabricType || 'N/A'}</div>
                                          <div class="detail-item">${product.color}</div>
                                          <div class="detail-item">Size ${product.size}</div>
                                        </div>
                                      </div>
                                    </div>
                                    <button onclick="window.print()" class="no-print" style="position: fixed; top: 20px; right: 20px; padding: 12px 24px; background: #000; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold; box-shadow: 0 2px 8px rgba(0,0,0,0.2);">Print Label</button>
                                  </body>
                                </html>
                              `)
                              win.document.close()
                            }
                          }}
                        />
                      ) : (
                        <span style={{ color: '#9ca3af' }}>Generating...</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div className="action-buttons">
                        <button className="action-btn delete" onClick={() => handleDelete(product)}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                    {isLoading ? 'Loading products...' : 'No products found'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Add Form Modal */}
      {showManualForm && (
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
            maxWidth: '500px'
          }}>
            <h2 style={{ marginBottom: '20px', color: '#374151' }}>Add Product Manually</h2>
            <form onSubmit={handleManualSubmit}>
              <div className="form-group">
                <label htmlFor="productName">Product Name *</label>
                <input
                  type="text"
                  id="productName"
                  value={manualFormData.productName}
                  onChange={(e) => setManualFormData({...manualFormData, productName: e.target.value})}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="fabricType">Fabric Type *</label>
                <input
                  type="text"
                  id="fabricType"
                  value={manualFormData.fabricType}
                  onChange={(e) => setManualFormData({...manualFormData, fabricType: e.target.value})}
                  placeholder="Enter fabric type"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="color">Color *</label>
                <input
                  type="text"
                  id="color"
                  value={manualFormData.color}
                  onChange={(e) => setManualFormData({...manualFormData, color: e.target.value})}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="size">Size *</label>
                <select
                  id="size"
                  value={manualFormData.size}
                  onChange={(e) => setManualFormData({...manualFormData, size: e.target.value})}
                  required
                >
                  <option value="XXS">XXS</option>
                  <option value="XS">XS</option>
                  <option value="S">S</option>
                  <option value="M">M</option>
                  <option value="L">L</option>
                  <option value="XL">XL</option>
                  <option value="XXL">XXL</option>
                  <option value="XXXL">XXXL</option>
                  <option value="Free Size">Free Size</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="quantity">Quantity *</label>
                <input
                  type="number"
                  id="quantity"
                  value={manualFormData.quantity}
                  onChange={(e) => setManualFormData({...manualFormData, quantity: e.target.value})}
                  min="1"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="tailorName">Tailor Name</label>
                <input
                  type="text"
                  id="tailorName"
                  value={manualFormData.tailorName}
                  onChange={(e) => setManualFormData({...manualFormData, tailorName: e.target.value})}
                  placeholder="Optional"
                />
              </div>

              <div className="btn-group">
                <button type="submit" className="btn btn-primary">
                  Add Product
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowManualForm(false)
                    setManualFormData({
                      productName: '',
                      fabricType: '',
                      color: '',
                      size: 'M',
                      quantity: '',
                      tailorName: ''
                    })
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