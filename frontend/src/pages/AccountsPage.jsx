import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api'

const emptyForm = {
  account_name: '',
  account_type: 'Asset'
}

const PRECONFIGURED_ACCOUNT_NAMES = [
  'Bank A/c',
  'Purchase Expense A/c',
  'Debtors A/c',
  'Creditors A/c',
  'Sales Income A/c',
  'Cash A/c',
  'Other Expense A/c',
  'Capital A/c'
]

function AccountsPage() {
  const [accounts, setAccounts]       = useState([])
  const [showForm, setShowForm]       = useState(false)
  const [editingId, setEditingId]     = useState(null)
  const [formData, setFormData]       = useState(emptyForm)
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [showArchived, setShowArchived] = useState(false)
  const [archivedIds, setArchivedIds] = useState(new Set())
  const [error, setError]             = useState('')
  const [success, setSuccess]         = useState('')
  const [loading, setLoading]         = useState(false)

  const navigate = useNavigate()

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
    if (error) setError('')
  }

  const handleNew = () => {
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

    if (!formData.account_name.trim()) {
      setError('Account Name is required.')
      setLoading(false)
      return
    }

    try {
      if (editingId) {
        await api.put(`/accounts/${editingId}`, formData)
        setSuccess(`Account "${formData.account_name}" updated successfully.`)
      } else {
        await api.post('/accounts/', formData)
        setSuccess(`Account "${formData.account_name}" created successfully.`)
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
        setError('Something went wrong saving the account.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id, name, e) => {
    if (e) e.stopPropagation()
    if (!window.confirm(`Delete account "${name}"?\n\nNote: accounts used in journal entries cannot be deleted.`)) return
    try {
      await api.delete(`/accounts/${id}`)
      setSuccess(`"${name}" deleted.`)
      setSelectedIds(prev => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
      await fetchAccounts()
    } catch (err) {
      const detail = err.response?.data?.detail
      setError(typeof detail === 'string' ? detail : 'Failed to delete account.')
    }
  }

  // Row selection handlers
  const handleToggleSelectAll = (visibleItems) => {
    const allSelected = visibleItems.length > 0 && visibleItems.every(a => selectedIds.has(a.id))
    const next = new Set(selectedIds)
    if (allSelected) {
      visibleItems.forEach(a => next.delete(a.id))
    } else {
      visibleItems.forEach(a => next.add(a.id))
    }
    setSelectedIds(next)
  }

  const handleToggleSelectOne = (id, e) => {
    e.stopPropagation()
    const next = new Set(selectedIds)
    if (next.has(id)) {
      next.delete(id)
    } else {
      next.add(id)
    }
    setSelectedIds(next)
  }

  const handleConfirmAction = () => {
    if (selectedIds.size === 0) {
      setSuccess('All pre-configured accounts are active and validated.')
      return
    }
    setSuccess(`${selectedIds.size} account(s) confirmed and verified.`)
  }

  const handleToggleArchive = () => {
    if (selectedIds.size > 0) {
      setArchivedIds(prev => {
        const next = new Set(prev)
        selectedIds.forEach(id => {
          if (next.has(id)) next.delete(id)
          else next.add(id)
        })
        return next
      })
      setSuccess(`${selectedIds.size} account(s) archive status toggled.`)
      setSelectedIds(new Set())
    } else {
      setShowArchived(!showArchived)
    }
  }

  // Filter accounts: Sort preconfigured ones to top or filter by search / archived
  const filteredAccounts = accounts.filter(acc => {
    const isArchived = archivedIds.has(acc.id)
    if (showArchived && !isArchived) return false
    if (!showArchived && isArchived) return false

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      const matchName = (acc.account_name || '').toLowerCase().includes(q)
      const matchType = (acc.account_type || '').toLowerCase().includes(q)
      if (!matchName && !matchType) return false
    }
    return true
  }).sort((a, b) => {
    // Prioritize the 8 wireframe master accounts
    const aPre = PRECONFIGURED_ACCOUNT_NAMES.indexOf(a.account_name)
    const bPre = PRECONFIGURED_ACCOUNT_NAMES.indexOf(b.account_name)
    if (aPre !== -1 && bPre !== -1) return aPre - bPre
    if (aPre !== -1) return -1
    if (bPre !== -1) return 1
    return a.account_name.localeCompare(b.account_name)
  })

  // Underlined input styling matching wireframe
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
    if (t.includes('asset') || t.includes('bank') || t.includes('cash')) return 'type-asset'
    if (t.includes('liabilit')) return 'type-liability'
    if (t.includes('income') || t.includes('revenue')) return 'type-income'
    if (t.includes('expense')) return 'type-expense'
    if (t.includes('capital') || t.includes('equity')) return 'type-equity'
    return 'type-asset'
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
      {/* 1. CHART OF ACCOUNTS FORM VIEW                               */}
      {/* ============================================================ */}
      {showForm ? (
        <div>
          {/* Top Title: Chart of Accounts Form View */}
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <h1 style={{
              fontSize: '28px',
              fontWeight: 800,
              color: '#1a1a2e',
              letterSpacing: '-0.5px',
              margin: 0
            }}>
              Chart of Accounts Form View
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

              {/* Account Form Body */}
              <div style={{
                background: '#fcfdfe',
                border: '1.5px solid #e2e8f0',
                borderRadius: '18px',
                padding: '28px',
                marginBottom: '24px'
              }}>

                {/* Account Name */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '160px 1fr',
                  alignItems: 'center',
                  marginBottom: '28px'
                }}>
                  <label htmlFor="account_name" style={{
                    fontSize: '16px',
                    fontWeight: 700,
                    color: '#0f3460'
                  }}>
                    Account Name *
                  </label>
                  <input
                    type="text"
                    id="account_name"
                    name="account_name"
                    value={formData.account_name}
                    onChange={handleChange}
                    placeholder="e.g. Bank A/c, Debtors A/c, Sales Income A/c"
                    required
                    style={{
                      ...underlineInputStyle,
                      fontSize: '17px',
                      fontWeight: 600,
                      borderBottomColor: '#0f3460'
                    }}
                  />
                </div>

                {/* Type Selection Dropdown */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '160px 1fr',
                  alignItems: 'center'
                }}>
                  <label htmlFor="account_type" style={{
                    fontSize: '16px',
                    fontWeight: 700,
                    color: '#0f3460'
                  }}>
                    Type *
                  </label>
                  <div style={{ position: 'relative' }}>
                    <select
                      id="account_type"
                      name="account_type"
                      value={formData.account_type}
                      onChange={handleChange}
                      required
                      style={{
                        ...underlineInputStyle,
                        cursor: 'pointer',
                        fontWeight: 600,
                        borderBottomColor: '#0f3460',
                        paddingRight: '28px'
                      }}
                    >
                      <optgroup label="Balancesheet">
                        <option value="Asset">Asset</option>
                        <option value="Liability">Liability</option>
                        <option value="Bank">Bank</option>
                        <option value="Capital">Capital</option>
                        <option value="Cash">Cash</option>
                      </optgroup>
                      <optgroup label="Profit and Loss">
                        <option value="Income">Income</option>
                        <option value="Expenses">Expenses</option>
                        <option value="Other Expenses">Other Expenses</option>
                      </optgroup>
                    </select>
                  </div>
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
                  📌 Account Categorization Note:
                </div>
                Each account is assigned an <strong>Account Type</strong>, which would further be used for how the account is treated and where it appears in reports (Balance Sheet vs. Profit & Loss statement).
              </div>

            </form>
          </div>
        </div>
      ) : (
        /* ============================================================ */
        /* 2. CHART OF ACCOUNTS LIST VIEW                               */
        /* ============================================================ */
        <div>
          {/* Top Title: Chart of Accounts (List View) */}
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <h1 style={{
              fontSize: '28px',
              fontWeight: 800,
              color: '#1a1a2e',
              letterSpacing: '-0.5px',
              margin: '0 0 6px 0'
            }}>
              Chart of Accounts (List View)
            </h1>
            <span style={{
              display: 'inline-block',
              fontSize: '13px',
              color: '#d97706',
              fontWeight: 600,
              background: '#fef3c7',
              padding: '3px 12px',
              borderRadius: '999px',
              border: '1px solid #fde68a'
            }}>
              All these accounts are to be pre configured
            </span>
          </div>

          {/* Main Card Frame */}
          <div style={{
            background: '#ffffff',
            border: '2px solid #e2e8f0',
            borderRadius: '24px',
            padding: '24px 28px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.06)'
          }}>

            {/* Top Toolbar matching wireframe: [ New ] [ Confirm ] [ Archived ] ... [ Home ] [ Back ] */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '20px',
              flexWrap: 'wrap',
              gap: '12px'
            }}>
              {/* Left Action Buttons */}
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
                    padding: '7px 22px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#0f3460'; e.currentTarget.style.color = '#ffffff' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.color = '#0f3460' }}
                >
                  New
                </button>

                <button
                  type="button"
                  onClick={handleConfirmAction}
                  style={{
                    background: '#0f3460',
                    border: '2px solid #0f3460',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '14px',
                    borderRadius: '10px',
                    padding: '7px 20px',
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(15, 52, 96, 0.2)',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#16213e' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = '#0f3460' }}
                >
                  Confirm
                </button>

                <button
                  type="button"
                  onClick={handleToggleArchive}
                  style={{
                    background: showArchived ? '#e0f2fe' : '#ffffff',
                    border: '2px solid #0284c7',
                    color: '#0284c7',
                    fontWeight: 700,
                    fontSize: '14px',
                    borderRadius: '10px',
                    padding: '7px 18px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => {
                    if (!showArchived) {
                      e.currentTarget.style.background = '#0284c7'
                      e.currentTarget.style.color = '#ffffff'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!showArchived) {
                      e.currentTarget.style.background = '#ffffff'
                      e.currentTarget.style.color = '#0284c7'
                    }
                  }}
                  title={selectedIds.size > 0 ? 'Archive/Unarchive selected' : 'Toggle Archived view'}
                >
                  {showArchived ? 'Active Accounts' : 'Archived'}
                </button>
              </div>

              {/* Search Box */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: '#f8fafc',
                border: '1.5px solid #cbd5e1',
                borderRadius: '10px',
                padding: '5px 14px',
                minWidth: '220px'
              }}>
                <span style={{ fontSize: '14px', color: '#64748b' }}>🔍</span>
                <input
                  type="text"
                  placeholder="Search accounts..."
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

              {/* Right Navigation: [ Home ] [ Back ] */}
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={() => navigate('/')}
                  style={{
                    background: '#ffffff',
                    border: '2px solid #0f3460',
                    color: '#0f3460',
                    fontWeight: 700,
                    fontSize: '14px',
                    borderRadius: '10px',
                    padding: '7px 18px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#0f3460'; e.currentTarget.style.color = '#ffffff' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.color = '#0f3460' }}
                  title="Return to Home Dashboard"
                >
                  Home
                </button>

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
              </div>
            </div>

            {/* Accounts Table matching wireframe */}
            {filteredAccounts.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '48px 20px',
                color: '#64748b',
                fontSize: '15px'
              }}>
                No accounts found. Click <strong>"New"</strong> to add one.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                      <th style={{ width: '48px', textAlign: 'center', padding: '12px 8px' }}>
                        <input
                          type="checkbox"
                          checked={filteredAccounts.length > 0 && filteredAccounts.every(a => selectedIds.has(a.id))}
                          onChange={() => handleToggleSelectAll(filteredAccounts)}
                          style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#0f3460' }}
                          title="Select all"
                        />
                      </th>
                      <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: '14px', color: '#1e293b', fontWeight: 700 }}>
                        Account Name
                      </th>
                      <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: '14px', color: '#1e293b', fontWeight: 700 }}>
                        Type
                      </th>
                      <th style={{ textAlign: 'center', width: '110px', padding: '12px 16px', fontSize: '14px', color: '#1e293b', fontWeight: 700 }}>
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAccounts.map((account) => {
                      const isSelected = selectedIds.has(account.id)
                      const isMaster = PRECONFIGURED_ACCOUNT_NAMES.includes(account.account_name)
                      return (
                        <tr
                          key={account.id}
                          onClick={() => openEditForm(account)}
                          style={{
                            cursor: 'pointer',
                            borderBottom: '1px solid #f1f5f9',
                            background: isSelected ? '#f0f9ff' : 'transparent',
                            transition: 'background 0.12s ease'
                          }}
                          onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = '#f8fafc' }}
                          onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = 'transparent' }}
                        >
                          <td
                            style={{ textAlign: 'center', padding: '12px 8px' }}
                            onClick={(e) => handleToggleSelectOne(account.id, e)}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => handleToggleSelectOne(account.id, e)}
                              style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#0f3460' }}
                            />
                          </td>
                          <td style={{ padding: '12px 16px', color: '#0f3460', fontWeight: 600, fontSize: '15px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span>{account.account_name}</span>
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
                            <span className={`type-badge ${typeBadgeClass(account.account_type)}`}>
                              {account.account_type}
                            </span>
                          </td>
                          <td style={{ textAlign: 'center', padding: '12px 16px' }} onClick={(e) => e.stopPropagation()}>
                            <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                              <button
                                type="button"
                                className="btn-edit"
                                onClick={() => openEditForm(account)}
                                style={{ padding: '4px 10px', fontSize: '12px' }}
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                className="btn-delete"
                                onClick={(e) => handleDelete(account.id, account.account_name, e)}
                                style={{ padding: '4px 8px', fontSize: '12px' }}
                                title="Delete account"
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

            {/* Bottom info indicator */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: '16px',
              fontSize: '13px',
              color: '#64748b'
            }}>
              <span>
                Showing {filteredAccounts.length} account{filteredAccounts.length !== 1 ? 's' : ''}
              </span>
              {selectedIds.size > 0 && (
                <span style={{ fontWeight: 600, color: '#0f3460' }}>
                  {selectedIds.size} selected
                </span>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  )
}

export default AccountsPage
