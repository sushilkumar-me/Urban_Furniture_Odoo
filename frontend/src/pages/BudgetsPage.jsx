import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import api from '../api'

const emptyForm = {
  analytic_account_id: '',
  budget_name:         '',
  start_date:          '',
  end_date:            '',
  planned_amount:      '',
  responsible_person:  ''
}

function BudgetsPage() {

  const [budgets, setBudgets]         = useState([])
  const [analytics, setAnalytics]     = useState([])
  const [showForm, setShowForm]       = useState(false)
  const [editingId, setEditingId]     = useState(null)
  const [formData, setFormData]       = useState(emptyForm)
  const [filterAnalytic, setFilterAnalytic] = useState('All')
  const [error, setError]             = useState('')
  const [success, setSuccess]         = useState('')
  const [loading, setLoading]         = useState(false)

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
    fetchBudgets()
    fetchAnalytics()
  }, [])

  const fetchBudgets = async () => {
    try {
      const r = await api.get('/budgets/')
      setBudgets(r.data)
    } catch { setError('Failed to load budgets.') }
  }

  // Load analytic accounts for the dropdown in the form
  const fetchAnalytics = async () => {
    try {
      const r = await api.get('/analytic-accounts/')
      setAnalytics(r.data)
    } catch { console.error('Failed to load analytic accounts.') }
  }

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const openAddForm = () => {
    setFormData(emptyForm); setEditingId(null)
    setError(''); setSuccess(''); setShowForm(true)
  }

  const openEditForm = (budget) => {
    setFormData({
      analytic_account_id: String(budget.analytic_account_id),
      budget_name:         budget.budget_name,
      // HTML date input requires format YYYY-MM-DD
      // The API returns dates as "2026-04-01" already — no conversion needed
      start_date:          budget.start_date || '',
      end_date:            budget.end_date   || '',
      planned_amount:      String(budget.planned_amount),
      responsible_person:  budget.responsible_person || ''
    })
    setEditingId(budget.id); setError(''); setSuccess(''); setShowForm(true)
  }

  const closeForm = () => {
    setShowForm(false); setEditingId(null); setFormData(emptyForm); setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault(); setError(''); setLoading(true)

    const payload = {
      analytic_account_id: Number(formData.analytic_account_id),
      budget_name:         formData.budget_name,
      // date fields sent as strings "YYYY-MM-DD" — FastAPI converts to date type
      start_date:          formData.start_date,
      end_date:            formData.end_date,
      planned_amount:      Number(formData.planned_amount),
      responsible_person:  formData.responsible_person || null
    }

    try {
      if (editingId) {
        await api.put(`/budgets/${editingId}`, payload)
        setSuccess('Budget updated.')
      } else {
        await api.post('/budgets/', payload)
        setSuccess('Budget created.')
      }
      await fetchBudgets(); closeForm()
    } catch (err) {
      if (err.response?.data?.detail) {
        setError(err.response.data.detail)
      } else {
        setError('Something went wrong.')
      }
    } finally { setLoading(false) }
  }

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete budget "${name}"?`)) return
    try {
      await api.delete(`/budgets/${id}`)
      setSuccess(`"${name}" deleted.`); await fetchBudgets()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to delete.')
    }
  }

  // Client-side filter by analytic account name
  const filtered = filterAnalytic === 'All'
    ? budgets
    : budgets.filter(b => b.analytic_account?.analytic_name === filterAnalytic)

  // Total planned amount across all filtered budgets
  const totalPlanned = filtered.reduce((sum, b) => sum + Number(b.planned_amount), 0)

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
            <h2>Budgets</h2>
            <p className="page-subtitle">Financial plans per analytic account and time period</p>
          </div>
          <button className="btn-primary" onClick={openAddForm}>+ Add Budget</button>
        </div>

        {success && <div className="success-message" style={{marginBottom:'16px'}}>✅ {success}</div>}
        {!showForm && error && <div className="error-message" style={{marginBottom:'16px'}}>⚠️ {error}</div>}

        {showForm && (
          <div className="form-card">
            <h3>{editingId ? 'Edit Budget' : 'Add New Budget'}</h3>
            <form onSubmit={handleSubmit} className="contact-form">

              <div className="form-row">
                <div className="form-group">
                  <label>Analytic Account *</label>
                  <select name="analytic_account_id" value={formData.analytic_account_id}
                    onChange={handleChange} className="form-select" required>
                    <option value="">-- Select Analytic Account --</option>
                    {analytics.map(a => (
                      <option key={a.id} value={a.id}>{a.analytic_name} ({a.type})</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Budget Name *</label>
                  <input type="text" name="budget_name" value={formData.budget_name}
                    onChange={handleChange} placeholder="e.g. FY2026 Sofa Production Budget" required />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Start Date *</label>
                  {/* type="date" shows a date picker in the browser.
                      The value is always in YYYY-MM-DD format.
                      FastAPI's date type reads this directly. */}
                  <input type="date" name="start_date" value={formData.start_date}
                    onChange={handleChange} required
                    style={{padding:'10px 14px',border:'2px solid #e1e5e9',borderRadius:'8px',fontSize:'14px',outline:'none'}} />
                </div>
                <div className="form-group">
                  <label>End Date *</label>
                  <input type="date" name="end_date" value={formData.end_date}
                    onChange={handleChange} required
                    style={{padding:'10px 14px',border:'2px solid #e1e5e9',borderRadius:'8px',fontSize:'14px',outline:'none'}} />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Planned Amount (₹) *</label>
                  <input type="number" name="planned_amount" value={formData.planned_amount}
                    onChange={handleChange} placeholder="e.g. 500000" min="0" step="0.01" required />
                </div>
                <div className="form-group">
                  <label>Responsible Person</label>
                  <input type="text" name="responsible_person" value={formData.responsible_person}
                    onChange={handleChange} placeholder="Name of budget owner" />
                </div>
              </div>

              {error && <div className="error-message">⚠️ {error}</div>}

              <div className="form-actions">
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? 'Saving...' : editingId ? 'Update Budget' : 'Create Budget'}
                </button>
                <button type="button" className="btn-secondary" onClick={closeForm}>Cancel</button>
              </div>
            </form>
          </div>
        )}

        <div className="card">
          <div className="table-toolbar">
            <span className="contact-count">
              {filtered.length} budget{filtered.length !== 1 ? 's' : ''} &nbsp;|&nbsp;
              Total: <strong>₹{totalPlanned.toLocaleString('en-IN')}</strong>
            </span>
            <div className="filter-tabs">
              <button className={`filter-tab ${filterAnalytic === 'All' ? 'active' : ''}`}
                onClick={() => setFilterAnalytic('All')}>All</button>
              {/* Build filter tabs from unique analytic account names */}
              {[...new Set(budgets.map(b => b.analytic_account?.analytic_name).filter(Boolean))].map(name => (
                <button key={name}
                  className={`filter-tab ${filterAnalytic === name ? 'active' : ''}`}
                  onClick={() => setFilterAnalytic(name)}>{name}</button>
              ))}
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="empty-state">No budgets found. Click "+ Add Budget" to create one.</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Budget Name</th>
                  <th>Analytic Account</th>
                  <th>Period</th>
                  <th>Planned Amount</th>
                  <th>Responsible</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(budget => (
                  <tr key={budget.id}>
                    <td>{budget.id}</td>
                    <td><strong>{budget.budget_name}</strong></td>
                    <td>
                      {budget.analytic_account && (
                        <div>
                          <div style={{fontWeight:600,fontSize:'13px'}}>{budget.analytic_account.analytic_name}</div>
                          <div style={{fontSize:'11px',color:'#888'}}>{budget.analytic_account.type}</div>
                        </div>
                      )}
                    </td>
                    <td style={{whiteSpace:'nowrap'}}>
                      {/* Format dates as DD/MM/YYYY for display */}
                      {budget.start_date ? new Date(budget.start_date).toLocaleDateString('en-IN') : '—'}
                      {' → '}
                      {budget.end_date ? new Date(budget.end_date).toLocaleDateString('en-IN') : '—'}
                    </td>
                    <td style={{fontWeight:700,color:'#0f3460'}}>
                      ₹{Number(budget.planned_amount).toLocaleString('en-IN')}
                    </td>
                    <td>{budget.responsible_person || <span style={{color:'#bbb'}}>—</span>}</td>
                    <td>
                      <div className="action-buttons">
                        <button className="btn-edit" onClick={() => openEditForm(budget)}>Edit</button>
                        <button className="btn-delete" onClick={() => handleDelete(budget.id, budget.budget_name)}>Delete</button>
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

export default BudgetsPage
