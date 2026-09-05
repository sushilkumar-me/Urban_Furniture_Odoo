import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api'

const emptyForm = {
  category_id:  '',
  product_name: '',
  product_type: 'Goods',
  sales_price:  '',
  cost_price:   '',
  image:        ''
}

function ProductsPage() {

  const [products, setProducts]       = useState([])
  const [categories, setCategories]   = useState([])
  const [showForm, setShowForm]       = useState(false)
  const [editingId, setEditingId]     = useState(null)
  const [formData, setFormData]       = useState(emptyForm)
  const [imageFile, setImageFile]     = useState(null)
  const [previewUrl, setPreviewUrl]   = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode]       = useState('list') // 'list' | 'kanban'
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize                      = 15
  const [error, setError]             = useState('')
  const [success, setSuccess]         = useState('')
  const [loading, setLoading]         = useState(false)

  const fileInputRef = useRef(null)
  const navigate     = useNavigate()

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
    if (error) setError('')
  }

  const handleImageChange = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('Image file must be smaller than 5MB.')
        return
      }
      setImageFile(file)
      setPreviewUrl(URL.createObjectURL(file))
      if (error) setError('')
    }
  }

  const removeImage = (e) => {
    e.stopPropagation()
    setImageFile(null)
    setPreviewUrl('')
    setFormData(prev => ({ ...prev, image: '' }))
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const openAddForm = () => {
    setFormData(emptyForm)
    setEditingId(null)
    setImageFile(null)
    setPreviewUrl('')
    setError('')
    setSuccess('')
    setShowForm(true)
  }

  const openEditForm = (product) => {
    setFormData({
      category_id:  product.category_id || '',
      product_name: product.product_name || '',
      product_type: product.product_type || 'Goods',
      sales_price:  product.sales_price || '',
      cost_price:   product.cost_price || '',
      image:        product.image || ''
    })
    setEditingId(product.id)
    setImageFile(null)
    setPreviewUrl(
      product.image
        ? product.image.startsWith('http') || product.image.startsWith('data:')
          ? product.image
          : `http://127.0.0.1:8000/uploads/${product.image}`
        : ''
    )
    setError('')
    setSuccess('')
    setShowForm(true)
  }

  const closeForm = () => {
    setShowForm(false)
    setEditingId(null)
    setFormData(emptyForm)
    setImageFile(null)
    setPreviewUrl('')
    setError('')
  }

  const handleNew = () => {
    setFormData(emptyForm)
    setEditingId(null)
    setImageFile(null)
    setPreviewUrl('')
    setError('')
    setSuccess('')
  }

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault()
    setError('')

    if (!formData.product_name.trim()) {
      setError('Product Name is required.')
      return
    }

    if (!formData.category_id) {
      setError('Please select a Category.')
      return
    }

    if (formData.sales_price === '' || isNaN(Number(formData.sales_price))) {
      setError('Please enter a valid Sales Price.')
      return
    }

    if (formData.cost_price === '' || isNaN(Number(formData.cost_price))) {
      setError('Please enter a valid Cost Price.')
      return
    }

    setLoading(true)

    const payload = {
      category_id:  Number(formData.category_id),
      product_name: formData.product_name.trim(),
      product_type: formData.product_type || 'Goods',
      sales_price:  Number(formData.sales_price),
      cost_price:   Number(formData.cost_price),
    }

    try {
      let savedProduct

      if (editingId) {
        const r = await api.put(`/products/${editingId}`, payload)
        savedProduct = r.data
        setSuccess('Product updated successfully.')
      } else {
        const r = await api.post('/products/', payload)
        savedProduct = r.data
        setSuccess('Product created successfully.')
      }

      // If user uploaded a new image file, upload it
      if (imageFile && savedProduct?.id) {
        try {
          const fd = new FormData()
          fd.append('file', imageFile)
          await api.post(`/products/${savedProduct.id}/upload-image`, fd)
        } catch (uploadErr) {
          console.warn('Image upload error:', uploadErr)
        }
      }

      await fetchProducts()
      closeForm()

    } catch (err) {
      console.error('Save product error:', err)
      const detail = err.response?.data?.detail
      if (detail) {
        if (Array.isArray(detail)) {
          setError(detail.map(d => d.msg || d.loc?.join('.')).join(' | '))
        } else if (typeof detail === 'object') {
          setError(JSON.stringify(detail))
        } else {
          setError(String(detail))
        }
      } else {
        setError(err.message || 'Something went wrong saving product.')
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
      setSelectedIds(prev => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
      await fetchProducts()
    } catch (err) {
      const detail = err.response?.data?.detail
      setError(typeof detail === 'string' ? detail : 'Failed to delete product.')
    }
  }

  // Row selection handlers
  const handleToggleSelectAll = (visibleItems) => {
    const allSelected = visibleItems.every(p => selectedIds.has(p.id))
    const next = new Set(selectedIds)
    if (allSelected) {
      visibleItems.forEach(p => next.delete(p.id))
    } else {
      visibleItems.forEach(p => next.add(p.id))
    }
    setSelectedIds(next)
  }

  const handleToggleSelectOne = (id, e) => {
    e.stopPropagation()
    const next = new Set(selectedIds)
    if (next.has(id)) {
      next.delete(id)
    } else {
      next.add(id)
    }
    setSelectedIds(next)
  }

  // Filter & search products
  const filtered = products.filter(p => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      const matchName = (p.product_name || '').toLowerCase().includes(q)
      const matchCat  = (p.category?.category_name || '').toLowerCase().includes(q)
      const matchType = (p.product_type || '').toLowerCase().includes(q)
      if (!matchName && !matchCat && !matchType) return false
    }
    return true
  })

  // Pagination
  const totalPages = Math.ceil(filtered.length / pageSize) || 1
  const startIdx = (currentPage - 1) * pageSize
  const paginatedProducts = filtered.slice(startIdx, startIdx + pageSize)

  // Underlined input styling matching wireframe
  const underlineInputStyle = {
    width: '100%',
    border: 'none',
    borderBottom: '2px solid #94a3b8',
    background: 'transparent',
    padding: '8px 4px',
    fontSize: '15px',
    outline: 'none',
    color: '#1e293b',
    transition: 'border-color 0.15s ease'
  }

  const resolveImage = (img) => {
    if (!img) return null
    if (img.startsWith('http') || img.startsWith('data:')) return img
    return `http://127.0.0.1:8000/uploads/${img}`
  }

  return (
    <div className="page-container" style={{ maxWidth: '960px', margin: '0 auto', padding: '24px 16px' }}>

      {/* Global Notifications */}
      {success && (
        <div className="success-message" style={{ marginBottom: '16px' }}>
          ✅ {success}
        </div>
      )}
      {!showForm && error && (
        <div className="error-message" style={{ marginBottom: '16px' }}>
          ⚠️ {error}
        </div>
      )}

      {/* ============================================================ */}
      {/* 1. PRODUCT MASTER FORM VIEW                                  */}
      {/* ============================================================ */}
      {showForm ? (
        <div>
          {/* Top Title: Product Master Form View */}
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <h1 style={{
              fontSize: '28px',
              fontWeight: 800,
              color: '#1a1a2e',
              letterSpacing: '-0.5px',
              margin: 0
            }}>
              Product Master Form View
            </h1>
          </div>

          {/* Main Card Frame */}
          <div style={{
            background: '#ffffff',
            border: '2px solid #e2e8f0',
            borderRadius: '24px',
            padding: '28px 32px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.06)',
            marginBottom: '32px'
          }}>

            <form onSubmit={handleSubmit}>

              {/* Top Action Bar: [ New ] [ Confirm ]  ...  [ Back ] */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '24px'
              }}>
                <div style={{ display: 'flex', gap: '14px' }}>
                  <button
                    type="button"
                    onClick={handleNew}
                    style={{
                      background: '#ffffff',
                      border: '2px solid #0f3460',
                      color: '#0f3460',
                      fontWeight: 700,
                      fontSize: '15px',
                      borderRadius: '12px',
                      padding: '8px 26px',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = '#0f3460'; e.currentTarget.style.color = '#ffffff' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.color = '#0f3460' }}
                  >
                    New
                  </button>

                  <button
                    type="submit"
                    disabled={loading}
                    style={{
                      background: '#0f3460',
                      border: '2px solid #0f3460',
                      color: '#ffffff',
                      fontWeight: 700,
                      fontSize: '15px',
                      borderRadius: '12px',
                      padding: '8px 28px',
                      cursor: 'pointer',
                      boxShadow: '0 3px 10px rgba(15, 52, 96, 0.25)',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = '#16213e' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = '#0f3460' }}
                  >
                    {loading ? 'Confirming...' : 'Confirm'}
                  </button>
                </div>

                <div>
                  <button
                    type="button"
                    onClick={closeForm}
                    style={{
                      background: '#ffffff',
                      border: '2px solid #64748b',
                      color: '#475569',
                      fontWeight: 700,
                      fontSize: '15px',
                      borderRadius: '12px',
                      padding: '8px 26px',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = '#f1f5f9' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = '#ffffff' }}
                  >
                    Back
                  </button>
                </div>
              </div>

              {/* Error banner inside form */}
              {error && (
                <div className="error-message" style={{ marginBottom: '20px' }}>
                  ⚠️ {error}
                </div>
              )}

              {/* Product Name Top Field */}
              <div style={{ marginBottom: '32px' }}>
                <label htmlFor="product_name" style={{ fontSize: '18px', fontWeight: 700, color: '#1a1a2e', display: 'block', marginBottom: '8px' }}>
                  Product Name *
                </label>
                <input
                  type="text"
                  id="product_name"
                  name="product_name"
                  value={formData.product_name}
                  onChange={handleChange}
                  placeholder="e.g. Executive Ergonomic Office Chair"
                  required
                  style={{
                    ...underlineInputStyle,
                    fontSize: '20px',
                    fontWeight: 700,
                    borderBottomColor: '#0f3460',
                    paddingBottom: '10px'
                  }}
                  onFocus={(e) => e.target.style.borderBottomColor = '#0f3460'}
                  onBlur={(e) => e.target.style.borderBottomColor = '#0f3460'}
                />
              </div>

              {/* 2-Column Body: Left Fields + Right Upload Image */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1.4fr 1fr',
                gap: '40px',
                alignItems: 'start'
              }}>

                {/* Left Column: Product Type, Category, Sales Price, Cost */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>

                  {/* Product Type (Goods / Service / Combo) */}
                  <div>
                    <label style={{ fontSize: '14px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '8px' }}>
                      Product Type
                    </label>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      {['Goods', 'Service', 'Combo'].map(type => (
                        <button
                          type="button"
                          key={type}
                          onClick={() => setFormData({ ...formData, product_type: type })}
                          style={{
                            background: formData.product_type === type ? '#0f3460' : '#f1f5f9',
                            color: formData.product_type === type ? '#ffffff' : '#475569',
                            border: 'none',
                            borderRadius: '10px',
                            padding: '8px 20px',
                            fontSize: '13px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Category Dropdown */}
                  <div>
                    <label htmlFor="category_id" style={{ fontSize: '14px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>
                      Category *
                    </label>
                    <select
                      id="category_id"
                      name="category_id"
                      value={formData.category_id}
                      onChange={handleChange}
                      required
                      style={{
                        ...underlineInputStyle,
                        cursor: 'pointer'
                      }}
                      onFocus={(e) => e.target.style.borderBottomColor = '#0f3460'}
                      onBlur={(e) => e.target.style.borderBottomColor = '#94a3b8'}
                    >
                      <option value="">-- Select Category --</option>
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>
                          {cat.category_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Sales Price */}
                  <div>
                    <label htmlFor="sales_price" style={{ fontSize: '14px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>
                      Sales Price (₹) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      id="sales_price"
                      name="sales_price"
                      value={formData.sales_price}
                      onChange={handleChange}
                      placeholder="0.00"
                      required
                      style={underlineInputStyle}
                      onFocus={(e) => e.target.style.borderBottomColor = '#0f3460'}
                      onBlur={(e) => e.target.style.borderBottomColor = '#94a3b8'}
                    />
                  </div>

                  {/* Cost Price */}
                  <div>
                    <label htmlFor="cost_price" style={{ fontSize: '14px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>
                      Cost (Purchase Price ₹) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      id="cost_price"
                      name="cost_price"
                      value={formData.cost_price}
                      onChange={handleChange}
                      placeholder="0.00"
                      required
                      style={underlineInputStyle}
                      onFocus={(e) => e.target.style.borderBottomColor = '#0f3460'}
                      onBlur={(e) => e.target.style.borderBottomColor = '#94a3b8'}
                    />
                  </div>

                </div>

                {/* Right Column: Upload Image Box */}
                <div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageChange}
                    accept="image/*"
                    style={{ display: 'none' }}
                  />

                  <div
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      border: '2px dashed #94a3b8',
                      borderRadius: '22px',
                      background: '#f8fafc',
                      minHeight: '260px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      padding: '20px',
                      textAlign: 'center',
                      position: 'relative',
                      transition: 'all 0.18s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#0f3460'
                      e.currentTarget.style.backgroundColor = '#f1f5f9'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#94a3b8'
                      e.currentTarget.style.backgroundColor = '#f8fafc'
                    }}
                  >
                    {previewUrl ? (
                      <div style={{ position: 'relative', width: '100%', height: '100%', textAlign: 'center' }}>
                        <img
                          src={previewUrl}
                          alt="Product Preview"
                          style={{
                            maxHeight: '200px',
                            maxWidth: '100%',
                            objectFit: 'contain',
                            borderRadius: '14px',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                          }}
                        />
                        <button
                          type="button"
                          onClick={removeImage}
                          style={{
                            position: 'absolute',
                            top: '-8px',
                            right: '-8px',
                            background: '#ef4444',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '50%',
                            width: '26px',
                            height: '26px',
                            fontWeight: 800,
                            fontSize: '12px',
                            cursor: 'pointer',
                            boxShadow: '0 2px 6px rgba(0,0,0,0.2)'
                          }}
                          title="Remove Image"
                        >
                          ✕
                        </button>
                        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '8px' }}>
                          Click to change image
                        </div>
                      </div>
                    ) : (
                      <>
                        <div style={{ fontSize: '42px', color: '#64748b', marginBottom: '8px' }}>
                          🛋️
                        </div>
                        <div style={{ fontSize: '18px', fontWeight: 800, color: '#1e293b', marginBottom: '4px' }}>
                          Upload Image
                        </div>
                        <div style={{ fontSize: '12px', color: '#64748b' }}>
                          JPG, PNG, WebP (max 5MB)
                        </div>
                      </>
                    )}
                  </div>
                </div>

              </div>

            </form>

          </div>
        </div>
      ) : (
        /* ============================================================ */
        /* 2. PRODUCT MASTER LIST VIEW                                  */
        /* ============================================================ */
        <div>
          {/* Top Title: Product Master List View */}
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <h1 style={{
              fontSize: '28px',
              fontWeight: 800,
              color: '#1a1a2e',
              letterSpacing: '-0.5px',
              margin: 0
            }}>
              Product Master List View
            </h1>
          </div>

          {/* Main Card Frame */}
          <div style={{
            background: '#ffffff',
            border: '2px solid #e2e8f0',
            borderRadius: '24px',
            padding: '24px 28px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.06)'
          }}>

            {/* Top Toolbar: [ New ] ... [ Search ] ... [ Back ] ... [ List | Kanban Icons ] */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
              marginBottom: '24px',
              flexWrap: 'wrap'
            }}>
              {/* Left: [ New ] Button */}
              <button
                type="button"
                onClick={openAddForm}
                style={{
                  background: '#0f3460',
                  border: '2px solid #0f3460',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '15px',
                  borderRadius: '12px',
                  padding: '8px 28px',
                  cursor: 'pointer',
                  boxShadow: '0 3px 10px rgba(15, 52, 96, 0.2)',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#16213e'}
                onMouseLeave={(e) => e.currentTarget.style.background = '#0f3460'}
              >
                New
              </button>

              {/* Center: [ Search ] Input Bar */}
              <div style={{ flex: '1', maxWidth: '420px', position: 'relative' }}>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1) }}
                  placeholder="Search product, category, or type..."
                  style={{
                    width: '100%',
                    height: '42px',
                    borderRadius: '10px',
                    border: '2px solid #cbd5e1',
                    padding: '0 14px 0 36px',
                    fontSize: '14px',
                    outline: 'none',
                    color: '#1e293b',
                    background: '#f8fafc',
                    transition: 'border-color 0.15s ease'
                  }}
                  onFocus={(e) => { e.target.style.borderColor = '#0f3460'; e.target.style.background = '#ffffff' }}
                  onBlur={(e) => { e.target.style.borderColor = '#cbd5e1'; e.target.style.background = '#f8fafc' }}
                />
                <span style={{ position: 'absolute', left: '12px', top: '12px', fontSize: '14px', color: '#94a3b8' }}>
                  🔍
                </span>
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '10px',
                      background: 'transparent',
                      border: 'none',
                      fontSize: '14px',
                      color: '#94a3b8',
                      cursor: 'pointer'
                    }}
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Right Controls: [ Back ] + [ View Switcher ] */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <button
                  type="button"
                  onClick={() => navigate('/dashboard')}
                  style={{
                    background: '#ffffff',
                    border: '2px solid #64748b',
                    color: '#475569',
                    fontWeight: 700,
                    fontSize: '15px',
                    borderRadius: '12px',
                    padding: '8px 24px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#f1f5f9'}
                  onMouseLeave={(e) => e.currentTarget.style.background = '#ffffff'}
                >
                  Back
                </button>

                {/* View Switcher Icons */}
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  border: '2px solid #cbd5e1',
                  borderRadius: '10px',
                  overflow: 'hidden',
                  background: '#ffffff'
                }}>
                  <button
                    type="button"
                    title="List View"
                    onClick={() => setViewMode('list')}
                    style={{
                      border: 'none',
                      background: viewMode === 'list' ? '#0f3460' : 'transparent',
                      color: viewMode === 'list' ? '#ffffff' : '#64748b',
                      padding: '8px 12px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '16px',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    ☰
                  </button>

                  <button
                    type="button"
                    title="Kanban Cards View"
                    onClick={() => setViewMode('kanban')}
                    style={{
                      border: 'none',
                      background: viewMode === 'kanban' ? '#0f3460' : 'transparent',
                      color: viewMode === 'kanban' ? '#ffffff' : '#64748b',
                      padding: '8px 12px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '16px',
                      borderLeft: '1px solid #e2e8f0',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    ⊞
                  </button>
                </div>
              </div>
            </div>

            {/* Bulk Selection Notification Bar */}
            {selectedIds.size > 0 && (
              <div style={{
                background: '#e0f2fe',
                border: '1px solid #7dd3fc',
                borderRadius: '10px',
                padding: '8px 16px',
                marginBottom: '16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '13px',
                color: '#0369a1'
              }}>
                <span>
                  <strong>{selectedIds.size}</strong> product{selectedIds.size > 1 ? 's' : ''} selected
                </span>
                <button
                  onClick={() => setSelectedIds(new Set())}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#0284c7',
                    fontWeight: 700,
                    cursor: 'pointer',
                    textDecoration: 'underline'
                  }}
                >
                  Clear Selection
                </button>
              </div>
            )}

            {/* VIEW MODE 1: LIST TABLE (MATCHING EXCALIDRAW WIREFRAME) */}
            {viewMode === 'list' ? (
              <div style={{ overflowX: 'auto' }}>
                {filtered.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '48px 16px', color: '#94a3b8' }}>
                    No products found. Click <strong>New</strong> to create your first product.
                  </div>
                ) : (
                  <table style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    textAlign: 'left'
                  }}>
                    <thead>
                      <tr style={{
                        borderBottom: '2px solid #e2e8f0',
                        fontSize: '14px',
                        fontWeight: 700,
                        color: '#64748b'
                      }}>
                        {/* 1. Select Column */}
                        <th style={{ padding: '12px 14px', width: '50px' }}>
                          <input
                            type="checkbox"
                            checked={paginatedProducts.length > 0 && paginatedProducts.every(p => selectedIds.has(p.id))}
                            onChange={() => handleToggleSelectAll(paginatedProducts)}
                            style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#0f3460' }}
                          />
                        </th>
                        {/* 2. Product Column (Image + Name) */}
                        <th style={{ padding: '12px 14px' }}>Product</th>
                        {/* 3. Category Column */}
                        <th style={{ padding: '12px 14px' }}>Category</th>
                        {/* 4. Type Column */}
                        <th style={{ padding: '12px 14px' }}>Type</th>
                        {/* 5. Sales Price Column */}
                        <th style={{ padding: '12px 14px', textAlign: 'right' }}>Sales Price</th>
                        {/* 6. Cost Column */}
                        <th style={{ padding: '12px 14px', textAlign: 'right' }}>Cost</th>
                        {/* Actions */}
                        <th style={{ padding: '12px 14px', width: '60px', textAlign: 'right' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedProducts.map((product) => {
                        const isSelected = selectedIds.has(product.id)
                        const imgSrc = resolveImage(product.image)

                        return (
                          <tr
                            key={product.id}
                            onClick={() => openEditForm(product)}
                            style={{
                              borderBottom: '1px solid #f1f5f9',
                              cursor: 'pointer',
                              background: isSelected ? '#f0f9ff' : 'transparent',
                              transition: 'background-color 0.15s ease'
                            }}
                            onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.backgroundColor = '#f8fafc' }}
                            onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent' }}
                          >
                            {/* Checkbox */}
                            <td style={{ padding: '14px' }} onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => handleToggleSelectOne(product.id, e)}
                                style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#0f3460' }}
                              />
                            </td>

                            {/* Product Image & Name */}
                            <td style={{ padding: '14px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                {imgSrc ? (
                                  <img
                                    src={imgSrc}
                                    alt=""
                                    style={{
                                      width: '40px',
                                      height: '40px',
                                      borderRadius: '8px',
                                      objectFit: 'cover',
                                      border: '1px solid #e2e8f0'
                                    }}
                                  />
                                ) : (
                                  <div style={{
                                    width: '40px',
                                    height: '40px',
                                    borderRadius: '8px',
                                    background: '#f1f5f9',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '18px'
                                  }}>
                                    🛋️
                                  </div>
                                )}
                                <strong style={{ color: '#1a1a2e', fontSize: '15px' }}>
                                  {product.product_name}
                                </strong>
                              </div>
                            </td>

                            {/* Category */}
                            <td style={{ padding: '14px', color: '#475569', fontSize: '14px' }}>
                              <span style={{
                                background: '#f1f5f9',
                                color: '#334155',
                                padding: '3px 10px',
                                borderRadius: '6px',
                                fontSize: '12px',
                                fontWeight: 600
                              }}>
                                {product.category?.category_name || '—'}
                              </span>
                            </td>

                            {/* Type */}
                            <td style={{ padding: '14px' }}>
                              <span style={{
                                padding: '3px 10px',
                                borderRadius: '6px',
                                fontSize: '12px',
                                fontWeight: 700,
                                background: product.product_type === 'Goods' ? '#e0f2fe' : product.product_type === 'Service' ? '#fef3c7' : '#f3e8ff',
                                color: product.product_type === 'Goods' ? '#0369a1' : product.product_type === 'Service' ? '#b45309' : '#7e22ce'
                              }}>
                                {product.product_type || 'Goods'}
                              </span>
                            </td>

                            {/* Sales Price */}
                            <td style={{ padding: '14px', textAlign: 'right', fontWeight: 700, color: '#008844', fontSize: '15px' }}>
                              ₹{Number(product.sales_price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </td>

                            {/* Cost Price */}
                            <td style={{ padding: '14px', textAlign: 'right', fontWeight: 600, color: '#64748b', fontSize: '14px' }}>
                              ₹{Number(product.cost_price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </td>

                            {/* Delete Action Button */}
                            <td style={{ padding: '14px', textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => handleDelete(product.id, product.product_name)}
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  color: '#94a3b8',
                                  cursor: 'pointer',
                                  fontSize: '14px',
                                  padding: '4px'
                                }}
                                title="Delete Product"
                                onMouseEnter={(e) => e.currentTarget.style.color = '#ef4444'}
                                onMouseLeave={(e) => e.currentTarget.style.color = '#94a3b8'}
                              >
                                🗑️
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            ) : (
              /* VIEW MODE 2: KANBAN CARDS VIEW */
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                gap: '16px',
                paddingTop: '8px'
              }}>
                {paginatedProducts.map((product) => {
                  const imgSrc = resolveImage(product.image)
                  return (
                    <div
                      key={product.id}
                      onClick={() => openEditForm(product)}
                      style={{
                        border: '2px solid #e2e8f0',
                        borderRadius: '16px',
                        padding: '16px',
                        background: '#ffffff',
                        cursor: 'pointer',
                        display: 'flex',
                        gap: '14px',
                        alignItems: 'center',
                        transition: 'all 0.18s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = '#0f3460'
                        e.currentTarget.style.transform = 'translateY(-2px)'
                        e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.06)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = '#e2e8f0'
                        e.currentTarget.style.transform = 'translateY(0)'
                        e.currentTarget.style.boxShadow = 'none'
                      }}
                    >
                      {imgSrc ? (
                        <img
                          src={imgSrc}
                          alt={product.product_name}
                          style={{ width: '60px', height: '60px', borderRadius: '12px', objectFit: 'cover' }}
                        />
                      ) : (
                        <div style={{
                          width: '60px',
                          height: '60px',
                          borderRadius: '12px',
                          background: '#f1f5f9',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '24px'
                        }}>
                          🛋️
                        </div>
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 800, color: '#1a1a2e', fontSize: '15px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {product.product_name}
                        </div>
                        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                          {product.category?.category_name || 'General'}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                          <span style={{ fontSize: '14px', fontWeight: 800, color: '#008844' }}>
                            ₹{Number(product.sales_price).toLocaleString('en-IN')}
                          </span>
                          <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                            Cost: ₹{Number(product.cost_price).toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: '20px',
                paddingTop: '16px',
                borderTop: '1px solid #f1f5f9',
                fontSize: '13px',
                color: '#64748b'
              }}>
                <div>
                  Showing {startIdx + 1} - {Math.min(startIdx + pageSize, filtered.length)} of {filtered.length} products
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                    disabled={currentPage === 1}
                    style={{
                      border: '1px solid #cbd5e1',
                      background: currentPage === 1 ? '#f8fafc' : '#ffffff',
                      color: currentPage === 1 ? '#94a3b8' : '#334155',
                      padding: '4px 12px',
                      borderRadius: '6px',
                      cursor: currentPage === 1 ? 'default' : 'pointer'
                    }}
                  >
                    ← Prev
                  </button>
                  <span style={{ alignSelf: 'center', fontWeight: 600, color: '#334155' }}>
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    style={{
                      border: '1px solid #cbd5e1',
                      background: currentPage === totalPages ? '#f8fafc' : '#ffffff',
                      color: currentPage === totalPages ? '#94a3b8' : '#334155',
                      padding: '4px 12px',
                      borderRadius: '6px',
                      cursor: currentPage === totalPages ? 'default' : 'pointer'
                    }}
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  )
}

export default ProductsPage
