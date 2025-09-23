import { useState } from 'react'
import { ScissorsIcon } from '@heroicons/react/24/outline'

type TabType = 'register' | 'dashboard' | 'cutting' | 'viewCutting'

interface Fabric {
  id: string
  fabricType: string
  color: string
  quantity: number
  supplier: string
  employeeName: string
  dateReceived: string
  status: 'In Stock' | 'Low Stock' | 'Out of Stock'
}

interface CuttingRecord {
  id: string
  fabricId: string
  fabricType: string
  productName: string
  piecesCount: number
  meterPerPiece: number
  totalMetersUsed: number
  sizeType: string
  cuttingMaster: string
  date: string
}

export default function FabricTracking() {
  const [activeTab, setActiveTab] = useState<TabType>('register')
  
  const [fabrics, setFabrics] = useState<Fabric[]>([
    {
      id: 'FAB001',
      fabricType: 'Cotton',
      color: 'White',
      quantity: 100,
      supplier: 'ABC Textiles',
      employeeName: 'John Doe',
      dateReceived: '2024-01-15',
      status: 'In Stock'
    },
    {
      id: 'FAB002',
      fabricType: 'Silk',
      color: 'Red',
      quantity: 50,
      supplier: 'XYZ Fabrics',
      employeeName: 'Jane Smith',
      dateReceived: '2024-01-16',
      status: 'In Stock'
    },
    {
      id: 'FAB003',
      fabricType: 'Denim',
      color: 'Blue',
      quantity: 10,
      supplier: 'Denim Co',
      employeeName: 'Bob Johnson',
      dateReceived: '2024-01-14',
      status: 'Low Stock'
    }
  ])

  const [cuttingRecords, setCuttingRecords] = useState<CuttingRecord[]>([])

  const [fabricForm, setFabricForm] = useState({
    fabricType: '',
    color: '',
    quantity: '',
    supplier: '',
    employeeName: ''
  })

  const [cuttingForm, setCuttingForm] = useState({
    fabricId: '',
    productName: '',
    piecesCount: '',
    meterPerPiece: '',
    sizeType: '',
    cuttingMaster: ''
  })

  const handleFabricSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const newFabric: Fabric = {
      id: `FAB${String(fabrics.length + 1).padStart(3, '0')}`,
      fabricType: fabricForm.fabricType,
      color: fabricForm.color,
      quantity: Number(fabricForm.quantity),
      supplier: fabricForm.supplier,
      employeeName: fabricForm.employeeName,
      dateReceived: new Date().toISOString().split('T')[0],
      status: Number(fabricForm.quantity) > 20 ? 'In Stock' : 'Low Stock'
    }
    setFabrics([...fabrics, newFabric])
    setFabricForm({
      fabricType: '',
      color: '',
      quantity: '',
      supplier: '',
      employeeName: ''
    })
    alert('Fabric registered successfully!')
  }

  const handleCuttingSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const selectedFabric = fabrics.find(f => f.id === cuttingForm.fabricId)
    if (!selectedFabric) return

    const totalMetersUsed = Number(cuttingForm.piecesCount) * Number(cuttingForm.meterPerPiece)
    
    const newCutting: CuttingRecord = {
      id: `CUT${String(cuttingRecords.length + 1).padStart(3, '0')}`,
      fabricId: cuttingForm.fabricId,
      fabricType: selectedFabric.fabricType,
      productName: cuttingForm.productName,
      piecesCount: Number(cuttingForm.piecesCount),
      meterPerPiece: Number(cuttingForm.meterPerPiece),
      totalMetersUsed,
      sizeType: cuttingForm.sizeType,
      cuttingMaster: cuttingForm.cuttingMaster,
      date: new Date().toISOString().split('T')[0]
    }

    // Update fabric quantity
    setFabrics(fabrics.map(f => 
      f.id === cuttingForm.fabricId 
        ? { ...f, quantity: f.quantity - totalMetersUsed }
        : f
    ))

    setCuttingRecords([...cuttingRecords, newCutting])
    setCuttingForm({
      fabricId: '',
      productName: '',
      piecesCount: '',
      meterPerPiece: '',
      sizeType: '',
      cuttingMaster: ''
    })
    alert('Cutting record added successfully!')
  }

  const getTotalMetersUsed = () => {
    if (cuttingForm.piecesCount && cuttingForm.meterPerPiece) {
      return Number(cuttingForm.piecesCount) * Number(cuttingForm.meterPerPiece)
    }
    return 0
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const day = date.getDate().toString().padStart(2, '0')
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const year = date.getFullYear()
    return `${day}/${month}/${year}`
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Tabs */}
      <div className="bg-white shadow-sm border-b">
        <div className="px-6 py-4">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Fabric Tracking System</h1>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveTab('register')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'register'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Register Fabric
            </button>
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'dashboard'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              View Fabrics
            </button>
            <button
              onClick={() => setActiveTab('cutting')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'cutting'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Cutting Section
            </button>
            <button
              onClick={() => setActiveTab('viewCutting')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'viewCutting'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              View Cutting
            </button>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Register Fabric Section */}
        {activeTab === 'register' && (
          <div className="max-w-2xl mx-auto bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-6">Register New Fabric</h2>
            <form onSubmit={handleFabricSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fabric Type
                </label>
                <input
                  type="text"
                  required
                  value={fabricForm.fabricType}
                  onChange={(e) => setFabricForm({...fabricForm, fabricType: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Color
                </label>
                <input
                  type="text"
                  required
                  value={fabricForm.color}
                  onChange={(e) => setFabricForm({...fabricForm, color: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quantity (meters)
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={fabricForm.quantity}
                  onChange={(e) => setFabricForm({...fabricForm, quantity: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Supplier
                </label>
                <input
                  type="text"
                  required
                  value={fabricForm.supplier}
                  onChange={(e) => setFabricForm({...fabricForm, supplier: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Employee Name
                </label>
                <input
                  type="text"
                  required
                  value={fabricForm.employeeName}
                  onChange={(e) => setFabricForm({...fabricForm, employeeName: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-primary-600 text-white py-2 px-4 rounded-lg hover:bg-primary-700 transition-colors"
              >
                Register Fabric
              </button>
            </form>
          </div>
        )}

        {/* Dashboard Section */}
        {activeTab === 'dashboard' && (
          <div>
            <h2 className="text-xl font-bold text-gray-800 mb-6">Fabric Inventory Dashboard</h2>
            
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-sm font-medium text-gray-500">Total Fabrics</h3>
                <p className="text-3xl font-bold text-gray-900 mt-2">{fabrics.length}</p>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-sm font-medium text-gray-500">In Stock</h3>
                <p className="text-3xl font-bold text-green-600 mt-2">
                  {fabrics.filter(f => f.status === 'In Stock').length}
                </p>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-sm font-medium text-gray-500">Low Stock</h3>
                <p className="text-3xl font-bold text-orange-600 mt-2">
                  {fabrics.filter(f => f.status === 'Low Stock').length}
                </p>
              </div>
            </div>

            {/* Fabrics Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">ID</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Fabric Type</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Color</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Quantity</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Supplier</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Date Received</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Employee</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {fabrics.map((fabric) => (
                      <tr key={fabric.id}>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900 text-center">{fabric.id}</td>
                        <td className="px-6 py-4 text-sm text-gray-500 text-center">{fabric.fabricType}</td>
                        <td className="px-6 py-4 text-sm text-gray-500 text-center">{fabric.color}</td>
                        <td className="px-6 py-4 text-sm text-gray-500 text-center">{fabric.quantity}m</td>
                        <td className="px-6 py-4 text-sm text-gray-500 text-center">{fabric.supplier}</td>
                        <td className="px-6 py-4 text-sm text-gray-500 text-center">{fabric.dateReceived}</td>
                        <td className="px-6 py-4 text-center">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            fabric.status === 'In Stock' 
                              ? 'bg-green-100 text-green-800' 
                              : fabric.status === 'Low Stock'
                              ? 'bg-orange-100 text-orange-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {fabric.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 text-center">{fabric.employeeName}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Cutting Section */}
        {activeTab === 'cutting' && (
          <div className="max-w-2xl mx-auto bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-6">Cutting Section</h2>
            <form onSubmit={handleCuttingSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Fabric
                </label>
                <select
                  required
                  value={cuttingForm.fabricId}
                  onChange={(e) => setCuttingForm({...cuttingForm, fabricId: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Choose a fabric</option>
                  {fabrics.map(fabric => (
                    <option key={fabric.id} value={fabric.id}>
                      {fabric.id} - {fabric.fabricType} ({fabric.color}) - {fabric.quantity}m available
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Product Name
                </label>
                <input
                  type="text"
                  required
                  value={cuttingForm.productName}
                  onChange={(e) => setCuttingForm({...cuttingForm, productName: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Number of Pieces to Cut
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={cuttingForm.piecesCount}
                  onChange={(e) => setCuttingForm({...cuttingForm, piecesCount: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Meter Length per Piece
                </label>
                <input
                  type="number"
                  required
                  min="0.1"
                  step="0.1"
                  value={cuttingForm.meterPerPiece}
                  onChange={(e) => setCuttingForm({...cuttingForm, meterPerPiece: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Total Meters Used
                </label>
                <input
                  type="number"
                  readOnly
                  value={getTotalMetersUsed()}
                  className="w-full px-3 py-2 border rounded-lg bg-gray-50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Size Type
                </label>
                <select
                  required
                  value={cuttingForm.sizeType}
                  onChange={(e) => setCuttingForm({...cuttingForm, sizeType: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Select Size</option>
                  <option value="XXS">XXS</option>
                  <option value="XS">XS</option>
                  <option value="S">S</option>
                  <option value="M">M</option>
                  <option value="L">L</option>
                  <option value="XL">XL</option>
                  <option value="XXL">XXL</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cutting Master
                </label>
                <input
                  type="text"
                  required
                  value={cuttingForm.cuttingMaster}
                  onChange={(e) => setCuttingForm({...cuttingForm, cuttingMaster: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-primary-600 text-white py-2 px-4 rounded-lg hover:bg-primary-700 transition-colors"
              >
                Submit Cutting Record
              </button>
            </form>
          </div>
        )}

        {/* View Cutting Section */}
        {activeTab === 'viewCutting' && (
          <div>
            <h2 className="text-xl font-bold text-gray-800 mb-6">Cutting Records</h2>
            
            {cuttingRecords.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-12 text-center">
                <ScissorsIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No cutting records available</p>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">ID</th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Fabric</th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Product</th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Pieces</th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Meter/Piece</th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Total Used</th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Size</th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Cutting Master</th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {cuttingRecords.map((record) => (
                        <tr key={record.id}>
                          <td className="px-6 py-4 text-sm font-medium text-gray-900 text-center">{record.id}</td>
                          <td className="px-6 py-4 text-sm text-gray-500 text-center">{record.fabricType}</td>
                          <td className="px-6 py-4 text-sm text-gray-500 text-center">{record.productName}</td>
                          <td className="px-6 py-4 text-sm text-gray-500 text-center">{record.piecesCount}</td>
                          <td className="px-6 py-4 text-sm text-gray-500 text-center">{record.meterPerPiece}m</td>
                          <td className="px-6 py-4 text-sm font-semibold text-primary-600 text-center">{record.totalMetersUsed}m</td>
                          <td className="px-6 py-4 text-sm text-gray-500 text-center">{record.sizeType}</td>
                          <td className="px-6 py-4 text-sm text-gray-500 text-center">{record.cuttingMaster}</td>
                          <td className="px-6 py-4 text-sm text-gray-500 text-center">{formatDate(record.date)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}