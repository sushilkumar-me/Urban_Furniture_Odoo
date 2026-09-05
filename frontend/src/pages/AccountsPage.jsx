import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import api from '../api'

const emptyForm = {
  account_name: '',
  account_type: 'Asset'
}

const ACCOUNT_TYPES = ['Asset', 'Liability', 'Equity', 'Income', 'Expense']

function AccountsPage() {

  const [accounts, setAccounts]   = useState([])
  const [showForm, setShowForm]   = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [formData, setFormData]   = useState(emptyForm)
  const [filter, setFilter]       = useState('All')
  const [error, setError]         = useState('')
  const [success, setSuccess]     = useState('')
  const [loading, setLoading]     = useState(false)

  const navigate = useNavigate()
  const location = useLocation()
  const loginId  = localStorage.getItem('login_id') || 'User'

  const navLinks = [
    { label: 'Dashboard',  path: '/dashboard'  },
    { label: 'Contacts',   path: '/contacts'   },
    { label: 'Categories', path: '/categories' },
    { label: 'Products',   path: '/products'   },
    { label: 'Accounts',   path: '/accounts'   },
  ]

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('login_id')
    navigate('/login')
  }

  useEffect(() => {
    fetchAccounts()
  }, [])

  const fetchAccounts = async () => {
    try {
      const r = await api.get('/accounts/')
      setAccounts(r.data)
    } catch (err) {
      setError('Failed to load accounts.')
    }
  }

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const openAddForm = () => {
    setFormData(emptyForm)
    setEditingId(null)
    setError('')
    setSuccess('')
    setShowForm(true)
  }

  const openEditForm = (account) => {
    setFormData({
      account_name: account.account_name,
      account_type: account.account_type
    })
    setEditingId(account.id)
    setError('')
    setSuccess('')
    setShowForm(true)
  }

  const closeForm = () => {
    setShowForm(false)
    setEditingId(null)
    setFormData(emptyForm)
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (editingId) {
        await api.put(`/accounts/${editingId}`, formData)
        setSuccess('Account updated.')
      } else {
        await api.post('/accounts/', formData)
        setSuccess('Account created.')
      }
      await fetchAccounts()
      closeForm()
    } catch (err) {
      if (err.response?.data?.detail) {
        setError(err.response.data.detail)
      } else {
        setError('Something went wrong.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete account "${name}"?\n\nNote: accounts used in journal entries cannot be deleted.`)) return
    try {
      await api.delete(`/accounts/${id}`)
      setSuccess(`"${name}" deleted.`)
      await fetchAccounts()
    } catch (err) {
      if (err.response?.data?.detail) {
        setError(err.response.data.detail)
      } else {
        setError('Failed to delete account.')
      }
    }
  }

  const filtered = filter === 'All'
    ? accounts
    : accounts.filter(a => a.account_type === filter)

  // typeColor returns a CSS class name based on account type.
  // Each type gets a distinct colour so the table is easy to scan.
  const typeColor = (type) => {
    const map = {
      'Asset':     'type-asset',
      'Liability': 'type-liability',
      'Equity':    'type-equity',
      'Income':    'type-income',
      'Expense':   'type-expense'
    }
    return map[type] || ''
  }

  return (
    <div className="dashboard-container">

      <nav className="navbar">
        <div className="navbar-brand">🪑 Urban Furniture Accounting</div>
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
          <button onClick={handleLogout} className="logout-button">Logout</button>
        </div>
      </nav>

      <div className="page-container">

        <div className="page-header">
          <div>
            <h2>Chart of Accounts</h2>
            <p className="page-subtitle">All financial accounts organised by type</p>
          </div>
          <button className="btn-primary" onClick={openAddForm}>+ Add Account</button>
        </div>

        {success && <div className="success-message" style={{marginBottom:'16px'}}>✅ {success}</div>}
        {!showForm && error && <div className="error-message" style={{marginBottom:'16px'}}>⚠️ {error}</div>}

        {showForm && (
          <div className="form-card">
            <h3>{editingId ? 'Edit Account' : 'Add New Account'}</h3>
            <form onSubmit={handleSubmit} className="contact-form">

              <div className="form-row">
                <div className="form-group">
                  <label>Account Type *</label>
                  <select
                    name="account_type"
                    value={formData.account_type}
                    onChange={handleChange}
                    className="form-select"
                    required
                  >
                    {ACCOUNT_TYPES.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Account Name *</label>
                  <input
                    type="text"
                    name="account_name"
                    value={formData.account_name}
                    onChange={handleChange}
                    placeholder="e.g. Cash in Hand, Sales Revenue"
                    required
                  />
                </div>
              </div>

              {/* Accounting hint — helps the user understand what type to pick */}
              <div style={{
                background: '#f8f9fa', borderRadius: '8px',
                padding: '12px 16px', fontSize: '13px', color: '#555'
              }}>
                💡 <strong>Asset</strong> = things you own &nbsp;|&nbsp;
                <strong>Liability</strong> = things you owe &nbsp;|&nbsp;
                <strong>Equity</strong> = owner's money &nbsp;|&nbsp;
                <strong>Income</strong> = money earned &nbsp;|&nbsp;
                <strong>Expense</strong> = money spent
              </div>

              {error && <div className="error-message">⚠️ {error}</div>}

              <div className="form-actions">
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? 'Saving...' : editingId ? 'Update Account' : 'Create Account'}
                </button>
                <button type="button" className="btn-secondary" onClick={closeForm}>Cancel</button>
              </div>
            </form>
          </div>
        )}

        <div className="card">
          <div className="table-toolbar">
            <span className="contact-count">
              {filtered.length} account{filtered.length !== 1 ? 's' : ''}
            </span>
            <div className="filter-tabs">
              {['All', ...ACCOUNT_TYPES].map(f => (
                <button
                  key={f}
                  className={`filter-tab ${filter === f ? 'active' : ''}`}
                  onClick={() => setFilter(f)}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="empty-state">No accounts found. Click "+ Add Account" to create one.</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Account Type</th>
                  <th>Account Name</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(account => (
                  <tr key={account.id}>
                    <td>{account.id}</td>
                    <td>
                      <span className={`type-badge ${typeColor(account.account_type)}`}>
                        {account.account_type}
                      </span>
                    </td>
                    <td><strong>{account.account_name}</strong></td>
                    <td>
                      {account.created_at
                        ? new Date(account.created_at).toLocaleDateString('en-IN')
                        : '—'}
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button className="btn-edit" onClick={() => openEditForm(account)}>Edit</button>
                        <button className="btn-delete" onClick={() => handleDelete(account.id, account.account_name)}>Delete</button>
                      </div>
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

export default AccountsPage
