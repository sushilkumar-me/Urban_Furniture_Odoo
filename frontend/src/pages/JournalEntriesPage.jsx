import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api'

function JournalEntriesPage() {
  const [entries, setEntries]         = useState([])
  const [journals, setJournals]       = useState([])
  const [accounts, setAccounts]       = useState([])
  const [contacts, setContacts]       = useState([])

  const [filterStatus, setFilterStatus] = useState('All')
  const [selectedJournal, setSelectedJournal] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedId, setExpandedId]   = useState(null)

  const [showForm, setShowForm]       = useState(false)
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState('')
  const [success, setSuccess]         = useState('')

  const today = new Date().toISOString().split('T')[0]
  const [formData, setFormData] = useState({
    journal_id: '',
    entry_date: today,
    reference:  ''
  })

  // Dynamic Journal Entry Line Items
  const [items, setItems] = useState([
    { account_id: '', partner_id: '', description: '', debit: '', credit: '' },
    { account_id: '', partner_id: '', description: '', debit: '', credit: '' }
  ])

  const navigate = useNavigate()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [eRes, jRes, aRes, cRes] = await Promise.all([
        api.get('/journal-entries/'),
        api.get('/journals/'),
        api.get('/accounts/'),
        api.get('/contacts/')
      ])
      setEntries(eRes.data)
      setJournals(jRes.data)
      setAccounts(aRes.data)
      setContacts(cRes.data)
      if (jRes.data.length > 0 && !formData.journal_id) {
        setFormData(prev => ({ ...prev, journal_id: jRes.data[0].id }))
      }
    } catch (err) {
      console.error('Failed to fetch data:', err)
      setError('Failed to load accounting data.')
    }
  }

  // Row item management
  const handleItemChange = (index, field, value) => {
    const updated = [...items]
    if (field === 'debit') {
      updated[index].debit = value
      if (Number(value) > 0) {
        updated[index].credit = ''
      }
    } else if (field === 'credit') {
      updated[index].credit = value
      if (Number(value) > 0) {
        updated[index].debit = ''
      }
    } else {
      updated[index][field] = value
    }
    setItems(updated)
  }

  const addLine = () => {
    setItems([...items, { account_id: '', partner_id: '', description: '', debit: '', credit: '' }])
  }

  const removeLine = (index) => {
    if (items.length <= 2) {
      setError('A journal entry must contain at least two line items for Double Entry.')
      return
    }
    setItems(items.filter((_, i) => i !== index))
  }

  // Live Balance Computations
  const totalDebit = items.reduce((acc, it) => acc + (Number(it.debit) || 0), 0)
  const totalCredit = items.reduce((acc, it) => acc + (Number(it.credit) || 0), 0)
  const difference = Math.abs(totalDebit - totalCredit)
  const isBalanced = totalDebit > 0 && Math.abs(totalDebit - totalCredit) < 0.001

  const openNewForm = () => {
    setFormData({
      journal_id: journals.length > 0 ? journals[0].id : '',
      entry_date: today,
      reference:  ''
    })
    setItems([
      { account_id: '', partner_id: '', description: '', debit: '', credit: '' },
      { account_id: '', partner_id: '', description: '', debit: '', credit: '' }
    ])
    setError('')
    setSuccess('')
    setShowForm(true)
  }

  const closeForm = () => {
    setShowForm(false)
    setError('')
  }

  const handleSubmit = async (e, autoPost = false) => {
    if (e && e.preventDefault) e.preventDefault()
    setError('')
    setSuccess('')

    if (!formData.journal_id) {
      setError('Please select a Journal.')
      return
    }

    if (items.length < 2) {
      setError('Double entry requires at least 2 line items (debit and credit).')
      return
    }

    // Validate items
    const parsedItems = []
    for (let i = 0; i < items.length; i++) {
      const line = items[i]
      if (!line.account_id) {
        setError(`Line ${i + 1}: Account is required.`)
        return
      }
      const deb = Number(line.debit) || 0
      const cred = Number(line.credit) || 0
      if ((deb > 0 && cred > 0) || (deb === 0 && cred === 0)) {
        setError(`Line ${i + 1}: Must specify either Debit OR Credit (not both, and not zero).`)
        return
      }
      parsedItems.push({
        account_id: Number(line.account_id),
        partner_id: line.partner_id ? Number(line.partner_id) : null,
        debit: deb,
        credit: cred,
        description: line.description || null
      })
    }

    if (autoPost && !isBalanced) {
      setError(`Cannot post unbalanced entry. Difference is ₹${difference.toFixed(2)}. Total Debits must equal Total Credits.`)
      return
    }

    setLoading(true)
    try {
      const payload = {
        journal_id: Number(formData.journal_id),
        entry_date: formData.entry_date,
        reference: formData.reference || null,
        items: parsedItems
      }

      const res = await api.post('/journal-entries/', payload)
      const createdEntry = res.data

      if (autoPost) {
        await api.post(`/journal-entries/${createdEntry.id}/post`)
        setSuccess(`Journal Entry "${createdEntry.entry_number}" created and Posted successfully!`)
      } else {
        setSuccess(`Journal Entry "${createdEntry.entry_number}" created as Draft.`)
      }

      setShowForm(false)
      await loadData()
    } catch (err) {
      const detail = err.response?.data?.detail
      if (Array.isArray(detail)) {
        setError(detail.map(d => d.msg || d.loc?.join('.')).join(' | '))
      } else if (typeof detail === 'object') {
        setError(JSON.stringify(detail))
      } else if (detail) {
        setError(String(detail))
      } else {
        setError('Failed to save Journal Entry.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handlePost = async (entry, e) => {
    if (e) e.stopPropagation()
    if (!window.confirm(`Post Journal Entry "${entry.entry_number}"? Once posted, it becomes permanent and immutable.`)) return
    try {
      await api.post(`/journal-entries/${entry.id}/post`)
      setSuccess(`Journal Entry "${entry.entry_number}" posted successfully!`)
      loadData()
    } catch (err) {
      const detail = err.response?.data?.detail
      setError(typeof detail === 'string' ? detail : 'Failed to post entry.')
    }
  }

  const handleDelete = async (entry, e) => {
    if (e) e.stopPropagation()
    if (!window.confirm(`Delete Draft Journal Entry "${entry.entry_number}"?`)) return
    try {
      await api.delete(`/journal-entries/${entry.id}`)
      setSuccess(`Journal Entry "${entry.entry_number}" deleted.`)
      loadData()
    } catch (err) {
      const detail = err.response?.data?.detail
      setError(typeof detail === 'string' ? detail : 'Failed to delete entry.')
    }
  }

  // Filter entries
  const filteredEntries = entries.filter(e => {
    const matchStatus = filterStatus === 'All' || e.status === filterStatus
    const matchJournal = selectedJournal === 'All' || String(e.journal_id) === String(selectedJournal)
    if (!matchStatus || !matchJournal) return false

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      const matchNum = (e.entry_number || '').toLowerCase().includes(q)
      const matchRef = (e.reference || '').toLowerCase().includes(q)
      const matchJ   = (e.journal?.journal_name || '').toLowerCase().includes(q)
      const matchP   = e.items?.some(it => (it.partner?.name || '').toLowerCase().includes(q))
      if (!matchNum && !matchRef && !matchJ && !matchP) return false
    }
    return true
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

  // Helper to extract primary partner from items
  const getEntryPartner = (entry) => {
    if (!entry.items || entry.items.length === 0) return '—'
    const itemWithPartner = entry.items.find(it => it.partner?.name)
    return itemWithPartner ? itemWithPartner.partner.name : '—'
  }

  return (
    <div className="page-container" style={{ maxWidth: '1020px', margin: '0 auto', padding: '24px 16px' }}>

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
      {/* 1. JOURNAL ENTRY FORM VIEW                                   */}
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
              Journal Entry Form View
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
            <form onSubmit={(e) => handleSubmit(e, false)}>

              {/* Action Bar matching wireframe: [ Post ] [ Save Draft ] ... [ Cancel ] [ Back ] */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '28px'
              }}>
                <div style={{ display: 'flex', gap: '14px' }}>
                  <button
                    type="button"
                    disabled={loading || !isBalanced}
                    onClick={(e) => handleSubmit(e, true)}
                    style={{
                      background: isBalanced ? '#0f3460' : '#94a3b8',
                      border: '2px solid',
                      borderColor: isBalanced ? '#0f3460' : '#94a3b8',
                      color: '#ffffff',
                      fontWeight: 700,
                      fontSize: '15px',
                      borderRadius: '12px',
                      padding: '8px 28px',
                      cursor: isBalanced ? 'pointer' : 'not-allowed',
                      boxShadow: isBalanced ? '0 3px 10px rgba(15, 52, 96, 0.25)' : 'none',
                      transition: 'all 0.15s ease'
                    }}
                    title={isBalanced ? 'Post directly to General Ledger' : 'Entry must be balanced to post'}
                  >
                    Post
                  </button>

                  <button
                    type="submit"
                    disabled={loading}
                    style={{
                      background: '#ffffff',
                      border: '2px solid #0f3460',
                      color: '#0f3460',
                      fontWeight: 700,
                      fontSize: '15px',
                      borderRadius: '12px',
                      padding: '8px 24px',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = '#0f3460'; e.currentTarget.style.color = '#ffffff' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.color = '#0f3460' }}
                  >
                    {loading ? 'Saving...' : 'Save Draft'}
                  </button>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={closeForm}
                    style={{
                      background: '#ffffff',
                      border: '2px solid #94a3b8',
                      color: '#64748b',
                      fontWeight: 700,
                      fontSize: '15px',
                      borderRadius: '12px',
                      padding: '8px 24px',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = '#f1f5f9' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = '#ffffff' }}
                  >
                    Cancel
                  </button>

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
                      padding: '8px 24px',
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

              {/* Header Details Card */}
              <div style={{
                background: '#fcfdfe',
                border: '1.5px solid #e2e8f0',
                borderRadius: '18px',
                padding: '24px 28px',
                marginBottom: '28px'
              }}>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '170px 1fr',
                  alignItems: 'center',
                  marginBottom: '20px'
                }}>
                  <label htmlFor="entry_date" style={{ fontSize: '16px', fontWeight: 700, color: '#0f3460' }}>
                    Accounting Date *
                  </label>
                  <input
                    type="date"
                    id="entry_date"
                    value={formData.entry_date}
                    onChange={e => setFormData({ ...formData, entry_date: e.target.value })}
                    required
                    style={{
                      ...underlineInputStyle,
                      borderBottomColor: '#0f3460',
                      maxWidth: '300px'
                    }}
                  />
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '170px 1fr',
                  alignItems: 'center',
                  marginBottom: '20px'
                }}>
                  <label htmlFor="journal_id" style={{ fontSize: '16px', fontWeight: 700, color: '#0f3460' }}>
                    Journal *
                  </label>
                  <select
                    id="journal_id"
                    value={formData.journal_id}
                    onChange={e => setFormData({ ...formData, journal_id: e.target.value })}
                    required
                    style={{
                      ...underlineInputStyle,
                      borderBottomColor: '#0f3460',
                      maxWidth: '350px',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="">-- Select Journal --</option>
                    {journals.map(j => (
                      <option key={j.id} value={j.id}>
                        {j.journal_name} ({j.journal_type})
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '170px 1fr',
                  alignItems: 'center'
                }}>
                  <label htmlFor="reference" style={{ fontSize: '16px', fontWeight: 700, color: '#0f3460' }}>
                    Reference / Memo
                  </label>
                  <input
                    type="text"
                    id="reference"
                    placeholder="e.g. Monthly Depreciation / Office supplies"
                    value={formData.reference}
                    onChange={e => setFormData({ ...formData, reference: e.target.value })}
                    style={{
                      ...underlineInputStyle,
                      borderBottomColor: '#0f3460'
                    }}
                  />
                </div>
              </div>

              {/* Line Items Section matching wireframe: Account | Partner | Debit | Credit */}
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#1a1a2e', marginBottom: '14px' }}>
                  Journal Items (Debits & Credits)
                </h3>

                <div style={{ overflowX: 'auto', border: '1.5px solid #e2e8f0', borderRadius: '14px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                        <th style={{ textAlign: 'left', padding: '12px 14px', width: '32%', fontSize: '14px', color: '#1e293b' }}>
                          Account *
                        </th>
                        <th style={{ textAlign: 'left', padding: '12px 14px', width: '26%', fontSize: '14px', color: '#1e293b' }}>
                          Partner (optional)
                        </th>
                        <th style={{ textAlign: 'right', padding: '12px 14px', width: '18%', fontSize: '14px', color: '#1e293b' }}>
                          Debit (₹)
                        </th>
                        <th style={{ textAlign: 'right', padding: '12px 14px', width: '18%', fontSize: '14px', color: '#1e293b' }}>
                          Credit (₹)
                        </th>
                        <th style={{ width: '6%', textAlign: 'center', padding: '12px 6px' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((row, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '10px 14px' }}>
                            <select
                              value={row.account_id}
                              onChange={e => handleItemChange(idx, 'account_id', e.target.value)}
                              required
                              style={{
                                width: '100%',
                                padding: '8px 10px',
                                borderRadius: '8px',
                                border: '1px solid #cbd5e1',
                                fontSize: '14px',
                                outline: 'none'
                              }}
                            >
                              <option value="">-- Select Account --</option>
                              {accounts.map(acc => (
                                <option key={acc.id} value={acc.id}>
                                  {acc.account_name} ({acc.account_type})
                                </option>
                              ))}
                            </select>
                          </td>
                          <td style={{ padding: '10px 14px' }}>
                            <select
                              value={row.partner_id}
                              onChange={e => handleItemChange(idx, 'partner_id', e.target.value)}
                              style={{
                                width: '100%',
                                padding: '8px 10px',
                                borderRadius: '8px',
                                border: '1px solid #cbd5e1',
                                fontSize: '14px',
                                outline: 'none'
                              }}
                            >
                              <option value="">-- None --</option>
                              {contacts.map(c => (
                                <option key={c.id} value={c.id}>
                                  {c.name} ({c.contact_type})
                                </option>
                              ))}
                            </select>
                          </td>
                          <td style={{ padding: '10px 14px' }}>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="0.00"
                              value={row.debit}
                              onChange={e => handleItemChange(idx, 'debit', e.target.value)}
                              style={{
                                width: '100%',
                                padding: '8px 10px',
                                borderRadius: '8px',
                                border: '1px solid #cbd5e1',
                                fontSize: '14px',
                                textAlign: 'right',
                                outline: 'none'
                              }}
                            />
                          </td>
                          <td style={{ padding: '10px 14px' }}>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="0.00"
                              value={row.credit}
                              onChange={e => handleItemChange(idx, 'credit', e.target.value)}
                              style={{
                                width: '100%',
                                padding: '8px 10px',
                                borderRadius: '8px',
                                border: '1px solid #cbd5e1',
                                fontSize: '14px',
                                textAlign: 'right',
                                outline: 'none'
                              }}
                            />
                          </td>
                          <td style={{ textAlign: 'center', padding: '10px 6px' }}>
                            {items.length > 2 && (
                              <button
                                type="button"
                                onClick={() => removeLine(idx)}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: '#ef4444',
                                  cursor: 'pointer',
                                  fontSize: '16px',
                                  fontWeight: 700
                                }}
                                title="Remove Line"
                              >
                                ✕
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div style={{ marginTop: '12px' }}>
                  <button
                    type="button"
                    onClick={addLine}
                    style={{
                      background: '#ffffff',
                      border: '1.5px solid #0f3460',
                      color: '#0f3460',
                      fontWeight: 600,
                      fontSize: '13px',
                      borderRadius: '8px',
                      padding: '6px 16px',
                      cursor: 'pointer'
                    }}
                  >
                    + Add Line
                  </button>
                </div>
              </div>

              {/* Double-Entry Balance Verification Banner */}
              <div style={{
                background: isBalanced ? '#f0fdf4' : '#fef2f2',
                border: `1.5px solid ${isBalanced ? '#86efac' : '#fca5a5'}`,
                borderRadius: '12px',
                padding: '16px 20px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '14px'
              }}>
                <div>
                  <strong>Total Debits:</strong> ₹{totalDebit.toFixed(2)} &nbsp;|&nbsp;{' '}
                  <strong>Total Credits:</strong> ₹{totalCredit.toFixed(2)} &nbsp;|&nbsp;{' '}
                  <strong>Difference:</strong> ₹{difference.toFixed(2)}
                </div>
                <div>
                  {isBalanced ? (
                    <span style={{ color: '#16a34a', fontWeight: 700 }}>
                      ✅ Balanced: Total Debits equal Total Credits.
                    </span>
                  ) : (
                    <span style={{ color: '#dc2626', fontWeight: 700 }}>
                      ⚠️ Unbalanced: Difference must be ₹0.00 before posting.
                    </span>
                  )}
                </div>
              </div>

            </form>
          </div>
        </div>
      ) : (
        /* ============================================================ */
        /* 2. JOURNAL ENTRIES LIST VIEW                                 */
        /* ============================================================ */
        <div>
          {/* Top Title: Journal Entries (List View) */}
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <h1 style={{
              fontSize: '28px',
              fontWeight: 800,
              color: '#1a1a2e',
              letterSpacing: '-0.5px',
              margin: '0 0 6px 0'
            }}>
              Journal Entries (List View)
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
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={openNewForm}
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

                {/* Filter Tabs: All, Draft, Posted */}
                <div className="filter-tabs" style={{ display: 'flex', gap: '6px' }}>
                  {['All', 'Draft', 'Posted'].map(st => (
                    <button
                      key={st}
                      className={`filter-tab ${filterStatus === st ? 'active' : ''}`}
                      onClick={() => setFilterStatus(st)}
                      style={{
                        padding: '6px 14px',
                        fontSize: '13px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        background: filterStatus === st ? '#0f3460' : '#ffffff',
                        color: filterStatus === st ? '#ffffff' : '#334155',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      {st}
                    </button>
                  ))}
                </div>
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
                  placeholder="Search entries..."
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

            {/* Table matching wireframe: Date | Number | Partner | Journal | Total | Status */}
            {filteredEntries.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '48px 20px',
                color: '#64748b',
                fontSize: '15px'
              }}>
                No journal entries found. Click <strong>"New"</strong> to record one.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                      <th style={{ textAlign: 'left', padding: '12px 14px', fontSize: '14px', color: '#1e293b', fontWeight: 700 }}>
                        Date
                      </th>
                      <th style={{ textAlign: 'left', padding: '12px 14px', fontSize: '14px', color: '#1e293b', fontWeight: 700 }}>
                        Number
                      </th>
                      <th style={{ textAlign: 'left', padding: '12px 14px', fontSize: '14px', color: '#1e293b', fontWeight: 700 }}>
                        Partner
                      </th>
                      <th style={{ textAlign: 'left', padding: '12px 14px', fontSize: '14px', color: '#1e293b', fontWeight: 700 }}>
                        Journal
                      </th>
                      <th style={{ textAlign: 'right', padding: '12px 14px', fontSize: '14px', color: '#1e293b', fontWeight: 700 }}>
                        Total (₹)
                      </th>
                      <th style={{ textAlign: 'center', padding: '12px 14px', fontSize: '14px', color: '#1e293b', fontWeight: 700 }}>
                        Status
                      </th>
                      <th style={{ textAlign: 'center', width: '130px', padding: '12px 14px', fontSize: '14px', color: '#1e293b', fontWeight: 700 }}>
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEntries.map((entry) => {
                      const isExpanded = expandedId === entry.id
                      return (
                        <React.Fragment key={entry.id}>
                          <tr
                            onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                            style={{
                              cursor: 'pointer',
                              borderBottom: '1px solid #f1f5f9',
                              background: isExpanded ? '#f8fafc' : 'transparent',
                              transition: 'background 0.12s ease'
                            }}
                            onMouseEnter={(e) => { if (!isExpanded) e.currentTarget.style.background = '#f8fafc' }}
                            onMouseLeave={(e) => { if (!isExpanded) e.currentTarget.style.background = 'transparent' }}
                          >
                            <td style={{ padding: '12px 14px', color: '#1e293b', fontSize: '14px' }}>
                              {entry.entry_date}
                            </td>
                            <td style={{ padding: '12px 14px', color: '#0f3460', fontWeight: 700, fontSize: '14px' }}>
                              {isExpanded ? '▼ ' : '▶ '} {entry.entry_number}
                            </td>
                            <td style={{ padding: '12px 14px', color: '#334155', fontSize: '14px' }}>
                              {getEntryPartner(entry)}
                            </td>
                            <td style={{ padding: '12px 14px', color: '#334155', fontSize: '14px' }}>
                              {entry.journal?.journal_name || `Journal #${entry.journal_id}`}
                            </td>
                            <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700, color: '#0f3460', fontSize: '14px' }}>
                              ₹{Number(entry.total_debit).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </td>
                            <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                              <span className={`status-badge ${entry.status === 'Posted' ? 'status-confirmed' : 'status-draft'}`}>
                                {entry.status}
                              </span>
                            </td>
                            <td style={{ textAlign: 'center', padding: '12px 14px' }} onClick={(e) => e.stopPropagation()}>
                              <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                                <button
                                  type="button"
                                  className="btn-view"
                                  onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                                  style={{ padding: '4px 8px', fontSize: '12px' }}
                                >
                                  {isExpanded ? 'Hide' : 'Lines'}
                                </button>
                                {entry.status === 'Draft' && (
                                  <>
                                    <button
                                      type="button"
                                      className="btn-success"
                                      onClick={(e) => handlePost(entry, e)}
                                      disabled={!entry.is_balanced}
                                      style={{ padding: '4px 8px', fontSize: '12px' }}
                                      title={entry.is_balanced ? 'Post to General Ledger' : 'Cannot post unbalanced entry'}
                                    >
                                      Post
                                    </button>
                                    <button
                                      type="button"
                                      className="btn-delete"
                                      onClick={(e) => handleDelete(entry, e)}
                                      style={{ padding: '4px 6px', fontSize: '12px' }}
                                      title="Delete draft"
                                    >
                                      🗑️
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>

                          {/* Expanded Line Items */}
                          {isExpanded && (
                            <tr>
                              <td colSpan="7" style={{ padding: '12px 24px', background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                    <strong style={{ color: '#0f3460' }}>Journal Items for {entry.entry_number}</strong>
                                    <span style={{ fontSize: '12px', color: '#64748b' }}>
                                      Reference: {entry.reference || 'None'}
                                    </span>
                                  </div>
                                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                      <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #cbd5e1' }}>
                                        <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: '13px' }}>Account</th>
                                        <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: '13px' }}>Partner</th>
                                        <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: '13px' }}>Label / Memo</th>
                                        <th style={{ textAlign: 'right', padding: '8px 12px', fontSize: '13px' }}>Debit (₹)</th>
                                        <th style={{ textAlign: 'right', padding: '8px 12px', fontSize: '13px' }}>Credit (₹)</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {entry.items?.map(it => (
                                        <tr key={it.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                          <td style={{ padding: '8px 12px', fontWeight: 600, color: '#0f3460', fontSize: '13px' }}>
                                            {it.account?.account_name || `Account #${it.account_id}`}
                                            <span style={{ marginLeft: '6px', fontSize: '11px', color: '#64748b' }}>
                                              ({it.account?.account_type || ''})
                                            </span>
                                          </td>
                                          <td style={{ padding: '8px 12px', fontSize: '13px', color: '#334155' }}>
                                            {it.partner?.name || '—'}
                                          </td>
                                          <td style={{ padding: '8px 12px', fontSize: '13px', color: '#64748b' }}>
                                            {it.description || '—'}
                                          </td>
                                          <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600, fontSize: '13px' }}>
                                            {Number(it.debit) > 0 ? `₹${Number(it.debit).toFixed(2)}` : '—'}
                                          </td>
                                          <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600, fontSize: '13px' }}>
                                            {Number(it.credit) > 0 ? `₹${Number(it.credit).toFixed(2)}` : '—'}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
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
                Showing {filteredEntries.length} journal entr{filteredEntries.length !== 1 ? 'ies' : 'y'}
              </span>
            </div>

          </div>
        </div>
      )}

    </div>
  )
}

export default JournalEntriesPage
