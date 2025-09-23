import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './stores/authStore'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'

// Pages
import Login from './pages/Login'
import AdminDashboard from './pages/AdminDashboard'
import EmployeePortal from './pages/EmployeePortal'
import Inventory from './pages/Inventory'
import AdminFabricTracking from './pages/AdminFabricTracking'
import EmployeeFabricTracking from './pages/EmployeeFabricTracking'
import FabricRegistration from './pages/FabricRegistration'
import ViewFabrics from './pages/ViewFabrics'
import Cutting from './pages/Cutting'
import CuttingInventory from './pages/CuttingInventory'
import Manufacturing from './pages/Manufacturing'
import ManufacturingInventory from './pages/ManufacturingInventory'
import Employees from './pages/Employees'
import QRInventory from './pages/QRInventory'
import Transactions from './pages/Transactions'
import QRScanner from './pages/QRScanner'
import MarkAttendance from './pages/MarkAttendance'

function App() {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated)
  const user = useAuthStore(state => state.user)

  return (
    <Routes>
      <Route path="/login" element={!isAuthenticated ? <Login /> : <Navigate to={user?.role === 'admin' ? "/admin-dashboard" : "/employee-portal"} />} />
      
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/" element={<Navigate to={user?.role === 'admin' ? "/admin-dashboard" : "/employee-portal"} />} />
          <Route path="/admin-dashboard" element={<AdminDashboard />} />
          <Route path="/employee-portal" element={<EmployeePortal />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/fabric-tracking" element={user?.role === 'admin' ? <AdminFabricTracking /> : <EmployeeFabricTracking />} />
          <Route path="/fabric-registration" element={<FabricRegistration />} />
          <Route path="/view-fabrics" element={<ViewFabrics />} />
          <Route path="/cutting" element={<Cutting />} />
          <Route path="/cutting-inventory" element={<CuttingInventory />} />
          <Route path="/manufacturing" element={<Manufacturing />} />
          <Route path="/manufacturing-inventory" element={<ManufacturingInventory />} />
          <Route path="/generate-qr" element={<QRInventory />} />
          <Route path="/employees" element={<Employees />} />
          <Route path="/qr-scanner" element={<QRScanner />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/mark-attendance" element={<MarkAttendance />} />
        </Route>
      </Route>
      
      <Route path="*" element={<Navigate to={user?.role === 'admin' ? "/admin-dashboard" : "/employee-portal"} />} />
    </Routes>
  )
}

export default App