import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import api from '../api'

const emptyForm = {
  category_id: '',
  product_name: '',
  product_type: 'Goods',
  sales_price: '',
  cost_price: '',
}

function ProductsPage() {

  const [products, setProducts]       = useState([])
  const [categories, setCategories]   = useState([])
  const [showForm, setShowForm]       = useState(false)
  const [editingId, setEditingId]     = useState(null)
  const [formData, setFormData]       = useState(emptyForm)
  const [imageFile, setImageFile]     = useState(null)
  const [filterCat, setFilterCat]     = useState('All')
  const [error, setError]             = useState('')
  const [success, setSuccess]         = useState('')
  const [loading, setLoading]         = useState(false)

  const navigate = useNavigate()
  const location = useLocation()
  const loginId  = localStorage.getItem('login_id') || 'User'

  const navLinks = [
    { label: 'Dashboard',  path: '/dashboard'  },
    { label: 'Contacts',   path: '/contacts'   },
    { label: 'Categories', path: '/categories' },
    { label: 'Products',   path: '/products'   },
  ]

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('login_id')
    navigate('/login')
  }

  // Load both products and categories when page first opens.
  // We need categories to populate the dropdown in the form.
  useEffect(() => {
    fetchProducts()
    fetchCategories()
  }, [])

  const fetchProducts = async () => {
    try {
      const r = await api.get('/products/')
      setProducts(r.data)
    } catch (err) {
      setError('Failed to load products.')
    }
  }

  // fetchCategories: loads all categories for the dropdown.
  // The user picks a category from a <select> — no need to type an id.
  const fetchCategories = async () => {
    try {
      const r = await api.get('/categories/')
      setCategories(r.data)
    } catch (err) {
      console.error('Failed to load categories.')
    }
  }

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  // handleImageChange: runs when user picks a file.
  // e.target.files is a FileList — [0] gets the first (and only) file.
  // We store it in imageFile state — it will be uploaded after save.
  const handleImageChange = (e) => {
    setImageFile(e.target.files[0] || null)
  }

  const openAddForm = () => {
    setFormData(emptyForm)
    setEditingId(null)
    setImageFile(null)
    setError('')
    setSuccess('')
    setShowForm(true)
  }

  const openEditForm = (product) => {
    setFormData({
      category_id:  product.category_id,
      product_name: product.product_name,
      product_type: product.product_type || 'Goods',
      sales_price:  product.sales_price,
      cost_price:   product.cost_price,
    })
    setEditingId(product.id)
    setImageFile(null)
    setError('')
    setSuccess('')
    setShowForm(true)
  }

  const closeForm = () => {
    setShowForm(false)
    setEditingId(null)
    setFormData(emptyForm)
    setImageFile(null)
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    // Build the JSON payload.
    // category_id and prices come as strings from the form inputs.
    // We convert them to numbers before sending.
    // Number("") → NaN, so empty fields are caught by "required" on the input.
    const payload = {
      category_id:  Number(formData.category_id),
      product_name: formData.product_name,
      product_type: formData.product_type || null,
      sales_price:  Number(formData.sales_price),
      cost_price:   Number(formData.cost_price),
    }

    try {
      let savedProduct

      if (editingId) {
        // PUT /products/{id} — update existing product
        const r = await api.put(`/products/${editingId}`, payload)
        savedProduct = r.data
        setSuccess('Product updated.')
      } else {
        // POST /products/ — create new product
        const r = await api.post('/products/', payload)
        savedProduct = r.data
        setSuccess('Product created.')
      }

      // If the user picked an image file, upload it now.
      // We upload AFTER saving the product because we need the product's id.
      // Image upload uses FormData, not JSON.
      if (imageFile) {
        // FormData is the browser's built-in class for multipart form data.
        // .append("file", imageFile) adds the file with the key "file".
        // FastAPI's File(...) expects the key to be "file".
        const fd = new FormData()
        fd.append('file', imageFile)

        // We do NOT set Content-Type manually here.
        // When you pass FormData to axios, it automatically sets:
        // Content-Type: multipart/form-data; boundary=...
        // Setting it manually would break the boundary — never do that.
        await api.post(`/products/${savedProduct.id}/upload-image`, fd)
        setSuccess(editingId ? 'Product updated with image.' : 'Product created with image.')
      }

      await fetchProducts()
      closeForm()

    } catch (err) {
      if (err.response?.data?.detail) {
        const detail = err.response.data.detail
        // detail can be a string or an array of validation errors
        if (Array.isArray(detail)) {
          setError(detail.map(d => d.msg).join(', '))
        } else {
          setError(detail)
        }
      } else {
        setError('Something went wrong.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete product "${name}"?`)) return
    try {
      await api.delete(`/products/${id}`)
      setSuccess(`"${name}" deleted.`)
      await fetchProducts()
    } catch (err) {
      if (err.response?.data?.detail) {
        setError(err.response.data.detail)
      } else {
        setError('Failed to delete.')
      }
    }
  }

  // Client-side category filter.
  // If filterCat is "All", show everything.
  // Otherwise show only products whose category_name matches the filter.
  const filtered = filterCat === 'All'
    ? products
    : products.filter(p => p.category?.category_name === filterCat)

  return (
    <div className="dashboard-container">

      <nav className="navbar">
        <div className="navbar-brand">🪑 Urban Furniture Accounting</div>
        <div className="navbar-links">
          {navLinks.map(link => (
            <button
              key={link.path}
              className={`nav-link ${location.pathname === link.path ? 'nav-link-active' : ''}`}
              onClick={() => navigate(link.path)}
            >
              {link.label}
            </button>
          ))}
        </div>
        <div className="navbar-user">
          <span>Welcome, <strong>{loginId}</strong></span>
          <button onClick={handleLogout} className="logout-button">Logout</button>
        </div>
      </nav>

      <div className="page-container">

        <div className="page-header">
          <div>
            <h2>Products</h2>
            <p className="page-subtitle">Manage your furniture product catalogue</p>
          </div>
          <button className="btn-primary" onClick={openAddForm}>+ Add Product</button>
        </div>

        {success && <div className="success-message" style={{marginBottom:'16px'}}>✅ {success}</div>}
        {!showForm && error && <div className="error-message" style={{marginBottom:'16px'}}>⚠️ {error}</div>}

        {showForm && (
          <div className="form-card">
            <h3>{editingId ? 'Edit Product' : 'Add New Product'}</h3>

            <form onSubmit={handleSubmit} className="contact-form">

              <div className="form-row">
                <div className="form-group">
                  <label>Category *</label>
                  {/* select dropdown populated from categories state.
                      When user picks "Sofas", the value is the category id (1).
                      This id is what we send to the API as category_id. */}
                  <select
                    name="category_id"
                    value={formData.category_id}
                    onChange={handleChange}
                    className="form-select"
                    required
                  >
                    <option value="">-- Select Category --</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>
                        {cat.category_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Product Name *</label>
                  <input
                    type="text"
                    name="product_name"
                    value={formData.product_name}
                    onChange={handleChange}
                    placeholder="e.g. L-Shape Sofa"
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Product Type</label>
                  <select
                    name="product_type"
                    value={formData.product_type}
                    onChange={handleChange}
                    className="form-select"
                  >
                    <option value="Goods">Goods</option>
                    <option value="Service">Service</option>
                    <option value="Consumable">Consumable</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Sales Price (₹) *</label>
                  <input
                    type="number"
                    name="sales_price"
                    value={formData.sales_price}
                    onChange={handleChange}
                    placeholder="e.g. 45000"
                    min="0"
                    step="0.01"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Cost Price (₹) *</label>
                  <input
                    type="number"
                    name="cost_price"
                    value={formData.cost_price}
                    onChange={handleChange}
                    placeholder="e.g. 28000"
                    min="0"
                    step="0.01"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Product Image (optional)</label>
                {/* type="file" opens the file picker dialog.
                    accept="image/*" restricts to image files only.
                    onChange stores the selected file in imageFile state. */}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  style={{ padding: '8px 0' }}
                />
                {/* Show selected filename so user knows what is picked */}
                {imageFile && (
                  <span style={{fontSize:'12px', color:'#666'}}>
                    Selected: {imageFile.name}
                  </span>
                )}
              </div>

              {error && <div className="error-message">⚠️ {error}</div>}

              <div className="form-actions">
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? 'Saving...' : editingId ? 'Update Product' : 'Create Product'}
                </button>
                <button type="button" className="btn-secondary" onClick={closeForm}>
                  Cancel
                </button>
              </div>

            </form>
          </div>
        )}

        <div className="card">
          <div className="table-toolbar">
            <span className="contact-count">
              {filtered.length} product{filtered.length !== 1 ? 's' : ''}
            </span>
            {/* Category filter tabs — built dynamically from loaded categories */}
            <div className="filter-tabs">
              <button
                className={`filter-tab ${filterCat === 'All' ? 'active' : ''}`}
                onClick={() => setFilterCat('All')}
              >
                All
              </button>
              {categories.map(cat => (
                <button
                  key={cat.id}
                  className={`filter-tab ${filterCat === cat.category_name ? 'active' : ''}`}
                  onClick={() => setFilterCat(cat.category_name)}
                >
                  {cat.category_name}
                </button>
              ))}
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="empty-state">No products found. Click "+ Add Product" to create one.</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Image</th>
                  <th>ID</th>
                  <th>Product Name</th>
                  <th>Category</th>
                  <th>Type</th>
                  <th>Sales Price</th>
                  <th>Cost Price</th>
                  <th>Profit</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(product => (
                  <tr key={product.id}>
                    <td>
                      {/* If product has an image, show a thumbnail.
                          We build the URL using the stored filename.
                          The /uploads/ path is served by FastAPI's StaticFiles.
                          onError: if image fails to load, hide the broken icon. */}
                      {product.image ? (
                        <img
                          src={`http://127.0.0.1:8000/uploads/${product.image}`}
                          alt={product.product_name}
                          style={{width:'48px', height:'48px', objectFit:'cover', borderRadius:'6px'}}
                          onError={(e) => { e.target.style.display = 'none' }}
                        />
                      ) : (
                        <div style={{
                          width:'48px', height:'48px', background:'#f0f2f5',
                          borderRadius:'6px', display:'flex', alignItems:'center',
                          justifyContent:'center', fontSize:'20px'
                        }}>
                          🪑
                        </div>
                      )}
                    </td>
                    <td>{product.id}</td>
                    <td><strong>{product.product_name}</strong></td>
                    <td>{product.category?.category_name || '—'}</td>
                    <td>
                      {product.product_type ? (
                        <span className="role-badge role-accountant">
                          {product.product_type}
                        </span>
                      ) : '—'}
                    </td>
                    <td>₹{Number(product.sales_price).toLocaleString('en-IN')}</td>
                    <td>₹{Number(product.cost_price).toLocaleString('en-IN')}</td>
                    <td style={{color: Number(product.sales_price) > Number(product.cost_price) ? '#00aa44' : '#cc0000', fontWeight:600}}>
                      {/* Profit = sales_price - cost_price.
                          Green if profitable, red if at a loss.
                          toLocaleString formats with Indian number system commas. */}
                      ₹{(Number(product.sales_price) - Number(product.cost_price)).toLocaleString('en-IN')}
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button className="btn-edit" onClick={() => openEditForm(product)}>Edit</button>
                        <button className="btn-delete" onClick={() => handleDelete(product.id, product.product_name)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

      </div>
    </div>
  )
}

export default ProductsPage
