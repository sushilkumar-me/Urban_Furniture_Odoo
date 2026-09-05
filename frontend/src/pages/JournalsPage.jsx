import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api'

const emptyForm = {
  journal_name:       '',
  journal_type:       'Bank',
  default_account_id: ''
}

const PRECONFIGURED_JOURNAL_NAMES = ['Sales', 'Purchase', 'Bank', 'Cash']
const JOURNAL_TYPES = ['Sales', 'Purchase', 'Bank', 'Cash', 'General']

function JournalsPage() {
  const [journals, setJournals]       = useState([])
  const [accounts, setAccounts]       = useState([])
  const [showForm, setShowForm]       = useState(false)
  const [editingId, setEditingId]     = useState(null)
  const [formData, setFormData]       = useState(emptyForm)
  const [searchQuery, setSearchQuery] = useState('')
  const [error, setError]             = useState('')
  const [success, setSuccess]         = useState('')
  const [loading, setLoading]         = useState(false)

  const navigate = useNavigate()

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
    if (error) setError('')
  }

  const handleNew = () => {
    setFormData(emptyForm)
    setEditingId(null)
    setError('')
    setSuccess('')
    setShowForm(true)
  }

  const openEditForm = (journal) => {
    // Normalise 'Sale' to 'Sales' if returned from backend
    const jType = journal.journal_type === 'Sale' ? 'Sales' : journal.journal_type
    setFormData({
      journal_name:       journal.journal_name,
      journal_type:       jType,
      default_account_id: journal.default_account_id ? String(journal.default_account_id) : ''
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

    if (!formData.journal_name.trim()) {
      setError('Journal Name is required.')
      setLoading(false)
      return
    }

    if (!formData.default_account_id) {
      setError('Please select a Default Account from the Chart of Accounts.')
      setLoading(false)
      return
    }

    const payload = {
      journal_name:       formData.journal_name.trim(),
      // Backend supports 'Sale' and 'Sales'
      journal_type:       formData.journal_type,
      default_account_id: Number(formData.default_account_id)
    }

    try {
      if (editingId) {
        await api.put(`/journals/${editingId}`, payload)
        setSuccess(`Journal "${formData.journal_name}" updated successfully.`)
      } else {
        await api.post('/journals/', payload)
        setSuccess(`Journal "${formData.journal_name}" created successfully.`)
      }
      await fetchJournals()
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
        setError('Something went wrong saving the journal.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id, name, e) => {
    if (e) e.stopPropagation()
    if (!window.confirm(`Delete journal "${name}"?\n\nNote: journals with existing entries cannot be deleted.`)) return
    try {
      await api.delete(`/journals/${id}`)
      setSuccess(`"${name}" deleted.`)
      await fetchJournals()
    } catch (err) {
      const detail = err.response?.data?.detail
      setError(typeof detail === 'string' ? detail : 'Failed to delete journal.')
    }
  }

  // Filter journals and prioritize wireframe ones
  const filteredJournals = journals.filter(j => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      const matchName = (j.journal_name || '').toLowerCase().includes(q)
      const matchType = (j.journal_type || '').toLowerCase().includes(q)
      const matchAcc  = (j.default_account?.account_name || '').toLowerCase().includes(q)
      if (!matchName && !matchType && !matchAcc) return false
    }
    return true
  }).sort((a, b) => {
    const aPre = PRECONFIGURED_JOURNAL_NAMES.indexOf(a.journal_name)
    const bPre = PRECONFIGURED_JOURNAL_NAMES.indexOf(b.journal_name)
    if (aPre !== -1 && bPre !== -1) return aPre - bPre
    if (aPre !== -1) return -1
    if (bPre !== -1) return 1
    return a.journal_name.localeCompare(b.journal_name)
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
    if (t.includes('bank')) return 'type-asset'
    if (t.includes('cash')) return 'type-income'
    if (t.includes('sale')) return 'type-equity'
    if (t.includes('purchase')) return 'type-liability'
    return 'type-expense'
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
      {/* 1. JOURNAL FORM VIEW                                         */}
      {/* ============================================================ */}
      {showForm ? (
        <div>
          {/* Top Title: Journal Form View */}
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <h1 style={{
              fontSize: '28px',
              fontWeight: 800,
              color: '#1a1a2e',
              letterSpacing: '-0.5px',
              margin: 0
            }}>
              Journal Form View
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

              {/* Journal Form Body */}
              <div style={{
                background: '#fcfdfe',
                border: '1.5px solid #e2e8f0',
                borderRadius: '18px',
                padding: '28px',
                marginBottom: '24px'
              }}>

                {/* Journal Name */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '170px 1fr',
                  alignItems: 'center',
                  marginBottom: '28px'
                }}>
                  <label htmlFor="journal_name" style={{
                    fontSize: '16px',
                    fontWeight: 700,
                    color: '#0f3460'
                  }}>
                    Journal Name *
                  </label>
                  <input
                    type="text"
                    id="journal_name"
                    name="journal_name"
                    value={formData.journal_name}
                    onChange={handleChange}
                    placeholder="e.g. Sales, Purchase, Bank, Cash"
                    required
                    style={{
                      ...underlineInputStyle,
                      fontSize: '17px',
                      fontWeight: 600,
                      borderBottomColor: '#0f3460'
                    }}
                  />
                </div>

                {/* Journal Type */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '170px 1fr',
                  alignItems: 'center',
                  marginBottom: '28px'
                }}>
                  <label htmlFor="journal_type" style={{
                    fontSize: '16px',
                    fontWeight: 700,
                    color: '#0f3460'
                  }}>
                    Journal Type *
                  </label>
                  <select
                    id="journal_type"
                    name="journal_type"
                    value={formData.journal_type}
                    onChange={handleChange}
                    required
                    style={{
                      ...underlineInputStyle,
                      cursor: 'pointer',
                      fontWeight: 600,
                      borderBottomColor: '#0f3460'
                    }}
                  >
                    {JOURNAL_TYPES.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                {/* Default Account (Many-to-one from Chart of Accounts) */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '170px 1fr',
                  alignItems: 'center'
                }}>
                  <label htmlFor="default_account_id" style={{
                    fontSize: '16px',
                    fontWeight: 700,
                    color: '#0f3460'
                  }}>
                    Default Account *
                  </label>
                  <select
                    id="default_account_id"
                    name="default_account_id"
                    value={formData.default_account_id}
                    onChange={handleChange}
                    required
                    style={{
                      ...underlineInputStyle,
                      cursor: 'pointer',
                      fontWeight: 600,
                      borderBottomColor: '#0f3460'
                    }}
                  >
                    <option value="">-- Select from Chart of Accounts --</option>
                    {accounts.map(acc => (
                      <option key={acc.id} value={acc.id}>
                        {acc.account_name} ({acc.account_type})
                      </option>
                    ))}
                  </select>
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
                lineHeight: '1.6'
              }}>
                <div style={{ fontWeight: 700, color: '#0f3460', marginBottom: '4px' }}>
                  📌 Journal Default Account Mapping:
                </div>
                The Default Account specifies where debit/credit entries for this journal route automatically during financial posting (e.g. Sales → Sales Income A/c, Purchase → Purchase Expense A/c, Bank → Bank A/c, Cash → Cash A/c).
              </div>

            </form>
          </div>
        </div>
      ) : (
        /* ============================================================ */
        /* 2. JOURNALS LIST VIEW                                        */
        /* ============================================================ */
        <div>
          {/* Top Title: Journals (List View) */}
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <h1 style={{
              fontSize: '28px',
              fontWeight: 800,
              color: '#1a1a2e',
              letterSpacing: '-0.5px',
              margin: '0 0 6px 0'
            }}>
              Journals (List View)
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
                  placeholder="Search journals..."
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

            {/* Journals Table matching wireframe */}
            {filteredJournals.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '48px 20px',
                color: '#64748b',
                fontSize: '15px'
              }}>
                No journals found. Click <strong>"New"</strong> to create one.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                      <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: '14px', color: '#1e293b', fontWeight: 700 }}>
                        Journal Name
                      </th>
                      <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: '14px', color: '#1e293b', fontWeight: 700 }}>
                        Type
                      </th>
                      <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: '14px', color: '#1e293b', fontWeight: 700 }}>
                        Default Account
                      </th>
                      <th style={{ textAlign: 'center', width: '110px', padding: '12px 16px', fontSize: '14px', color: '#1e293b', fontWeight: 700 }}>
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredJournals.map((journal) => {
                      const isMaster = PRECONFIGURED_JOURNAL_NAMES.includes(journal.journal_name)
                      return (
                        <tr
                          key={journal.id}
                          onClick={() => openEditForm(journal)}
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
                              <span>{journal.journal_name}</span>
                              {isMaster && (
                                <span style={{
                                  fontSize: '10px',
                                  fontWeight: 700,
                                  background: '#ecfdf5',
                                  color: '#059669',
                                  border: '1px solid #a7f3d0',
                                  borderRadius: '4px',
                                  padding: '1px 6px'
                                }}>
                                  Master
                                </span>
                              )}
                            </div>
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <span className={`type-badge ${typeBadgeClass(journal.journal_type)}`}>
                              {journal.journal_type}
                            </span>
                          </td>
                          <td style={{ padding: '12px 16px', color: '#dc2626', fontWeight: 600 }}>
                            {journal.default_account?.account_name || '—'}
                          </td>
                          <td style={{ textAlign: 'center', padding: '12px 16px' }} onClick={(e) => e.stopPropagation()}>
                            <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                              <button
                                type="button"
                                className="btn-edit"
                                onClick={() => openEditForm(journal)}
                                style={{ padding: '4px 10px', fontSize: '12px' }}
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                className="btn-delete"
                                onClick={(e) => handleDelete(journal.id, journal.journal_name, e)}
                                style={{ padding: '4px 8px', fontSize: '12px' }}
                                title="Delete journal"
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
                Showing {filteredJournals.length} journal{filteredJournals.length !== 1 ? 's' : ''}
              </span>
            </div>

          </div>
        </div>
      )}

    </div>
  )
}

export default JournalsPage
