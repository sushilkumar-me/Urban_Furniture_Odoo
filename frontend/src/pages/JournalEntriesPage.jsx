import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import api from '../api'

const navLinks = [
  { label: 'Dashboard',         path: '/dashboard'         },
  { label: 'Contacts',          path: '/contacts'          },
  { label: 'Categories',        path: '/categories'        },
  { label: 'Products',          path: '/products'          },
  { label: 'Accounts',          path: '/accounts'          },
  { label: 'Journals',          path: '/journals'          },
  { label: 'Analytics',         path: '/analytic-accounts' },
  { label: 'Budgets',           path: '/budgets'           },
  { label: 'Purchase Orders',   path: '/purchase-orders'   },
  { label: 'Vendor Bills',      path: '/vendor-bills'      },
  { label: 'Sales Orders',      path: '/sales-orders'      },
  { label: 'Customer Invoices', path: '/customer-invoices' },
  { label: 'Payments',          path: '/payments'          },
  { label: 'Journal Entries',   path: '/journal-entries'   },
  { label: 'Reports',           path: '/reports'           },
]

function JournalEntriesPage() {
  const [entries, setEntries]         = useState([])
  const [journals, setJournals]       = useState([])
  const [accounts, setAccounts]       = useState([])
  const [contacts, setContacts]       = useState([])

  const [filterStatus, setFilterStatus] = useState('All')
  const [selectedJournal, setSelectedJournal] = useState('All')
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
  const location = useLocation()
  const loginId  = localStorage.getItem('login_id') || 'User'

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('login_id')
    navigate('/login')
  }

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
  const isBalanced = totalDebit > 0 && totalDebit === totalCredit

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

  const handleSubmit = async (e) => {
    e.preventDefault()
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

    setLoading(true)
    try {
      const payload = {
        journal_id: Number(formData.journal_id),
        entry_date: formData.entry_date,
        reference: formData.reference || null,
        items: parsedItems
      }

      const res = await api.post('/journal-entries/', payload)
      setSuccess(`Journal Entry ${res.data.entry_number} created successfully as Draft.`)
      setShowForm(false)
      loadData()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save Journal Entry.')
    } finally {
      setLoading(false)
    }
  }

  const handlePost = async (entry) => {
    if (!window.confirm(`Post Journal Entry "${entry.entry_number}"? Once posted, it becomes permanent and immutable.`)) return
    try {
      await api.post(`/journal-entries/${entry.id}/post`)
      setSuccess(`Journal Entry "${entry.entry_number}" posted successfully!`)
      loadData()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to post entry.')
    }
  }

  const handleDelete = async (entry) => {
    if (!window.confirm(`Delete Draft Journal Entry "${entry.entry_number}"?`)) return
    try {
      await api.delete(`/journal-entries/${entry.id}`)
      setSuccess(`Journal Entry "${entry.entry_number}" deleted.`)
      loadData()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to delete entry.')
    }
  }

  // Filtering
  const filteredEntries = entries.filter(e => {
    const matchStatus = filterStatus === 'All' || e.status === filterStatus
    const matchJournal = selectedJournal === 'All' || String(e.journal_id) === String(selectedJournal)
    return matchStatus && matchJournal
  })

  return (
    <div className="dashboard-container">

      {/* Navigation */}
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

        {/* Page Header */}
        <div className="page-header">
          <div>
            <h2>📖 Journal Entries & General Ledger</h2>
            <p className="page-subtitle">
              Manage complete Double-Entry bookkeeping with strict Debit = Credit validation
            </p>
          </div>
          <button className="btn-primary" onClick={openNewForm}>
            + New Journal Entry
          </button>
        </div>

        {success && <div className="success-message" style={{marginBottom:'16px'}}>✅ {success}</div>}
        {error && <div className="error-message" style={{marginBottom:'16px'}}>⚠️ {error}</div>}

        {/* Create / Edit Form Modal */}
        {showForm && (
          <div className="form-card" style={{marginBottom:'24px', background:'#ffffff', border:'1px solid #d0d7de'}}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'16px'}}>
              <h3 style={{margin:0, color:'#0f3460'}}>New Journal Entry</h3>
              <button className="btn-secondary" onClick={() => setShowForm(false)}>✕ Close</button>
            </div>

            <form onSubmit={handleSubmit}>
              {/* Header Inputs */}
              <div className="form-row">
                <div className="form-group">
                  <label>Journal *</label>
                  <select
                    className="form-select"
                    value={formData.journal_id}
                    onChange={e => setFormData({ ...formData, journal_id: e.target.value })}
                    required
                  >
                    <option value="">-- Select Journal --</option>
                    {journals.map(j => (
                      <option key={j.id} value={j.id}>
                        {j.journal_name} ({j.journal_type})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Accounting Date *</label>
                  <input
                    type="date"
                    value={formData.entry_date}
                    onChange={e => setFormData({ ...formData, entry_date: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Reference / Memo</label>
                  <input
                    type="text"
                    placeholder="e.g. Monthly Depreciation / Office supplies"
                    value={formData.reference}
                    onChange={e => setFormData({ ...formData, reference: e.target.value })}
                  />
                </div>
              </div>

              {/* Items Section */}
              <h4 style={{marginTop:'20px', marginBottom:'10px', color:'#333'}}>
                Journal Items (Debits & Credits)
              </h4>

              <div style={{overflowX:'auto'}}>
                <table className="je-items-table">
                  <thead>
                    <tr>
                      <th style={{width:'28%'}}>Account *</th>
                      <th style={{width:'22%'}}>Partner (optional)</th>
                      <th style={{width:'22%'}}>Label / Description</th>
                      <th style={{width:'12%'}}>Debit (₹)</th>
                      <th style={{width:'12%'}}>Credit (₹)</th>
                      <th style={{width:'4%'}}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((row, idx) => (
                      <tr key={idx}>
                        <td>
                          <select
                            className="form-select"
                            style={{padding:'6px 8px', fontSize:'13px'}}
                            value={row.account_id}
                            onChange={e => handleItemChange(idx, 'account_id', e.target.value)}
                            required
                          >
                            <option value="">-- Account --</option>
                            {accounts.map(acc => (
                              <option key={acc.id} value={acc.id}>
                                {acc.account_name} ({acc.account_type})
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <select
                            className="form-select"
                            style={{padding:'6px 8px', fontSize:'13px'}}
                            value={row.partner_id}
                            onChange={e => handleItemChange(idx, 'partner_id', e.target.value)}
                          >
                            <option value="">-- None --</option>
                            {contacts.map(c => (
                              <option key={c.id} value={c.id}>
                                {c.name} ({c.contact_type})
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <input
                            type="text"
                            placeholder="Line memo"
                            style={{padding:'6px 8px', fontSize:'13px', width:'100%'}}
                            value={row.description}
                            onChange={e => handleItemChange(idx, 'description', e.target.value)}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            style={{padding:'6px 8px', fontSize:'13px', width:'100%', textAlign:'right'}}
                            value={row.debit}
                            onChange={e => handleItemChange(idx, 'debit', e.target.value)}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            style={{padding:'6px 8px', fontSize:'13px', width:'100%', textAlign:'right'}}
                            value={row.credit}
                            onChange={e => handleItemChange(idx, 'credit', e.target.value)}
                          />
                        </td>
                        <td style={{textAlign:'center'}}>
                          {items.length > 2 && (
                            <button
                              type="button"
                              onClick={() => removeLine(idx)}
                              style={{background:'none', border:'none', color:'#cc0000', cursor:'pointer', fontSize:'16px'}}
                              title="Remove line"
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

              <div style={{marginTop:'12px'}}>
                <button type="button" className="btn-secondary" onClick={addLine} style={{fontSize:'13px'}}>
                  + Add Line
                </button>
              </div>

              {/* Real-time Double-Entry Balance Verification Banner */}
              <div className={`balance-box ${isBalanced ? 'balance-box-balanced' : 'balance-box-unbalanced'}`}>
                <div>
                  <strong>Total Debits:</strong> ₹{totalDebit.toFixed(2)} &nbsp;|&nbsp;{' '}
                  <strong>Total Credits:</strong> ₹{totalCredit.toFixed(2)} &nbsp;|&nbsp;{' '}
                  <strong>Difference:</strong> ₹{difference.toFixed(2)}
                </div>
                <div>
                  {isBalanced ? (
                    <span>✅ <strong>Balanced:</strong> Total Debits equal Total Credits.</span>
                  ) : (
                    <span>⚠️ <strong>Unbalanced:</strong> Difference must be ₹0.00 before posting.</span>
                  )}
                </div>
              </div>

              <div className="form-actions" style={{marginTop:'16px'}}>
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? 'Saving...' : 'Save as Draft'}
                </button>
                <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Entries List Card */}
        <div className="card">
          <div className="table-toolbar">
            <div>
              <span className="contact-count" style={{fontWeight:600}}>
                {filteredEntries.length} Journal Entr{filteredEntries.length === 1 ? 'y' : 'ies'}
              </span>
            </div>

            {/* Filter Controls */}
            <div style={{display:'flex', gap:'12px', alignItems:'center'}}>
              <div className="filter-tabs">
                {['All', 'Draft', 'Posted'].map(st => (
                  <button
                    key={st}
                    className={`filter-tab ${filterStatus === st ? 'active' : ''}`}
                    onClick={() => setFilterStatus(st)}
                  >
                    {st}
                  </button>
                ))}
              </div>

              <select
                className="form-select"
                style={{padding:'6px 10px', fontSize:'13px'}}
                value={selectedJournal}
                onChange={e => setSelectedJournal(e.target.value)}
              >
                <option value="All">All Journals</option>
                {journals.map(j => (
                  <option key={j.id} value={j.id}>{j.journal_name}</option>
                ))}
              </select>
            </div>
          </div>

          {filteredEntries.length === 0 ? (
            <div className="empty-state">
              No journal entries found. Click <strong>"+ New Journal Entry"</strong> to record one.
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Entry Number</th>
                  <th>Journal</th>
                  <th>Date</th>
                  <th>Reference</th>
                  <th>Status</th>
                  <th>Total Debit</th>
                  <th>Total Credit</th>
                  <th>Balance</th>
                  <th style={{textAlign:'center'}}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredEntries.map(entry => (
                  <React.Fragment key={entry.id}>
                    <tr style={{cursor:'pointer', background: expandedId === entry.id ? '#f8fafc' : 'white'}}>
                      <td style={{fontWeight:600, color:'#0f3460'}} onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}>
                        {expandedId === entry.id ? '▼ ' : '▶ '} {entry.entry_number}
                      </td>
                      <td>{entry.journal?.journal_name || `Journal #${entry.journal_id}`}</td>
                      <td>{entry.entry_date}</td>
                      <td>{entry.reference || '—'}</td>
                      <td>
                        <span className={`status-badge ${entry.status === 'Posted' ? 'status-confirmed' : 'status-draft'}`}>
                          {entry.status}
                        </span>
                      </td>
                      <td style={{fontWeight:600}}>₹{Number(entry.total_debit).toFixed(2)}</td>
                      <td style={{fontWeight:600}}>₹{Number(entry.total_credit).toFixed(2)}</td>
                      <td>
                        {entry.is_balanced ? (
                          <span className="badge-balanced">Balanced ✓</span>
                        ) : (
                          <span className="badge-unbalanced">Unbalanced ✗</span>
                        )}
                      </td>
                      <td style={{textAlign:'center'}}>
                        <div style={{display:'flex', gap:'6px', justifyContent:'center'}}>
                          <button
                            className="btn-view"
                            onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                            title="View line items"
                          >
                            {expandedId === entry.id ? 'Hide' : 'Lines'}
                          </button>
                          {entry.status === 'Draft' && (
                            <>
                              <button
                                className="btn-success"
                                onClick={() => handlePost(entry)}
                                disabled={!entry.is_balanced}
                                title={entry.is_balanced ? 'Post Entry to General Ledger' : 'Cannot post unbalanced entry'}
                              >
                                Post
                              </button>
                              <button
                                className="btn-secondary"
                                style={{color:'#cc0000', borderColor:'#fcc', padding:'4px 8px'}}
                                onClick={() => handleDelete(entry)}
                                title="Delete draft"
                              >
                                🗑️
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>

                    {/* Expandable Line Items Row */}
                    {expandedId === entry.id && (
                      <tr>
                        <td colSpan="9" style={{padding:'12px 24px', background:'#f8fafc', borderBottom:'2px solid #e1e5e9'}}>
                          <div style={{background:'white', border:'1px solid #e1e5e9', borderRadius:'8px', padding:'16px'}}>
                            <div style={{display:'flex', justifyContent:'space-between', marginBottom:'10px'}}>
                              <strong style={{color:'#0f3460'}}>Journal Items for {entry.entry_number}</strong>
                              <span style={{fontSize:'12px', color:'#666'}}>Created by: {entry.creator?.name || 'System Admin'}</span>
                            </div>
                            <table className="je-items-table">
                              <thead>
                                <tr>
                                  <th>Account</th>
                                  <th>Account Type</th>
                                  <th>Partner</th>
                                  <th>Label</th>
                                  <th style={{textAlign:'right'}}>Debit (₹)</th>
                                  <th style={{textAlign:'right'}}>Credit (₹)</th>
                                </tr>
                              </thead>
                              <tbody>
                                {entry.items?.map(it => (
                                  <tr key={it.id}>
                                    <td style={{fontWeight:500}}>{it.account?.account_name || `Account #${it.account_id}`}</td>
                                    <td>
                                      <span style={{fontSize:'11px', background:'#f0f2f5', padding:'2px 6px', borderRadius:'4px'}}>
                                        {it.account?.account_type || '—'}
                                      </span>
                                    </td>
                                    <td>{it.partner?.name || '—'}</td>
                                    <td style={{color:'#666'}}>{it.description || '—'}</td>
                                    <td style={{textAlign:'right', fontWeight:Number(it.debit) > 0 ? 600 : 400}}>
                                      {Number(it.debit) > 0 ? `₹${Number(it.debit).toFixed(2)}` : '0.00'}
                                    </td>
                                    <td style={{textAlign:'right', fontWeight:Number(it.credit) > 0 ? 600 : 400}}>
                                      {Number(it.credit) > 0 ? `₹${Number(it.credit).toFixed(2)}` : '0.00'}
                                    </td>
                                  </tr>
                                ))}
                                <tr style={{background:'#fafbfc', fontWeight:700}}>
                                  <td colSpan="4" style={{textAlign:'right'}}>Total</td>
                                  <td style={{textAlign:'right', color:'#0f3460'}}>₹{Number(entry.total_debit).toFixed(2)}</td>
                                  <td style={{textAlign:'right', color:'#0f3460'}}>₹{Number(entry.total_credit).toFixed(2)}</td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          )}
        </div>

      </div>
    </div>
  )
}

export default JournalEntriesPage
