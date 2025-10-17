import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './stores/authStore'
import Layout from './components/Layout'
import EmployeeLayout from './components/EmployeeLayout'
import ProtectedRoute from './components/ProtectedRoute'

// Pages
import Login from './pages/Login'
import StockRoom from './pages/StockRoom'
import Inventory from './pages/Inventory'
import CuttingInventory from './pages/CuttingInventory'
import Manufacturing from './pages/Manufacturing'
import ManufacturingInventory from './pages/ManufacturingInventory'
import Employees from './pages/Employees'
import QRInventory from './pages/QRInventory'
import Transactions from './pages/Transactions'
import QRScanner from './pages/QRScanner'

function App() {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated)
  const user = useAuthStore(state => state.user)

  // Determine default redirect based on user role
  const getDefaultRoute = () => {
    if (user?.role === 'employee') {
      return '/qr-scanner'
    }
    return '/admin-dashboard'
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={!isAuthenticated ? <Login /> : <Navigate to={getDefaultRoute()} />}
      />

      <Route element={<ProtectedRoute />}>
        {/* Admin Routes - with sidebar */}
        {user?.role === 'admin' && (
          <Route element={<Layout />}>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/admin-dashboard" element={<StockRoom />} />
            <Route path="/stock-room" element={<StockRoom />} />
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/cutting-inventory" element={<CuttingInventory />} />
            <Route path="/manufacturing" element={<Manufacturing />} />
            <Route path="/manufacturing-inventory" element={<ManufacturingInventory />} />
            <Route path="/generate-qr" element={<QRInventory />} />
            <Route path="/employees" element={<Employees />} />
            <Route path="/qr-scanner" element={<QRScanner />} />
            <Route path="/transactions" element={<Transactions />} />
          </Route>
        )}

        {/* Employee Routes - without sidebar */}
        {user?.role === 'employee' && (
          <Route element={<EmployeeLayout />}>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/qr-scanner" element={<QRScanner />} />
          </Route>
        )}
      </Route>

      <Route path="*" element={<Navigate to="/login" />} />
    </Routes>
  )
}

export default App