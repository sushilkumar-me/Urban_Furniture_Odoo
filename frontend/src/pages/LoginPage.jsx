import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api'

function LoginPage() {

  const [formData, setFormData] = useState({ email: '', password: '' })
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const navigate                = useNavigate()

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // POST /auth/login-by-email accepts email + password
      // Response includes: access_token, role, user_id, user_name, login_id
      const response = await api.post('/auth/login-by-email', formData)
      const data     = response.data

      // Store everything the app needs in localStorage
      // The token is used by the axios interceptor for all future requests
      localStorage.setItem('token',     data.access_token)
      localStorage.setItem('login_id',  data.login_id)
      localStorage.setItem('user_name', data.user_name)
      localStorage.setItem('user_id',   String(data.user_id))
      localStorage.setItem('role',      data.role)

      // Role-based redirect:
      //   Admin and Accountant → main accounting dashboard
      //   Customer             → customer dashboard (simpler view)
      if (data.role === 'Admin' || data.role === 'Accountant') {
        navigate('/dashboard')
      } else {
        navigate('/customer-dashboard')
      }

    } catch (err) {
      if (err.response?.data?.detail) {
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
      <div className="login-card">

        <div className="login-header">
          <h1>🪑 Urban Furniture</h1>
          <h2>Accounting System</h2>
          <p>Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">

          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Enter your email address"
              required
              autoComplete="email"
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
              placeholder="Enter your password"
              required
              autoComplete="current-password"
            />
          </div>

          {error && <div className="error-message">⚠️ {error}</div>}

          <button type="submit" className="login-button" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>

        </form>

        <div className="login-hint">
          <p>
            Don't have an account?{' '}
            <span
              onClick={() => navigate('/signup')}
              style={{ color: '#0f3460', fontWeight: 600, cursor: 'pointer' }}
            >
              Sign Up
            </span>
          </p>
          <p style={{ marginTop: '8px', fontSize: '12px', color: '#aaa' }}>
            Admin? Use{' '}
            <span
              onClick={() => navigate('/register')}
              style={{ color: '#999', cursor: 'pointer', textDecoration: 'underline' }}
            >
              Create User
            </span>
            {' '}to add staff accounts.
          </p>
        </div>

      </div>
    </div>
  )
}

export default LoginPage
