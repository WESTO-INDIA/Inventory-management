import { useState } from 'react'
import './FabricTracking.css'

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

export default function AdminFabricTracking() {
  const [activeTab, setActiveTab] = useState<TabType>('register')
  const [menuOpen, setMenuOpen] = useState(false)
  
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
    alert('✅ Fabric registered successfully!')
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
    alert('✅ Cutting record added successfully!')
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

  const showSection = (section: TabType) => {
    setActiveTab(section)
    setMenuOpen(false)
  }

  return (
    <div className="fabric-tracking-container">
      <div className="container">
        <nav className="navbar">
          <div className="nav-header">
            <h1>Fabric Tracking System - Admin</h1>
            <button 
              className={`hamburger ${menuOpen ? 'active' : ''}`}
              onClick={() => setMenuOpen(!menuOpen)}
            >
              <span></span>
              <span></span>
              <span></span>
            </button>
          </div>
          <div className={`nav-buttons ${menuOpen ? 'active' : ''}`}>
            <button 
              className={`nav-btn ${activeTab === 'register' ? 'active' : ''}`} 
              onClick={() => showSection('register')}
            >
              Register Fabric
            </button>
            <button 
              className={`nav-btn ${activeTab === 'dashboard' ? 'active' : ''}`} 
              onClick={() => showSection('dashboard')}
            >
              View Fabrics
            </button>
            <button 
              className={`nav-btn ${activeTab === 'cutting' ? 'active' : ''}`} 
              onClick={() => showSection('cutting')}
            >
              Cutting Section
            </button>
            <button 
              className={`nav-btn ${activeTab === 'viewCutting' ? 'active' : ''}`} 
              onClick={() => showSection('viewCutting')}
            >
              View Cutting
            </button>
          </div>
        </nav>

        {/* Fabric Registration Section */}
        <div id="register" className={`section ${activeTab === 'register' ? 'active' : ''}`}>
          <div className="form-container">
            <h2>Register New Fabric</h2>
            <form id="fabricForm" onSubmit={handleFabricSubmit}>
              <div className="form-group">
                <label htmlFor="fabricType">Fabric Type:</label>
                <input 
                  type="text" 
                  id="fabricType" 
                  name="fabricType" 
                  required
                  value={fabricForm.fabricType}
                  onChange={(e) => setFabricForm({...fabricForm, fabricType: e.target.value})}
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="color">Color:</label>
                <input 
                  type="text" 
                  id="color" 
                  name="color" 
                  required
                  value={fabricForm.color}
                  onChange={(e) => setFabricForm({...fabricForm, color: e.target.value})}
                />
              </div>

              <div className="form-group">
                <label htmlFor="quantity">Quantity (meters):</label>
                <input 
                  type="number" 
                  id="quantity" 
                  name="quantity" 
                  required 
                  min="1"
                  value={fabricForm.quantity}
                  onChange={(e) => setFabricForm({...fabricForm, quantity: e.target.value})}
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="supplier">Supplier:</label>
                <input 
                  type="text" 
                  id="supplier" 
                  name="supplier" 
                  required
                  value={fabricForm.supplier}
                  onChange={(e) => setFabricForm({...fabricForm, supplier: e.target.value})}
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="employeeName">Employee Name:</label>
                <input 
                  type="text" 
                  id="employeeName" 
                  name="employeeName" 
                  required
                  value={fabricForm.employeeName}
                  onChange={(e) => setFabricForm({...fabricForm, employeeName: e.target.value})}
                />
              </div>
              
              <button type="submit" className="submit-btn">Register Fabric</button>
            </form>
          </div>
        </div>

        {/* Dashboard Section */}
        <div id="dashboard" className={`section ${activeTab === 'dashboard' ? 'active' : ''}`}>
          <div className="dashboard-container">
            <h2>Fabric Inventory Dashboard</h2>
            <div className="stats-container">
              <div className="stat-card">
                <h3>Total Fabrics</h3>
                <span id="totalFabrics">{fabrics.length}</span>
              </div>
              <div className="stat-card">
                <h3>In Stock</h3>
                <span id="inStock">{fabrics.filter(f => f.status === 'In Stock').length}</span>
              </div>
              <div className="stat-card">
                <h3>Low Stock</h3>
                <span id="lowStock">{fabrics.filter(f => f.status === 'Low Stock').length}</span>
              </div>
            </div>
            
            <div className="table-container">
              <table id="fabricTable">
                <thead>
                  <tr>
                    <th style={{ textAlign: 'center' }}>Fabric Type</th>
                    <th style={{ textAlign: 'center' }}>Color</th>
                    <th style={{ textAlign: 'center' }}>Quantity</th>
                    <th style={{ textAlign: 'center' }}>Supplier</th>
                    <th style={{ textAlign: 'center' }}>Date Received</th>
                    <th style={{ textAlign: 'center' }}>Status</th>
                    <th style={{ textAlign: 'center' }}>Employee</th>
                  </tr>
                </thead>
                <tbody id="fabricTableBody">
                  {fabrics.map((fabric) => (
                    <tr key={fabric.id}>
                      <td style={{ textAlign: 'center' }}>{fabric.fabricType}</td>
                      <td style={{ textAlign: 'center' }}>{fabric.color}</td>
                      <td style={{ textAlign: 'center' }}>{fabric.quantity}m</td>
                      <td style={{ textAlign: 'center' }}>{fabric.supplier}</td>
                      <td style={{ textAlign: 'center' }}>{fabric.dateReceived}</td>
                      <td style={{ textAlign: 'center' }}>
                        <span className={`status ${fabric.status.toLowerCase().replace(' ', '-')}`}>
                          {fabric.status}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>{fabric.employeeName}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Cutting Section */}
        <div id="cutting" className={`section ${activeTab === 'cutting' ? 'active' : ''}`}>
          <div className="form-container">
            <h2>Cutting Section</h2>
            <form id="cuttingForm" onSubmit={handleCuttingSubmit}>
              <div className="form-group">
                <label htmlFor="fabricSelect">Select Fabric:</label>
                <select 
                  id="fabricSelect" 
                  name="fabricId" 
                  required
                  value={cuttingForm.fabricId}
                  onChange={(e) => setCuttingForm({...cuttingForm, fabricId: e.target.value})}
                >
                  <option value="">Choose a fabric</option>
                  {fabrics.map(fabric => (
                    <option key={fabric.id} value={fabric.id}>
                      {fabric.id} - {fabric.fabricType} ({fabric.color}) - {fabric.quantity}m available
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="form-group">
                <label htmlFor="productName">Product Name:</label>
                <input 
                  type="text" 
                  id="productName" 
                  name="productName" 
                  required
                  value={cuttingForm.productName}
                  onChange={(e) => setCuttingForm({...cuttingForm, productName: e.target.value})}
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="piecesCount">Number of Pieces to Cut:</label>
                <input 
                  type="number" 
                  id="piecesCount" 
                  name="piecesCount" 
                  required 
                  min="1"
                  value={cuttingForm.piecesCount}
                  onChange={(e) => setCuttingForm({...cuttingForm, piecesCount: e.target.value})}
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="meterPerPiece">Meter Length per Piece:</label>
                <input 
                  type="number" 
                  id="meterPerPiece" 
                  name="meterPerPiece" 
                  required 
                  min="0.1" 
                  step="0.1"
                  value={cuttingForm.meterPerPiece}
                  onChange={(e) => setCuttingForm({...cuttingForm, meterPerPiece: e.target.value})}
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="totalMetersUsed">Total Meters Used:</label>
                <input 
                  type="number" 
                  id="totalMetersUsed" 
                  name="totalMetersUsed" 
                  readOnly
                  value={getTotalMetersUsed()}
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="sizeType">Size Type:</label>
                <select
                  id="sizeType"
                  name="sizeType"
                  required
                  value={cuttingForm.sizeType}
                  onChange={(e) => setCuttingForm({...cuttingForm, sizeType: e.target.value})}
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

              <div className="form-group">
                <label htmlFor="cuttingMaster">Cutting Master:</label>
                <input
                  type="text"
                  id="cuttingMaster"
                  name="cuttingMaster"
                  required
                  value={cuttingForm.cuttingMaster}
                  onChange={(e) => setCuttingForm({...cuttingForm, cuttingMaster: e.target.value})}
                />
              </div>
              
              <button type="submit" className="submit-btn">Submit Cutting Record</button>
            </form>
          </div>
        </div>

        {/* View Cutting Section */}
        <div id="viewCutting" className={`section ${activeTab === 'viewCutting' ? 'active' : ''}`}>
          <div className="dashboard-container">
            <h2>Cutting Records</h2>
            {cuttingRecords.length === 0 ? (
              <div className="empty-state">
                <p>No cutting records available</p>
              </div>
            ) : (
              <div className="table-container">
                <table id="cuttingTable">
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'center' }}>Cutting ID</th>
                      <th style={{ textAlign: 'center' }}>Fabric Type</th>
                      <th style={{ textAlign: 'center' }}>Product</th>
                      <th style={{ textAlign: 'center' }}>Pieces</th>
                      <th style={{ textAlign: 'center' }}>Meter/Piece</th>
                      <th style={{ textAlign: 'center' }}>Total Used</th>
                      <th style={{ textAlign: 'center' }}>Size</th>
                      <th style={{ textAlign: 'center' }}>Cutting Master</th>
                      <th style={{ textAlign: 'center' }}>Date</th>
                    </tr>
                  </thead>
                  <tbody id="cuttingTableBody">
                    {cuttingRecords.map((record) => (
                      <tr key={record.id}>
                        <td style={{ textAlign: 'center' }}>{record.id}</td>
                        <td style={{ textAlign: 'center' }}>{record.fabricType}</td>
                        <td style={{ textAlign: 'center' }}>{record.productName}</td>
                        <td style={{ textAlign: 'center' }}>{record.piecesCount}</td>
                        <td style={{ textAlign: 'center' }}>{record.meterPerPiece}m</td>
                        <td style={{ textAlign: 'center' }}>{record.totalMetersUsed}m</td>
                        <td style={{ textAlign: 'center' }}>{record.sizeType}</td>
                        <td style={{ textAlign: 'center' }}>{record.cuttingMaster}</td>
                        <td style={{ textAlign: 'center' }}>{formatDate(record.date)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}