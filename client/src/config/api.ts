// API Configuration
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000'

export const API_ENDPOINTS = {
  // Auth
  LOGIN: `${API_URL}/api/auth/login`,
  LOGOUT: `${API_URL}/api/auth/logout`,

  // Employees
  EMPLOYEES: `${API_URL}/api/employees`,

  // Fabrics
  FABRICS: `${API_URL}/api/fabrics`,

  // Cutting Records
  CUTTING_RECORDS: `${API_URL}/api/cutting-records`,

  // Manufacturing
  MANUFACTURING: `${API_URL}/api/manufacturing`,

  // Tailors
  TAILORS: `${API_URL}/api/tailors`,

  // Inventory Stats
  INVENTORY_STATS: `${API_URL}/api/inventory/stats`,
}