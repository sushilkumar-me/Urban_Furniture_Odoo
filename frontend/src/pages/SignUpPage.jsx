import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api'

function SignUpPage() {

  const [formData, setFormData] = useState({
    login_id:         '',
    email:            '',
    password:         '',
    confirm_password: ''
  })

  const [fieldErrors, setFieldErrors] = useState({})
  const [error, setError]             = useState('')
  const [success, setSuccess]         = useState('')
  const [loading, setLoading]         = useState(false)
  const navigate                      = useNavigate()

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
    if (fieldErrors[e.target.name]) {
      setFieldErrors({ ...fieldErrors, [e.target.name]: '' })
    }
  }

  const validate = () => {
    const errors = {}

    if (!formData.login_id.trim()) {
      errors.login_id = 'Login ID is required.'
    } else if (formData.login_id.trim().length > 12) {
      errors.login_id = 'Login ID cannot exceed 12 characters.'
    }

    if (!formData.email.trim()) {
      errors.email = 'Email ID is required.'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Enter a valid email address.'
    }

    if (!formData.password) {
      errors.password = 'Password is required.'
    } else if (formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters.'
    }

    if (!formData.confirm_password) {
      errors.confirm_password = 'Please re-enter your password.'
    } else if (formData.password !== formData.confirm_password) {
      errors.confirm_password = 'Passwords do not match.'
    }

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!validate()) return

    setLoading(true)

    try {
      const payload = {
        login_id:         formData.login_id.trim(),
        name:             formData.login_id.trim(),
        email:            formData.email.trim(),
        password:         formData.password,
        confirm_password: formData.confirm_password
      }

      await api.post('/auth/signup', payload)
      setSuccess('Account created successfully! Redirecting to Sign In...')

      setTimeout(() => navigate('/login'), 1800)

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
            Sign Up Page
          </h2>
          <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
            Create a new portal customer account
          </p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">

          {/* 2. Enter Login Id - */}
          <div className="form-group" style={{ marginBottom: '20px' }}>
            <label htmlFor="login_id" style={{ fontWeight: 600, fontSize: '14px', color: '#334155', display: 'flex', alignItems: 'center', gap: '4px' }}>
              Enter Login Id -
            </label>
            <input
              type="text"
              id="login_id"
              name="login_id"
              value={formData.login_id}
              onChange={handleChange}
              placeholder="e.g. rahul_corp (max 12 chars)"
              maxLength={12}
              required
              autoComplete="username"
              style={{
                width: '100%',
                height: '44px',
                padding: '0 14px',
                borderRadius: '8px',
                border: fieldErrors.login_id ? '2px solid #ef4444' : '1px solid #cbd5e1',
                fontSize: '14px',
                outline: 'none'
              }}
            />
            {fieldErrors.login_id && (
              <span style={{ fontSize: '12px', color: '#ef4444', marginTop: '4px', display: 'block' }}>
                {fieldErrors.login_id}
              </span>
            )}
          </div>

          {/* 3. Enter Email Id - */}
          <div className="form-group" style={{ marginBottom: '20px' }}>
            <label htmlFor="email" style={{ fontWeight: 600, fontSize: '14px', color: '#334155', display: 'flex', alignItems: 'center', gap: '4px' }}>
              Enter Email Id -
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="e.g. rahul@example.com"
              required
              autoComplete="email"
              style={{
                width: '100%',
                height: '44px',
                padding: '0 14px',
                borderRadius: '8px',
                border: fieldErrors.email ? '2px solid #ef4444' : '1px solid #cbd5e1',
                fontSize: '14px',
                outline: 'none'
              }}
            />
            {fieldErrors.email && (
              <span style={{ fontSize: '12px', color: '#ef4444', marginTop: '4px', display: 'block' }}>
                {fieldErrors.email}
              </span>
            )}
          </div>

          {/* 4. Enter Password - */}
          <div className="form-group" style={{ marginBottom: '20px' }}>
            <label htmlFor="password" style={{ fontWeight: 600, fontSize: '14px', color: '#334155', display: 'flex', alignItems: 'center', gap: '4px' }}>
              Enter Password -
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Set a password (min 6 chars)"
              required
              autoComplete="new-password"
              style={{
                width: '100%',
                height: '44px',
                padding: '0 14px',
                borderRadius: '8px',
                border: fieldErrors.password ? '2px solid #ef4444' : '1px solid #cbd5e1',
                fontSize: '14px',
                outline: 'none'
              }}
            />
            {fieldErrors.password && (
              <span style={{ fontSize: '12px', color: '#ef4444', marginTop: '4px', display: 'block' }}>
                {fieldErrors.password}
              </span>
            )}
          </div>

          {/* 5. Re-Enter Password - */}
          <div className="form-group" style={{ marginBottom: '24px' }}>
            <label htmlFor="confirm_password" style={{ fontWeight: 600, fontSize: '14px', color: '#334155', display: 'flex', alignItems: 'center', gap: '4px' }}>
              Re-Enter Password -
            </label>
            <input
              type="password"
              id="confirm_password"
              name="confirm_password"
              value={formData.confirm_password}
              onChange={handleChange}
              placeholder="Re-enter your password"
              required
              autoComplete="new-password"
              style={{
                width: '100%',
                height: '44px',
                padding: '0 14px',
                borderRadius: '8px',
                border: fieldErrors.confirm_password ? '2px solid #ef4444' : '1px solid #cbd5e1',
                fontSize: '14px',
                outline: 'none'
              }}
            />
            {fieldErrors.confirm_password && (
              <span style={{ fontSize: '12px', color: '#ef4444', marginTop: '4px', display: 'block' }}>
                {fieldErrors.confirm_password}
              </span>
            )}
          </div>

          {error   && <div className="error-message" style={{ marginBottom: '16px' }}>⚠️ {error}</div>}
          {success && <div className="success-message" style={{ marginBottom: '16px' }}>✅ {success}</div>}

          {/* 6. Action Button (SIGN UP / SIGN IN matching wireframe) */}
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
              {loading ? 'REGISTERING...' : 'SIGN UP'}
            </button>
          </div>

          {/* Return to Sign In link */}
          <div style={{ textAlign: 'center', fontSize: '13px', color: '#64748b' }}>
            Already have an account?{' '}
            <span
              onClick={() => navigate('/login')}
              style={{ color: '#0f3460', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}
            >
              Sign In
            </span>
          </div>

        </form>

      </div>
    </div>
  )
}

export default SignUpPage
