import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api'

const emptyForm = {
  analytic_name: '',
  type:          'Expense',
  description:   ''
}

const ANALYTIC_TYPES = ['Expense', 'Income', 'Department', 'Project', 'Product', 'General']

function AnalyticAccountsPage() {
  const [accounts, setAccounts]       = useState([])
  const [budgets, setBudgets]         = useState([])
  const [showForm, setShowForm]       = useState(false)
  const [editingId, setEditingId]     = useState(null)
  const [formData, setFormData]       = useState(emptyForm)
  const [searchQuery, setSearchQuery] = useState('')
  const [error, setError]             = useState('')
  const [success, setSuccess]         = useState('')
  const [loading, setLoading]         = useState(false)

  const navigate = useNavigate()

  useEffect(() => {
    fetchAccounts()
    fetchBudgets()
  }, [])

  const fetchAccounts = async () => {
    try {
      const r = await api.get('/analytic-accounts/')
      setAccounts(r.data)
    } catch {
      setError('Failed to load analytic accounts.')
    }
  }

  const fetchBudgets = async () => {
    try {
      const r = await api.get('/budgets/')
      setBudgets(r.data)
    } catch {
      console.error('Failed to load budgets.')
    }
  }

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
    if (error) setError('')
  }

  const handleNew = () => {
    setFormData(emptyForm)
    setEditingId(null)
    setError('')
    setSuccess('')
    setShowForm(true)
  }

  const openEditForm = (acc) => {
    setFormData({
      analytic_name: acc.analytic_name,
      type:          acc.type || 'Expense',
      description:   acc.description || ''
    })
    setEditingId(acc.id)
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

    if (!formData.analytic_name.trim()) {
      setError('Analytic Account name is required.')
      setLoading(false)
      return
    }

    const payload = {
      analytic_name: formData.analytic_name.trim(),
      type:          formData.type || null,
      description:   formData.description?.trim() || null
    }

    try {
      if (editingId) {
        await api.put(`/analytic-accounts/${editingId}`, payload)
        setSuccess(`Analytic Account "${formData.analytic_name}" updated successfully.`)
      } else {
        await api.post('/analytic-accounts/', payload)
        setSuccess(`Analytic Account "${formData.analytic_name}" created successfully.`)
      }
      await fetchAccounts()
      closeForm()
    } catch (err) {
      const detail = err.response?.data?.detail
      if (Array.isArray(detail)) {
        setError(detail.map(d => d.msg || d.loc?.join('.')).join(' | '))
      } else if (typeof detail === 'object') {
        setError(JSON.stringify(detail))
      } else if (detail) {
        setError(String(detail))
      } else {
        setError('Failed to save analytic account.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id, name, e) => {
    if (e) e.stopPropagation()
    if (!window.confirm(`Delete analytic account "${name}"?\n\nNote: analytic accounts with active budgets cannot be deleted.`)) return
    try {
      await api.delete(`/analytic-accounts/${id}`)
      setSuccess(`"${name}" deleted.`)
      await fetchAccounts()
    } catch (err) {
      const detail = err.response?.data?.detail
      setError(typeof detail === 'string' ? detail : 'Failed to delete analytic account.')
    }
  }

  // Linked budgets for the currently open/editing analytic account
  const linkedBudgets = editingId ? budgets.filter(b => b.analytic_account_id === editingId) : []

  // Filter accounts for search
  const filteredAccounts = accounts.filter(acc => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      const matchName = (acc.analytic_name || '').toLowerCase().includes(q)
      const matchType = (acc.type || '').toLowerCase().includes(q)
      const matchDesc = (acc.description || '').toLowerCase().includes(q)
      if (!matchName && !matchType && !matchDesc) return false
    }
    return true
  }).sort((a, b) => {
    if (a.analytic_name === 'Furniture') return -1
    if (b.analytic_name === 'Furniture') return 1
    return a.analytic_name.localeCompare(b.analytic_name)
  })

  // Underlined input style matching wireframe
  const underlineInputStyle = {
    width: '100%',
    border: 'none',
    borderBottom: '2px solid #94a3b8',
    background: 'transparent',
    padding: '8px 4px',
    fontSize: '16px',
    outline: 'none',
    color: '#1e293b',
    transition: 'border-color 0.15s ease'
  }

  const typeBadgeClass = (type) => {
    const t = (type || '').toLowerCase()
    if (t === 'income') return 'type-income'
    if (t === 'expense' || t === 'expenses') return 'type-expense'
    if (t === 'department') return 'type-asset'
    if (t === 'project') return 'type-equity'
    return 'type-liability'
  }

  return (
    <div className="page-container" style={{ maxWidth: '960px', margin: '0 auto', padding: '24px 16px' }}>

      {/* Global Notifications */}
      {success && (
        <div className="success-message" style={{ marginBottom: '16px' }}>
          ✅ {success}
        </div>
      )}
      {!showForm && error && (
        <div className="error-message" style={{ marginBottom: '16px' }}>
          ⚠️ {error}
        </div>
      )}

      {/* ============================================================ */}
      {/* 1. ANALYTICS FORM VIEW                                       */}
      {/* ============================================================ */}
      {showForm ? (
        <div>
          {/* Top Title: Analytics Form View */}
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <h1 style={{
              fontSize: '28px',
              fontWeight: 800,
              color: '#1a1a2e',
              letterSpacing: '-0.5px',
              margin: 0
            }}>
              Analytics Form View
            </h1>
          </div>

          {/* Main Card Frame */}
          <div style={{
            background: '#ffffff',
            border: '2px solid #e2e8f0',
            borderRadius: '24px',
            padding: '32px 36px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.06)',
            marginBottom: '32px'
          }}>
            <form onSubmit={handleSubmit}>

              {/* Action Bar: [ New ] [ Confirm ]  ...  [ Back ] */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '28px'
              }}>
                <div style={{ display: 'flex', gap: '14px' }}>
                  <button
                    type="button"
                    onClick={handleNew}
                    style={{
                      background: '#ffffff',
                      border: '2px solid #0f3460',
                      color: '#0f3460',
                      fontWeight: 700,
                      fontSize: '15px',
                      borderRadius: '12px',
                      padding: '8px 26px',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = '#0f3460'; e.currentTarget.style.color = '#ffffff' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.color = '#0f3460' }}
                  >
                    New
                  </button>

                  <button
                    type="submit"
                    disabled={loading}
                    style={{
                      background: '#0f3460',
                      border: '2px solid #0f3460',
                      color: '#ffffff',
                      fontWeight: 700,
                      fontSize: '15px',
                      borderRadius: '12px',
                      padding: '8px 28px',
                      cursor: 'pointer',
                      boxShadow: '0 3px 10px rgba(15, 52, 96, 0.25)',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = '#16213e' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = '#0f3460' }}
                  >
                    {loading ? 'Confirming...' : 'Confirm'}
                  </button>
                </div>

                <div>
                  <button
                    type="button"
                    onClick={closeForm}
                    style={{
                      background: '#ffffff',
                      border: '2px solid #64748b',
                      color: '#475569',
                      fontWeight: 700,
                      fontSize: '15px',
                      borderRadius: '12px',
                      padding: '8px 26px',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = '#f1f5f9' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = '#ffffff' }}
                  >
                    Back
                  </button>
                </div>
              </div>

              {/* Form Error Banner */}
              {error && (
                <div className="error-message" style={{ marginBottom: '20px' }}>
                  ⚠️ {error}
                </div>
              )}

              {/* Analytics Header Fields */}
              <div style={{
                background: '#fcfdfe',
                border: '1.5px solid #e2e8f0',
                borderRadius: '18px',
                padding: '28px',
                marginBottom: '28px'
              }}>
                {/* Analytic Account Name */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '170px 1fr',
                  alignItems: 'center',
                  marginBottom: '24px'
                }}>
                  <label htmlFor="analytic_name" style={{
                    fontSize: '16px',
                    fontWeight: 700,
                    color: '#0f3460'
                  }}>
                    Analytic Account *
                  </label>
                  <input
                    type="text"
                    id="analytic_name"
                    name="analytic_name"
                    value={formData.analytic_name}
                    onChange={handleChange}
                    placeholder="e.g. Furniture, Design Studio, Turnkey Project"
                    required
                    style={{
                      ...underlineInputStyle,
                      fontSize: '17px',
                      fontWeight: 600,
                      borderBottomColor: '#0f3460'
                    }}
                  />
                </div>

                {/* Type Selection Dropdown (Income / Expense) */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '170px 1fr',
                  alignItems: 'center',
                  marginBottom: '24px'
                }}>
                  <label htmlFor="type" style={{
                    fontSize: '16px',
                    fontWeight: 700,
                    color: '#0f3460'
                  }}>
                    Type *
                  </label>
                  <select
                    id="type"
                    name="type"
                    value={formData.type}
                    onChange={handleChange}
                    required
                    style={{
                      ...underlineInputStyle,
                      cursor: 'pointer',
                      fontWeight: 600,
                      borderBottomColor: '#0f3460'
                    }}
                  >
                    <optgroup label="Core Types (Wireframe Specification)">
                      <option value="Expense">Expense (for Purchase Orders & Vendor Bills)</option>
                      <option value="Income">Income (for Customer Invoices & Sales)</option>
                    </optgroup>
                    <optgroup label="Other Cost Center Categories">
                      <option value="Department">Department</option>
                      <option value="Project">Project</option>
                      <option value="Product">Product Line</option>
                      <option value="General">General Overhead</option>
                    </optgroup>
                  </select>
                </div>

                {/* Description */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '170px 1fr',
                  alignItems: 'center'
                }}>
                  <label htmlFor="description" style={{
                    fontSize: '16px',
                    fontWeight: 700,
                    color: '#0f3460'
                  }}>
                    Description
                  </label>
                  <input
                    type="text"
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    placeholder="Optional memo or scope notes"
                    style={{
                      ...underlineInputStyle,
                      borderBottomColor: '#0f3460'
                    }}
                  />
                </div>
              </div>

              {/* Reverse Linked Budgets Table matching wireframe */}
              <div style={{ marginTop: '32px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#1a1a2e', margin: 0 }}>
                    Linked Budgets
                  </h3>
                  <span style={{
                    fontSize: '12px',
                    color: '#dc2626',
                    fontStyle: 'italic',
                    fontWeight: 600
                  }}>
                    (All the Budget List where the Analytic Account is used)
                  </span>
                </div>

                {linkedBudgets.length === 0 ? (
                  <div style={{
                    background: '#f8fafc',
                    border: '1.5px dashed #cbd5e1',
                    borderRadius: '12px',
                    padding: '24px',
                    textAlign: 'center',
                    color: '#64748b',
                    fontSize: '14px'
                  }}>
                    No budgets linked to this analytic account yet. Create one under <strong>Budgets</strong>.
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto', border: '1.5px solid #e2e8f0', borderRadius: '14px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                          <th style={{ textAlign: 'left', padding: '12px 14px', fontSize: '14px', color: '#1e293b' }}>
                            Budget
                          </th>
                          <th style={{ textAlign: 'left', padding: '12px 14px', fontSize: '14px', color: '#1e293b' }}>
                            Start Date
                          </th>
                          <th style={{ textAlign: 'left', padding: '12px 14px', fontSize: '14px', color: '#1e293b' }}>
                            End Date
                          </th>
                          <th style={{ textAlign: 'right', padding: '12px 14px', fontSize: '14px', color: '#1e293b' }}>
                            Committed (₹)
                          </th>
                          <th style={{ textAlign: 'right', padding: '12px 14px', fontSize: '14px', color: '#1e293b' }}>
                            Achieved (₹)
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {linkedBudgets.map(b => (
                          <tr key={b.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '12px 14px', fontWeight: 600, color: '#0f3460' }}>
                              {b.budget_name}
                            </td>
                            <td style={{ padding: '12px 14px', color: '#475569', fontSize: '14px' }}>
                              {b.start_date || '—'}
                            </td>
                            <td style={{ padding: '12px 14px', color: '#475569', fontSize: '14px' }}>
                              {b.end_date || '—'}
                            </td>
                            <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700, color: '#0f3460' }}>
                              ₹{Number(b.planned_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </td>
                            <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700, color: '#16a34a' }}>
                              ₹{Number(b.achieved_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

            </form>
          </div>
        </div>
      ) : (
        /* ============================================================ */
        /* 2. ANALYTIC ACCOUNTS LIST VIEW                               */
        /* ============================================================ */
        <div>
          {/* Top Title: Analytic Accounts (List View) */}
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <h1 style={{
              fontSize: '28px',
              fontWeight: 800,
              color: '#1a1a2e',
              letterSpacing: '-0.5px',
              margin: '0 0 6px 0'
            }}>
              Analytic Accounts (List View)
            </h1>
          </div>

          {/* Main Card Frame */}
          <div style={{
            background: '#ffffff',
            border: '2px solid #e2e8f0',
            borderRadius: '24px',
            padding: '24px 28px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.06)'
          }}>

            {/* Top Toolbar matching wireframe: [ New ] ... [ Back ] */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '20px',
              flexWrap: 'wrap',
              gap: '12px'
            }}>
              {/* Left Action: [ New ] */}
              <button
                type="button"
                onClick={handleNew}
                style={{
                  background: '#ffffff',
                  border: '2px solid #0f3460',
                  color: '#0f3460',
                  fontWeight: 700,
                  fontSize: '14px',
                  borderRadius: '10px',
                  padding: '7px 24px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#0f3460'; e.currentTarget.style.color = '#ffffff' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.color = '#0f3460' }}
              >
                New
              </button>

              {/* Search Box */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: '#f8fafc',
                border: '1.5px solid #cbd5e1',
                borderRadius: '10px',
                padding: '5px 14px',
                minWidth: '240px'
              }}>
                <span style={{ fontSize: '14px', color: '#64748b' }}>🔍</span>
                <input
                  type="text"
                  placeholder="Search analytic accounts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    outline: 'none',
                    fontSize: '13px',
                    color: '#1e293b',
                    width: '100%'
                  }}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    style={{ border: 'none', background: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '12px' }}
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Right Navigation: [ Back ] */}
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                style={{
                  background: '#ffffff',
                  border: '2px solid #64748b',
                  color: '#475569',
                  fontWeight: 700,
                  fontSize: '14px',
                  borderRadius: '10px',
                  padding: '7px 22px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#f1f5f9' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = '#ffffff' }}
                title="Back to Dashboard"
              >
                Back
              </button>
            </div>

            {/* Analytic Accounts Table */}
            {filteredAccounts.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '48px 20px',
                color: '#64748b',
                fontSize: '15px'
              }}>
                No analytic accounts found. Click <strong>"New"</strong> to add one.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                      <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: '14px', color: '#1e293b', fontWeight: 700 }}>
                        Analytic Account Name
                      </th>
                      <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: '14px', color: '#1e293b', fontWeight: 700 }}>
                        Type
                      </th>
                      <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: '14px', color: '#1e293b', fontWeight: 700 }}>
                        Description
                      </th>
                      <th style={{ textAlign: 'center', width: '110px', padding: '12px 16px', fontSize: '14px', color: '#1e293b', fontWeight: 700 }}>
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAccounts.map((acc) => (
                      <tr
                        key={acc.id}
                        onClick={() => openEditForm(acc)}
                        style={{
                          cursor: 'pointer',
                          borderBottom: '1px solid #f1f5f9',
                          transition: 'background 0.12s ease'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        <td style={{ padding: '12px 16px', color: '#0f3460', fontWeight: 600, fontSize: '15px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span>{acc.analytic_name}</span>
                            {acc.analytic_name === 'Furniture' && (
                              <span style={{
                                fontSize: '10px',
                                fontWeight: 700,
                                background: '#ecfdf5',
                                color: '#059669',
                                border: '1px solid #a7f3d0',
                                borderRadius: '4px',
                                padding: '1px 6px'
                              }}>
                                Wireframe Master
                              </span>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span className={`type-badge ${typeBadgeClass(acc.type)}`}>
                            {acc.type || '—'}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', color: '#64748b', fontSize: '14px', maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {acc.description || '—'}
                        </td>
                        <td style={{ textAlign: 'center', padding: '12px 16px' }} onClick={(e) => e.stopPropagation()}>
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                            <button
                              type="button"
                              className="btn-edit"
                              onClick={() => openEditForm(acc)}
                              style={{ padding: '4px 10px', fontSize: '12px' }}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="btn-delete"
                              onClick={(e) => handleDelete(acc.id, acc.analytic_name, e)}
                              style={{ padding: '4px 8px', fontSize: '12px' }}
                              title="Delete analytic account"
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Bottom count indicator */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: '16px',
              fontSize: '13px',
              color: '#64748b'
            }}>
              <span>
                Showing {filteredAccounts.length} analytic account{filteredAccounts.length !== 1 ? 's' : ''}
              </span>
            </div>

          </div>
        </div>
      )}

    </div>
  )
}

export default AnalyticAccountsPage
