import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import api from '../api'

const emptyForm = {
  journal_name:       '',
  journal_type:       'Bank',
  default_account_id: ''
}

const JOURNAL_TYPES = ['Bank', 'Cash', 'General', 'Purchase', 'Sale']

function JournalsPage() {

  const [journals, setJournals]   = useState([])
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
    { label: 'Journals',   path: '/journals'   },
    { label: 'Analytics',  path: '/analytic-accounts' },
    { label: 'Budgets',    path: '/budgets'    },
  ]

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('login_id')
    navigate('/login')
  }

  useEffect(() => {
    fetchJournals()
    fetchAccounts()
  }, [])

  const fetchJournals = async () => {
    try {
      const r = await api.get('/journals/')
      setJournals(r.data)
    } catch (err) {
      setError('Failed to load journals.')
    }
  }

  // fetchAccounts: loads all accounts for the default account dropdown.
  // The accountant picks which account is the default for this journal.
  const fetchAccounts = async () => {
    try {
      const r = await api.get('/accounts/')
      setAccounts(r.data)
    } catch (err) {
      console.error('Failed to load accounts.')
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

  const openEditForm = (journal) => {
    setFormData({
      journal_name:       journal.journal_name,
      journal_type:       journal.journal_type,
      // default_account_id comes as a number from the API.
      // We convert to string because HTML <select> value is always a string.
      // Without String(), the dropdown would not pre-select the right option.
      default_account_id: String(journal.default_account_id)
    })
    setEditingId(journal.id)
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

    const payload = {
      journal_name:       formData.journal_name,
      journal_type:       formData.journal_type,
      // Convert back to number before sending to the API.
      // The backend expects an integer, not a string.
      default_account_id: Number(formData.default_account_id)
    }

    try {
      if (editingId) {
        await api.put(`/journals/${editingId}`, payload)
        setSuccess('Journal updated.')
      } else {
        await api.post('/journals/', payload)
        setSuccess('Journal created.')
      }
      await fetchJournals()
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
    if (!window.confirm(`Delete journal "${name}"?\n\nNote: journals with entries cannot be deleted.`)) return
    try {
      await api.delete(`/journals/${id}`)
      setSuccess(`"${name}" deleted.`)
      await fetchJournals()
    } catch (err) {
      if (err.response?.data?.detail) {
        setError(err.response.data.detail)
      } else {
        setError('Failed to delete journal.')
      }
    }
  }

  const filtered = filter === 'All'
    ? journals
    : journals.filter(j => j.journal_type === filter)

  // typeColor: returns a CSS class for each journal type badge
  const typeColor = (type) => {
    const map = {
      'Bank':     'type-asset',
      'Cash':     'type-income',
      'Sale':     'type-equity',
      'Purchase': 'type-liability',
      'General':  'type-expense'
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
            <h2>Journals</h2>
            <p className="page-subtitle">Financial transaction categories for your accounting</p>
          </div>
          <button className="btn-primary" onClick={openAddForm}>+ Add Journal</button>
        </div>

        {success && <div className="success-message" style={{marginBottom:'16px'}}>✅ {success}</div>}
        {!showForm && error && <div className="error-message" style={{marginBottom:'16px'}}>⚠️ {error}</div>}

        {showForm && (
          <div className="form-card">
            <h3>{editingId ? 'Edit Journal' : 'Add New Journal'}</h3>
            <form onSubmit={handleSubmit} className="contact-form">

              <div className="form-row">
                <div className="form-group">
                  <label>Journal Type *</label>
                  <select
                    name="journal_type"
                    value={formData.journal_type}
                    onChange={handleChange}
                    className="form-select"
                    required
                  >
                    {JOURNAL_TYPES.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Journal Name *</label>
                  <input
                    type="text"
                    name="journal_name"
                    value={formData.journal_name}
                    onChange={handleChange}
                    placeholder="e.g. Bank Journal, Sales Journal"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Default Account *</label>
                <select
                  name="default_account_id"
                  value={formData.default_account_id}
                  onChange={handleChange}
                  className="form-select"
                  required
                >
                  <option value="">-- Select Default Account --</option>
                  {/* Group accounts by type for easier selection.
                      We sort accounts so they appear grouped: Asset, Equity, Expense... */}
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>
                      {acc.account_name} ({acc.account_type})
                    </option>
                  ))}
                </select>
              </div>

              {/* Accounting hint about which account to pick */}
              <div style={{
                background: '#f8f9fa', borderRadius: '8px',
                padding: '12px 16px', fontSize: '13px', color: '#555'
              }}>
                💡 <strong>Bank</strong> → Asset account &nbsp;|&nbsp;
                <strong>Cash</strong> → Asset account &nbsp;|&nbsp;
                <strong>Sale</strong> → Income account &nbsp;|&nbsp;
                <strong>Purchase</strong> → Liability account &nbsp;|&nbsp;
                <strong>General</strong> → Any account
              </div>

              {error && <div className="error-message">⚠️ {error}</div>}

              <div className="form-actions">
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? 'Saving...' : editingId ? 'Update Journal' : 'Create Journal'}
                </button>
                <button type="button" className="btn-secondary" onClick={closeForm}>Cancel</button>
              </div>
            </form>
          </div>
        )}

        <div className="card">
          <div className="table-toolbar">
            <span className="contact-count">
              {filtered.length} journal{filtered.length !== 1 ? 's' : ''}
            </span>
            <div className="filter-tabs">
              {['All', ...JOURNAL_TYPES].map(f => (
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
            <div className="empty-state">No journals found. Click "+ Add Journal" to create one.</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Type</th>
                  <th>Journal Name</th>
                  <th>Default Account</th>
                  <th>Account Type</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(journal => (
                  <tr key={journal.id}>
                    <td>{journal.id}</td>
                    <td>
                      <span className={`type-badge ${typeColor(journal.journal_type)}`}>
                        {journal.journal_type}
                      </span>
                    </td>
                    <td><strong>{journal.journal_name}</strong></td>
                    <td>{journal.default_account?.account_name || '—'}</td>
                    <td>
                      {journal.default_account && (
                        <span className={`type-badge type-${journal.default_account.account_type.toLowerCase()}`}>
                          {journal.default_account.account_type}
                        </span>
                      )}
                    </td>
                    <td>
                      {journal.created_at
                        ? new Date(journal.created_at).toLocaleDateString('en-IN')
                        : '—'}
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button className="btn-edit" onClick={() => openEditForm(journal)}>Edit</button>
                        <button className="btn-delete" onClick={() => handleDelete(journal.id, journal.journal_name)}>Delete</button>
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

export default JournalsPage
