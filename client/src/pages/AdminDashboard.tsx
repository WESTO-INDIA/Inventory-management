import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { API_URL } from '@/config/api'
import '../styles/common.css'

interface DashboardStats {
  overview: {
    totalEmployees: number
    activeEmployees: number
    presentToday: number
    todayAttendance: number
    totalFabrics: number
    activeFabrics: number
    totalFabricQuantity: number
    totalTailors: number
    activeTailors: number
    totalOrders: number
  }
  manufacturing: {
    total: number
    completed: number
    pending: number
    completionRate: number
  }
  cutting: {
    total: number
    today: number
  }
  trends: {
    monthlyAttendance: number
    monthlyManufacturing: number
    weeklyGrowth: number
  }
  recentActivities: {
    fabrics: any[]
    attendance: any[]
  }
}

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [currentTime, setCurrentTime] = useState(new Date())
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      const response = await fetch(`${API_URL}/api/dashboard/stats`)
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error('Error fetching dashboard stats:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
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

  const quickActions = [
    { name: 'Fabric Inventory', icon: '📦', route: '/inventory' },
    { name: 'Cutting Inventory', icon: '✂️', route: '/cutting-inventory' },
    { name: 'Manufacturing', icon: '🏭', route: '/manufacturing' },
    { name: 'Garment Inventory', icon: '📱', route: '/generate-qr' },
    { name: 'Employees', icon: '👥', route: '/employees' },
    { name: 'Transactions', icon: '💰', route: '/transactions' }
  ]

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-black mx-auto"></div>
          <p className="mt-4 text-black">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white p-4 sm:p-6 lg:p-8">
      {/* Animated Header */}
      <div className="mb-8 animate-fadeIn">
        <div className="bg-white rounded-2xl shadow-xl p-6 backdrop-blur-lg bg-opacity-90">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-4xl font-bold text-black">
                Admin Dashboard
              </h1>
              <p className="mt-2 text-black">Welcome to Garment Inventory Management System</p>
            </div>
            <div className="mt-4 sm:mt-0 text-right">
              <div className="bg-white border-2 border-black text-black px-4 py-2 rounded-lg">
                <div className="flex items-center justify-end">
                  <span className="text-xl font-bold">
                    {formatTime(currentTime)}
                  </span>
                </div>
                <p className="text-sm">
                  {formatDate(currentTime)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-2xl shadow-lg p-6 transform hover:scale-105 transition-all duration-300 hover:shadow-2xl">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-white border-2 border-black p-3 rounded-xl">
              <span className="text-2xl">👥</span>
            </div>
            <span className="text-xs bg-white border border-black text-black px-2 py-1 rounded-full font-semibold">
              +{stats?.trends.weeklyGrowth || 0}%
            </span>
          </div>
          <h3 className="text-black text-sm mb-1">Total Employees</h3>
          <p className="text-3xl font-bold text-black">{stats?.overview.totalEmployees || 0}</p>
          <p className="text-sm text-black mt-2">
            <span className="text-black font-semibold">{stats?.overview.presentToday || 0}</span> present today
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6 transform hover:scale-105 transition-all duration-300 hover:shadow-2xl">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-white border-2 border-black p-3 rounded-xl">
              <span className="text-2xl">📦</span>
            </div>
            <span className="text-xs bg-white border border-black text-black px-2 py-1 rounded-full font-semibold">
              Active
            </span>
          </div>
          <h3 className="text-black text-sm mb-1">Total Fabrics</h3>
          <p className="text-3xl font-bold text-black">{stats?.overview.totalFabrics || 0}</p>
          <p className="text-sm text-black mt-2">
            <span className="text-black font-semibold">{stats?.overview.totalFabricQuantity || 0}</span> meters
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6 transform hover:scale-105 transition-all duration-300 hover:shadow-2xl">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-white border-2 border-black p-3 rounded-xl">
              <span className="text-2xl">✂️</span>
            </div>
            <span className="text-xs bg-white border border-black text-black px-2 py-1 rounded-full font-semibold">
              {stats?.manufacturing.completionRate || 0}%
            </span>
          </div>
          <h3 className="text-black text-sm mb-1">Manufacturing</h3>
          <p className="text-3xl font-bold text-black">{stats?.manufacturing.total || 0}</p>
          <p className="text-sm text-black mt-2">
            <span className="text-black font-semibold">{stats?.manufacturing.completed || 0}</span> completed
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6 transform hover:scale-105 transition-all duration-300 hover:shadow-2xl">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-white border-2 border-black p-3 rounded-xl">
              <span className="text-2xl">👔</span>
            </div>
            <span className="text-xs bg-white border border-black text-black px-2 py-1 rounded-full font-semibold">
              Today
            </span>
          </div>
          <h3 className="text-black text-sm mb-1">Tailors</h3>
          <p className="text-3xl font-bold text-black">{stats?.overview.totalTailors || 0}</p>
          <p className="text-sm text-black mt-2">
            <span className="text-black font-semibold">{stats?.overview.activeTailors || 0}</span> active
          </p>
        </div>
      </div>

      {/* Quick Actions with Animation */}
      <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
        <h2 className="text-2xl font-bold text-black mb-6">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {quickActions.map((action, index) => (
            <button
              key={index}
              onClick={() => navigate(action.route)}
              className="relative overflow-hidden rounded-xl p-4 bg-white border-2 border-black text-black transform hover:scale-110 transition-all duration-300 hover:shadow-xl"
            >
              <div className="relative z-10">
                <div className="text-3xl mb-2">{action.icon}</div>
                <p className="text-sm font-medium">{action.name}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Progress Bars Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-black mb-4">Today's Progress</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm text-black">Attendance</span>
                <span className="text-sm font-semibold">{stats?.overview.presentToday || 0}/{stats?.overview.totalEmployees || 0}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-black h-2 rounded-full transition-all duration-500"
                  style={{ width: `${stats?.overview.totalEmployees ? (stats.overview.presentToday / stats.overview.totalEmployees * 100) : 0}%` }}
                ></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm text-black">Manufacturing</span>
                <span className="text-sm font-semibold">{stats?.manufacturing.completionRate || 0}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-black h-2 rounded-full transition-all duration-500"
                  style={{ width: `${stats?.manufacturing.completionRate || 0}%` }}
                ></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm text-black">Cutting Today</span>
                <span className="text-sm font-semibold">{stats?.cutting.today || 0}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-black h-2 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min((stats?.cutting.today || 0) * 10, 100)}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activities */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-black mb-4">Recent Activities</h3>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {stats?.recentActivities.attendance?.slice(0, 5).map((activity, index) => (
              <div key={index} className="flex items-start space-x-3 p-2 hover:bg-gray-50 rounded-lg transition-colors">
                <div className="w-2 h-2 bg-black rounded-full mt-2 animate-pulse"></div>
                <div className="flex-1">
                  <p className="text-sm text-black">{activity.employeeName}</p>
                  <p className="text-xs text-black">Checked in - {activity.status}</p>
                  <p className="text-xs text-black">{new Date(activity.checkIn).toLocaleTimeString()}</p>
                </div>
              </div>
            ))}
            {stats?.recentActivities.fabrics?.slice(0, 3).map((fabric, index) => (
              <div key={`fabric-${index}`} className="flex items-start space-x-3 p-2 hover:bg-gray-50 rounded-lg transition-colors">
                <div className="w-2 h-2 bg-black rounded-full mt-2 animate-pulse"></div>
                <div className="flex-1">
                  <p className="text-sm text-black">Fabric {fabric.fabricId}</p>
                  <p className="text-xs text-black">{fabric.fabricType} - {fabric.quantity} meters</p>
                  <p className="text-xs text-black">{new Date(fabric.createdAt).toLocaleTimeString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  )
}