import { useState, useEffect, useRef } from 'react'
import QrScanner from 'qr-scanner'
import { API_URL } from '@/config/api'
import { useAuthStore } from '@/stores/authStore'
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
  pricePerPiece?: number
  totalPrice?: number
  companyName?: string
  companyLogo?: string
}

export default function QRScanner() {
  const user = useAuthStore(state => state.user)
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
      // Fetch directly from Stock Room endpoint - this returns the EXACT same data as Stock Room displays
      const response = await fetch(`${API_URL}/api/stock-room/item/${manufacturingId}`)

      if (response.ok) {
        const stockItem = await response.json()

        return {
          _id: manufacturingId,
          manufacturingId: stockItem.manufacturingId,
          productName: stockItem.garment,
          fabricType: stockItem.fabricType,
          color: stockItem.color,
          size: stockItem.size,
          currentStock: stockItem.quantity, // This is the exact quantity shown in Stock Room
          tailorName: stockItem.tailorName,
          pricePerPiece: 0,
          totalPrice: 0,
          companyName: 'Westo',
          companyLogo: '🏢'
        }
      }

      return null
    } catch (error) {
      console.error('Error fetching from Stock Room:', error)
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

      // Fetch product from Garment Inventory
      const product = await fetchProductFromQRInventory(manufacturingId)

      if (product) {
        setScannedProduct(product)
        showMessage('success', `Found: ${product.productName}`)
        return product
      } else {
        showMessage('error', 'Product not found in Garment Inventory')
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

      // Only log transaction - don't update manufacturing orders or QR products
      // Stock is calculated from transactions in Stock Room
      const transactionResponse = await fetch(`${API_URL}/api/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          timestamp: new Date().toISOString(),
          itemType: 'MANUFACTURING',
          itemId: scannedProduct.manufacturingId,
          itemName: scannedProduct.productName,
          fabricType: scannedProduct.fabricType,
          color: scannedProduct.color,
          size: scannedProduct.size,
          action: stockAction === 'in' ? 'STOCK_IN' : 'STOCK_OUT',
          quantity: quantity,
          previousStock: scannedProduct.currentStock,
          newStock: newQuantity,
          performedBy: user?.name || 'Unknown User',
          source: 'QR_SCANNER'
        })
      })

      if (!transactionResponse.ok) {
        throw new Error('Failed to create transaction')
      }

      // Fetch updated stock from Stock Room to ensure accuracy
      const updatedProduct = await fetchProductFromQRInventory(scannedProduct.manufacturingId)

      if (updatedProduct) {
        setScannedProduct(updatedProduct)
      } else {
        // Fallback to calculated quantity if fetch fails
        setScannedProduct({
          ...scannedProduct,
          currentStock: newQuantity
        })
      }

      showMessage('success', `Stock ${stockAction === 'in' ? 'added' : 'removed'} successfully!`)

      // Close modal immediately
      setScannedProduct(null)
      setQuantity(1)
      setStockAction('in')

    } catch (error) {
      showMessage('error', 'Failed to update stock')
    } finally {
      setIsLoading(false)
    }
  }

  const startCamera = async () => {
    try {
      setIsLoading(true)

      // Check if we're on HTTPS (required for camera on production)
      const isSecureContext = window.isSecureContext
      if (!isSecureContext && window.location.hostname !== 'localhost') {
        throw new Error('Camera requires HTTPS. Please use a secure connection.')
      }

      // Check camera permissions first
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera API not available. Please ensure you are using a modern browser with HTTPS.')
      }

      // For iOS Safari, we need to handle permissions differently
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)

      // Request camera permission explicitly with fallback options
      try {
        const constraints = {
          video: isIOS
            ? { facingMode: { ideal: 'environment' } }
            : { facingMode: 'environment' },
          audio: false
        }

        const stream = await navigator.mediaDevices.getUserMedia(constraints)
        // Stop the stream immediately as we just needed permission
        stream.getTracks().forEach(track => track.stop())
      } catch (permError: any) {
        if (permError.name === 'NotAllowedError' || permError.name === 'PermissionDeniedError') {
          throw new Error('Camera permission denied. Please allow camera access and reload the page.')
        } else if (permError.name === 'NotFoundError' || permError.name === 'DevicesNotFoundError') {
          throw new Error('No camera found on this device.')
        } else if (permError.name === 'NotReadableError' || permError.name === 'TrackStartError') {
          throw new Error('Camera is already in use by another application.')
        } else if (permError.name === 'OverconstrainedError') {
          // Try again with basic constraints
          try {
            const basicStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
            basicStream.getTracks().forEach(track => track.stop())
          } catch {
            throw new Error('Camera access failed. Please try manual entry.')
          }
        } else {
          throw new Error(`Camera access failed: ${permError.message || 'Please try manual entry.'}`)
        }
      }

      setScanMode(true)

      // Wait for video element to be ready
      await new Promise(resolve => setTimeout(resolve, 100))

      // Clean up any existing scanner
      if (qrScanner) {
        qrScanner.destroy()
        setQrScanner(null)
        await new Promise(resolve => setTimeout(resolve, 100))
      }

      if (!videoRef.current) {
        await new Promise(resolve => setTimeout(resolve, 300))
        if (!videoRef.current) {
          throw new Error('Video element not ready')
        }
      }

      // Create and configure scanner with enhanced options for HTTPS
      const scannerOptions: any = {
        returnDetailedScanResult: true,
        highlightScanRegion: true,
        highlightCodeOutline: true,
        preferredCamera: 'environment',
        maxScansPerSecond: 2
      }

      // Only add calculateScanRegion if not on mobile (can cause issues on some devices)
      if (!isMobile) {
        scannerOptions.calculateScanRegion = (video: HTMLVideoElement) => {
          const smallestDimension = Math.min(video.videoWidth, video.videoHeight)
          const scanRegionSize = Math.round(0.75 * smallestDimension)
          return {
            x: Math.round((video.videoWidth - scanRegionSize) / 2),
            y: Math.round((video.videoHeight - scanRegionSize) / 2),
            width: scanRegionSize,
            height: scanRegionSize
          }
        }
      }

      const scanner = new QrScanner(
        videoRef.current,
        async (result) => {
          // Debounce scanning
          scanner.pause()

          // Process the result
          await processScannedData(result.data)

          // Clean up scanner after successful scan
          setTimeout(() => {
            scanner.stop()
            scanner.destroy()
            setQrScanner(null)
            setScanMode(false)
          }, 100)
        },
        scannerOptions
      )

      // Start the scanner with fallback
      try {
        await scanner.start()
        setQrScanner(scanner)
      } catch (startError: any) {
        console.warn('QR Scanner start failed, trying with fallback options:', startError)

        // Try starting with a different camera if available
        try {
          const cameras = await QrScanner.listCameras(true)
          if (cameras.length > 0) {
            // Try with the first available camera
            await scanner.setCamera(cameras[0].id)
            await scanner.start()
            setQrScanner(scanner)
          } else {
            throw new Error('No cameras available')
          }
        } catch (fallbackError) {
          throw new Error(`Camera initialization failed. Please use manual entry to scan QR codes.`)
        }
      }

    } catch (error: any) {
      console.error('Camera error:', error)

      let errorMessage = 'Camera error: '
      if (error.message) {
        errorMessage = error.message
      } else {
        errorMessage += 'Unknown error occurred'
      }

      showMessage('error', errorMessage)
      setScanMode(false)

      // Clean up on error
      if (qrScanner) {
        qrScanner.destroy()
        setQrScanner(null)
      }
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
                  {isLoading && (
                    <div style={{
                      position: 'absolute',
                      top: '10px',
                      left: '10px',
                      background: 'rgba(0,0,0,0.7)',
                      color: 'white',
                      padding: '8px 12px',
                      borderRadius: '4px',
                      fontSize: '12px'
                    }}>
                      Initializing camera...
                    </div>
                  )}
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
                  <p style={{ marginTop: '8px', fontSize: '12px', color: '#6b7280' }}>
                    Position QR code within the green box
                  </p>
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
            padding: '16px',
            width: '90%',
            maxWidth: '500px',
            maxHeight: '95vh',
            overflowY: 'auto',
            zIndex: 1000
          }}>
            {/* Company Verification Header */}
            <div style={{
              padding: '8px 0',
              marginBottom: '12px',
              textAlign: 'center'
            }}>
              <div style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                background: '#000',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 8px',
                fontSize: '28px',
                fontWeight: 'bold',
                color: 'white'
              }}>
                W
              </div>
              <div style={{ fontWeight: 'bold', fontSize: '16px', color: '#000', marginBottom: '2px' }}>
                {scannedProduct.companyName || 'Westo-India'}
              </div>
              <div style={{ fontSize: '10px', color: '#059669', fontWeight: '600' }}>
                ✓ Verified Product
              </div>
            </div>

            <h2 style={{ marginBottom: '12px', fontSize: '16px', fontWeight: '600', color: '#000', textAlign: 'center' }}>Stock Management</h2>

            {/* Product Info */}
            <div style={{
              background: '#f9fafb',
              padding: '12px',
              borderRadius: '6px',
              marginBottom: '12px',
              border: '2px solid #000'
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                <div>
                  <label style={{ fontSize: '11px', color: '#6b7280', display: 'block', marginBottom: '2px' }}>
                    Manufacturing ID
                  </label>
                  <div style={{ fontWeight: '600', fontSize: '13px', color: '#000' }}>
                    {scannedProduct.manufacturingId}
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: '#6b7280', display: 'block', marginBottom: '2px' }}>
                    Current Stock
                  </label>
                  <div style={{ fontWeight: '700', fontSize: '20px', color: '#10b981' }}>
                    {scannedProduct.currentStock}
                  </div>
                </div>
              </div>
              <div style={{ borderTop: '2px solid #000', paddingTop: '10px', marginBottom: '10px' }}>
                <div style={{ fontWeight: '600', fontSize: '15px', marginBottom: '6px', color: '#000' }}>
                  {scannedProduct.productName}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', fontSize: '12px', color: '#000', fontWeight: '500' }}>
                  <span>Size: {scannedProduct.size}</span>
                  <span>Color: {scannedProduct.color}</span>
                  <span>Type: {scannedProduct.fabricType}</span>
                </div>
              </div>
              {/* Price Information */}
              {(scannedProduct.pricePerPiece || scannedProduct.totalPrice) && (
                <div style={{ borderTop: '2px solid #000', paddingTop: '10px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '10px' }}>
                    {scannedProduct.pricePerPiece ? (
                      <div>
                        <label style={{ fontSize: '11px', color: '#6b7280', display: 'block', marginBottom: '2px' }}>
                          Price per Piece
                        </label>
                        <div style={{ fontWeight: '600', fontSize: '14px', color: '#059669' }}>
                          ₹{scannedProduct.pricePerPiece.toFixed(2)}
                        </div>
                      </div>
                    ) : null}
                    {scannedProduct.totalPrice ? (
                      <div>
                        <label style={{ fontSize: '11px', color: '#6b7280', display: 'block', marginBottom: '2px' }}>
                          Total Price
                        </label>
                        <div style={{ fontWeight: '600', fontSize: '14px', color: '#059669' }}>
                          ₹{scannedProduct.totalPrice.toFixed(2)}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              )}
            </div>

            {/* Stock Action */}
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', fontSize: '13px', color: '#000' }}>
                Stock Action
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                <button
                  onClick={() => setStockAction('in')}
                  style={{
                    padding: '10px',
                    border: '2px solid #000',
                    background: stockAction === 'in' ? '#10b981' : 'white',
                    color: stockAction === 'in' ? 'white' : '#000',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: '600',
                    fontSize: '13px'
                  }}
                >
                  📥 Stock In
                </button>
                <button
                  onClick={() => setStockAction('out')}
                  style={{
                    padding: '10px',
                    border: '2px solid #000',
                    background: stockAction === 'out' ? '#ef4444' : 'white',
                    color: stockAction === 'out' ? 'white' : '#000',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: '600',
                    fontSize: '13px'
                  }}
                >
                  📤 Stock Out
                </button>
              </div>
            </div>

            {/* Quantity Input */}
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', fontSize: '13px', color: '#000' }}>
                Quantity
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'center' }}>
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '6px',
                    border: '2px solid #000',
                    background: 'white',
                    color: '#000',
                    fontSize: '16px',
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
                    width: '70px',
                    padding: '6px',
                    fontSize: '18px',
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
                    width: '32px',
                    height: '32px',
                    borderRadius: '6px',
                    border: '2px solid #000',
                    background: 'white',
                    color: '#000',
                    fontSize: '16px',
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
              padding: '10px',
              borderRadius: '6px',
              marginBottom: '12px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px' }}>
                New Stock After {stockAction === 'in' ? 'Addition' : 'Removal'}
              </div>
              <div style={{ fontSize: '28px', fontWeight: 'bold', color: stockAction === 'in' ? '#10b981' : '#ef4444' }}>
                {stockAction === 'in'
                  ? scannedProduct.currentStock + quantity
                  : Math.max(0, scannedProduct.currentStock - quantity)}
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '6px', flexDirection: isMobile ? 'column' : 'row' }}>
              <button
                onClick={() => {
                  setScannedProduct(null)
                  setQuantity(1)
                  setStockAction('in')
                }}
                style={{
                  flex: isMobile ? 'auto' : 1,
                  padding: '10px',
                  border: '2px solid #000',
                  background: 'white',
                  color: '#000',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '13px'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleStockUpdate}
                style={{
                  flex: isMobile ? 'auto' : 2,
                  padding: '10px',
                  background: stockAction === 'in' ? '#10b981' : '#ef4444',
                  color: 'white',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  border: '2px solid #000',
                  fontSize: '13px'
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