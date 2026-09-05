import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api'

function RegisterPage() {

  const [formData, setFormData] = useState({
    name:     '',
    login_id: '',
    email:    '',
    password: '',
    role:     'Accountant'
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
    setLoading(true)
    try {
      const r = await api.post('/auth/register', formData)
      setSuccess(`Account created for ${r.data.name} (${r.data.role}). Login ID: ${r.data.login_id}`)
      setFormData({ name: '', login_id: '', email: '', password: '', role: 'Accountant' })
    } catch (err) {
      setError(err.response?.data?.detail || 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-container">
      <div className="login-card" style={{ maxWidth: '480px' }}>

        <div className="login-header">
          <h1>🪑 Urban Furniture</h1>
          <h2>Create User Account</h2>
          <p style={{ color: '#cc5500', fontWeight: 600, fontSize: '13px' }}>
            🛡️ Admin Only
          </p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">

          <div className="form-group">
            <label htmlFor="name">Full Name</label>
            <input type="text" id="name" name="name" value={formData.name}
              onChange={handleChange} placeholder="e.g. John Smith" required />
          </div>

          <div className="form-group">
            <label htmlFor="login_id">Login ID <span style={{fontSize:'11px',color:'#999'}}>(max 12 chars)</span></label>
            <input type="text" id="login_id" name="login_id" value={formData.login_id}
              onChange={handleChange} placeholder="e.g. JS001" maxLength={12} required />
          </div>

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input type="email" id="email" name="email" value={formData.email}
              onChange={handleChange} placeholder="e.g. john@urbanfurniture.com" required />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input type="password" id="password" name="password" value={formData.password}
              onChange={handleChange} placeholder="Set a strong password" required />
          </div>

          <div className="form-group">
            <label htmlFor="role">Role</label>
            <select id="role" name="role" value={formData.role}
              onChange={handleChange} className="form-select" required>
              <option value="Admin">Admin</option>
              <option value="Accountant">Accountant</option>
              <option value="Customer">Customer</option>
            </select>
          </div>

          {/* Role description hint */}
          <div style={{
            background:'#f8f9fa', borderRadius:'8px',
            padding:'10px 14px', fontSize:'12px', color:'#666'
          }}>
            🛡️ <strong>Admin</strong> = full access &nbsp;|&nbsp;
            📊 <strong>Accountant</strong> = accounting features &nbsp;|&nbsp;
            🛒 <strong>Customer</strong> = limited view
          </div>

          {error   && <div className="error-message">⚠️ {error}</div>}
          {success && <div className="success-message">✅ {success}</div>}

          <button type="submit" className="login-button" disabled={loading}>
            {loading ? 'Creating...' : 'Create Account'}
          </button>

        </form>

        <div className="login-hint">
          <p>
            <span onClick={() => navigate('/dashboard')}
              style={{ color: '#0f3460', fontWeight: 600, cursor: 'pointer' }}>
              ← Back to Dashboard
            </span>
          </p>
        </div>

      </div>
    </div>
  )
}

export default RegisterPage
