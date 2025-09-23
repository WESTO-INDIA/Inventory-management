import { useState, useEffect, useRef } from 'react'
import '../styles/common.css'
import { API_URL } from '@/config/api'
import { compressImage, getBase64SizeInKB } from '@/utils/imageCompression'

interface Employee {
  _id: string
  employeeId: string
  username: string
  name: string
  email: string
  mobile: string
  dob: string
  aadharNumber?: string
  address: {
    street: string
    city: string
    state: string
    pincode: string
  }
  salary: number
  work: string
  photo: string | null
  joiningDate: string
  status: string
  role: string
}

export default function Employees() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [photoData, setPhotoData] = useState<string | null>(null)
  
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    name: '',
    mobile: '',
    dob: '',
    aadharNumber: '',
    address: '',
    salary: '',
    work: '',
    photo: ''
  })

  useEffect(() => {
    fetchEmployees()
  }, [])

  const fetchEmployees = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`${API_URL}/api/employees`)
      if (response.ok) {
        const data = await response.json()
        setEmployees(data)
      }
    } catch (error) {
      // Error fetching employees
    } finally {
      setIsLoading(false)
    }
  }


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validation
    if (!formData.username.trim()) {
      alert('Please enter a username')
      return
    }
    
    if (!editingEmployee && !formData.password.trim()) {
      alert('Please enter a password for new employee')
      return
    }
    
    if (!formData.name.trim()) {
      alert('Please enter employee name')
      return
    }
    
    if (!formData.mobile.trim()) {
      alert('Please enter mobile number')
      return
    }
    
    if (!formData.salary || parseFloat(formData.salary) <= 0) {
      alert('Please enter a valid salary')
      return
    }
    
    if (!formData.work.trim()) {
      alert('Please enter work type')
      return
    }

    if (!formData.dob) {
      alert('Please enter date of birth')
      return
    }

    setIsLoading(true)
    
    try {
      const employeeData: any = {
        username: formData.username.trim().toLowerCase(),
        name: formData.name.trim(),
        email: `${formData.username.trim().toLowerCase()}@company.com`,
        mobile: formData.mobile.trim(),
        dob: formData.dob || null,
        aadharNumber: formData.aadharNumber.trim(),
        address: {
          street: formData.address.trim(),
          city: '',
          state: '',
          pincode: ''
        },
        salary: parseFloat(formData.salary),
        work: formData.work.trim(),
        photo: photoData || null
      }
      
      // Only include password if it's provided (for new employees or password update)
      if (formData.password.trim()) {
        employeeData.password = formData.password.trim()
      }

      const url = editingEmployee 
        ? `${API_URL}/api/employees/${editingEmployee._id}`
        : `${API_URL}/api/employees`
      
      const method = editingEmployee ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(employeeData)
      })

      if (response.ok) {
        alert(editingEmployee ? 'Employee updated successfully!' : 'Employee created successfully!')
        await fetchEmployees()
        resetForm()
      } else {
        const error = await response.json()
        // Server error
        alert(error.message || 'Failed to save employee. Please check all fields.')
      }
    } catch (error) {
      // Error saving employee
      alert('Error saving employee. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleEdit = (employee: Employee) => {
    setEditingEmployee(employee)
    setFormData({
      username: employee.username,
      password: '',
      name: employee.name,
      mobile: employee.mobile || '',
      dob: employee.dob ? new Date(employee.dob).toISOString().split('T')[0] : '',
      aadharNumber: employee.aadharNumber || '',
      address: employee.address?.street || '',
      salary: employee.salary?.toString() || '',
      work: employee.work || '',
      photo: employee.photo || ''
    })
    setPhotoData(employee.photo)
    setShowForm(true)
    // Smooth scroll to top with a small delay to ensure form is rendered
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' })
      // Also try to focus on the first input for better UX
      const firstInput = document.querySelector('input[type="text"]') as HTMLInputElement
      if (firstInput) {
        firstInput.focus()
      }
    }, 100)
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this employee?')) return
    
    try {
      const response = await fetch(`${API_URL}/api/employees/${id}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        alert('Employee deleted successfully!')
        fetchEmployees()
      }
    } catch (error) {
      alert('Error deleting employee')
    }
  }

  const resetForm = () => {
    setFormData({
      username: '',
      password: '',
      name: '',
      mobile: '',
      dob: '',
      aadharNumber: '',
      address: '',
      salary: '',
      work: '',
      photo: ''
    })
    setPhotoData(null)
    setEditingEmployee(null)
    setShowForm(false)
  }

  const generateIDCard = (employee: Employee) => {
    // Format DOB for display
    const dob = employee.dob && employee.dob !== ''
      ? new Date(employee.dob).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })
      : 'Not Available'

    const idCardContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Employee ID Card - ${employee.name}</title>
        <style>
          @page {
            size: 3.5in 2.25in;
            margin: 0;
          }
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: 'Times New Roman', serif;
            margin: 0;
            padding: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            background: white;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            color-adjust: exact;
          }
          .id-card {
            width: 3.5in;
            height: 2.25in;
            background: white;
            border: 3px solid #001f3f;
            border-radius: 8px;
            overflow: hidden;
            position: relative;
            display: flex;
            flex-direction: column;
          }
          .id-card-header {
            background: #001f3f !important;
            padding: 10px 0;
            text-align: center;
            color: white !important;
            border-bottom: 2px solid #ffd700;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .company-name {
            font-size: 22px;
            font-weight: bold;
            margin: 0;
            letter-spacing: 3px;
            text-transform: uppercase;
            font-family: 'Times New Roman', serif;
            color: white !important;
          }
          .company-tagline {
            font-size: 7px;
            margin-top: 3px;
            letter-spacing: 1px;
            text-transform: uppercase;
            color: #ffd700 !important;
            font-family: 'Times New Roman', serif;
          }
          .id-card-body {
            flex: 1;
            padding: 12px;
            display: flex;
            gap: 15px;
            background: white;
            position: relative;
          }
          .left-section {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
          }
          .photo {
            width: 90px;
            height: 90px;
            border-radius: 6px;
            border: 2px solid #001f3f;
            background: #f8f9fa;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 36px;
            color: #000000;
            font-weight: bold;
            overflow: hidden;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          }
          .photo img {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }
          .right-section {
            flex: 1;
            display: flex;
            flex-direction: column;
            justify-content: center;
            padding-left: 5px;
          }
          .info-row {
            margin-bottom: 6px;
            display: flex;
            align-items: baseline;
            font-size: 11px;
          }
          .info-label {
            font-weight: 600;
            color: #000000;
            min-width: 65px;
            font-family: 'Times New Roman', serif;
          }
          .info-value {
            color: #000000;
            font-weight: 500;
            flex: 1;
            font-family: 'Times New Roman', serif;
          }
          .employee-name {
            font-size: 15px;
            font-weight: bold;
            color: #000000;
            font-family: 'Times New Roman', serif;
          }
          .employee-id {
            font-size: 13px;
            font-weight: bold;
            color: #001f3f;
            font-family: 'Times New Roman', serif;
          }
          .signature-section {
            position: absolute;
            bottom: 8px;
            right: 15px;
            text-align: center;
            width: 80px;
          }
          .signature-img {
            width: 80px;
            height: 25px;
            object-fit: contain;
            margin-bottom: -4.2px;
            opacity: 0.8;
          }
          .signature-label {
            font-size: 9px;
            color: #000000;
            border-top: 1px solid #001f3f;
            padding-top: 3px;
            font-family: 'Times New Roman', serif;
            font-weight: 600;
          }
          @media print {
            body {
              margin: 0;
              padding: 0;
              background: white;
              min-height: auto;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .id-card {
              border: 3px solid #001f3f !important;
              page-break-inside: avoid;
            }
            .id-card-header {
              background: #001f3f !important;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
          }
        </style>
      </head>
      <body>
        <div class="id-card">
          <div class="id-card-header">
            <h1 class="company-name">WESTO INDIA</h1>
            <div class="company-tagline">A NAME BEHIND MANY SUCCESSFUL BRANDS</div>
          </div>
          <div class="id-card-body">
            <div class="left-section">
              <div class="photo">
                ${employee.photo
                  ? `<img src="${employee.photo}" alt="${employee.name}" />`
                  : employee.name.charAt(0).toUpperCase()
                }
              </div>
            </div>
            <div class="right-section">
              <div class="info-row">
                <span class="info-label">Name:</span>
                <span class="info-value employee-name">${employee.name}</span>
              </div>
              <div class="info-row">
                <span class="info-label">DOB:</span>
                <span class="info-value">${dob}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Mobile:</span>
                <span class="info-value">${employee.mobile}</span>
              </div>
              <div class="info-row">
                <span class="info-label">EMP ID:</span>
                <span class="info-value employee-id">${employee.employeeId}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Legal name:</span>
                <span class="info-value">Teezure</span>
              </div>
            </div>
            <div class="signature-section">
              <img src="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEAAYGBgYHBgcICAcKCwoLCg8ODAwODxYQERAREBYiFRkVFRkVIh4kHhweJB42KiYmKjY+NDI0PkxERExfWl98fKcBBgYGBgcGBwgIBwoLCgsKDw4MDA4PFhAREBEQFiIVGRUVGRUiHiQeHB4kHjYqJiYqNj40MjQ+TERETF9aX3x8p//CABEIAPwCWAMBIgACEQEDEQH/xAAyAAEAAwEBAQEAAAAAAAAAAAAABAUGAwIBBwEBAQEBAQEAAAAAAAAAAAAAAAECAwQF/9oADAMBAAIQAxAAAALUgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHxPpwO6s47XKl4amhZzrV8hTeVKzNdptOWY7WXfOH7OthV2mL3HLQAAAAAAAAAAAAAAA5HVVcdy7UPPU0TL+dNUo7zjXnLVfebnnk5Fl7wp4HWaW6yes82qfnGjd864ePoBmodhA9/LYUF/V+Tecvs/qfXzj9nnzdOsL1U9cetVmNXmwc/p8xqafplvGbpvFH3lnWFRa871HPQAAAAAABmOHo5675jvm5r+GYmy23ansuepNFbZLrmxi2VzpkvOw7YuOsdC51UW9Vi0FnSaL38vnr508u+/eu4Rfeq+w46CVXRc16ce7Gxu9vHs8e87Ataj6HHZufT5/UFpaK9ovfx2tfYx/F0y/Xhovfzq2leTphpWqzvpxo+mOu/Pq0yGxxPSaG1zPjLUsh8l2HzKI1j594bHk9AAAAAA4+/ZPmY1FF3x40FHeAcOkPJ7PEe3lY9fljVfy0blrNaGX951An8udwthG0H0+UCXeefD0h9OvLDt0rpub0zHiq9uOmqz3WtaxX3hraMRbRc5DbxUpLGN83JcL12KC2uZErh3ebWD0lv8Ae+Q4bfPoqfNw3lDmMWP06KCUAB8+gAAAAAABRXtN1xzvc9odQOHTzht3ivXiZe5rpvNvziSuWvv37IiT0++vPrAdd09Wch11TDJ9NQKC0lueqzhdCskS0RpJASgAAAAAU02lkdZfDlQAAAAAAAAAAAAAHHsSNJKCUAAAAAAAACsZjl3m/cuvCgAAAAAAAUkayoO02I40AAAAAD59AAAAAAAAAAAAAAAAAABy6xjLX9DsesyesytuWY5UAAAAAADx+e/ov570n6ErMvG7fmmi01KivedCAAAAAAAAAAAAAAAAAAAAAADhyMnuM9I7SyxG+ymbqvtBf8wAAAAEPpScuk1By53z+efo+S7TxX+5O2nhV2k53IbnEaBLccqAAAAAAAAAAAAAAAAAAAIpKrqKb1kfzqfRluetZuSufdiU9n1YYDe57n0mnI/OyGc0NenimLzh3wtm6iVtLWzyEGy2+VvrbdFXaUuk81y/vSwqmnnKPidXl+s3n3l15UAAAAAAAAAAAAAAAAAABhd1mNy/65KUaCL8l5tZzvfNRpeI2h7GXzA7+Dqe++L3BUUG2zm0zI+NppnY97UdZIn0cbU/RmIefVf0nSuyRHs3FTfLqD1zC7+rXNj2+a5JsFby42d5oe3WaOu4QMpFzAtM36OegAAAAAAAAAAAAAAAABwO9TSyusr9ty+4vRx95ewZXvffnvWfo/jFeSf692mmVbjKdszJMWJh3sZPzCg+2tf1zZVsnjmzedtH52B05yNzxaVdxy1mCT3xG53czGs307equOkOZ59BKAAAAAAAAAAAAAAhTampkrM8tzV1+fn2wvWl7yZ2k1uX299tFNyyfHTZjSN8sb/TBSdzXRltdTWeF0OVY7Y430Y1vU8+lJdwNok7OyO+PvftJy+9/MnjvJXHaT0lLoOXXnc1oOqsz41Lc48ZjlePYgFAAAAAAAAAAAAAAA8+gAAcuoj0cab2kDUd3MGaAAAgziAoAAAAAADz6Hn0AAAAAAAAAAAAAAAAAAAACNJjGc1lPcagZoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHz6AAAAAAAAAAAAAAAAAAAAAAH/xAAC/9oADAMBAAIAAwAAACHzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzznvzjzXLU+3zzzzzzzzzzzzzzzzzr/AA/8v11A88Q7rIHJjZDW888888847v8Aqj6JnrluyXfNTnMvfBc0HvFXMuHvPPPPPPPP2nfN4gNa+Dq8yaOtXttXL/fPP/8A1zzyzzzzzzzy5bwz+e7/AOv9889Nc888888Z888888888888888vd88888888889088888888j8888888c888888888888888888uP588888888b77088888888888888888888888mdeW8888838TT0Z8888888888888888888869Fccuv8w4r7NYu68f08888888888888888888v7Ka88rVpbURrKzn6ZzMtb88888888888888888865Wy8BlphPd7iN5mTYiV888888888888888874/jJL89Z8t/uIV8w+sMNf8888888888888888M888VP8888/88888888s888888888888888888888+X888888888888888888888888888888888888888888888888888888888888/8QAAv/aAAwDAQACAAMAAAAQ88888888888888888848888888888888888888888888888888888888888835y/49sHSV88888888888888886689+fqX2u88M8Pytlatcx88888886tFdQGqUP4OYr18vke238T1MeYaEb3928888888+IV87lCeqX6q44rW077p+v/wDPLv3PLPLPPPPPPPKn/NvZiRrjG7rzPfPPPPPPMfPPPPPPPPPPPPPPLXPPPPPPPPPPLtvPPPPPPPE/PPPPPPPPPPPPPPPPPPPPPPPPPOn+vPPPPPPPGe69PPPPPPPPPPPPPPPPPPPPPPOKtWPvPPPPM/teDlvPPPPPPPPPPPPPPPPPPPOLdXlHg/vtL9eJ4sugXvPPPPPPPPPPPPPPPPPPB7ZiNPO16QrNbxkbzctT7zPPPPPPPPPPPPPPPPPPOPaPuANnZmj6L5vV20hFvPPPPPPPPPPPPPPOsYj2UQq2svODfDzzWJ/D/vfPPPPPPPPPPPPPPPPvPPmDfPPPP/PPPPPPPPHPPPPPPPPPPPPPPPNPPPPLnfPPPPPPPPPPOPPPPPPPPPPPPPPPPPPPPPPPPPHPPPPPPPPPPPPPPPPPPPPPPP/EADwRAAIBAwMBBAgEBAQHAAAAAAECAwAEEQUSITEGE0FREBQiMkBhcZEVIzBCIFKBoRZEUIIkM0NTYrHB/9oACAECAQE/AP8AXMHypEZ2CqpJPQCk02/f3baT7Uuiao3+VYfWjoOpj/of3FSRSROUkQqw8DWl6G+oQtKJ1RVJByKOmaXG+JdRU467a9U7PKeb6U/7av10tVUWjyM3iWHwKqzEKoJJ6AUumag3S2el0LVW/wAqwHmcCl7PakQCUVefE1c28ltK0cmMjyqz0OK4t0ma/iTP7T1F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" alt="Signature" class="signature-img" />
              <div class="signature-label">Authorized Sign</div>
            </div>
          </div>
        </div>
        <script>
          function printCard() {
            window.print();
          }
        </script>
        <div class="print-button-container" style="
          position: fixed;
          bottom: 20px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 1000;
          text-align: center;
        ">
          <button onclick="printCard()" style="
            background: #001f3f;
            color: white;
            padding: 12px 40px;
            border: none;
            border-radius: 5px;
            font-size: 16px;
            cursor: pointer;
            font-family: 'Times New Roman', serif;
            font-weight: bold;
            box-shadow: 0 4px 8px rgba(0,0,0,0.3);
            transition: all 0.3s ease;
          "
          onmouseover="this.style.background='#003366'; this.style.transform='scale(1.05)';"
          onmouseout="this.style.background='#001f3f'; this.style.transform='scale(1)';"
          >Print ID Card</button>
        </div>
        <style>
          @media print {
            .print-button-container { display: none !important; }
          }
        </style>
      </body>
      </html>
    `

    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    printWindow.document.write(idCardContent)
    printWindow.document.close()
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Employee Management</h1>
        <p>Manage employee records and account access</p>
      </div>

      {/* Add Employee Button */}
      {!showForm && (
        <div className="content-card">
          <button onClick={() => setShowForm(true)} className="btn btn-primary">
            + Add New Employee
          </button>
        </div>
      )}

      {/* Employee Form */}
      {showForm && (
        <div className="content-card" style={{
          border: editingEmployee ? '2px solid #3b82f6' : '1px solid #e5e7eb',
          boxShadow: editingEmployee ? '0 4px 6px rgba(59, 130, 246, 0.1)' : 'none'
        }}>
          <h2 style={{
            marginBottom: '24px',
            color: editingEmployee ? '#3b82f6' : 'inherit'
          }}>
            {editingEmployee ? '✏️ Edit Employee' : '➕ Add New Employee'}
          </h2>
          
          <form onSubmit={handleSubmit}>
            {/* Photo Section - Upload or URL */}
            <div style={{ marginBottom: '24px', padding: '20px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <label style={{ display: 'block', marginBottom: '12px', fontWeight: '600', fontSize: '16px', color: '#1e293b' }}>
                Employee Photo
              </label>

              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '12px' }}>
                <label style={{
                  padding: '10px 20px',
                  background: '#4f46e5',
                  color: 'white',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '500',
                  fontSize: '14px',
                  transition: 'background 0.2s',
                  display: 'inline-block'
                }}>
                  Upload Photo
                  <input
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={async (e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        if (file.size > 5 * 1024 * 1024) {
                          alert('Image size should be less than 5MB')
                          return
                        }
                        try {
                          // Compress the image before storing
                          const compressedBase64 = await compressImage(file, 200, 200, 0.6)
                          const sizeInKB = getBase64SizeInKB(compressedBase64)
                          setPhotoData(compressedBase64)
                          setFormData({...formData, photo: compressedBase64})
                        } catch (error) {
                          alert('Failed to process image. Please try again.')
                        }
                      }
                    }}
                  />
                </label>

                <span style={{ color: '#64748b', fontSize: '14px' }}>OR</span>

                <input
                  type="text"
                  placeholder="Enter photo URL"
                  value={formData.photo.startsWith('data:') ? '' : formData.photo}
                  onChange={(e) => {
                    // For URL images, store as-is (they're already optimized on the server)
                    setFormData({...formData, photo: e.target.value})
                    setPhotoData(e.target.value)
                  }}
                  style={{
                    flex: 1,
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '15px'
                  }}
                />
              </div>

              {(photoData || formData.photo) && (
                <div style={{ textAlign: 'center' }}>
                  <img
                    src={photoData || formData.photo}
                    alt="Employee preview"
                    style={{
                      maxWidth: '150px',
                      maxHeight: '150px',
                      objectFit: 'cover',
                      borderRadius: '8px',
                      border: '2px solid #e5e7eb'
                    }}
                    onError={(e) => {
                      e.currentTarget.style.display = 'none'
                    }}
                  />
                  {photoData && photoData.startsWith('data:') && (
                    <p style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                      Image compressed to ~{getBase64SizeInKB(photoData)}KB
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setPhotoData(null)
                      setFormData({...formData, photo: ''})
                    }}
                    style={{
                      display: 'block',
                      margin: '8px auto 0',
                      padding: '4px 12px',
                      background: '#ef4444',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      fontSize: '12px',
                      cursor: 'pointer'
                    }}
                  >
                    Remove Photo
                  </button>
                </div>
              )}
            </div>

            {/* Form Fields in Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '24px',
              padding: '24px',
              background: '#ffffff',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              marginBottom: '24px'
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontWeight: '500', fontSize: 'clamp(12px, 2.5vw, 14px)', color: '#475569' }}>Username *</label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({...formData, username: e.target.value})}
                  required
                  disabled={editingEmployee !== null}
                  style={{ 
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '15px',
                    background: editingEmployee ? '#f1f5f9' : '#ffffff'
                  }}
                />
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontWeight: '500', fontSize: 'clamp(12px, 2.5vw, 14px)', color: '#475569' }}>Password *</label>
                <input
                  type="text"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  placeholder={editingEmployee ? 'Leave blank to keep current' : 'Enter password'}
                  required={!editingEmployee}
                  style={{ 
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '15px'
                  }}
                />
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontWeight: '500', fontSize: 'clamp(12px, 2.5vw, 14px)', color: '#475569' }}>Full Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required
                  style={{ 
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '15px'
                  }}
                />
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontWeight: '500', fontSize: 'clamp(12px, 2.5vw, 14px)', color: '#475569' }}>Mobile Number *</label>
                <input
                  type="tel"
                  value={formData.mobile}
                  onChange={(e) => setFormData({...formData, mobile: e.target.value})}
                  required
                  pattern="[0-9]{10}"
                  maxLength={10}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '15px'
                  }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontWeight: '500', fontSize: 'clamp(12px, 2.5vw, 14px)', color: '#475569' }}>Date of Birth *</label>
                <input
                  type="date"
                  value={formData.dob}
                  onChange={(e) => setFormData({...formData, dob: e.target.value})}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '15px'
                  }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontWeight: '500', fontSize: 'clamp(12px, 2.5vw, 14px)', color: '#475569' }}>Aadhar Number</label>
                <input
                  type="text"
                  value={formData.aadharNumber}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '')
                    if (value.length <= 12) {
                      setFormData({...formData, aadharNumber: value})
                    }
                  }}
                  placeholder="Enter 12-digit Aadhar number"
                  pattern="[0-9]{12}"
                  maxLength={12}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '15px'
                  }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontWeight: '500', fontSize: 'clamp(12px, 2.5vw, 14px)', color: '#475569' }}>Work Type *</label>
                <input
                  type="text"
                  value={formData.work}
                  onChange={(e) => setFormData({...formData, work: e.target.value})}
                  required
                  placeholder="Enter work type"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '15px'
                  }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontWeight: '500', fontSize: 'clamp(12px, 2.5vw, 14px)', color: '#475569' }}>Monthly Salary (₹) *</label>
                <input
                  type="number"
                  value={formData.salary}
                  onChange={(e) => setFormData({...formData, salary: e.target.value})}
                  required
                  min="0"
                  step="500"
                  placeholder="Enter monthly salary"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '15px'
                  }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontWeight: '500', fontSize: 'clamp(12px, 2.5vw, 14px)', color: '#475569' }}>Address</label>
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                  placeholder="Enter complete address"
                  rows={2}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '15px',
                    resize: 'vertical',
                    minHeight: '60px'
                  }}
                />
              </div>
            </div>

            <div className="btn-group">
              <button type="submit" className="btn btn-primary" disabled={isLoading}>
                {isLoading ? 'Saving...' : editingEmployee ? 'Update Employee' : 'Create Employee'}
              </button>
              <button type="button" onClick={resetForm} className="btn btn-secondary">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Employees List */}
      <div className="content-card">
        <h2 style={{ marginBottom: '20px' }}>Employee List</h2>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ textAlign: 'center' }}>Photo</th>
                <th style={{ textAlign: 'center' }}>ID</th>
                <th style={{ textAlign: 'center' }}>Name</th>
                <th style={{ textAlign: 'center' }}>Username</th>
                <th style={{ textAlign: 'center' }}>DOB</th>
                <th style={{ textAlign: 'center' }}>Mobile</th>
                <th style={{ textAlign: 'center' }}>Aadhar</th>
                <th style={{ textAlign: 'center' }}>Address</th>
                <th style={{ textAlign: 'center' }}>Work</th>
                <th style={{ textAlign: 'center' }}>Salary</th>
                <th style={{ textAlign: 'center' }}>Status</th>
                <th style={{ textAlign: 'center', width: '120px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={12} style={{ textAlign: 'center', padding: '40px' }}>
                    Loading employees...
                  </td>
                </tr>
              ) : employees.length > 0 ? (
                employees.map(employee => (
                  <tr key={employee._id}>
                    <td style={{ textAlign: 'center' }}>
                      {employee.photo ? (
                        <img
                          src={employee.photo}
                          alt={employee.name}
                          style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            objectFit: 'cover',
                            transform: 'scaleX(-1)',
                            margin: '0 auto',
                            display: 'block'
                          }}
                        />
                      ) : (
                        <div style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '50%',
                          background: '#e5e7eb',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '16px',
                          fontWeight: '600',
                          color: '#6b7280',
                          margin: '0 auto'
                        }}>
                          {employee.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </td>
                    <td style={{ fontWeight: '600', textAlign: 'center' }}>{employee.employeeId}</td>
                    <td style={{ textAlign: 'center' }}>{employee.name}</td>
                    <td style={{ textAlign: 'center' }}>{employee.username}</td>
                    <td style={{ textAlign: 'center' }}>{employee.dob ? new Date(employee.dob).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-'}</td>
                    <td style={{ textAlign: 'center' }}>{employee.mobile || '-'}</td>
                    <td style={{ textAlign: 'center' }}>{employee.aadharNumber ? `XXXX-${employee.aadharNumber.slice(-4)}` : '-'}</td>
                    <td style={{ textAlign: 'center' }}>{employee.address?.street || '-'}</td>
                    <td style={{ textAlign: 'center' }}>{employee.work || '-'}</td>
                    <td style={{ textAlign: 'center' }}>₹{employee.salary?.toLocaleString() || '0'}</td>
                    <td style={{ textAlign: 'center' }}>
                      <span className={`badge ${employee.status === 'active' ? 'badge-success' : 'badge-danger'}`}>
                        {employee.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{
                        display: 'flex',
                        gap: '4px',
                        justifyContent: 'center',
                        alignItems: 'center'
                      }}>
                        <button
                          onClick={() => handleEdit(employee)}
                          title="Edit Employee"
                          style={{
                            padding: '6px 8px',
                            background: 'transparent',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '16px',
                            transition: 'all 0.2s',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            minWidth: 'auto'
                          }}
                          onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.2)'}
                          onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => generateIDCard(employee)}
                          title="Generate ID Card"
                          style={{
                            padding: '6px 8px',
                            background: 'transparent',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '16px',
                            transition: 'all 0.2s',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            minWidth: 'auto'
                          }}
                          onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.2)'}
                          onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                        >
                          🆔
                        </button>
                        <button
                          onClick={() => handleDelete(employee._id)}
                          title="Delete Employee"
                          style={{
                            padding: '6px 8px',
                            background: 'transparent',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '16px',
                            transition: 'all 0.2s',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            minWidth: 'auto'
                          }}
                          onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.2)'}
                          onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={12} className="empty-state">
                    <div className="empty-state-icon">👥</div>
                    <h3>No Employees</h3>
                    <p>Click "Add New Employee" to get started</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}