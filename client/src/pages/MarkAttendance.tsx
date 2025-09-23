import { useState, useRef, useEffect } from 'react'
import { useAuthStore } from '@/stores/authStore'
import '../styles/common.css'

import { API_URL } from '@/config/api'
export default function MarkAttendance() {
  const { user } = useAuthStore()
  const [isLoading, setIsLoading] = useState(false)
  const [attendanceStatus, setAttendanceStatus] = useState<any>(null)
  const [photoData, setPhotoData] = useState<string | null>(null)
  const [showCamera, setShowCamera] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)

  useEffect(() => {
    checkTodayAttendance()
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
      }
    }
  }, [])

  const checkTodayAttendance = async () => {
    try {
      const employeeIdentifier = user?.employeeId || user?.username || user?.id
      const response = await fetch(`${API_URL}/api/attendance/today/${employeeIdentifier}`)
      if (response.ok) {
        const data = await response.json()
        setAttendanceStatus(data)
      }
    } catch (error) {
    }
  }

  const startCamera = async () => {
    try {
      // Check if getUserMedia is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera API not available. Please use HTTPS or localhost.')
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: true,
        audio: false 
      })
      
      setStream(mediaStream)
      setShowCamera(true)
      
      // Set up video element after state updates
      setTimeout(() => {
        if (videoRef.current && mediaStream) {
          videoRef.current.srcObject = mediaStream
          videoRef.current.play().catch(err => {
          })
        }
      }, 100)
    } catch (error: any) {
      
      let errorMessage = 'Could not access camera. '
      
      if (error.name === 'NotAllowedError') {
        errorMessage += 'Please allow camera permissions in your browser.'
      } else if (error.name === 'NotFoundError') {
        errorMessage += 'No camera found on this device.'
      } else if (error.name === 'NotReadableError') {
        errorMessage += 'Camera is already in use by another application.'
      } else {
        errorMessage += error.message || 'Please check permissions.'
      }
      
      alert(errorMessage)
    }
  }

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
      setStream(null)
    }
    setShowCamera(false)
  }

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d')
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth
        canvasRef.current.height = videoRef.current.videoHeight
        context.drawImage(videoRef.current, 0, 0)
        const photo = canvasRef.current.toDataURL('image/jpeg', 0.8)
        setPhotoData(photo)
        stopCamera()
      }
    }
  }

  const markCheckIn = async () => {
    if (!photoData) {
      alert('Please capture your photo first')
      return
    }

    setIsLoading(true)
    try {
      const employeeIdentifier = user?.employeeId || user?.username || user?.id
      const response = await fetch(`${API_URL}/api/attendance/checkin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: employeeIdentifier,
          photo: photoData,
          location: {
            latitude: null,
            longitude: null,
            address: 'Office'
          }
        })
      })

      if (response.ok) {
        alert('Check-in successful!')
        checkTodayAttendance()
        setPhotoData(null)
      } else {
        const error = await response.json()
        alert(error.message || 'Failed to mark attendance')
      }
    } catch (error) {
      alert('Error marking attendance')
    } finally {
      setIsLoading(false)
    }
  }

  const markCheckOut = async () => {
    setIsLoading(true)
    try {
      const employeeIdentifier = user?.employeeId || user?.username || user?.id
      const response = await fetch(`${API_URL}/api/attendance/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: employeeIdentifier
        })
      })

      if (response.ok) {
        alert('Check-out successful!')
        checkTodayAttendance()
      } else {
        const error = await response.json()
        alert(error.message || 'Failed to mark checkout')
      }
    } catch (error) {
      alert('Error marking checkout')
    } finally {
      setIsLoading(false)
    }
  }

  const formatTime = (date: string) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Mark Attendance</h1>
        <p>Record your daily attendance with photo verification</p>
      </div>

      {/* Current Status */}
      {attendanceStatus && (
        <div className="content-card" style={{ 
          background: 'white',
          border: `2px solid ${attendanceStatus.checkOut ? '#10b981' : '#f59e0b'}`,
          color: 'black'
        }}>
          <h2 style={{ marginBottom: '20px', color: 'black' }}>Today's Attendance</h2>
          <div className="form-grid">
            <div className="form-group">
              <label style={{ color: 'black' }}>Status</label>
              <div style={{ fontSize: '18px', fontWeight: '600', color: 'black' }}>
                {attendanceStatus.checkOut ? '✅ Completed' : '⏰ Checked In'}
              </div>
            </div>
            <div className="form-group">
              <label style={{ color: 'black' }}>Check-in Time</label>
              <div style={{ color: 'black' }}>{formatTime(attendanceStatus.checkIn)}</div>
            </div>
            {attendanceStatus.checkOut && (
              <div className="form-group">
                <label style={{ color: 'black' }}>Check-out Time</label>
                <div style={{ color: 'black' }}>{formatTime(attendanceStatus.checkOut)}</div>
              </div>
            )}
            {attendanceStatus.workHours > 0 && (
              <div className="form-group">
                <label style={{ color: 'black' }}>Work Hours</label>
                <div style={{ color: 'black' }}>{attendanceStatus.workHours.toFixed(2)} hours</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Photo Capture Section */}
      {!attendanceStatus && (
        <div className="content-card" style={{ background: 'white', color: 'black' }}>
          <h2 style={{ marginBottom: '24px', color: 'black' }}>Capture Photo for Check-in</h2>
          
          {showCamera ? (
            <div style={{ textAlign: 'center' }}>
              <video
                ref={videoRef}
                style={{
                  width: '100%',
                  maxWidth: '400px',
                  height: '300px',
                  borderRadius: '8px',
                  background: '#000',
                  marginBottom: '16px',
                  transform: 'scaleX(-1)'
                }}
                autoPlay
                playsInline
                muted
              />
              <canvas ref={canvasRef} style={{ display: 'none' }} />
              <div className="btn-group" style={{ justifyContent: 'center' }}>
                <button onClick={capturePhoto} className="btn btn-success">
                  📸 Capture Photo
                </button>
                <button onClick={stopCamera} className="btn btn-secondary">
                  Cancel
                </button>
              </div>
            </div>
          ) : photoData ? (
            <div style={{ textAlign: 'center' }}>
              <img 
                src={photoData} 
                alt="Captured" 
                style={{
                  width: '100%',
                  maxWidth: '400px',
                  height: '300px',
                  objectFit: 'cover',
                  borderRadius: '8px',
                  marginBottom: '16px',
                  transform: 'scaleX(-1)'
                }}
              />
              <div className="btn-group" style={{ justifyContent: 'center' }}>
                <button onClick={markCheckIn} className="btn btn-success" disabled={isLoading}>
                  {isLoading ? 'Marking...' : '✅ Mark Check-in'}
                </button>
                <button onClick={() => setPhotoData(null)} className="btn btn-secondary">
                  Retake Photo
                </button>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>📷</div>
              <h3 style={{ marginBottom: '8px', color: 'black' }}>Ready to Check-in</h3>
              <p style={{ marginBottom: '24px', color: 'black' }}>
                Take a photo to mark your attendance
              </p>
              <button onClick={startCamera} className="btn btn-primary" style={{ fontSize: '16px', padding: '12px 24px' }}>
                📸 Start Camera
              </button>
            </div>
          )}
        </div>
      )}

      {/* Check-out Button */}
      {attendanceStatus && !attendanceStatus.checkOut && (
        <div className="content-card" style={{ background: 'white', color: 'black' }}>
          <h2 style={{ marginBottom: '20px', color: 'black' }}>Ready to leave?</h2>
          <p style={{ marginBottom: '20px', color: 'black' }}>
            Mark your check-out time to complete today's attendance
          </p>
          <button 
            onClick={markCheckOut} 
            className="btn btn-danger" 
            disabled={isLoading}
            style={{ fontSize: '16px', padding: '12px 24px' }}
          >
            {isLoading ? 'Processing...' : '🚪 Mark Check-out'}
          </button>
        </div>
      )}

      {/* Attendance History */}
      <div className="content-card" style={{ background: 'white', color: 'black' }}>
        <h2 style={{ marginBottom: '20px', color: 'black' }}>Recent Attendance</h2>
        <div className="empty-state">
          <div className="empty-state-icon">📅</div>
          <h3>Attendance History</h3>
          <p>Your attendance records will appear here</p>
        </div>
      </div>
    </div>
  )
}