import { useState, useEffect, useRef } from 'react'
import QrScanner from 'qr-scanner'
import { API_URL } from '@/config/api'
import '../styles/common.css'

interface ScannedProduct {
  _id: string
  manufacturingId: string
  productName: string
  fabricType: string
  color: string
  size: string
  currentStock: number
  tailorName: string
}

export default function QRScanner() {
  const [scanMode, setScanMode] = useState(false)
  const [manualCode, setManualCode] = useState('')
  const [scannedProduct, setScannedProduct] = useState<ScannedProduct | null>(null)
  const [stockAction, setStockAction] = useState<'in' | 'out'>('in')
  const [quantity, setQuantity] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [qrScanner, setQrScanner] = useState<QrScanner | null>(null)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 480)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    return () => {
      if (qrScanner) {
        qrScanner.destroy()
      }
    }
  }, [qrScanner])

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 3000)
  }

  const fetchProductFromQRInventory = async (manufacturingId: string) => {
    try {
      // Fetch from manufacturing orders
      const response = await fetch(`${API_URL}/api/manufacturing-orders`)
      if (response.ok) {
        const records = await response.json()
        const record = records.find((r: any) =>
          r.manufacturingId === manufacturingId && r.itemsReceived > 0
        )

        if (record) {
          return {
            _id: record._id,
            manufacturingId: record.manufacturingId,
            productName: record.productName,
            fabricType: record.fabricType || 'N/A',
            color: record.fabricColor || 'N/A',
            size: record.size || 'N/A',
            currentStock: record.itemsReceived || 0,
            tailorName: record.tailorName || 'N/A'
          }
        }
      }

      // Also check QR products for manual entries
      const qrResponse = await fetch(`${API_URL}/api/qr-products`)
      if (qrResponse.ok) {
        const qrProducts = await qrResponse.json()
        const qrProduct = qrProducts.find((p: any) =>
          p.manufacturingId === manufacturingId
        )

        if (qrProduct) {
          return {
            _id: qrProduct._id,
            manufacturingId: qrProduct.manufacturingId,
            productName: qrProduct.productName,
            fabricType: qrProduct.fabricType || 'N/A',
            color: qrProduct.color || 'N/A',
            size: qrProduct.size || 'N/A',
            currentStock: qrProduct.quantity || 0,
            tailorName: qrProduct.tailorName || 'N/A'
          }
        }
      }

      return null
    } catch (error) {
      return null
    }
  }

  const processScannedData = async (scannedText: string) => {
    try {
      setIsLoading(true)
      let qrData

      try {
        qrData = JSON.parse(scannedText)
      } catch {
        // If not JSON, treat as manufacturing ID
        qrData = { manufacturingId: scannedText }
      }

      const manufacturingId = qrData.manufacturingId || qrData.id || scannedText

      // Fetch product from QR Inventory
      const product = await fetchProductFromQRInventory(manufacturingId)

      if (product) {
        setScannedProduct(product)
        showMessage('success', `Found: ${product.productName}`)
        return product
      } else {
        showMessage('error', 'Product not found in QR Inventory')
        return null
      }
    } catch (error) {
      showMessage('error', 'Error processing QR code')
      return null
    } finally {
      setIsLoading(false)
    }
  }

  const handleManualScan = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!manualCode.trim()) return

    await processScannedData(manualCode.trim())
    setManualCode('')
  }

  const handleStockUpdate = async () => {
    if (!scannedProduct) return

    setIsLoading(true)
    try {
      const newQuantity = stockAction === 'in'
        ? scannedProduct.currentStock + quantity
        : Math.max(0, scannedProduct.currentStock - quantity)

      // Update in manufacturing orders
      const response = await fetch(`${API_URL}/api/manufacturing-orders`)
      if (response.ok) {
        const records = await response.json()
        const record = records.find((r: any) =>
          r.manufacturingId === scannedProduct.manufacturingId
        )

        if (record) {
          const updateResponse = await fetch(`${API_URL}/api/manufacturing-orders/${record._id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              itemsReceived: newQuantity
            })
          })

          if (!updateResponse.ok) {
            // Try updating QR products instead
            const qrResponse = await fetch(`${API_URL}/api/qr-products`)
            if (qrResponse.ok) {
              const qrProducts = await qrResponse.json()
              const qrProduct = qrProducts.find((p: any) =>
                p.manufacturingId === scannedProduct.manufacturingId
              )

              if (qrProduct) {
                await fetch(`${API_URL}/api/qr-products/${qrProduct._id}`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ quantity: newQuantity })
                })
              }
            }
          }
        }
      }

      // Log transaction
      const transactionResponse = await fetch(`${API_URL}/api/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          timestamp: new Date().toISOString(),
          itemType: 'MANUFACTURING',
          itemId: scannedProduct.manufacturingId,
          itemName: scannedProduct.productName,
          action: stockAction === 'in' ? 'STOCK_IN' : 'STOCK_OUT',
          quantity: quantity,
          previousStock: scannedProduct.currentStock,
          newStock: newQuantity,
          performedBy: 'QR Scanner',
          source: 'QR_SCANNER'
        })
      })

      if (!transactionResponse.ok) {
      }

      setScannedProduct({
        ...scannedProduct,
        currentStock: newQuantity
      })

      showMessage('success', `Stock ${stockAction === 'in' ? 'added' : 'removed'} successfully!`)

      // Reset after 2 seconds
      setTimeout(() => {
        setScannedProduct(null)
        setQuantity(1)
        setStockAction('in')
      }, 2000)

    } catch (error) {
      showMessage('error', 'Failed to update stock')
    } finally {
      setIsLoading(false)
    }
  }

  const startCamera = async () => {
    try {
      setIsLoading(true)
      setScanMode(true)

      await new Promise(resolve => setTimeout(resolve, 100))

      if (qrScanner) {
        qrScanner.destroy()
        setQrScanner(null)
      }

      if (!videoRef.current) {
        await new Promise(resolve => setTimeout(resolve, 200))
        if (!videoRef.current) {
          throw new Error('Video element not ready')
        }
      }

      const scanner = new QrScanner(
        videoRef.current,
        async (result) => {
          scanner.stop()
          scanner.destroy()
          setQrScanner(null)
          setScanMode(false)

          await processScannedData(result.data)
        },
        {
          returnDetailedScanResult: true,
          highlightScanRegion: true,
          highlightCodeOutline: true,
          preferredCamera: 'environment',
          maxScansPerSecond: 1
        }
      )

      await scanner.start()
      setQrScanner(scanner)

    } catch (error: any) {
      showMessage('error', `Camera error: ${error.message || 'Unknown error'}`)
      setScanMode(false)
    } finally {
      setIsLoading(false)
    }
  }

  const stopCamera = () => {
    if (qrScanner) {
      qrScanner.destroy()
      setQrScanner(null)
    }
    setScanMode(false)
  }

  return (
    <div style={{
      padding: '16px',
      maxWidth: '600px',
      margin: '0 auto',
      minHeight: '100vh'
    }}>
      <div style={{
        textAlign: 'center',
        marginBottom: '24px'
      }}>
        <h1 style={{ fontSize: '24px', marginBottom: '8px' }}>QR Stock Scanner</h1>
        <p style={{ color: '#6b7280', fontSize: '14px' }}>Scan QR codes to manage inventory</p>
      </div>

      {/* Message Display */}
      {message && (
        <div style={{
          padding: '12px',
          marginBottom: '16px',
          borderRadius: '4px',
          backgroundColor: message.type === 'success' ? '#10b981' : '#ef4444',
          color: 'white',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '14px'
        }}>
          <span>{message.text}</span>
          <button
            onClick={() => setMessage(null)}
            style={{
              background: 'none',
              border: 'none',
              color: 'white',
              cursor: 'pointer',
              fontSize: '18px',
              padding: '0',
              marginLeft: '8px'
            }}
          >
            ×
          </button>
        </div>
      )}

      <div style={{
        background: 'white',
        border: '2px solid #000',
        borderRadius: '4px',
        padding: '20px'
      }}>
        {/* Scanner Section */}
        {!scannedProduct ? (
          <>
            <h2 style={{ marginBottom: '20px', fontSize: '18px', fontWeight: '600' }}>Scan Product</h2>

            {scanMode ? (
              <div style={{ marginBottom: '24px' }}>
                <div style={{
                  position: 'relative',
                  width: '100%',
                  margin: '0 auto',
                  marginBottom: '16px',
                  border: '2px solid #000',
                  borderRadius: '4px',
                  overflow: 'hidden'
                }}>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    style={{
                      width: '100%',
                      height: 'auto',
                      minHeight: '250px',
                      maxHeight: '400px',
                      background: '#000',
                      objectFit: 'cover',
                      display: 'block'
                    }}
                  />
                  <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: '60%',
                    maxWidth: '200px',
                    aspectRatio: '1',
                    border: '3px solid #10b981',
                    borderRadius: '8px'
                  }} />
                </div>
                <div style={{ textAlign: 'center' }}>
                  <button
                    onClick={stopCamera}
                    style={{
                      padding: '10px 20px',
                      background: '#ef4444',
                      color: 'white',
                      border: '2px solid #000',
                      borderRadius: '4px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      fontSize: '14px'
                    }}
                  >
                    Stop Camera
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                <button
                  onClick={startCamera}
                  style={{
                    padding: '12px 24px',
                    background: 'white',
                    color: '#000',
                    border: '2px solid #000',
                    borderRadius: '4px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    fontSize: '16px'
                  }}
                  disabled={isLoading}
                >
                  📷 Start Scanner
                </button>
              </div>
            )}

            {/* Manual Entry */}
            <div style={{ borderTop: '2px solid #000', paddingTop: '20px' }}>
              <h3 style={{ marginBottom: '12px', fontSize: '16px', fontWeight: '600' }}>Manual Entry</h3>
              <form onSubmit={handleManualScan}>
                <div style={{ display: 'flex', gap: '8px', flexDirection: isMobile ? 'column' : 'row' }}>
                  <input
                    type="text"
                    placeholder="Enter Manufacturing ID"
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                    style={{
                      flex: 1,
                      padding: '10px',
                      fontSize: '14px',
                      border: '2px solid #000',
                      borderRadius: '4px',
                      background: 'white'
                    }}
                  />
                  <button
                    type="submit"
                    disabled={isLoading}
                    style={{
                      padding: '10px 20px',
                      background: 'white',
                      color: '#000',
                      border: '2px solid #000',
                      borderRadius: '4px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      fontSize: '14px'
                    }}
                  >
                    Search
                  </button>
                </div>
              </form>
            </div>
          </>
        ) : null}
      </div>

      {/* Product Found - Stock Management Modal */}
      {scannedProduct && (
        <>
          {/* Modal Overlay */}
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            zIndex: 999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          onClick={() => {
            setScannedProduct(null)
            setQuantity(1)
            setStockAction('in')
          }}
          />

          {/* Modal Box */}
          <div style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'white',
            border: '3px solid #000',
            borderRadius: '8px',
            padding: '24px',
            width: '90%',
            maxWidth: '500px',
            maxHeight: '90vh',
            overflowY: 'auto',
            zIndex: 1000
          }}>
            <h2 style={{ marginBottom: '20px', fontSize: '20px', fontWeight: '600', color: '#000' }}>Stock Management</h2>

            {/* Product Info */}
            <div style={{
              background: '#f9fafb',
              padding: '16px',
              borderRadius: '6px',
              marginBottom: '20px',
              border: '2px solid #000'
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>
                    Manufacturing ID
                  </label>
                  <div style={{ fontWeight: '600', fontSize: '14px', color: '#000' }}>
                    {scannedProduct.manufacturingId}
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>
                    Current Stock
                  </label>
                  <div style={{ fontWeight: '700', fontSize: '24px', color: '#10b981' }}>
                    {scannedProduct.currentStock}
                  </div>
                </div>
              </div>
              <div style={{ borderTop: '2px solid #000', paddingTop: '12px' }}>
                <div style={{ fontWeight: '600', fontSize: '16px', marginBottom: '8px', color: '#000' }}>
                  {scannedProduct.productName}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', fontSize: '13px', color: '#6b7280' }}>
                  <span>Type: {scannedProduct.fabricType}</span>
                  <span>Color: {scannedProduct.color}</span>
                  <span>Size: {scannedProduct.size}</span>
                </div>
              </div>
            </div>

            {/* Stock Action */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '14px', color: '#000' }}>
                Stock Action
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <button
                  onClick={() => setStockAction('in')}
                  style={{
                    padding: '12px',
                    border: '2px solid #000',
                    background: stockAction === 'in' ? '#10b981' : 'white',
                    color: stockAction === 'in' ? 'white' : '#000',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: '600',
                    fontSize: '14px'
                  }}
                >
                  📥 Stock In
                </button>
                <button
                  onClick={() => setStockAction('out')}
                  style={{
                    padding: '12px',
                    border: '2px solid #000',
                    background: stockAction === 'out' ? '#ef4444' : 'white',
                    color: stockAction === 'out' ? 'white' : '#000',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: '600',
                    fontSize: '14px'
                  }}
                >
                  📤 Stock Out
                </button>
              </div>
            </div>

            {/* Quantity Input */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '14px', color: '#000' }}>
                Quantity
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', justifyContent: 'center' }}>
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '6px',
                    border: '2px solid #000',
                    background: 'white',
                    color: '#000',
                    fontSize: '18px',
                    cursor: 'pointer',
                    fontWeight: '600'
                  }}
                >
                  −
                </button>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  style={{
                    width: '80px',
                    padding: '8px',
                    fontSize: '20px',
                    fontWeight: '600',
                    textAlign: 'center',
                    border: '2px solid #000',
                    borderRadius: '6px',
                    background: 'white',
                    color: '#000'
                  }}
                  min="1"
                />
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '6px',
                    border: '2px solid #000',
                    background: 'white',
                    color: '#000',
                    fontSize: '18px',
                    cursor: 'pointer',
                    fontWeight: '600'
                  }}
                >
                  +
                </button>
              </div>
            </div>

            {/* Stock Preview */}
            <div style={{
              background: stockAction === 'in' ? '#f0fdf4' : '#fef2f2',
              border: '2px solid #000',
              padding: '12px',
              borderRadius: '6px',
              marginBottom: '20px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '8px' }}>
                New Stock After {stockAction === 'in' ? 'Addition' : 'Removal'}
              </div>
              <div style={{ fontSize: '32px', fontWeight: 'bold', color: stockAction === 'in' ? '#10b981' : '#ef4444' }}>
                {stockAction === 'in'
                  ? scannedProduct.currentStock + quantity
                  : Math.max(0, scannedProduct.currentStock - quantity)}
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '8px', flexDirection: isMobile ? 'column' : 'row' }}>
              <button
                onClick={() => {
                  setScannedProduct(null)
                  setQuantity(1)
                  setStockAction('in')
                }}
                style={{
                  flex: isMobile ? 'auto' : 1,
                  padding: '12px',
                  border: '2px solid #000',
                  background: 'white',
                  color: '#000',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '14px'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleStockUpdate}
                style={{
                  flex: isMobile ? 'auto' : 2,
                  padding: '12px',
                  background: stockAction === 'in' ? '#10b981' : '#ef4444',
                  color: 'white',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  border: '2px solid #000',
                  fontSize: '14px'
                }}
                disabled={isLoading}
              >
                {isLoading ? 'Updating...' : `Confirm ${stockAction === 'in' ? 'Stock In' : 'Stock Out'}`}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}