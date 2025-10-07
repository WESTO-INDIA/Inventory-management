import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import '../styles/common.css'
import { API_URL } from '@/config/api'

interface InventoryItem {
  id: string
  fabricType: string
  color: string
  quantity: number
  status: string
  length: number
  width: number
  supplier: string
  purchasePrice: number
  notes: string
  dateRegistered: string
}

interface FabricForm {
  fabricType: string
  color: string
  length: string
  width: string
  quantity: string
  supplier: string
  purchasePrice: string
  notes: string
}

export default function Inventory() {
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState('')
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [formData, setFormData] = useState<FabricForm>({
    fabricType: '',
    color: '',
    length: '',
    width: '',
    quantity: '',
    supplier: '',
    purchasePrice: '',
    notes: ''
  })

  const generateProductId = (name: string, color: string, quantity: number) => {
    // Get first 3 letters of fabric type (uppercase)
    const fabricTypeCode = name.substring(0, 3).toUpperCase().padEnd(3, 'X')

    // Generate 5-character alphanumeric serial
    const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    let serial = ''
    for (let i = 0; i < 5; i++) {
      serial += chars.charAt(Math.floor(Math.random() * chars.length))
    }

    return `${fabricTypeCode}${serial}` // Total 8 characters
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const day = date.getDate().toString().padStart(2, '0')
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const year = date.getFullYear()
    return `${day}/${month}/${year}`
  }

  const fetchInventoryItems = async () => {
    setIsLoading(true)
    try {
      // This would connect to fabric API to show fabrics as inventory
      const response = await fetch(`${API_URL}/api/fabrics`)
      if (response.ok) {
        const fabrics = await response.json()
        const inventoryItems = fabrics.map((fabric: any) => ({
          id: fabric.productId || generateProductId(fabric.fabricType, fabric.color, Math.floor(fabric.quantity)),
          fabricType: fabric.fabricType,
          color: fabric.color,
          quantity: fabric.quantity,
          status: fabric.status,
          length: fabric.length,
          width: fabric.width,
          supplier: fabric.supplier,
          purchasePrice: fabric.purchasePrice || 0,
          notes: fabric.notes || '',
          dateRegistered: fabric.dateReceived || fabric.createdAt || new Date().toISOString()
        }))
        setInventoryItems(inventoryItems)
      }
    } catch (error) {
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchInventoryItems()
  }, [])

  const filteredItems = inventoryItems.filter(item =>
    item.fabricType.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.color.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.id.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleEdit = (item: InventoryItem) => {
    setEditingItem(item)
    setShowEditModal(true)
  }

  const handleDelete = async (item: InventoryItem) => {
    if (window.confirm(`Are you sure you want to delete ${item.fabricType} - ${item.color}?`)) {
      try {
        // Find the fabric by matching name and color since we need the MongoDB _id
        const response = await fetch(`${API_URL}/api/fabrics`)
        if (response.ok) {
          const fabrics = await response.json()
          const fabricToDelete = fabrics.find((fabric: any) =>
            fabric.fabricType === item.fabricType && fabric.color === item.color
          )
          
          if (fabricToDelete) {
            const deleteResponse = await fetch(`${API_URL}/api/fabrics/${fabricToDelete._id}`, {
              method: 'DELETE'
            })
            
            if (deleteResponse.ok) {
              alert('✅ Item deleted successfully!')
              fetchInventoryItems() // Refresh the list
            } else {
              alert('❌ Error deleting item. Please try again.')
            }
          }
        }
      } catch (error) {
        alert('❌ Error deleting item. Please try again.')
      }
    }
  }

  const handleSaveEdit = async (updatedItem: InventoryItem) => {
    try {
      // Find the fabric by matching name and color since we need the MongoDB _id
      const response = await fetch(`${API_URL}/api/fabrics`)
      if (response.ok) {
        const fabrics = await response.json()
        const fabricToUpdate = fabrics.find((fabric: any) =>
          fabric.fabricType === editingItem?.fabricType && fabric.color === editingItem?.color
        )

        if (fabricToUpdate) {
          const updateResponse = await fetch(`${API_URL}/api/fabrics/${fabricToUpdate._id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              fabricType: updatedItem.fabricType,
              color: updatedItem.color,
              length: updatedItem.length,
              width: updatedItem.width,
              supplier: updatedItem.supplier,
              purchasePrice: updatedItem.purchasePrice,
              notes: updatedItem.notes
            })
          })

          if (updateResponse.ok) {
            alert('✅ Item updated successfully!')
            setShowEditModal(false)
            setEditingItem(null)
            fetchInventoryItems() // Refresh the list
          } else {
            alert('❌ Error updating item. Please try again.')
          }
        }
      }
    } catch (error) {
      alert('❌ Error updating item. Please try again.')
    }
  }

  const handleAddFabric = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const response = await fetch(`${API_URL}/api/fabrics`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        await response.json()
        alert('✅ Fabric added successfully!')

        // Reset form
        setFormData({
          fabricType: '',
          color: '',
          length: '',
          width: '',
          quantity: '',
          supplier: '',
          purchasePrice: '',
          notes: ''
        })

        // Close modal
        setShowAddModal(false)

        // Refresh inventory list
        fetchInventoryItems()
      } else {
        alert('❌ Error adding fabric. Please try again.')
      }
    } catch (error) {
      alert('❌ Error adding fabric. Please try again.')
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    const newFormData = { ...formData, [name]: value }

    // Calculate total quantity automatically when length or width changes
    if (name === 'length' || name === 'width') {
      const length = name === 'length' ? parseFloat(value) : parseFloat(formData.length)
      const width = name === 'width' ? parseFloat(value) : parseFloat(formData.width)

      if (!isNaN(length) && !isNaN(width) && length > 0 && width > 0) {
        newFormData.quantity = (length * width).toFixed(2)
      } else {
        newFormData.quantity = ''
      }
    }

    setFormData(newFormData)
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Fabric Inventory Management</h1>
        <p>Manage your fabric products and stock levels</p>
      </div>

      <div className="content-card">
        <div className="toolbar">
          <div className="search-box">
            <input
              type="text"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="filter-group">
            <button
              className="btn btn-secondary"
              onClick={fetchInventoryItems}
              disabled={isLoading}
            >
              {isLoading ? 'Refreshing...' : 'Refresh'}
            </button>
            <button
              className="btn btn-primary"
              onClick={() => setShowAddModal(true)}
            >
              Add Fabric
            </button>
          </div>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ textAlign: 'center' }}>Fabric ID</th>
                <th style={{ textAlign: 'center' }}>Fabric Type</th>
                <th style={{ textAlign: 'center' }}>Color</th>
                <th style={{ textAlign: 'center' }}>Quantity</th>
                <th style={{ textAlign: 'center' }}>Price/m</th>
                <th style={{ textAlign: 'center' }}>Date Registered</th>
                <th style={{ textAlign: 'center' }}>Status</th>
                <th style={{ textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.length > 0 ? (
                filteredItems.map((item) => (
                  <tr key={item.id}>
                    <td style={{ fontWeight: '500', textAlign: 'center' }}>{item.id}</td>
                    <td style={{ textAlign: 'center' }}>{item.fabricType}</td>
                    <td style={{ textAlign: 'center' }}>{item.color}</td>
                    <td style={{ textAlign: 'center' }}>{item.quantity} sq.m</td>
                    <td style={{ textAlign: 'center' }}>₹{item.purchasePrice > 0 ? item.purchasePrice.toFixed(2) : 'N/A'}</td>
                    <td style={{ textAlign: 'center' }}>{formatDate(item.dateRegistered)}</td>
                    <td style={{ textAlign: 'center' }}>
                      <span className={`badge ${
                        item.status === 'In Stock' ? 'badge-success' : 
                        item.status === 'Low Stock' ? 'badge-warning' : 'badge-danger'
                      }`}>
                        {item.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div className="action-buttons">
                        <button className="action-btn edit" onClick={() => handleEdit(item)}>✏️</button>
                        <button className="action-btn delete" onClick={() => handleDelete(item)}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                    {isLoading ? 'Loading inventory...' : 'No inventory items found'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && editingItem && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '30px',
            borderRadius: '10px',
            width: '90%',
            maxWidth: '500px',
            maxHeight: '90vh',
            overflow: 'auto'
          }}>
            <h2 style={{ marginBottom: '20px', color: '#374151' }}>Edit Item</h2>
            <form onSubmit={(e) => {
              e.preventDefault()
              const formData = new FormData(e.target as HTMLFormElement)
              const updatedItem: InventoryItem = {
                ...editingItem,
                fabricType: formData.get('fabricType') as string,
                color: formData.get('color') as string,
                length: parseFloat(formData.get('length') as string),
                width: parseFloat(formData.get('width') as string),
                supplier: formData.get('supplier') as string,
                purchasePrice: parseFloat(formData.get('purchasePrice') as string) || 0,
                notes: formData.get('notes') as string
              }
              handleSaveEdit(updatedItem)
            }}>
              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="fabricType">Fabric Type *</label>
                  <input
                    type="text"
                    id="fabricType"
                    name="fabricType"
                    defaultValue={editingItem.fabricType}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="color">Color *</label>
                  <input
                    type="text"
                    id="color"
                    name="color"
                    defaultValue={editingItem.color}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="length">Length (meters) *</label>
                  <input
                    type="number"
                    id="length"
                    name="length"
                    defaultValue={editingItem.length}
                    min="0.1"
                    step="0.1"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="width">Width (meters) *</label>
                  <input
                    type="number"
                    id="width"
                    name="width"
                    defaultValue={editingItem.width}
                    min="0.1"
                    step="0.1"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="supplier">Supplier *</label>
                  <input
                    type="text"
                    id="supplier"
                    name="supplier"
                    defaultValue={editingItem.supplier}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="purchasePrice">Purchase Price (per meter)</label>
                  <input
                    type="number"
                    id="purchasePrice"
                    name="purchasePrice"
                    defaultValue={editingItem.purchasePrice}
                    min="0"
                    step="0.01"
                  />
                </div>

              </div>

              <div className="form-group">
                <label htmlFor="notes">Additional Notes</label>
                <textarea
                  id="notes"
                  name="notes"
                  defaultValue={editingItem.notes}
                  rows={4}
                  style={{ resize: 'vertical' }}
                />
              </div>

              <div className="btn-group">
                <button type="submit" className="btn btn-primary">
                  Save Changes
                </button>
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowEditModal(false)
                    setEditingItem(null)
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Fabric Modal */}
      {showAddModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setShowAddModal(false)}
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              padding: '24px',
              maxWidth: '600px',
              width: '90%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, color: '#374151', fontSize: '20px', fontWeight: 'bold' }}>Add New Fabric</h2>
              <button
                onClick={() => setShowAddModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#6b7280',
                }}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleAddFabric}>
              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="modal-fabricType">Fabric Type *</label>
                  <input
                    type="text"
                    id="modal-fabricType"
                    name="fabricType"
                    value={formData.fabricType}
                    onChange={handleChange}
                    placeholder="e.g., Cotton, Silk, Denim"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="modal-color">Color *</label>
                  <input
                    type="text"
                    id="modal-color"
                    name="color"
                    value={formData.color}
                    onChange={handleChange}
                    placeholder="e.g., Red, Blue, White"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="modal-length">Length (meters) *</label>
                  <input
                    type="number"
                    id="modal-length"
                    name="length"
                    value={formData.length}
                    onChange={handleChange}
                    placeholder="Enter length in meters"
                    min="0.1"
                    step="0.1"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="modal-width">Width (meters) *</label>
                  <input
                    type="number"
                    id="modal-width"
                    name="width"
                    value={formData.width}
                    onChange={handleChange}
                    placeholder="Enter width in meters"
                    min="0.1"
                    step="0.1"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="modal-quantity">Total Quantity (square meters)</label>
                  <input
                    type="text"
                    id="modal-quantity"
                    name="quantity"
                    value={formData.quantity ? `${formData.quantity} sq.m` : ''}
                    placeholder="Calculated automatically"
                    readOnly
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="modal-purchasePrice">Purchase Price (per meter)</label>
                  <input
                    type="number"
                    id="modal-purchasePrice"
                    name="purchasePrice"
                    value={formData.purchasePrice}
                    onChange={handleChange}
                    placeholder="Enter price per meter"
                    min="0"
                    step="0.01"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="modal-supplier">Supplier *</label>
                  <input
                    type="text"
                    id="modal-supplier"
                    name="supplier"
                    value={formData.supplier}
                    onChange={handleChange}
                    placeholder="Supplier name"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="modal-notes">Additional Notes</label>
                <textarea
                  id="modal-notes"
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  placeholder="Any additional information about the fabric"
                  rows={3}
                  style={{ resize: 'vertical' }}
                />
              </div>

              <div className="btn-group" style={{ marginTop: '20px' }}>
                <button type="submit" className="btn btn-primary">
                  Add Fabric
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowAddModal(false)
                    setFormData({
                      fabricType: '',
                      color: '',
                      length: '',
                      width: '',
                      quantity: '',
                      supplier: '',
                      purchasePrice: '',
                      notes: ''
                    })
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}