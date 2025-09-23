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
}

interface ManufacturingRecord {
  _id: string
  manufacturingId: string
  productName: string
  fabricType?: string
  fabricColor: string
  size: string
  itemsReceived: number
  dateOfReceive: string
  tailorName: string
  cuttingId: string
  status: string
  createdAt?: string
}

export default function QRInventory() {
  const [qrProducts, setQrProducts] = useState<QRProduct[]>([])
  const [qrCodes, setQrCodes] = useState<Map<string, string>>(new Map())
  const [isLoading, setIsLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [showManualForm, setShowManualForm] = useState(false)
  const [editingProduct, setEditingProduct] = useState<QRProduct | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
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

        // Filter only completed or records with items received
        const qrEligibleRecords = records.filter((record: ManufacturingRecord) =>
          record.itemsReceived && record.itemsReceived > 0
        )

        // Convert to QR product format
        const qrProductsList: QRProduct[] = qrEligibleRecords.map((record: ManufacturingRecord) => ({
          _id: record._id,
          manufacturingId: record.manufacturingId,
          productName: record.productName,
          fabricType: record.fabricType || 'N/A',
          color: record.fabricColor,
          size: record.size || 'N/A',
          quantity: record.itemsReceived,
          generatedDate: record.dateOfReceive,
          tailorName: record.tailorName,
          cuttingId: record.cuttingId,
          createdAt: record.createdAt,
          isManual: false
        }))

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

        // Sort by creation date - newest first
        const sortedProducts = qrProductsList.sort((a, b) => {
          // Parse dates properly
          let dateA = 0
          let dateB = 0

          try {
            // For manual products created just now
            if (a.isManual && a.createdAt) {
              dateA = new Date(a.createdAt).getTime()
            } else if (a.createdAt) {
              dateA = new Date(a.createdAt).getTime()
            } else if (a.generatedDate) {
              dateA = new Date(a.generatedDate).getTime()
            } else {
              dateA = Date.now()
            }

            if (b.isManual && b.createdAt) {
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
            const qrCodeDataUrl = await QRCode.toDataURL(JSON.stringify(qrData), {
              errorCorrectionLevel: 'M',
              type: 'image/png',
              margin: 1,
              color: {
                dark: '#000000',
                light: '#FFFFFF'
              },
              width: 256
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
      // Generate manufacturing-style ID for manual products
      const productCode = manualFormData.productName.substring(0, 2).toUpperCase() || 'XX'
      const colorCode = manualFormData.color.substring(0, 2).toUpperCase() || 'XX'
      const randomNumber = Math.floor(Math.random() * 900) + 100
      const manualId = `MFG${productCode}${colorCode}${randomNumber}`

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


      const response = await fetch(`${API_URL}/api/qr-products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newQRProduct)
      })

      const data = await response.json()

      if (response.ok) {
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
    if (window.confirm(`Delete QR for ${product.productName}?`)) {
      try {
        // Check if it's a manual product
        if (product.isManual || product.cuttingId === 'MANUAL') {
          // First try to find in qr-products collection
          const checkResponse = await fetch(`${API_URL}/api/qr-products`)
          if (checkResponse.ok) {
            const qrProducts = await checkResponse.json()
            const qrProduct = qrProducts.find((qr: any) =>
              qr.manufacturingId === product.manufacturingId
            )

            if (qrProduct) {
              // Delete from qr-products collection
              const response = await fetch(`${API_URL}/api/qr-products/${qrProduct._id}`, {
                method: 'DELETE'
              })
              if (response.ok) {
                alert('✅ Product deleted successfully!')
                await fetchQRProducts()
              } else {
                alert('❌ Error deleting product')
              }
            } else {
              alert('❌ Product not found in database')
            }
          }
        } else {
          alert('❌ Cannot delete manufacturing-based QR products. These are auto-generated from manufacturing orders.')
        }
      } catch (error) {
        alert('❌ Error deleting product')
      }
    }
  }

  const handleEdit = (product: QRProduct) => {
    setEditingProduct(product)
    setShowEditModal(true)
  }

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingProduct) return

    try {
      const formData = new FormData(e.target as HTMLFormElement)
      const updatedData = {
        productName: formData.get('productName') as string,
        fabricType: formData.get('fabricType') as string,
        color: formData.get('color') as string,
        size: formData.get('size') as string,
        quantity: parseInt(formData.get('quantity') as string)
      }

      if (editingProduct.isManual || editingProduct.cuttingId === 'MANUAL') {
        const response = await fetch(`${API_URL}/api/qr-products/${editingProduct._id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedData)
        })

        if (response.ok) {
          alert('✅ Product updated successfully!')
          setShowEditModal(false)
          setEditingProduct(null)
          fetchQRProducts()
        }
      } else {
        alert('❌ Cannot edit manufacturing-based QR products')
        setShowEditModal(false)
      }
    } catch (error) {
      alert('❌ Error updating product')
    }
  }

  const filteredProducts = qrProducts.filter(product =>
    product.manufacturingId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.tailorName?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>QR Inventory</h1>
        <p>Manage QR codes for manufactured products</p>
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
                <th style={{ textAlign: 'center' }}>Quantity</th>
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
                    <td style={{ textAlign: 'center' }}>{product.quantity}</td>
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
                                      @page { size: 2in 2in; margin: 0; }
                                      body {
                                        margin: 0;
                                        display: flex;
                                        justify-content: center;
                                        align-items: center;
                                        min-height: 100vh;
                                      }
                                      .label {
                                        width: 2in;
                                        height: 2in;
                                        border: 1px solid #000;
                                        display: flex;
                                        flex-direction: column;
                                        align-items: center;
                                        justify-content: center;
                                        padding: 0.1in;
                                      }
                                      .qr { width: 1.2in; height: 1.2in; }
                                      .product-name {
                                        font-size: 14px;
                                        font-weight: bold;
                                        margin-top: 8px;
                                        text-align: center;
                                      }
                                      .size {
                                        background: #000;
                                        color: white;
                                        padding: 4px 12px;
                                        border-radius: 4px;
                                        margin-top: 6px;
                                        font-weight: bold;
                                      }
                                      @media print {
                                        body { margin: 0; }
                                        .no-print { display: none; }
                                      }
                                    </style>
                                  </head>
                                  <body>
                                    <div class="label">
                                      <img src="${qrCodes.get(product.manufacturingId)}" class="qr" />
                                      <div class="product-name">${product.productName}</div>
                                      <div class="size">SIZE: ${product.size}</div>
                                    </div>
                                    <button onclick="window.print()" class="no-print" style="position: fixed; top: 20px; right: 20px; padding: 10px 20px; background: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer;">Print Label</button>
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
                        {(product.isManual || product.cuttingId === 'MANUAL') && (
                          <>
                            <button className="action-btn edit" onClick={() => handleEdit(product)}>✏️</button>
                            <button className="action-btn delete" onClick={() => handleDelete(product)}>🗑️</button>
                          </>
                        )}
                        {!(product.isManual || product.cuttingId === 'MANUAL') && (
                          <span style={{ color: '#9ca3af', fontSize: '12px' }}>Auto-generated</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
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

      {/* Edit Modal */}
      {showEditModal && editingProduct && (
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
            <h2 style={{ marginBottom: '20px', color: '#374151' }}>Edit Product</h2>
            <form onSubmit={handleSaveEdit}>
              <div className="form-group">
                <label htmlFor="productName">Product Name *</label>
                <input
                  type="text"
                  name="productName"
                  defaultValue={editingProduct.productName}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="fabricType">Fabric Type *</label>
                <input
                  type="text"
                  name="fabricType"
                  defaultValue={editingProduct.fabricType || 'N/A'}
                  placeholder="Enter fabric type"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="color">Color *</label>
                <input
                  type="text"
                  name="color"
                  defaultValue={editingProduct.color}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="size">Size *</label>
                <select
                  name="size"
                  defaultValue={editingProduct.size}
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
                  <option value="N/A">N/A</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="quantity">Quantity *</label>
                <input
                  type="number"
                  name="quantity"
                  defaultValue={editingProduct.quantity}
                  min="1"
                  required
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
                    setEditingProduct(null)
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