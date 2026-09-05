import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api'

function RegisterPage() {

  const [formData, setFormData] = useState({
    name: '',
    login_id: '',
    email: '',
    password: '',
    role: 'Accountant'
  })

  const [error, setError]     = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  const navigate = useNavigate()

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      await api.post('/auth/register', formData)
      setSuccess('Account created! Redirecting to login...')
      setTimeout(() => navigate('/login'), 2000)

    } catch (err) {
      if (err.response && err.response.data && err.response.data.detail) {
        setError(err.response.data.detail)
      } else {
        setError('Something went wrong. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-container">
      <div className="login-card" style={{ maxWidth: '480px' }}>

        <div className="login-header">
          <h1>🪑 Urban Furniture</h1>
          <h2>Accounting System</h2>
          <p>Create a new account</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">

          <div className="form-group">
            <label htmlFor="name">Full Name</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g. John Smith"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="login_id">Login ID</label>
            <input
              type="text"
              id="login_id"
              name="login_id"
              value={formData.login_id}
              onChange={handleChange}
              placeholder="e.g. JS001 (max 12 characters)"
              maxLength={12}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="e.g. john@urbanfurniture.com"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Enter a strong password"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="role">Role</label>
            <select
              id="role"
              name="role"
              value={formData.role}
              onChange={handleChange}
              className="form-select"
              required
            >
              <option value="Admin">Admin</option>
              <option value="Accountant">Accountant</option>
              <option value="Customer">Customer</option>
            </select>
          </div>

          {error && (
            <div className="error-message">⚠️ {error}</div>
          )}

          {success && (
            <div className="success-message">✅ {success}</div>
          )}

          <button type="submit" className="login-button" disabled={loading}>
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>

        </form>

        <div className="login-hint">
          <p>Already have an account?{' '}
            <span
              onClick={() => navigate('/login')}
              style={{ color: '#0f3460', fontWeight: 600, cursor: 'pointer' }}
            >
              Sign In
            </span>
          </p>
        </div>

      </div>
    </div>
  )
}

export default RegisterPage
