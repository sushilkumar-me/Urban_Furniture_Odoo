import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api'

const emptyForm = {
  analytic_account_id: '',
  budget_name:         '',
  start_date:          '',
  end_date:            '',
  planned_amount:      '',
  achieved_amount:     '0',
  responsible_person:  '',
  status:              'Draft',
  revision_of_id:      null
}

function BudgetsPage() {
  const [budgets, setBudgets]         = useState([])
  const [analytics, setAnalytics]     = useState([])
  const [contacts, setContacts]       = useState([])
  const [showForm, setShowForm]       = useState(false)
  const [editingId, setEditingId]     = useState(null)
  const [formData, setFormData]       = useState(emptyForm)
  const [viewMode, setViewMode]       = useState('list') // 'list' | 'kanban'
  const [searchQuery, setSearchQuery] = useState('')
  const [error, setError]             = useState('')
  const [success, setSuccess]         = useState('')
  const [loading, setLoading]         = useState(false)

  const navigate = useNavigate()

  useEffect(() => {
    fetchBudgets()
    fetchAnalytics()
    fetchContacts()
  }, [])

  const fetchBudgets = async () => {
    try {
      const r = await api.get('/budgets/')
      setBudgets(r.data)
    } catch {
      setError('Failed to load budgets.')
    }
  }

  const fetchAnalytics = async () => {
    try {
      const r = await api.get('/analytic-accounts/')
      setAnalytics(r.data)
    } catch {
      console.error('Failed to load analytic accounts.')
    }
  }

  const fetchContacts = async () => {
    try {
      const r = await api.get('/contacts/')
      setContacts(r.data)
    } catch {
      console.error('Failed to load contacts.')
    }
  }

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
    if (error) setError('')
  }

  const handleNew = () => {
    setFormData({
      ...emptyForm,
      analytic_account_id: analytics.length > 0 ? String(analytics[0].id) : ''
    })
    setEditingId(null)
    setError('')
    setSuccess('')
    setShowForm(true)
  }

  const openEditForm = (budget) => {
    setFormData({
      analytic_account_id: String(budget.analytic_account_id),
      budget_name:         budget.budget_name,
      start_date:          budget.start_date || '',
      end_date:            budget.end_date   || '',
      planned_amount:      String(budget.planned_amount),
      achieved_amount:     String(budget.achieved_amount || '0'),
      responsible_person:  budget.responsible_person || '',
      status:              budget.status || 'Draft',
      revision_of_id:      budget.revision_of_id || null
    })
    setEditingId(budget.id)
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

  // Lifecycle Stage Actions matching wireframe Menu & Stage Mapping:
  // [ Confirm ] -> stage moves to 'Confirm'
  const handleConfirmStage = async () => {
    if (!editingId) {
      // If creating fresh, save with Confirm status
      setFormData(prev => ({ ...prev, status: 'Confirm' }))
      handleSubmit(null, 'Confirm')
      return
    }
    try {
      setLoading(true)
      await api.put(`/budgets/${editingId}`, { status: 'Confirm' })
      setSuccess(`Budget "${formData.budget_name}" confirmed!`)
      setFormData(prev => ({ ...prev, status: 'Confirm' }))
      await fetchBudgets()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to confirm budget.')
    } finally {
      setLoading(false)
    }
  }

  // [ Revise ] -> Only visible at Confirmed stage.
  // Creates a revised copy e.g. "January 2026 Revised" linked back to original
  const handleReviseStage = async () => {
    if (!editingId) return
    const revisedName = formData.budget_name.includes('Revised')
      ? `${formData.budget_name} 2`
      : `${formData.budget_name} Revised`

    const payload = {
      analytic_account_id: Number(formData.analytic_account_id),
      budget_name:         revisedName,
      start_date:          formData.start_date,
      end_date:            formData.end_date,
      planned_amount:      Number(formData.planned_amount),
      achieved_amount:     Number(formData.achieved_amount || 0),
      responsible_person:  formData.responsible_person || null,
      status:              'Revised',
      revision_of_id:      editingId
    }

    try {
      setLoading(true)
      const res = await api.post('/budgets/', payload)
      setSuccess(`Revised budget "${revisedName}" created successfully!`)
      await fetchBudgets()
      openEditForm(res.data)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create budget revision.')
    } finally {
      setLoading(false)
    }
  }

  // [ Cancel ] -> marks status as 'Cancelled'
  const handleCancelStage = async () => {
    if (!editingId) {
      closeForm()
      return
    }
    if (!window.confirm(`Cancel budget "${formData.budget_name}"?`)) return
    try {
      setLoading(true)
      await api.put(`/budgets/${editingId}`, { status: 'Cancelled' })
      setSuccess(`Budget "${formData.budget_name}" cancelled.`)
      setFormData(prev => ({ ...prev, status: 'Cancelled' }))
      await fetchBudgets()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to cancel budget.')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e, overrideStatus = null) => {
    if (e && e.preventDefault) e.preventDefault()
    setError('')
    setLoading(true)

    if (!formData.analytic_account_id) {
      setError('Please select an Analytic Account.')
      setLoading(false)
      return
    }
    if (!formData.budget_name.trim()) {
      setError('Budget Name is required.')
      setLoading(false)
      return
    }
    if (!formData.start_date || !formData.end_date) {
      setError('Both Start Date and End Date are required.')
      setLoading(false)
      return
    }
    if (formData.end_date <= formData.start_date) {
      setError('End Date must be after Start Date.')
      setLoading(false)
      return
    }

    const payload = {
      analytic_account_id: Number(formData.analytic_account_id),
      budget_name:         formData.budget_name.trim(),
      start_date:          formData.start_date,
      end_date:            formData.end_date,
      planned_amount:      Number(formData.planned_amount) || 0,
      achieved_amount:     Number(formData.achieved_amount) || 0,
      responsible_person:  formData.responsible_person || null,
      status:              overrideStatus || formData.status || 'Draft',
      revision_of_id:      formData.revision_of_id || null
    }

    try {
      if (editingId) {
        await api.put(`/budgets/${editingId}`, payload)
        setSuccess(`Budget "${formData.budget_name}" updated.`)
      } else {
        await api.post('/budgets/', payload)
        setSuccess(`Budget "${formData.budget_name}" created.`)
      }
      await fetchBudgets()
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
        setError('Failed to save budget.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id, name, e) => {
    if (e) e.stopPropagation()
    if (!window.confirm(`Delete budget "${name}"?`)) return
    try {
      await api.delete(`/budgets/${id}`)
      setSuccess(`"${name}" deleted.`)
      await fetchBudgets()
    } catch (err) {
      const detail = err.response?.data?.detail
      setError(typeof detail === 'string' ? detail : 'Failed to delete budget.')
    }
  }

  // Wireframe formulas:
  // Achieved % = (Achieved / Committed) * 100
  // Amount To Achieve = Committed - Achieved
  const committedVal = Number(formData.planned_amount) || 0
  const achievedVal  = Number(formData.achieved_amount) || 0
  const achievedPct  = committedVal > 0 ? ((achievedVal / committedVal) * 100).toFixed(1) : '0.0'
  const amountToAchieve = Math.max(0, committedVal - achievedVal)

  // Selected analytic account helper
  const selectedAnalytic = analytics.find(a => String(a.id) === String(formData.analytic_account_id))

  // Filter budgets for list & kanban
  const filteredBudgets = budgets.filter(b => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      const matchName = (b.budget_name || '').toLowerCase().includes(q)
      const matchAcc  = (b.analytic_account?.analytic_name || '').toLowerCase().includes(q)
      const matchResp = (b.responsible_person || '').toLowerCase().includes(q)
      const matchSt   = (b.status || '').toLowerCase().includes(q)
      if (!matchName && !matchAcc && !matchResp && !matchSt) return false
    }
    return true
  }).sort((a, b) => {
    if (a.budget_name === 'January 2026') return -1
    if (b.budget_name === 'January 2026') return 1
    return new Date(b.start_date) - new Date(a.start_date)
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

  // Mini inline SVG Pie / Donut chart badge for Achieved vs Balance
  const renderPieChart = (achieved, committed, size = 38) => {
    const total = Math.max(committed, 1)
    const pct = Math.min(Math.max((achieved / total), 0), 1)
    const angle = pct * 360
    const rad = (angle - 90) * (Math.PI / 180)
    const x = 20 + 16 * Math.cos(rad)
    const y = 20 + 16 * Math.sin(rad)
    const largeArc = angle > 180 ? 1 : 0

    const pathData = pct >= 0.999
      ? 'M 20 4 A 16 16 0 1 1 19.99 4 Z'
      : pct <= 0.001
      ? ''
      : `M 20 20 L 20 4 A 16 16 0 ${largeArc} 1 ${x} ${y} Z`

    return (
      <svg width={size} height={size} viewBox="0 0 40 40" style={{ transform: 'rotate(0deg)', verticalAlign: 'middle' }}>
        {/* Background circle: Balance (peach/reddish hatch) */}
        <circle cx="20" cy="20" r="16" fill="#fecdd3" stroke="#f43f5e" strokeWidth="1.5" />
        {/* Foreground slice: Achieved (teal/cyan) */}
        {pathData && <path d={pathData} fill="#38bdf8" stroke="#0284c7" strokeWidth="1.5" />}
        {/* Center hub */}
        <circle cx="20" cy="20" r="4" fill="#ffffff" stroke="#94a3b8" strokeWidth="1" />
      </svg>
    )
  }

  return (
    <div className="page-container" style={{ maxWidth: '1000px', margin: '0 auto', padding: '24px 16px' }}>

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
      {/* 1. BUDGET FORM VIEW (ORIGINAL & REVISED)                     */}
      {/* ============================================================ */}
      {showForm ? (
        <div>
          {/* Top Title */}
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <h1 style={{
              fontSize: '28px',
              fontWeight: 800,
              color: '#1a1a2e',
              letterSpacing: '-0.5px',
              margin: 0
            }}>
              {formData.revision_of_id ? 'Budget (Revised)' : 'Budget (Form View of Original Budget)'}
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

              {/* Top Action Bar & Stage Pipeline Indicator */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '28px',
                flexWrap: 'wrap',
                gap: '14px'
              }}>
                {/* Left Action Buttons: [ New ] [ Confirm ] [ Revise ] [ Cancel ] */}
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
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
                      padding: '7px 20px',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = '#0f3460'; e.currentTarget.style.color = '#ffffff' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.color = '#0f3460' }}
                  >
                    New
                  </button>

                  {/* Confirm button — enabled in Draft */}
                  <button
                    type="button"
                    onClick={handleConfirmStage}
                    disabled={loading || formData.status === 'Confirm' || formData.status === 'Revised'}
                    style={{
                      background: formData.status === 'Draft' ? '#0f3460' : '#e2e8f0',
                      border: '2px solid',
                      borderColor: formData.status === 'Draft' ? '#0f3460' : '#cbd5e1',
                      color: formData.status === 'Draft' ? '#ffffff' : '#64748b',
                      fontWeight: 700,
                      fontSize: '14px',
                      borderRadius: '10px',
                      padding: '7px 20px',
                      cursor: formData.status === 'Draft' ? 'pointer' : 'not-allowed',
                      boxShadow: formData.status === 'Draft' ? '0 2px 8px rgba(15, 52, 96, 0.2)' : 'none'
                    }}
                    title="User confirm the newly created Budget"
                  >
                    Confirm
                  </button>

                  {/* Revise button — only visible & enabled at Confirmed stage */}
                  {formData.status === 'Confirm' && (
                    <button
                      type="button"
                      onClick={handleReviseStage}
                      disabled={loading}
                      style={{
                        background: '#ffffff',
                        border: '2px solid #d97706',
                        color: '#d97706',
                        fontWeight: 700,
                        fontSize: '14px',
                        borderRadius: '10px',
                        padding: '7px 20px',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = '#d97706'; e.currentTarget.style.color = '#ffffff' }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.color = '#d97706' }}
                      title="Only visible at confirmed Stage — Revise budget amounts"
                    >
                      Revise
                    </button>
                  )}

                  {/* Cancel button */}
                  <button
                    type="button"
                    onClick={handleCancelStage}
                    disabled={loading || formData.status === 'Cancelled'}
                    style={{
                      background: '#ffffff',
                      border: '2px solid #94a3b8',
                      color: '#64748b',
                      fontWeight: 700,
                      fontSize: '14px',
                      borderRadius: '10px',
                      padding: '7px 18px',
                      cursor: formData.status === 'Cancelled' ? 'not-allowed' : 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    Cancel
                  </button>
                </div>

                {/* Right Pipeline Stage Indicator: [ Draft ] [ Confirm ] [ Revised ] [ Cancelled ] */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {['Draft', 'Confirm', 'Revised', 'Cancelled'].map((st, idx) => {
                    const isActive = (formData.status || 'Draft') === st
                    return (
                      <div
                        key={st}
                        style={{
                          padding: '5px 12px',
                          fontSize: '12px',
                          fontWeight: 700,
                          borderRadius: '6px',
                          background: isActive ? '#0f3460' : '#f1f5f9',
                          color: isActive ? '#ffffff' : '#64748b',
                          border: `1px solid ${isActive ? '#0f3460' : '#cbd5e1'}`,
                          cursor: 'default'
                        }}
                      >
                        {st}
                      </div>
                    )
                  })}

                  <button
                    type="button"
                    onClick={closeForm}
                    style={{
                      marginLeft: '12px',
                      background: '#ffffff',
                      border: '2px solid #64748b',
                      color: '#475569',
                      fontWeight: 700,
                      fontSize: '14px',
                      borderRadius: '10px',
                      padding: '6px 18px',
                      cursor: 'pointer'
                    }}
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

              {/* Header Details Frame */}
              <div style={{
                background: '#fcfdfe',
                border: '1.5px solid #e2e8f0',
                borderRadius: '18px',
                padding: '24px 28px',
                marginBottom: '28px'
              }}>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1.2fr 1fr',
                  gap: '24px',
                  alignItems: 'start'
                }}>
                  {/* Left Column: Budget Name, Period */}
                  <div>
                    {/* Budget Name */}
                    <div style={{ marginBottom: '22px' }}>
                      <label htmlFor="budget_name" style={{ fontSize: '15px', fontWeight: 700, color: '#0f3460', display: 'block', marginBottom: '4px' }}>
                        Budget Name *
                      </label>
                      <input
                        type="text"
                        id="budget_name"
                        name="budget_name"
                        value={formData.budget_name}
                        onChange={handleChange}
                        placeholder="e.g. January 2026"
                        required
                        style={{
                          ...underlineInputStyle,
                          fontSize: '17px',
                          fontWeight: 600,
                          borderBottomColor: '#0f3460'
                        }}
                      />
                    </div>

                    {/* Budget Period: Start Date To End Date */}
                    <div>
                      <label style={{ fontSize: '15px', fontWeight: 700, color: '#0f3460', display: 'block', marginBottom: '6px' }}>
                        Budget Period *
                      </label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <input
                          type="date"
                          name="start_date"
                          value={formData.start_date}
                          onChange={handleChange}
                          required
                          style={{
                            ...underlineInputStyle,
                            borderBottomColor: '#0f3460',
                            maxWidth: '160px'
                          }}
                        />
                        <span style={{ fontSize: '14px', fontWeight: 600, color: '#64748b' }}>To</span>
                        <input
                          type="date"
                          name="end_date"
                          value={formData.end_date}
                          onChange={handleChange}
                          required
                          style={{
                            ...underlineInputStyle,
                            borderBottomColor: '#0f3460',
                            maxWidth: '160px'
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Revision Of / Revised With + Responsible Person */}
                  <div>
                    {/* Revision linkage */}
                    <div style={{ marginBottom: '22px' }}>
                      <label style={{ fontSize: '15px', fontWeight: 700, color: '#0f3460', display: 'block', marginBottom: '4px' }}>
                        {formData.revision_of_id ? 'Revision Of' : 'Revised With'}
                      </label>
                      {formData.revision_of_id ? (
                        <div style={{ padding: '8px 0', fontSize: '15px', fontWeight: 600, color: '#d97706' }}>
                          Original Budget #{formData.revision_of_id} (Clickable Link)
                        </div>
                      ) : (
                        <div style={{ padding: '8px 0', fontSize: '14px', color: '#94a3b8', fontStyle: 'italic' }}>
                          No revisions yet (click [ Revise ] when confirmed)
                        </div>
                      )}
                    </div>

                    {/* Responsible (Select from Contacts) */}
                    <div>
                      <label htmlFor="responsible_person" style={{ fontSize: '15px', fontWeight: 700, color: '#0f3460', display: 'block', marginBottom: '4px' }}>
                        Responsible *
                      </label>
                      <select
                        id="responsible_person"
                        name="responsible_person"
                        value={formData.responsible_person}
                        onChange={handleChange}
                        style={{
                          ...underlineInputStyle,
                          cursor: 'pointer',
                          fontWeight: 600,
                          borderBottomColor: '#0f3460'
                        }}
                      >
                        <option value="">-- Select Contact --</option>
                        {contacts.map(c => (
                          <option key={c.id} value={c.name}>
                            {c.name} ({c.contact_type})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Line Items Table matching wireframe:
                  Analytic | Type | Committed Amount | Achieved Amount | Achieved % | Amount To Achieve */}
              <div style={{ marginBottom: '28px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#1a1a2e', marginBottom: '14px' }}>
                  Budget Lines
                </h3>

                <div style={{ overflowX: 'auto', border: '1.5px solid #e2e8f0', borderRadius: '14px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                        <th style={{ textAlign: 'left', padding: '12px 14px', fontSize: '14px', color: '#1e293b', width: '25%' }}>
                          Analytic
                        </th>
                        <th style={{ textAlign: 'left', padding: '12px 14px', fontSize: '14px', color: '#1e293b', width: '15%' }}>
                          Type
                        </th>
                        <th style={{ textAlign: 'right', padding: '12px 14px', fontSize: '14px', color: '#1e293b', width: '16%' }}>
                          Committed Amount
                        </th>
                        <th style={{ textAlign: 'right', padding: '12px 14px', fontSize: '14px', color: '#1e293b', width: '16%' }}>
                          Achieved Amount
                        </th>
                        <th style={{ textAlign: 'right', padding: '12px 14px', fontSize: '14px', color: '#1e293b', width: '14%' }}>
                          Achieved %
                        </th>
                        <th style={{ textAlign: 'right', padding: '12px 14px', fontSize: '14px', color: '#1e293b', width: '14%' }}>
                          Amount To Achieve
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                        {/* Analytic Account Dropdown */}
                        <td style={{ padding: '12px 14px' }}>
                          <select
                            name="analytic_account_id"
                            value={formData.analytic_account_id}
                            onChange={handleChange}
                            required
                            style={{
                              width: '100%',
                              padding: '8px 10px',
                              borderRadius: '8px',
                              border: '1px solid #cbd5e1',
                              fontSize: '14px',
                              outline: 'none',
                              fontWeight: 600,
                              color: '#0f3460'
                            }}
                          >
                            <option value="">-- Select Analytic Account --</option>
                            {analytics.map(a => (
                              <option key={a.id} value={a.id}>
                                {a.analytic_name} ({a.type || 'Expense'})
                              </option>
                            ))}
                          </select>
                        </td>

                        {/* Type */}
                        <td style={{ padding: '12px 14px', color: '#475569', fontWeight: 600, fontSize: '14px' }}>
                          {selectedAnalytic?.type || 'Expense'}
                        </td>

                        {/* Committed Amount Input */}
                        <td style={{ padding: '12px 14px' }}>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            name="planned_amount"
                            value={formData.planned_amount}
                            onChange={handleChange}
                            placeholder="e.g. 200000"
                            required
                            style={{
                              width: '100%',
                              padding: '8px 10px',
                              borderRadius: '8px',
                              border: '1px solid #cbd5e1',
                              fontSize: '14px',
                              textAlign: 'right',
                              fontWeight: 600,
                              outline: 'none'
                            }}
                          />
                        </td>

                        {/* Achieved Amount Input / Readonly */}
                        <td style={{ padding: '12px 14px' }}>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            name="achieved_amount"
                            value={formData.achieved_amount}
                            onChange={handleChange}
                            placeholder="e.g. 10000"
                            style={{
                              width: '100%',
                              padding: '8px 10px',
                              borderRadius: '8px',
                              border: '1px solid #cbd5e1',
                              fontSize: '14px',
                              textAlign: 'right',
                              fontWeight: 600,
                              color: '#059669',
                              outline: 'none'
                            }}
                          />
                        </td>

                        {/* Achieved % Auto-computed */}
                        <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700, color: '#0284c7', fontSize: '14px' }}>
                          {achievedPct}%
                        </td>

                        {/* Amount To Achieve Auto-computed */}
                        <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700, color: '#d97706', fontSize: '14px' }}>
                          ₹{amountToAchieve.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Wireframe Guidance Callout */}
              <div style={{
                background: '#f8fafc',
                borderLeft: '4px solid #0f3460',
                borderRadius: '8px',
                padding: '14px 18px',
                fontSize: '13px',
                color: '#475569',
                lineHeight: '1.6',
                marginBottom: '24px'
              }}>
                <div style={{ fontWeight: 700, color: '#0f3460', marginBottom: '4px' }}>
                  📌 Wireframe Field Explanation:
                </div>
                • <strong>Responsible</strong>: Select from created Contacts.<br />
                • <strong>Analytic</strong>: The Analytic Account set in the analytical accounts list.<br />
                • <strong>Type</strong>: Income (mapped to Invoices) / Expense (mapped to PO / Vendor Bills).<br />
                • <strong>Formula</strong>: Achieved % = (Achieved / Committed) * 100 &nbsp;|&nbsp; Amount to Achieve = Committed - Achieved.
              </div>

              {/* Bottom Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
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
                    boxShadow: '0 3px 10px rgba(15, 52, 96, 0.25)'
                  }}
                >
                  {loading ? 'Saving...' : 'Save Budget'}
                </button>
                <button
                  type="button"
                  onClick={closeForm}
                  style={{
                    background: '#ffffff',
                    border: '2px solid #64748b',
                    color: '#64748b',
                    fontWeight: 700,
                    fontSize: '15px',
                    borderRadius: '12px',
                    padding: '8px 24px',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
              </div>

            </form>
          </div>
        </div>
      ) : (
        /* ============================================================ */
        /* 2. BUDGET REPORT (LIST & KANBAN VIEWS)                       */
        /* ============================================================ */
        <div>
          {/* Top Title */}
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <h1 style={{
              fontSize: '28px',
              fontWeight: 800,
              color: '#1a1a2e',
              letterSpacing: '-0.5px',
              margin: '0 0 6px 0'
            }}>
              {viewMode === 'list' ? 'Budget Report (List View)' : 'Budget Report (Kanban View)'}
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

            {/* Top Toolbar matching wireframe: [ New ] ... [ Search ] ... [ Back ] ... [ List | Kanban ] */}
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
                  placeholder="Search budgets..."
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

              {/* Right Controls: [ Back ] + [ List | Kanban ] Switcher */}
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
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
                    padding: '7px 20px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#f1f5f9' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = '#ffffff' }}
                  title="Back to Dashboard"
                >
                  Back
                </button>

                {/* View Switcher Icons */}
                <div style={{ display: 'flex', border: '1.5px solid #cbd5e1', borderRadius: '10px', overflow: 'hidden' }}>
                  <button
                    type="button"
                    onClick={() => setViewMode('list')}
                    style={{
                      background: viewMode === 'list' ? '#0f3460' : '#ffffff',
                      color: viewMode === 'list' ? '#ffffff' : '#64748b',
                      border: 'none',
                      padding: '7px 12px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: 700
                    }}
                    title="List View"
                  >
                    ☰
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('kanban')}
                    style={{
                      background: viewMode === 'kanban' ? '#0f3460' : '#ffffff',
                      color: viewMode === 'kanban' ? '#ffffff' : '#64748b',
                      border: 'none',
                      padding: '7px 12px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: 700
                    }}
                    title="Kanban View"
                  >
                    ⊞
                  </button>
                </div>
              </div>
            </div>

            {/* Content Rendering: List or Kanban */}
            {filteredBudgets.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '48px 20px',
                color: '#64748b',
                fontSize: '15px'
              }}>
                No budgets found. Click <strong>"New"</strong> to create one.
              </div>
            ) : viewMode === 'list' ? (
              /* --- A. LIST VIEW matching wireframe: Budget | Start Date | End Date | Status | Pie Chart --- */
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                      <th style={{ textAlign: 'left', padding: '12px 14px', fontSize: '14px', color: '#1e293b', fontWeight: 700 }}>
                        Budget
                      </th>
                      <th style={{ textAlign: 'left', padding: '12px 14px', fontSize: '14px', color: '#1e293b', fontWeight: 700 }}>
                        Start Date
                      </th>
                      <th style={{ textAlign: 'left', padding: '12px 14px', fontSize: '14px', color: '#1e293b', fontWeight: 700 }}>
                        End Date
                      </th>
                      <th style={{ textAlign: 'center', padding: '12px 14px', fontSize: '14px', color: '#1e293b', fontWeight: 700 }}>
                        Status
                      </th>
                      <th style={{ textAlign: 'center', padding: '12px 14px', fontSize: '14px', color: '#1e293b', fontWeight: 700 }}>
                        Pie Chart
                      </th>
                      <th style={{ textAlign: 'center', width: '110px', padding: '12px 14px', fontSize: '14px', color: '#1e293b', fontWeight: 700 }}>
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBudgets.map((b) => {
                      const committed = Number(b.planned_amount) || 0
                      const achieved = Number(b.achieved_amount) || 0
                      const pct = committed > 0 ? ((achieved / committed) * 100).toFixed(0) : '0'

                      return (
                        <tr
                          key={b.id}
                          onClick={() => openEditForm(b)}
                          style={{
                            cursor: 'pointer',
                            borderBottom: '1px solid #f1f5f9',
                            transition: 'background 0.12s ease'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                          <td style={{ padding: '12px 14px', color: '#0f3460', fontWeight: 700, fontSize: '15px' }}>
                            <div>{b.budget_name}</div>
                            {b.analytic_account && (
                              <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 500 }}>
                                {b.analytic_account.analytic_name} ({b.analytic_account.type || 'Expense'})
                              </div>
                            )}
                          </td>
                          <td style={{ padding: '12px 14px', color: '#334155', fontSize: '14px' }}>
                            {b.start_date ? new Date(b.start_date).toLocaleDateString('en-IN') : '—'}
                          </td>
                          <td style={{ padding: '12px 14px', color: '#334155', fontSize: '14px' }}>
                            {b.end_date ? new Date(b.end_date).toLocaleDateString('en-IN') : '—'}
                          </td>
                          <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                            <span className={`status-badge ${
                              b.status === 'Confirm' ? 'status-confirmed' :
                              b.status === 'Revised' ? 'status-partially-paid' :
                              b.status === 'Cancelled' ? 'status-cancelled' : 'status-draft'
                            }`}>
                              {b.status || 'Draft'}
                            </span>
                          </td>
                          <td style={{ padding: '8px 14px', textAlign: 'center' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                              {renderPieChart(achieved, committed)}
                              <span style={{ fontSize: '12px', fontWeight: 700, color: '#0284c7' }}>
                                {pct}%
                              </span>
                            </div>
                          </td>
                          <td style={{ textAlign: 'center', padding: '12px 14px' }} onClick={(e) => e.stopPropagation()}>
                            <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                              <button
                                type="button"
                                className="btn-edit"
                                onClick={() => openEditForm(b)}
                                style={{ padding: '4px 10px', fontSize: '12px' }}
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                className="btn-delete"
                                onClick={(e) => handleDelete(b.id, b.budget_name, e)}
                                style={{ padding: '4px 8px', fontSize: '12px' }}
                                title="Delete budget"
                              >
                                🗑️
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              /* --- B. KANBAN VIEW matching wireframe Budget Report (Kanban View) --- */
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: '20px',
                marginTop: '10px'
              }}>
                {filteredBudgets.map(b => {
                  const committed = Number(b.planned_amount) || 0
                  const achieved = Number(b.achieved_amount) || 0
                  const pct = committed > 0 ? Math.min(Math.round((achieved / committed) * 100), 100) : 0

                  return (
                    <div
                      key={b.id}
                      onClick={() => openEditForm(b)}
                      style={{
                        background: '#ffffff',
                        border: '2px solid #e2e8f0',
                        borderRadius: '18px',
                        padding: '20px',
                        cursor: 'pointer',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.04)',
                        transition: 'all 0.15s ease',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = '#0f3460'
                        e.currentTarget.style.transform = 'translateY(-2px)'
                        e.currentTarget.style.boxShadow = '0 8px 20px rgba(15, 52, 96, 0.12)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = '#e2e8f0'
                        e.currentTarget.style.transform = 'translateY(0)'
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.04)'
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                          <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#0f3460', margin: 0 }}>
                            {b.budget_name}
                          </h3>
                          <span className={`status-badge ${
                            b.status === 'Confirm' ? 'status-confirmed' :
                            b.status === 'Revised' ? 'status-partially-paid' :
                            b.status === 'Cancelled' ? 'status-cancelled' : 'status-draft'
                          }`}>
                            {b.status || 'Draft'}
                          </span>
                        </div>

                        {b.analytic_account && (
                          <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '12px' }}>
                            Cost Center: <strong>{b.analytic_account.analytic_name}</strong>
                          </div>
                        )}

                        <div style={{ fontSize: '13px', color: '#475569', lineHeight: '1.6', marginBottom: '16px' }}>
                          <div>Start Date: <strong>{b.start_date ? new Date(b.start_date).toLocaleDateString('en-IN') : '—'}</strong></div>
                          <div>End Date: <strong>{b.end_date ? new Date(b.end_date).toLocaleDateString('en-IN') : '—'}</strong></div>
                        </div>
                      </div>

                      <div>
                        {/* Progress Bar */}
                        <div style={{ marginBottom: '8px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>
                            <span style={{ color: '#0284c7' }}>Achieved: ₹{achieved.toLocaleString('en-IN')}</span>
                            <span style={{ color: '#64748b' }}>Target: ₹{committed.toLocaleString('en-IN')}</span>
                          </div>
                          <div style={{ width: '100%', height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                            <div style={{
                              width: `${pct}%`,
                              height: '100%',
                              background: pct >= 80 ? '#16a34a' : '#0284c7',
                              borderRadius: '4px'
                            }} />
                          </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {renderPieChart(achieved, committed, 28)}
                            <span style={{ fontSize: '12px', fontWeight: 700, color: '#0f3460' }}>{pct}% utilized</span>
                          </div>
                          <span style={{ fontSize: '12px', color: '#0284c7', fontWeight: 600 }}>
                            Open Form View ↗
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Bottom count indicator */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: '18px',
              fontSize: '13px',
              color: '#64748b'
            }}>
              <span>
                Showing {filteredBudgets.length} budget{filteredBudgets.length !== 1 ? 's' : ''}
              </span>
            </div>

          </div>
        </div>
      )}

    </div>
  )
}

export default BudgetsPage
