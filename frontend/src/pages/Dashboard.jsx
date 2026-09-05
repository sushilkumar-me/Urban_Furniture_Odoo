import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import api from '../api'

function Dashboard() {

  const [users, setUsers]   = useState([])
  const [loginId]           = useState(localStorage.getItem('login_id') || 'User')
  const navigate            = useNavigate()
  const location            = useLocation()

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await api.get('/auth/users', {
        headers: { Authorization: `Bearer ${token}` }
      })
      setUsers(response.data)
    } catch (err) {
      console.error('Failed to fetch users:', err)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('login_id')
    navigate('/login')
  }

  const navLinks = [
    { label: 'Dashboard', path: '/dashboard' },
    { label: 'Contacts',  path: '/contacts'  },
    { label: 'Categories', path: '/categories' },
  ]

  return (
    <div className="dashboard-container">

      <nav className="navbar">
        <div className="navbar-brand">
          🪑 Urban Furniture Accounting
        </div>

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
          <button onClick={handleLogout} className="logout-button">
            Logout
          </button>
        </div>
      </nav>

      <div className="dashboard-content">

        <h2>Dashboard</h2>
        <p className="dashboard-subtitle">
          Welcome back. Use the navigation above to manage your accounting data.
        </p>

        <div className="stats-row">
          <div className="stat-card" onClick={() => navigate('/contacts')} style={{ cursor: 'pointer' }}>
            <div className="stat-icon">👥</div>
            <div className="stat-info">
              <div className="stat-label">Contacts</div>
              <div className="stat-hint">Customers & Vendors</div>
            </div>
          </div>
          <div className="stat-card" onClick={() => navigate('/categories')} style={{ cursor: 'pointer' }}>
            <div className="stat-icon">🗂️</div>
            <div className="stat-info">
              <div className="stat-label">Categories</div>
              <div className="stat-hint">Product categories</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">🧾</div>
            <div className="stat-info">
              <div className="stat-label">Invoices</div>
              <div className="stat-hint">Coming soon</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">💳</div>
            <div className="stat-info">
              <div className="stat-label">Payments</div>
              <div className="stat-hint">Coming soon</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">📦</div>
            <div className="stat-info">
              <div className="stat-label">Products</div>
              <div className="stat-hint">Coming soon</div>
            </div>
          </div>
        </div>

        <div className="card">
          <h3>Registered Users ({users.length})</h3>
          {users.length === 0 ? (
            <p>Loading users...</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Login ID</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td>{user.id}</td>
                    <td>{user.name}</td>
                    <td>{user.login_id}</td>
                    <td>{user.email}</td>
                    <td>
                      <span className={`role-badge role-${user.role.toLowerCase()}`}>
                        {user.role}
                      </span>
                    </td>
                    <td>
                      <span className={user.is_active ? 'status-active' : 'status-inactive'}>
                        {user.is_active ? '● Active' : '● Inactive'}
                      </span>
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

export default Dashboard
