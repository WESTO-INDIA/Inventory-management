import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useAuthStore } from '@/stores/authStore'
import {
  HomeIcon,
  CubeIcon,
  UsersIcon,
  ClipboardDocumentListIcon,
  QrCodeIcon,
  ChartBarIcon,
  DocumentTextIcon,
  Bars3Icon,
  XMarkIcon,
  ArrowRightOnRectangleIcon
} from '@heroicons/react/24/outline'

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false) // Default closed on mobile
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  // Common menu items for both admin and employees (removed fabric-tracking and view-fabrics)
  const commonMenuItems = [
    { path: '/fabric-registration', name: 'Register Fabric', icon: ClipboardDocumentListIcon },
    { path: '/inventory', name: 'Fabric Inventory', icon: CubeIcon },
    { path: '/cutting', name: 'Cutting', icon: ClipboardDocumentListIcon },
    { path: '/cutting-inventory', name: 'Cutting Inventory', icon: ChartBarIcon },
    { path: '/manufacturing', name: 'Manufacturing', icon: ChartBarIcon },
    { path: '/manufacturing-inventory', name: 'Manufacturing Inventory', icon: ChartBarIcon },
    { path: '/generate-qr', name: 'QR Inventory', icon: QrCodeIcon },
    { path: '/qr-scanner', name: 'QR Scanner', icon: QrCodeIcon },
    { path: '/transactions', name: 'Transactions', icon: DocumentTextIcon },
  ]

  // Admin-only menu items
  const adminOnlyItems = [
    { path: '/admin-dashboard', name: 'Admin Dashboard', icon: HomeIcon },
    { path: '/employees', name: 'Employees', icon: UsersIcon },
  ]

  // Employee-only menu items
  const employeeOnlyItems = [
    { path: '/employee-portal', name: 'My Dashboard', icon: HomeIcon },
    { path: '/mark-attendance', name: 'Mark Attendance', icon: ClipboardDocumentListIcon },
  ]

  // Combine menu items based on role
  const adminMenuItems = [
    adminOnlyItems[0], // Admin Dashboard first
    commonMenuItems[0], // Register Fabric second
    ...commonMenuItems.slice(1), // Rest of common items
    ...adminOnlyItems.slice(1), // Rest of admin-only items
  ]

  const employeeMenuItems = [
    employeeOnlyItems[0], // My Dashboard first
    commonMenuItems[0], // Register Fabric second
    ...commonMenuItems.slice(1), // Rest of common items
  ]

  const menuItems = user?.role === 'admin' ? adminMenuItems : employeeMenuItems

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 fixed lg:static inset-y-0 left-0 z-50 w-64 transition-transform duration-300 bg-[#001f3f] shadow-lg lg:shadow-none`}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between p-4 border-b border-[#003366]">
            <h1 className="font-bold text-xl text-white">
              WESTO INDIA
            </h1>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-2 rounded-lg hover:bg-[#003366]"
            >
              <XMarkIcon className="h-5 w-5 text-white" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-4">
            <ul className="space-y-2">
              {menuItems.map((item) => {
                const Icon = item.icon
                const isActive = location.pathname === item.path
                
                return (
                  <li key={item.path}>
                    <Link
                      to={item.path}
                      onClick={() => setSidebarOpen(false)}
                      className={`flex items-center space-x-3 p-3 rounded-lg transition-colors ${
                        isActive
                          ? 'bg-[#003366] text-white'
                          : 'hover:bg-[#003366] text-gray-300'
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                      <span>{item.name}</span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </nav>

          {/* User Section */}
          <div className="border-t border-[#003366] p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-white">{user?.name || 'User'}</p>
                <p className="text-sm text-gray-400">{user?.role || 'Role'}</p>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 rounded-lg hover:bg-[#003366] text-white"
                title="Logout"
              >
                <ArrowRightOnRectangleIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Header */}
        <div className="lg:hidden bg-[#001f3f] shadow-sm p-4 flex items-center justify-between">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg hover:bg-[#003366]"
          >
            <Bars3Icon className="h-6 w-6 text-white" />
          </button>
          <h1 className="font-bold text-lg text-white">WESTO INDIA</h1>
          <div className="w-10" />
        </div>
        
        {/* Page Content */}
        <div className="flex-1 overflow-auto">
          <Outlet />
        </div>
      </div>
    </div>
  )
}