import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api'

function SignUpPage() {

  const [formData, setFormData] = useState({
    name:             '',
    email:            '',
    password:         '',
    confirm_password: ''
  })

  // fieldErrors: per-field validation messages shown below each input
  // error: general server error shown at the bottom
  const [fieldErrors, setFieldErrors] = useState({})
  const [error, setError]             = useState('')
  const [success, setSuccess]         = useState('')
  const [loading, setLoading]         = useState(false)
  const navigate                      = useNavigate()

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
    // Clear the field-level error as soon as the user starts typing
    if (fieldErrors[e.target.name]) {
      setFieldErrors({ ...fieldErrors, [e.target.name]: '' })
    }
  }

  // validate: runs before submitting to the server.
  // Returns true if all fields are valid, false otherwise.
  // Sets fieldErrors so each input shows its own message.
  const validate = () => {
    const errors = {}

    if (!formData.name.trim()) {
      errors.name = 'Full name is required.'
    }

    if (!formData.email.trim()) {
      errors.email = 'Email is required.'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      // Basic email format check using a regex
      // The pattern checks: something @ something . something
      errors.email = 'Enter a valid email address.'
    }

    if (!formData.password) {
      errors.password = 'Password is required.'
    } else if (formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters.'
    }

    if (!formData.confirm_password) {
      errors.confirm_password = 'Please confirm your password.'
    } else if (formData.password !== formData.confirm_password) {
      errors.confirm_password = 'Passwords do not match.'
    }

    setFieldErrors(errors)
    // Object.keys(errors).length === 0 means no errors found
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    // Run client-side validation first — don't hit the server if invalid
    if (!validate()) return

    setLoading(true)

    try {
      // POST /auth/signup — no login_id or role needed
      // Backend auto-generates login_id and assigns role=Customer
      await api.post('/auth/signup', formData)

      setSuccess('Account created successfully! Redirecting to Sign In...')

      // Redirect to login after 2 seconds so user can read the success message
      setTimeout(() => navigate('/login'), 2000)

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
      <div className="login-card" style={{ maxWidth: '460px' }}>

        <div className="login-header">
          <h1>🪑 Urban Furniture</h1>
          <h2>Accounting System</h2>
          <p>Create your account</p>
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
              autoComplete="name"
            />
            {/* Show field-level error only for this input */}
            {fieldErrors.name && (
              <span style={{ fontSize: '12px', color: '#cc0000', marginTop: '4px' }}>
                {fieldErrors.name}
              </span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="e.g. john@example.com"
              autoComplete="email"
            />
            {fieldErrors.email && (
              <span style={{ fontSize: '12px', color: '#cc0000', marginTop: '4px' }}>
                {fieldErrors.email}
              </span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="At least 6 characters"
              autoComplete="new-password"
            />
            {fieldErrors.password && (
              <span style={{ fontSize: '12px', color: '#cc0000', marginTop: '4px' }}>
                {fieldErrors.password}
              </span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="confirm_password">Confirm Password</label>
            <input
              type="password"
              id="confirm_password"
              name="confirm_password"
              value={formData.confirm_password}
              onChange={handleChange}
              placeholder="Re-enter your password"
              autoComplete="new-password"
            />
            {fieldErrors.confirm_password && (
              <span style={{ fontSize: '12px', color: '#cc0000', marginTop: '4px' }}>
                {fieldErrors.confirm_password}
              </span>
            )}
          </div>

          {/* Server-side error (e.g. email already registered) */}
          {error && <div className="error-message">⚠️ {error}</div>}

          {/* Success message after account creation */}
          {success && <div className="success-message">✅ {success}</div>}

          <button type="submit" className="login-button" disabled={loading}>
            {loading ? 'Creating Account...' : 'Sign Up'}
          </button>

        </form>

        <div className="login-hint">
          <p>
            Already have an account?{' '}
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

export default SignUpPage
