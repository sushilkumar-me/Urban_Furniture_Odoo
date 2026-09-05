import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
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
  pincode: ''
}

function ContactsPage() {

  const [contacts, setContacts]   = useState([])
  const [showForm, setShowForm]   = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [formData, setFormData]   = useState(emptyForm)
  const [error, setError]         = useState('')
  const [success, setSuccess]     = useState('')
  const [loading, setLoading]     = useState(false)
  const [filter, setFilter]       = useState('All')

  const navigate = useNavigate()
  const location = useLocation()
  const loginId  = localStorage.getItem('login_id') || 'User'

  const navLinks = [
    { label: 'Dashboard', path: '/dashboard' },
    { label: 'Contacts',  path: '/contacts'  },
    { label: 'Categories', path: '/categories' },
  ]

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('login_id')
    navigate('/login')
  }

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
      contact_type: contact.contact_type,
      name:         contact.name,
      email:        contact.email    || '',
      phone:        contact.phone    || '',
      address:      contact.address  || '',
      city:         contact.city     || '',
      state:        contact.state    || '',
      country:      contact.country  || '',
      pincode:      contact.pincode  || ''
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

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const payload = {}
    Object.keys(formData).forEach(key => {
      payload[key] = formData[key] === '' ? null : formData[key]
    })

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
      if (err.response?.data?.detail) {
        setError(err.response.data.detail)
      } else {
        setError('Something went wrong.')
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
      await fetchContacts()
    } catch (err) {
      setError('Failed to delete contact.')
    }
  }

  const filtered = filter === 'All'
    ? contacts
    : contacts.filter(c => c.contact_type === filter)

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
            <h2>Contacts</h2>
            <p className="page-subtitle">Manage customers and vendors</p>
          </div>
          <button className="btn-primary" onClick={openAddForm}>
            + Add Contact
          </button>
        </div>

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

        {showForm && (
          <div className="form-card">
            <h3>{editingId ? 'Edit Contact' : 'Add New Contact'}</h3>

            <form onSubmit={handleSubmit} className="contact-form">

              <div className="form-row">
                <div className="form-group">
                  <label>Contact Type *</label>
                  <select
                    name="contact_type"
                    value={formData.contact_type}
                    onChange={handleChange}
                    className="form-select"
                    required
                  >
                    <option value="Customer">Customer</option>
                    <option value="Vendor">Vendor</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Full Name *</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Full name"
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="email@example.com"
                  />
                </div>

                <div className="form-group">
                  <label>Phone</label>
                  <input
                    type="text"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="Phone number"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Address</label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="Street address"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>City</label>
                  <input type="text" name="city" value={formData.city} onChange={handleChange} placeholder="City" />
                </div>
                <div className="form-group">
                  <label>State</label>
                  <input type="text" name="state" value={formData.state} onChange={handleChange} placeholder="State" />
                </div>
                <div className="form-group">
                  <label>Country</label>
                  <input type="text" name="country" value={formData.country} onChange={handleChange} placeholder="Country" />
                </div>
                <div className="form-group">
                  <label>Pincode</label>
                  <input type="text" name="pincode" value={formData.pincode} onChange={handleChange} placeholder="Pincode" />
                </div>
              </div>

              {error && <div className="error-message">⚠️ {error}</div>}

              <div className="form-actions">
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? 'Saving...' : editingId ? 'Update Contact' : 'Create Contact'}
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
              {filtered.length} contact{filtered.length !== 1 ? 's' : ''}
            </span>
            <div className="filter-tabs">
              {['All', 'Customer', 'Vendor'].map(f => (
                <button
                  key={f}
                  className={`filter-tab ${filter === f ? 'active' : ''}`}
                  onClick={() => setFilter(f)}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="empty-state">
              No contacts found. Click "+ Add Contact" to create one.
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Type</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>City</th>
                  <th>Country</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(contact => (
                  <tr key={contact.id}>
                    <td>{contact.id}</td>
                    <td>
                      <span className={`role-badge ${contact.contact_type === 'Customer' ? 'role-customer' : 'role-vendor'}`}>
                        {contact.contact_type}
                      </span>
                    </td>
                    <td><strong>{contact.name}</strong></td>
                    <td>{contact.email   || '—'}</td>
                    <td>{contact.phone   || '—'}</td>
                    <td>{contact.city    || '—'}</td>
                    <td>{contact.country || '—'}</td>
                    <td>
                      <div className="action-buttons">
                        <button className="btn-edit"   onClick={() => openEditForm(contact)}>Edit</button>
                        <button className="btn-delete" onClick={() => handleDelete(contact.id, contact.name)}>Delete</button>
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

export default ContactsPage
