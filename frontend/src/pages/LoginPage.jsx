import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api'

function LoginPage() {

  const [formData, setFormData] = useState({ login_id: '', password: '' })
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
      const response = await api.post('/auth/login', formData)
      localStorage.setItem('token', response.data.access_token)
      localStorage.setItem('login_id', formData.login_id)
      navigate('/dashboard')
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
            <label htmlFor="login_id">Login ID</label>
            <input
              type="text"
              id="login_id"
              name="login_id"
              value={formData.login_id}
              onChange={handleChange}
              placeholder="Enter your Login ID (e.g. ADMIN001)"
              required
              autoComplete="username"
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
          <p>Demo credentials:</p>
          <p>Login ID: <strong>ADMIN001</strong> | Password: <strong>admin@1234</strong></p>
          <p style={{ marginTop: '10px' }}>
            No account?{' '}
            <span
              onClick={() => navigate('/register')}
              style={{ color: '#0f3460', fontWeight: 600, cursor: 'pointer' }}
            >
              Create Account
            </span>
          </p>
        </div>
      </div>
    </div>
  )
}

export default LoginPage
