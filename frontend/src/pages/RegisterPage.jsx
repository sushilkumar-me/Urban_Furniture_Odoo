import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api'

function RegisterPage() {

  const [formData, setFormData] = useState({
    name:             '',
    login_id:         '',
    email:            '',
    password:         '',
    confirm_password: '',
    role:             'Admin'
  })

  const [error, setError]     = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate              = useNavigate()

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!formData.name.trim()) {
      setError('Please enter user name.')
      return
    }

    if (!formData.login_id.trim()) {
      setError('Please enter a login ID.')
      return
    }

    if (!formData.email.trim()) {
      setError('Please enter an email address.')
      return
    }

    if (!formData.password) {
      setError('Please enter a password.')
      return
    }

    if (formData.password !== formData.confirm_password) {
      setError('Passwords do not match. Please re-enter identical passwords.')
      return
    }

    setLoading(true)
    try {
      const payload = {
        name:     formData.name,
        login_id: formData.login_id,
        email:    formData.email,
        password: formData.password,
        role:     formData.role
      }
      const r = await api.post('/auth/register', payload)
      setSuccess(`User "${r.data.name}" created successfully as ${r.data.role}! Login ID: ${r.data.login_id}`)
      setFormData({
        name:             '',
        login_id:         '',
        email:            '',
        password:         '',
        confirm_password: '',
        role:             'Admin'
      })
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create user. Please check credentials.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-container" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
      <div className="login-card" style={{ maxWidth: '520px', width: '100%', borderRadius: '16px', padding: '36px', boxShadow: '0 10px 30px rgba(0,0,0,0.08)' }}>

        {/* Wireframe Header & App Logo Box */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            border: '2px dashed #0f3460',
            borderRadius: '12px',
            padding: '10px 24px',
            marginBottom: '16px',
            background: '#f8fafc'
          }}>
            <span style={{ fontSize: '24px' }}>🪑</span>
            <span style={{ fontWeight: 800, fontSize: '18px', color: '#0f3460', letterSpacing: '0.5px' }}>
              Urban Furniture
            </span>
          </div>

          <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#1a1a2e', margin: '0 0 6px 0' }}>
            Create User
          </h2>
          <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
            Administrator console for provisioning system user access
          </p>
        </div>

        <form onSubmit={handleSubmit} className="contact-form">

          {/* 1. Name */}
          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label style={{ fontWeight: 600, fontSize: '13px', color: '#334155' }}>
              Name *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g. Priya Sharma / John Smith"
              required
              style={{ width: '100%', height: '42px', padding: '0 14px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
            />
          </div>

          {/* 2. Login id */}
          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label style={{ fontWeight: 600, fontSize: '13px', color: '#334155' }}>
              Login id * <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 400 }}>(max 12 alphanumeric chars)</span>
            </label>
            <input
              type="text"
              name="login_id"
              value={formData.login_id}
              onChange={handleChange}
              placeholder="e.g. priya_ca"
              maxLength={12}
              required
              style={{ width: '100%', height: '42px', padding: '0 14px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
            />
          </div>

          {/* 3. E-mail id */}
          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label style={{ fontWeight: 600, fontSize: '13px', color: '#334155' }}>
              E-mail id *
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="e.g. user@urbanfurniture.com"
              required
              style={{ width: '100%', height: '42px', padding: '0 14px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
            />
          </div>

          {/* 4. Role (Radio Buttons matching Excalidraw Wireframe) */}
          <div className="form-group" style={{ marginBottom: '18px' }}>
            <label style={{ fontWeight: 600, fontSize: '13px', color: '#334155', display: 'block', marginBottom: '8px' }}>
              Role *
            </label>
            <div style={{
              display: 'flex',
              gap: '16px',
              flexWrap: 'wrap',
              background: '#f8fafc',
              padding: '12px 16px',
              borderRadius: '8px',
              border: '1px solid #e2e8f0'
            }}>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>
                <input
                  type="radio"
                  name="role"
                  value="Admin"
                  checked={formData.role === 'Admin'}
                  onChange={handleChange}
                />
                Administrator
              </label>

              <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: 500, color: '#334155' }}>
                <input
                  type="radio"
                  name="role"
                  value="Accountant"
                  checked={formData.role === 'Accountant'}
                  onChange={handleChange}
                />
                Accountant
              </label>

              <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: 500, color: '#334155' }}>
                <input
                  type="radio"
                  name="role"
                  value="Customer"
                  checked={formData.role === 'Customer'}
                  onChange={handleChange}
                />
                Customer (User)
              </label>

              <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: 500, color: '#334155' }}>
                <input
                  type="radio"
                  name="role"
                  value="Vendor"
                  checked={formData.role === 'Vendor'}
                  onChange={handleChange}
                />
                Vendor (User)
              </label>
            </div>
          </div>

          {/* 5. Password */}
          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label style={{ fontWeight: 600, fontSize: '13px', color: '#334155' }}>
              Password *
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Enter secure password"
              required
              style={{ width: '100%', height: '42px', padding: '0 14px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
            />
          </div>

          {/* 6. Re-Enter Password */}
          <div className="form-group" style={{ marginBottom: '20px' }}>
            <label style={{ fontWeight: 600, fontSize: '13px', color: '#334155' }}>
              Re-Enter Password *
            </label>
            <input
              type="password"
              name="confirm_password"
              value={formData.confirm_password}
              onChange={handleChange}
              placeholder="Confirm password"
              required
              style={{
                width: '100%',
                height: '42px',
                padding: '0 14px',
                borderRadius: '8px',
                border: formData.confirm_password && formData.password !== formData.confirm_password
                  ? '2px solid #ef4444'
                  : '1px solid #cbd5e1'
              }}
            />
            {formData.confirm_password && formData.password !== formData.confirm_password && (
              <span style={{ fontSize: '12px', color: '#ef4444', marginTop: '4px', display: 'block' }}>
                ⚠️ Passwords do not match
              </span>
            )}
          </div>

          {/* Alerts */}
          {error && <div className="error-message" style={{ marginBottom: '16px' }}>⚠️ {error}</div>}
          {success && <div className="success-message" style={{ marginBottom: '16px' }}>✅ {success}</div>}

          {/* 7. Action Buttons (Create & Cancel matching Excalidraw) */}
          <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
              style={{ flex: 1, height: '44px', fontSize: '15px', fontWeight: 700, borderRadius: '8px' }}
            >
              {loading ? 'Creating...' : 'Create'}
            </button>

            <button
              type="button"
              className="btn-secondary"
              onClick={() => navigate('/dashboard')}
              disabled={loading}
              style={{ flex: 1, height: '44px', fontSize: '15px', fontWeight: 600, borderRadius: '8px' }}
            >
              Cancel
            </button>
          </div>

        </form>

      </div>
    </div>
  )
}

export default RegisterPage
