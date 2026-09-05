import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api'

const emptyForm = {
  contact_type: 'Customer',
  name: '',
  email: '',
  phone: '',
  address: '',
  city: '',
  state: '',
  country: '',
  pincode: '',
  image: ''
}

function ContactsPage() {

  const [contacts, setContacts]       = useState([])
  const [showForm, setShowForm]       = useState(false)
  const [editingId, setEditingId]     = useState(null)
  const [formData, setFormData]       = useState(emptyForm)
  const [error, setError]             = useState('')
  const [success, setSuccess]         = useState('')
  const [loading, setLoading]         = useState(false)
  const [filter, setFilter]           = useState('All')
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode]       = useState('list') // 'list' | 'kanban'
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize                      = 15

  const fileInputRef = useRef(null)
  const navigate     = useNavigate()

  useEffect(() => {
    fetchContacts()
  }, [])

  const fetchContacts = async () => {
    try {
      const response = await api.get('/contacts/')
      setContacts(response.data)
    } catch (err) {
      setError('Failed to load contacts.')
    }
  }

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
    if (error) setError('')
  }

  // Compress & resize image to lightweight thumbnail
  const handleImageUpload = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        const img = new Image()
        img.onload = () => {
          const canvas = document.createElement('canvas')
          const maxDim = 260
          let width = img.width
          let height = img.height
          if (width > height) {
            if (width > maxDim) {
              height = Math.round((height * maxDim) / width)
              width = maxDim
            }
          } else {
            if (height > maxDim) {
              width = Math.round((width * maxDim) / height)
              height = maxDim
            }
          }
          canvas.width = width
          canvas.height = height
          const ctx = canvas.getContext('2d')
          ctx.drawImage(img, 0, 0, width, height)
          const dataUrl = canvas.toDataURL('image/jpeg', 0.82)
          setFormData(prev => ({ ...prev, image: dataUrl }))
        }
        img.src = event.target.result
      }
      reader.readAsDataURL(file)
    }
  }

  const removeImage = (e) => {
    e.stopPropagation()
    setFormData(prev => ({ ...prev, image: '' }))
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const openAddForm = () => {
    setFormData(emptyForm)
    setEditingId(null)
    setError('')
    setSuccess('')
    setShowForm(true)
  }

  const openEditForm = (contact) => {
    setFormData({
      contact_type: contact.contact_type || 'Customer',
      name:         contact.name || '',
      email:        contact.email    || '',
      phone:        contact.phone    || '',
      address:      contact.address  || '',
      city:         contact.city     || '',
      state:        contact.state    || '',
      country:      contact.country  || '',
      pincode:      contact.pincode  || '',
      image:        contact.image    || ''
    })
    setEditingId(contact.id)
    setError('')
    setSuccess('')
    setShowForm(true)
  }

  const closeForm = () => {
    setShowForm(false)
    setEditingId(null)
    setFormData(emptyForm)
    setError('')
  }

  const handleNew = () => {
    setFormData(emptyForm)
    setEditingId(null)
    setError('')
    setSuccess('')
  }

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault()
    setError('')

    if (!formData.name || !formData.name.trim()) {
      setError('Contact Name is required.')
      return
    }

    setLoading(true)

    const payload = {}
    Object.keys(formData).forEach(key => {
      const val = formData[key]
      if (typeof val === 'string') {
        const trimmed = val.trim()
        payload[key] = trimmed === '' ? null : trimmed
      } else {
        payload[key] = val === '' ? null : val
      }
    })

    // Email format validation
    if (payload.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(payload.email)) {
        setError('Please enter a valid email address (e.g. name@example.com).')
        setLoading(false)
        return
      }
    }

    try {
      if (editingId) {
        await api.put(`/contacts/${editingId}`, payload)
        setSuccess('Contact updated successfully.')
      } else {
        await api.post('/contacts/', payload)
        setSuccess('Contact created successfully.')
      }
      await fetchContacts()
      closeForm()
    } catch (err) {
      console.error('Contact submit error:', err)
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
        setError(err.message || 'Something went wrong saving contact.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete contact "${name}"?`)) return
    try {
      await api.delete(`/contacts/${id}`)
      setSuccess(`"${name}" deleted.`)
      setSelectedIds(prev => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
      await fetchContacts()
    } catch (err) {
      setError('Failed to delete contact.')
    }
  }

  // Row selection handlers
  const handleToggleSelectAll = (visibleItems) => {
    const allSelected = visibleItems.every(c => selectedIds.has(c.id))
    const next = new Set(selectedIds)
    if (allSelected) {
      visibleItems.forEach(c => next.delete(c.id))
    } else {
      visibleItems.forEach(c => next.add(c.id))
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

  // Filter & search contacts
  const filtered = contacts.filter(c => {
    if (filter !== 'All' && c.contact_type !== filter) return false
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      const matchName  = (c.name || '').toLowerCase().includes(q)
      const matchEmail = (c.email || '').toLowerCase().includes(q)
      const matchPhone = (c.phone || '').toLowerCase().includes(q)
      if (!matchName && !matchEmail && !matchPhone) return false
    }
    return true
  })

  // Pagination
  const totalPages = Math.ceil(filtered.length / pageSize) || 1
  const startIdx = (currentPage - 1) * pageSize
  const paginatedContacts = filtered.slice(startIdx, startIdx + pageSize)

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
      {/* 1. CONTACT MASTER FORM VIEW                                  */}
      {/* ============================================================ */}
      {showForm ? (
        <div>
          {/* Top Title: Contact master Form View */}
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <h1 style={{
              fontSize: '28px',
              fontWeight: 800,
              color: '#1a1a2e',
              letterSpacing: '-0.5px',
              margin: 0
            }}>
              Contact master Form View
            </h1>
          </div>

          {/* Main Card Container */}
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

              {/* Contact Type & Name Field */}
              <div style={{ marginBottom: '32px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label htmlFor="name" style={{ fontSize: '18px', fontWeight: 700, color: '#1a1a2e' }}>
                    Contact Name *
                  </label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {['Customer', 'Vendor'].map(type => (
                      <button
                        type="button"
                        key={type}
                        onClick={() => setFormData({ ...formData, contact_type: type })}
                        style={{
                          background: formData.contact_type === type ? '#0f3460' : '#f1f5f9',
                          color: formData.contact_type === type ? '#ffffff' : '#475569',
                          border: 'none',
                          borderRadius: '8px',
                          padding: '4px 14px',
                          fontSize: '12px',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="e.g. Acme Corporation or John Smith"
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

              {/* 2 Columns: Details + Image Upload */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1.4fr 1fr',
                gap: '40px',
                alignItems: 'start'
              }}>

                {/* Left Column: Email, Phone, Address */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div>
                    <label style={{ fontSize: '14px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>
                      Email
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="Unique Email"
                      style={underlineInputStyle}
                      onFocus={(e) => e.target.style.borderBottomColor = '#0f3460'}
                      onBlur={(e) => e.target.style.borderBottomColor = '#94a3b8'}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '14px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>
                      Phone
                    </label>
                    <input
                      type="text"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="Phone"
                      style={underlineInputStyle}
                      onFocus={(e) => e.target.style.borderBottomColor = '#0f3460'}
                      onBlur={(e) => e.target.style.borderBottomColor = '#94a3b8'}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '15px', fontWeight: 700, color: '#1a1a2e', display: 'block', marginBottom: '8px' }}>
                      Address
                    </label>

                    <div style={{ marginBottom: '14px' }}>
                      <input
                        type="text"
                        name="address"
                        value={formData.address}
                        onChange={handleChange}
                        placeholder="Street"
                        style={underlineInputStyle}
                        onFocus={(e) => e.target.style.borderBottomColor = '#0f3460'}
                        onBlur={(e) => e.target.style.borderBottomColor = '#94a3b8'}
                      />
                    </div>

                    <div style={{ marginBottom: '14px' }}>
                      <input
                        type="text"
                        name="city"
                        value={formData.city}
                        onChange={handleChange}
                        placeholder="City"
                        style={underlineInputStyle}
                        onFocus={(e) => e.target.style.borderBottomColor = '#0f3460'}
                        onBlur={(e) => e.target.style.borderBottomColor = '#94a3b8'}
                      />
                    </div>

                    <div style={{ marginBottom: '14px' }}>
                      <input
                        type="text"
                        name="state"
                        value={formData.state}
                        onChange={handleChange}
                        placeholder="State"
                        style={underlineInputStyle}
                        onFocus={(e) => e.target.style.borderBottomColor = '#0f3460'}
                        onBlur={(e) => e.target.style.borderBottomColor = '#94a3b8'}
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                      <div>
                        <input
                          type="text"
                          name="country"
                          value={formData.country}
                          onChange={handleChange}
                          placeholder="Country"
                          style={underlineInputStyle}
                          onFocus={(e) => e.target.style.borderBottomColor = '#0f3460'}
                          onBlur={(e) => e.target.style.borderBottomColor = '#94a3b8'}
                        />
                      </div>
                      <div>
                        <input
                          type="text"
                          name="pincode"
                          value={formData.pincode}
                          onChange={handleChange}
                          placeholder="Pincode"
                          style={underlineInputStyle}
                          onFocus={(e) => e.target.style.borderBottomColor = '#0f3460'}
                          onBlur={(e) => e.target.style.borderBottomColor = '#94a3b8'}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column: Upload Image Box */}
                <div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageUpload}
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
                    {formData.image ? (
                      <div style={{ position: 'relative', width: '100%', height: '100%', textAlign: 'center' }}>
                        <img
                          src={formData.image}
                          alt="Contact Avatar"
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
                          🖼️
                        </div>
                        <div style={{ fontSize: '18px', fontWeight: 800, color: '#1e293b', marginBottom: '4px' }}>
                          Upload Image
                        </div>
                        <div style={{ fontSize: '12px', color: '#64748b' }}>
                          PNG, JPG or WebP (auto-compressed)
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
        /* 2. CONTACT LIST VIEW (MATCHING EXCALIDRAW WIREFRAME)         */
        /* ============================================================ */
        <div>
          {/* Top Title: Contact List View */}
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <h1 style={{
              fontSize: '28px',
              fontWeight: 800,
              color: '#1a1a2e',
              letterSpacing: '-0.5px',
              margin: 0
            }}>
              Contact List View
            </h1>
          </div>

          {/* Main Card Container */}
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

              {/* Center: [ Search ] Input */}
              <div style={{ flex: '1', maxWidth: '420px', position: 'relative' }}>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1) }}
                  placeholder="Search name, email, or phone..."
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
                  <strong>{selectedIds.size}</strong> contact{selectedIds.size > 1 ? 's' : ''} selected
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
                    No contacts found. Click <strong>New</strong> to create your first contact.
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
                        <th style={{ padding: '12px 14px', width: '50px' }}>
                          <input
                            type="checkbox"
                            checked={paginatedContacts.length > 0 && paginatedContacts.every(c => selectedIds.has(c.id))}
                            onChange={() => handleToggleSelectAll(paginatedContacts)}
                            style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#0f3460' }}
                          />
                        </th>
                        <th style={{ padding: '12px 14px', width: '70px' }}>Image</th>
                        <th style={{ padding: '12px 14px' }}>Name</th>
                        <th style={{ padding: '12px 14px' }}>Email</th>
                        <th style={{ padding: '12px 14px' }}>Phone</th>
                        <th style={{ padding: '12px 14px', width: '80px', textAlign: 'right' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedContacts.map((contact) => {
                        const isSelected = selectedIds.has(contact.id)
                        return (
                          <tr
                            key={contact.id}
                            onClick={() => openEditForm(contact)}
                            style={{
                              borderBottom: '1px solid #f1f5f9',
                              cursor: 'pointer',
                              background: isSelected ? '#f0f9ff' : 'transparent',
                              transition: 'background-color 0.15s ease'
                            }}
                            onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.backgroundColor = '#f8fafc' }}
                            onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent' }}
                          >
                            <td style={{ padding: '14px' }} onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => handleToggleSelectOne(contact.id, e)}
                                style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#0f3460' }}
                              />
                            </td>

                            <td style={{ padding: '14px' }}>
                              {contact.image ? (
                                <img
                                  src={contact.image}
                                  alt={contact.name}
                                  style={{
                                    width: '38px',
                                    height: '38px',
                                    borderRadius: '8px',
                                    objectFit: 'cover',
                                    border: '1px solid #e2e8f0'
                                  }}
                                />
                              ) : (
                                <div style={{
                                  width: '38px',
                                  height: '38px',
                                  borderRadius: '8px',
                                  background: '#e2e8f0',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '16px',
                                  fontWeight: 800,
                                  color: '#0f3460'
                                }}>
                                  {contact.name.charAt(0).toUpperCase()}
                                </div>
                              )}
                            </td>

                            <td style={{ padding: '14px', fontWeight: 700, color: '#1a1a2e', fontSize: '15px' }}>
                              {contact.name}
                              <span style={{
                                display: 'inline-block',
                                marginLeft: '8px',
                                padding: '2px 8px',
                                borderRadius: '6px',
                                fontSize: '11px',
                                fontWeight: 600,
                                background: contact.contact_type === 'Customer' ? '#e0f2fe' : '#fef3c7',
                                color: contact.contact_type === 'Customer' ? '#0369a1' : '#b45309'
                              }}>
                                {contact.contact_type}
                              </span>
                            </td>

                            <td style={{ padding: '14px', color: '#475569', fontSize: '14px' }}>
                              {contact.email || '—'}
                            </td>

                            <td style={{ padding: '14px', color: '#475569', fontSize: '14px' }}>
                              {contact.phone || '—'}
                            </td>

                            <td style={{ padding: '14px', textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => handleDelete(contact.id, contact.name)}
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  color: '#94a3b8',
                                  cursor: 'pointer',
                                  fontSize: '14px',
                                  padding: '4px'
                                }}
                                title="Delete Contact"
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
                {paginatedContacts.map((contact) => (
                  <div
                    key={contact.id}
                    onClick={() => openEditForm(contact)}
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
                    {contact.image ? (
                      <img
                        src={contact.image}
                        alt={contact.name}
                        style={{ width: '52px', height: '52px', borderRadius: '12px', objectFit: 'cover' }}
                      />
                    ) : (
                      <div style={{
                        width: '52px',
                        height: '52px',
                        borderRadius: '12px',
                        background: '#e2e8f0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '20px',
                        fontWeight: 800,
                        color: '#0f3460'
                      }}>
                        {contact.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 800, color: '#1a1a2e', fontSize: '15px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {contact.name}
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {contact.email || 'No email'}
                      </div>
                      <div style={{ fontSize: '12px', color: '#0f3460', fontWeight: 600, marginTop: '2px' }}>
                        {contact.phone || 'No phone'}
                      </div>
                    </div>
                  </div>
                ))}
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
                  Showing {startIdx + 1} - {Math.min(startIdx + pageSize, filtered.length)} of {filtered.length} contacts
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

export default ContactsPage
