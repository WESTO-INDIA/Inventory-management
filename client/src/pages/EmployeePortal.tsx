import { useEffect, useState, useRef } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { ClockIcon, CalendarIcon, BriefcaseIcon, CheckCircleIcon, XCircleIcon, CameraIcon } from '@heroicons/react/24/outline'
import { API_ENDPOINTS } from '@/config/api'

export default function EmployeePortal() {
  const user = useAuthStore(state => state.user)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [showAttendanceModal, setShowAttendanceModal] = useState(false)
  const [todayAttendance, setTodayAttendance] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null)
  const [isCameraOpen, setIsCameraOpen] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    
    // Check today's attendance on mount
    checkTodayAttendance()
    
    return () => clearInterval(timer)
  }, [])

  const checkTodayAttendance = async () => {
    try {
      const today = new Date().toISOString().split('T')[0]
      const response = await fetch(API_ENDPOINTS.ATTENDANCE_CHECK(user?.employeeId || user?.username || '', today))
      if (response.ok) {
        const data = await response.json()
        setTodayAttendance(data.attendance)
      }
    } catch (error) {
      // Error checking attendance
    }
  }

  const startCamera = async () => {
    try {
      const constraints = { video: true, audio: false }
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        streamRef.current = stream
        setIsCameraOpen(true)
      }
    } catch (error) {
      // Error accessing camera
      alert('❌ Unable to access camera. Please ensure camera permissions are granted.')
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setIsCameraOpen(false)
  }

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas')
      canvas.width = videoRef.current.videoWidth
      canvas.height = videoRef.current.videoHeight
      const ctx = canvas.getContext('2d')
      
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0)
        const photoData = canvas.toDataURL('image/jpeg')
        setCapturedPhoto(photoData)
        stopCamera()
      }
    }
  }

  const retakePhoto = () => {
    setCapturedPhoto(null)
    startCamera()
  }

  const markAttendance = async (status: 'present' | 'absent' | 'late') => {
    if (!capturedPhoto) {
      alert('❌ Please capture your photo first to mark attendance')
      return
    }
    
    setIsLoading(true)
    try {
      const attendanceData = {
        employeeId: user?.employeeId || user?.username,
        employeeName: user?.name || 'Unknown',
        date: new Date().toISOString().split('T')[0],
        status,
        photo: capturedPhoto, // Include captured photo
        checkIn: status === 'present' || status === 'late' ? new Date().toISOString() : null,
        checkOut: null,
        totalHours: 0,
        overtime: 0,
        notes: status === 'late' ? 'Marked late by employee' : ''
      }

      const response = await fetch(API_ENDPOINTS.ATTENDANCE_MARK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(attendanceData)
      })

      if (response.ok) {
        const data = await response.json()
        setTodayAttendance(data.attendance)
        setShowAttendanceModal(false)
        setCapturedPhoto(null)
        alert(`✅ Attendance marked as ${status}`)
      } else {
        alert('❌ Failed to mark attendance. Please try again.')
      }
    } catch (error) {
      // Error marking attendance
      alert('❌ Error marking attendance. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const checkOut = async () => {
    if (!todayAttendance) return
    
    setIsLoading(true)
    try {
      const response = await fetch(API_ENDPOINTS.ATTENDANCE_CHECKOUT(todayAttendance._id), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checkOut: new Date().toISOString() })
      })

      if (response.ok) {
        const data = await response.json()
        setTodayAttendance(data.attendance)
        alert('✅ Checked out successfully!')
      } else {
        alert('❌ Failed to check out. Please try again.')
      }
    } catch (error) {
      // Error checking out
      alert('❌ Error checking out. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    })
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Welcome Section */}
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="text-center animate-fade-in">

          {/* Welcome Message - Exactly as original */}
          <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-4">
            Welcome back, <span className="text-primary-600" id="welcomeName">{user?.name?.split(' ')[0] || 'Employee'}</span>!
          </h1>

          <p className="text-xl text-gray-600 mb-8">
            Have a productive day at work
          </p>

          {/* Date and Time */}
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-md mx-auto">
            <div className="flex items-center justify-center space-x-2 text-gray-700 mb-2">
              <CalendarIcon className="h-5 w-5" />
              <span className="text-lg font-medium">{formatDate(currentTime)}</span>
            </div>
            <div className="flex items-center justify-center space-x-2 text-primary-600">
              <ClockIcon className="h-6 w-6" />
              <span className="text-2xl font-bold">{formatTime(currentTime)}</span>
            </div>
          </div>

          <div className="mt-8">
            <p className="text-gray-500">Use the navigation menu to access inventory features</p>
          </div>
        </div>
      </div>

      {/* Attendance Modal */}
      {showAttendanceModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-8 max-w-lg w-full mx-4">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Mark Attendance</h2>
            
            <div className="mb-6">
              <p className="text-gray-600 mb-2">Date: {new Date().toLocaleDateString()}</p>
              <p className="text-gray-600">Time: {formatTime(currentTime)}</p>
            </div>

            {/* Camera Section */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-700 mb-4">Step 1: Capture Your Photo</h3>
              
              {!isCameraOpen && !capturedPhoto && (
                <button
                  onClick={startCamera}
                  className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
                >
                  <CameraIcon className="h-5 w-5" />
                  <span>Open Camera</span>
                </button>
              )}

              {isCameraOpen && (
                <div className="space-y-4">
                  <div className="relative">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      className="w-full rounded-lg bg-gray-200"
                      style={{ transform: 'scaleX(-1)', height: '300px', objectFit: 'cover' }}
                    />
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={capturePhoto}
                      className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors"
                    >
                      📸 Capture Photo
                    </button>
                    <button
                      onClick={stopCamera}
                      className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-colors"
                    >
                      ❌ Cancel
                    </button>
                  </div>
                </div>
              )}

              {capturedPhoto && (
                <div className="space-y-4">
                  <div className="relative">
                    <img
                      src={capturedPhoto}
                      alt="Captured"
                      className="w-full rounded-lg"
                      style={{ transform: 'scaleX(-1)' }}
                    />
                    <div className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded text-sm">
                      ✓ Photo Captured
                    </div>
                  </div>
                  <button
                    onClick={retakePhoto}
                    className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    🔄 Retake Photo
                  </button>
                </div>
              )}
            </div>

            {/* Attendance Options */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-700">Step 2: Mark Your Status</h3>
              
              <button
                onClick={() => markAttendance('present')}
                disabled={isLoading || !capturedPhoto}
                className={`w-full py-3 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2 ${
                  capturedPhoto 
                    ? 'bg-green-600 text-white hover:bg-green-700' 
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                <CheckCircleIcon className="h-5 w-5" />
                <span>{isLoading ? 'Marking...' : 'Mark as Present'}</span>
              </button>
              
              <button
                onClick={() => markAttendance('late')}
                disabled={isLoading || !capturedPhoto}
                className={`w-full py-3 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2 ${
                  capturedPhoto 
                    ? 'bg-yellow-600 text-white hover:bg-yellow-700' 
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                <ClockIcon className="h-5 w-5" />
                <span>{isLoading ? 'Marking...' : 'Mark as Late'}</span>
              </button>
              
              <button
                onClick={() => {
                  setShowAttendanceModal(false)
                  setCapturedPhoto(null)
                  stopCamera()
                }}
                disabled={isLoading}
                className="w-full bg-gray-600 text-white py-3 px-4 rounded-lg hover:bg-gray-700 transition-colors flex items-center justify-center space-x-2"
              >
                <XCircleIcon className="h-5 w-5" />
                <span>Cancel</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}