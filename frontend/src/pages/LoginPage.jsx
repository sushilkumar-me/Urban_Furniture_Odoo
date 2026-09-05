import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api'

function LoginPage() {

  const [formData, setFormData]       = useState({ login_id: '', password: '' })
  const [error, setError]             = useState('')
  const [loading, setLoading]         = useState(false)
  const [showForgotModal, setShowForgotModal] = useState(false)
  const navigate                      = useNavigate()

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const identifier = formData.login_id.trim()

    try {
      let response
      // Support both Login Id and Email seamlessly
      if (identifier.includes('@')) {
        response = await api.post('/auth/login-by-email', {
          email: identifier,
          password: formData.password
        })
      } else {
        response = await api.post('/auth/login', {
          login_id: identifier,
          password: formData.password
        })
      }

      const data = response.data

      // Store credentials in localStorage
      localStorage.setItem('token',       data.access_token)
      localStorage.setItem('login_id',    data.login_id)
      localStorage.setItem('user_name',   data.user_name)
      localStorage.setItem('user_id',     String(data.user_id))
      localStorage.setItem('role',        data.role)
      localStorage.setItem('active_role', data.role)
      localStorage.setItem('email',       data.email || identifier)

      // Role-based redirect
      if (data.role === 'Admin' || data.role === 'Accountant') {
        navigate('/dashboard')
      } else if (data.role === 'Vendor') {
        navigate('/vendor-dashboard')
      } else {
        navigate('/customer-dashboard')
      }

    } catch (err) {
      if (err.response?.data?.detail) {
        setError(err.response.data.detail)
      } else {
        setError('Invalid credentials. Please check your Login ID and password.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-container" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
      <div className="login-card" style={{ maxWidth: '440px', width: '100%', borderRadius: '20px', padding: '40px 32px', boxShadow: '0 15px 35px rgba(0,0,0,0.1)' }}>

        {/* 1. App Logo Box (Matching Excalidraw Wireframe) */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            border: '2px solid #0f3460',
            borderRadius: '16px',
            padding: '12px 28px',
            background: '#f8fafc',
            boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.05)'
          }}>
            <span style={{ fontSize: '26px' }}>🪑</span>
            <span style={{ fontWeight: 800, fontSize: '18px', color: '#0f3460', letterSpacing: '0.8px' }}>
              Urban Furniture
            </span>
          </div>

          <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#1a1a2e', marginTop: '16px', marginBottom: '4px' }}>
            Login Page
          </h2>
          <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
            Sign in to access your ERP portal
          </p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">

          {/* 2. Login Id - */}
          <div className="form-group" style={{ marginBottom: '22px' }}>
            <label htmlFor="login_id" style={{ fontWeight: 600, fontSize: '14px', color: '#334155', display: 'flex', alignItems: 'center', gap: '4px' }}>
              Login Id -
            </label>
            <input
              type="text"
              id="login_id"
              name="login_id"
              value={formData.login_id}
              onChange={handleChange}
              placeholder="Enter your Login ID or Email"
              required
              autoComplete="username"
              style={{
                width: '100%',
                height: '44px',
                padding: '0 14px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '14px',
                outline: 'none',
                transition: 'border-color 0.2s'
              }}
            />
          </div>

          {/* 3. Password - */}
          <div className="form-group" style={{ marginBottom: '24px' }}>
            <label htmlFor="password" style={{ fontWeight: 600, fontSize: '14px', color: '#334155', display: 'flex', alignItems: 'center', gap: '4px' }}>
              Password -
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Enter your password"
              required
              autoComplete="current-password"
              style={{
                width: '100%',
                height: '44px',
                padding: '0 14px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '14px',
                outline: 'none',
                transition: 'border-color 0.2s'
              }}
            />
          </div>

          {error && (
            <div className="error-message" style={{ marginBottom: '18px', padding: '10px 14px', borderRadius: '8px', fontSize: '13px' }}>
              ⚠️ {error}
            </div>
          )}

          {/* 4. SIGN IN Button */}
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <button
              type="submit"
              className="login-button"
              disabled={loading}
              style={{
                width: '100%',
                height: '48px',
                fontSize: '16px',
                fontWeight: 800,
                letterSpacing: '1px',
                textTransform: 'uppercase',
                borderRadius: '12px',
                cursor: 'pointer'
              }}
            >
              {loading ? 'SIGNING IN...' : 'SIGN IN'}
            </button>
          </div>

          {/* 5. Forgot Password | Sign Up (Matching Excalidraw Wireframe) */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            fontSize: '13px',
            color: '#64748b'
          }}>
            <span
              onClick={() => setShowForgotModal(true)}
              style={{ color: '#0f3460', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}
            >
              Forgot Password
            </span>

            <span style={{ color: '#cbd5e1', fontWeight: 700 }}>|</span>

            <span
              onClick={() => navigate('/signup')}
              style={{ color: '#0f3460', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}
            >
              Sign Up
            </span>
          </div>

        </form>

        {/* Demo Credentials Quick-Reference Helper */}
        <div style={{
          marginTop: '28px',
          padding: '12px 14px',
          background: '#f8fafc',
          borderRadius: '10px',
          border: '1px dashed #cbd5e1',
          fontSize: '12px',
          color: '#475569'
        }}>
          <div style={{ fontWeight: 700, color: '#0f3460', marginBottom: '4px' }}>
            💡 Quick Demo Logins (Password: <code>Password123!</code>):
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', fontSize: '11px' }}>
            <span>🛡️ Admin: <code>admin</code></span>
            <span>📊 Accountant: <code>ramesh_ca</code></span>
            <span>🛒 Customer: <code>cust_infosys</code></span>
            <span>🚚 Vendor: <code>vend_greenpl</code></span>
          </div>
        </div>

      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', zIndex: 1000, padding: '20px'
        }}>
          <div className="form-card" style={{ maxWidth: '400px', width: '100%', margin: 0, borderRadius: '16px', padding: '24px' }}>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '18px', color: '#1a1a2e' }}>
              🔑 Reset Password Assistance
            </h3>
            <p style={{ fontSize: '13px', color: '#64748b', lineHeight: 1.5, marginBottom: '16px' }}>
              For security reasons, password resets are handled through the System Administrator.
            </p>
            <div style={{ background: '#f1f5f9', padding: '12px', borderRadius: '8px', fontSize: '12px', color: '#334155', marginBottom: '20px' }}>
              Please contact your administrator at:<br />
              <strong>support@urbanfurniture.com</strong> or <strong>admin@urbanfurniture.com</strong>.<br /><br />
              <em>(All pre-seeded demo accounts use default password: <code>Password123!</code>)</em>
            </div>
            <button
              className="btn-primary"
              onClick={() => setShowForgotModal(false)}
              style={{ width: '100%', height: '40px', borderRadius: '8px' }}
            >
              Close
            </button>
          </div>
        </div>
      )}

    </div>
  )
}

export default LoginPage
