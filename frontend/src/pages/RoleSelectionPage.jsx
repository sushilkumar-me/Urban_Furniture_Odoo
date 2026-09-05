import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

// Each role definition contains:
//   role     → the role string stored in localStorage
//   label    → display name shown on the button
//   icon     → emoji icon for visual distinction
//   hint     → one-line description of what this role can do
//   path     → where to navigate when this role is selected
const ROLE_CONFIG = [
  {
    role:  'Admin',
    label: 'Administrator',
    icon:  '🛡️',
    hint:  'Full access — manage users, accounts, and all modules',
    path:  '/dashboard'
  },
  {
    role:  'Accountant',
    label: 'Accountant',
    icon:  '📊',
    hint:  'Manage accounts, journals, invoices, and payments',
    path:  '/dashboard'
  },
  {
    role:  'Customer',
    label: 'Customer',
    icon:  '🛒',
    hint:  'View your invoices and make online payments',
    path:  '/customer-dashboard'
  },
  {
    role:  'Vendor',
    label: 'Vendor / Supplier',
    icon:  '🚚',
    hint:  'View purchase bills and track incoming settlements',
    path:  '/vendor-dashboard'
  }
]

function RoleSelectionPage() {

  const navigate = useNavigate()

  // If user is not logged in (no token), send them to login
  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      navigate('/login')
    }
  }, [navigate])

  // Get the user's role from localStorage.
  // After login, LoginPage stores the role returned by the API.
  const storedRole = localStorage.getItem('role')
  const userName   = localStorage.getItem('user_name') || 'User'

  // Filter ROLE_CONFIG to only show roles the user has.
  // For single-role users this will be one button.
  // For multi-role users (future) it will show multiple.
  // If no role stored at all, show all three as a fallback.
  const availableRoles = storedRole
    ? ROLE_CONFIG.filter(r => r.role === storedRole)
    : ROLE_CONFIG

  const handleRoleSelect = (roleConfig) => {
    // Store the selected role as the "active" role for this session.
    // Already stored from login but we set it again here to be explicit.
    localStorage.setItem('active_role', roleConfig.role)

    // Navigate to the role's dashboard
    navigate(roleConfig.path)
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('login_id')
    localStorage.removeItem('user_name')
    localStorage.removeItem('user_id')
    localStorage.removeItem('role')
    localStorage.removeItem('active_role')
    navigate('/login')
  }

  return (
    <div className="login-container">
      <div className="login-card" style={{ maxWidth: '460px' }}>

        <div className="login-header">
          <h1>🪑 Urban Furniture</h1>
          <h2>Accounting System</h2>
          <p>Welcome back, <strong>{userName}</strong></p>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <p style={{
            textAlign: 'center',
            color: '#666',
            fontSize: '15px',
            marginBottom: '20px'
          }}>
            Select your role to continue
          </p>

          {/* Render one card per available role */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {availableRoles.map(roleConfig => (
              <button
                key={roleConfig.role}
                onClick={() => handleRoleSelect(roleConfig)}
                style={{
                  display:       'flex',
                  alignItems:    'center',
                  gap:           '16px',
                  padding:       '18px 20px',
                  background:    'white',
                  border:        '2px solid #e1e5e9',
                  borderRadius:  '10px',
                  cursor:        'pointer',
                  textAlign:     'left',
                  transition:    'all 0.2s',
                  width:         '100%'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = '#0f3460'
                  e.currentTarget.style.background  = '#f8f9ff'
                  e.currentTarget.style.transform   = 'translateY(-1px)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = '#e1e5e9'
                  e.currentTarget.style.background  = 'white'
                  e.currentTarget.style.transform   = 'translateY(0)'
                }}
              >
                {/* Role icon */}
                <span style={{ fontSize: '32px', lineHeight: 1 }}>
                  {roleConfig.icon}
                </span>

                {/* Role name and description */}
                <div>
                  <div style={{
                    fontWeight: 700,
                    fontSize:   '16px',
                    color:      '#1a1a2e',
                    marginBottom: '3px'
                  }}>
                    {roleConfig.label}
                  </div>
                  <div style={{ fontSize: '13px', color: '#888' }}>
                    {roleConfig.hint}
                  </div>
                </div>

                {/* Arrow indicator */}
                <span style={{
                  marginLeft: 'auto',
                  color:      '#0f3460',
                  fontSize:   '18px'
                }}>
                  →
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Logout link at the bottom */}
        <div className="login-hint">
          <p>
            Wrong account?{' '}
            <span
              onClick={handleLogout}
              style={{ color: '#cc0000', fontWeight: 600, cursor: 'pointer' }}
            >
              Sign Out
            </span>
          </p>
        </div>

      </div>
    </div>
  )
}

export default RoleSelectionPage
