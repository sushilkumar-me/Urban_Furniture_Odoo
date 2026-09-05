import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import api from '../api'

const emptyForm = { analytic_name: '', type: 'Department', description: '' }
const ANALYTIC_TYPES = ['Department', 'General', 'Product', 'Project']

function AnalyticAccountsPage() {

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

  useEffect(() => { fetchAccounts() }, [])

  const fetchAccounts = async () => {
    try {
      const r = await api.get('/analytic-accounts/')
      setAccounts(r.data)
    } catch { setError('Failed to load analytic accounts.') }
  }

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const openAddForm = () => {
    setFormData(emptyForm); setEditingId(null)
    setError(''); setSuccess(''); setShowForm(true)
  }

  const openEditForm = (acc) => {
    setFormData({ analytic_name: acc.analytic_name, type: acc.type || 'Department', description: acc.description || '' })
    setEditingId(acc.id); setError(''); setSuccess(''); setShowForm(true)
  }

  const closeForm = () => {
    setShowForm(false); setEditingId(null); setFormData(emptyForm); setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault(); setError(''); setLoading(true)
    const payload = {
      analytic_name: formData.analytic_name,
      type:          formData.type         || null,
      description:   formData.description  || null
    }
    try {
      if (editingId) {
        await api.put(`/analytic-accounts/${editingId}`, payload)
        setSuccess('Analytic account updated.')
      } else {
        await api.post('/analytic-accounts/', payload)
        setSuccess('Analytic account created.')
      }
      await fetchAccounts(); closeForm()
    } catch (err) {
      setError(err.response?.data?.detail || 'Something went wrong.')
    } finally { setLoading(false) }
  }

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete "${name}"?`)) return
    try {
      await api.delete(`/analytic-accounts/${id}`)
      setSuccess(`"${name}" deleted.`); await fetchAccounts()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to delete.')
    }
  }

  const filtered = filter === 'All' ? accounts : accounts.filter(a => a.type === filter)

  const typeColor = (type) => ({
    'Department': 'type-asset',
    'Project':    'type-equity',
    'Product':    'type-income',
    'General':    'type-expense'
  })[type] || ''

  return (
    <div className="dashboard-container">
      <nav className="navbar">
        <div className="navbar-brand">🪑 Urban Furniture Accounting</div>
        <div className="navbar-links">
          {navLinks.map(link => (
            <button key={link.path}
              className={`nav-link ${location.pathname === link.path ? 'nav-link-active' : ''}`}
              onClick={() => navigate(link.path)}>{link.label}</button>
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
            <h2>Analytic Accounts</h2>
            <p className="page-subtitle">Cost centres, projects and departments for expense tracking</p>
          </div>
          <button className="btn-primary" onClick={openAddForm}>+ Add Analytic Account</button>
        </div>

        {success && <div className="success-message" style={{marginBottom:'16px'}}>✅ {success}</div>}
        {!showForm && error && <div className="error-message" style={{marginBottom:'16px'}}>⚠️ {error}</div>}

        {showForm && (
          <div className="form-card">
            <h3>{editingId ? 'Edit Analytic Account' : 'Add Analytic Account'}</h3>
            <form onSubmit={handleSubmit} className="contact-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Type</label>
                  <select name="type" value={formData.type} onChange={handleChange} className="form-select">
                    {ANALYTIC_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Name *</label>
                  <input type="text" name="analytic_name" value={formData.analytic_name}
                    onChange={handleChange} placeholder="e.g. Sofa Department" required />
                </div>
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea name="description" value={formData.description} onChange={handleChange}
                  placeholder="Optional description" rows={2}
                  style={{padding:'10px 14px',border:'2px solid #e1e5e9',borderRadius:'8px',fontSize:'14px',resize:'vertical',outline:'none',fontFamily:'inherit'}} />
              </div>
              {error && <div className="error-message">⚠️ {error}</div>}

              <div style={{
                background:'#f8f9fa',borderRadius:'8px',padding:'12px 16px',fontSize:'13px',color:'#555'
              }}>
                💡 <strong>Department</strong> = cost centre by team &nbsp;|&nbsp;
                <strong>Project</strong> = specific project &nbsp;|&nbsp;
                <strong>Product</strong> = product line &nbsp;|&nbsp;
                <strong>General</strong> = overhead
              </div>

              <div className="form-actions">
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? 'Saving...' : editingId ? 'Update' : 'Create'}
                </button>
                <button type="button" className="btn-secondary" onClick={closeForm}>Cancel</button>
              </div>
            </form>
          </div>
        )}

        <div className="card">
          <div className="table-toolbar">
            <span className="contact-count">{filtered.length} analytic account{filtered.length !== 1 ? 's' : ''}</span>
            <div className="filter-tabs">
              {['All', ...ANALYTIC_TYPES].map(f => (
                <button key={f} className={`filter-tab ${filter === f ? 'active' : ''}`}
                  onClick={() => setFilter(f)}>{f}</button>
              ))}
            </div>
          </div>
          {filtered.length === 0 ? (
            <div className="empty-state">No analytic accounts found. Click "+ Add" to create one.</div>
          ) : (
            <table className="data-table">
              <thead><tr><th>ID</th><th>Type</th><th>Name</th><th>Description</th><th>Created</th><th>Actions</th></tr></thead>
              <tbody>
                {filtered.map(acc => (
                  <tr key={acc.id}>
                    <td>{acc.id}</td>
                    <td><span className={`type-badge ${typeColor(acc.type)}`}>{acc.type || '—'}</span></td>
                    <td><strong>{acc.analytic_name}</strong></td>
                    <td style={{maxWidth:'250px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                      {acc.description || <span style={{color:'#bbb'}}>—</span>}
                    </td>
                    <td>{acc.created_at ? new Date(acc.created_at).toLocaleDateString('en-IN') : '—'}</td>
                    <td>
                      <div className="action-buttons">
                        <button className="btn-edit" onClick={() => openEditForm(acc)}>Edit</button>
                        <button className="btn-delete" onClick={() => handleDelete(acc.id, acc.analytic_name)}>Delete</button>
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

export default AnalyticAccountsPage
