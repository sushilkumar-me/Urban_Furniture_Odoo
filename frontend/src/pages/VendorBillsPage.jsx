import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import api from '../api'

const navLinks = [
  { label: 'Dashboard',       path: '/dashboard'        },
  { label: 'Contacts',        path: '/contacts'         },
  { label: 'Categories',      path: '/categories'       },
  { label: 'Products',        path: '/products'         },
  { label: 'Accounts',        path: '/accounts'         },
  { label: 'Journals',        path: '/journals'         },
  { label: 'Analytics',       path: '/analytic-accounts'},
  { label: 'Budgets',         path: '/budgets'          },
  { label: 'Purchase Orders', path: '/purchase-orders'  },
  { label: 'Vendor Bills',    path: '/vendor-bills'     },
  { label: 'Payments',        path: '/payments'         },
  { label: 'Journal Entries', path: '/journal-entries'  },
  { label: 'Reports',         path: '/reports'          },
]

function VendorBillsPage() {
  const [bills, setBills]   = useState([])
  const [pos, setPOs]       = useState([])
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({ purchase_order_id:'', bill_number:'', bill_date:'', due_date:'' })
  const [error, setError]   = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  const navigate = useNavigate()
  const location = useLocation()
  const loginId  = localStorage.getItem('login_id') || 'User'

  const handleLogout = () => { localStorage.removeItem('token'); localStorage.removeItem('login_id'); navigate('/login') }

  useEffect(() => {
    initPage()
  }, [location.search])

  const initPage = async () => {
    await fetchBills()
    const posList = await fetchPOs()

    // Check if po_id passed in URL query
    const params = new URLSearchParams(location.search)
    const targetPoId = params.get('po_id')
    if (targetPoId && posList) {
      const selected = posList.find(p => String(p.id) === String(targetPoId))
      const today = new Date().toISOString().split('T')[0]
      setFormData({
        purchase_order_id: targetPoId,
        bill_number: selected ? `BILL-${selected.po_number}` : `BILL-${Date.now().toString().slice(-4)}`,
        bill_date: today,
        due_date: ''
      })
      setShowForm(true)
    }
  }

  const fetchBills = async () => {
    try {
      const r = await api.get('/vendor-bills/')
      setBills(r.data)
    } catch {
      setError('Failed to load vendor bills.')
    }
  }

  const fetchPOs = async () => {
    try {
      const r = await api.get('/purchase-orders/')
      const confirmedPOs = r.data.filter(p => p.status === 'Confirmed')
      setPOs(confirmedPOs)
      return confirmedPOs
    } catch {
      return []
    }
  }

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault(); setError(''); setLoading(true)
    const payload = {
      purchase_order_id: Number(formData.purchase_order_id),
      bill_number:       formData.bill_number,
      bill_date:         formData.bill_date,
      due_date:          formData.due_date || null
    }
    try {
      await api.post('/vendor-bills/', payload)
      setSuccess('Vendor bill created successfully.'); await fetchBills(); setShowForm(false)
      setFormData({ purchase_order_id:'', bill_number:'', bill_date:'', due_date:'' })
    } catch (err) {
      setError(err.response?.data?.detail || 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  const changeStatus = async (bill, newStatus) => {
    try {
      await api.patch(`/vendor-bills/${bill.id}`, { status: newStatus })
      setSuccess(`Bill ${bill.bill_number} → ${newStatus}`); await fetchBills()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to update bill status.')
    }
  }

  const deleteBill = async (bill) => {
    if (!window.confirm(`Delete bill ${bill.bill_number}?`)) return
    try {
      await api.delete(`/vendor-bills/${bill.id}`)
      setSuccess('Vendor bill deleted.'); await fetchBills()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to delete bill.')
    }
  }

  const statusClass = (s) => ({ Draft:'status-draft', Posted:'status-posted', Paid:'status-paid' })[s] || ''

  return (
    <div className="dashboard-container">
      <nav className="navbar">
        <div className="navbar-brand">🪑 Urban Furniture Accounting</div>
        <div className="navbar-links">
          {navLinks.map(l => (
            <button key={l.path} className={`nav-link ${location.pathname===l.path?'nav-link-active':''}`} onClick={() => navigate(l.path)}>
              {l.label}
            </button>
          ))}
        </div>
        <div className="navbar-user"><span>Welcome, <strong>{loginId}</strong></span><button onClick={handleLogout} className="logout-button">Logout</button></div>
      </nav>

      <div className="page-container">
        <div className="page-header">
          <div><h2>Vendor Bills</h2><p className="page-subtitle">Invoices received from vendors against confirmed purchase orders</p></div>
          <button className="btn-primary" onClick={() => { setShowForm(true); setError('') }}>+ New Vendor Bill</button>
        </div>

        {success && <div className="success-message" style={{marginBottom:'16px'}}>✅ {success}</div>}
        {!showForm && error && <div className="error-message" style={{marginBottom:'16px'}}>⚠️ {error}</div>}

        {showForm && (
          <div className="form-card">
            <h3>Create Vendor Bill</h3>
            <form onSubmit={handleSubmit} className="contact-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Purchase Order * (Confirmed only)</label>
                  <select name="purchase_order_id" value={formData.purchase_order_id} onChange={handleChange} className="form-select" required>
                    <option value="">-- Select PO --</option>
                    {pos.map(p => <option key={p.id} value={p.id}>{p.po_number} – {p.vendor?.name} (₹{Number(p.total_amount).toLocaleString('en-IN')})</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Bill Number *</label>
                  <input type="text" name="bill_number" value={formData.bill_number} onChange={handleChange} placeholder="e.g. WCRAFT-INV-001" required />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Bill Date *</label>
                  <input type="date" name="bill_date" value={formData.bill_date} onChange={handleChange} required style={{padding:'10px 14px',border:'2px solid #e1e5e9',borderRadius:'8px',fontSize:'14px',outline:'none'}} />
                </div>
                <div className="form-group">
                  <label>Due Date</label>
                  <input type="date" name="due_date" value={formData.due_date} onChange={handleChange} style={{padding:'10px 14px',border:'2px solid #e1e5e9',borderRadius:'8px',fontSize:'14px',outline:'none'}} />
                </div>
              </div>
              <div style={{background:'#fff3e6',borderRadius:'8px',padding:'12px 16px',fontSize:'13px',color:'#aa4400'}}>
                💡 Total amount is automatically linked from the selected Purchase Order.
              </div>
              {error && <div className="error-message">⚠️ {error}</div>}
              <div className="form-actions">
                <button type="submit" className="btn-primary" disabled={loading}>{loading ? 'Creating...' : 'Create Bill'}</button>
                <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
              </div>
            </form>
          </div>
        )}

        <div className="card">
          <div className="table-toolbar">
            <span className="contact-count">{bills.length} vendor bill{bills.length!==1?'s':''}</span>
          </div>
          {bills.length === 0 ? <div className="empty-state">No vendor bills yet.</div> : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Bill Number</th>
                  <th>PO Reference</th>
                  <th>Bill Date</th>
                  <th>Due Date</th>
                  <th>Total Amount</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {bills.map(bill => (
                  <tr key={bill.id}>
                    <td><strong>{bill.bill_number}</strong></td>
                    <td>{bill.purchase_order?.po_number || '—'}</td>
                    <td>{bill.bill_date ? new Date(bill.bill_date).toLocaleDateString('en-IN') : '—'}</td>
                    <td>{bill.due_date ? new Date(bill.due_date).toLocaleDateString('en-IN') : <span style={{color:'#bbb'}}>—</span>}</td>
                    <td style={{fontWeight:700, color:'#0f3460'}}>₹{Number(bill.total_amount).toLocaleString('en-IN')}</td>
                    <td><span className={`status-badge ${statusClass(bill.status)}`}>{bill.status}</span></td>
                    <td>
                      <div className="action-buttons">
                        {bill.status === 'Draft' && (
                          <>
                            <button className="btn-edit" onClick={() => changeStatus(bill,'Posted')}>Post Bill</button>
                            <button className="btn-delete" onClick={() => deleteBill(bill)}>Delete</button>
                          </>
                        )}
                        {bill.status === 'Posted' && (
                          <button
                            className="btn-success"
                            onClick={() => navigate(`/payments?bill_id=${bill.id}`)}
                            title="Record Payment for this Bill"
                          >
                            💳 Register Payment
                          </button>
                        )}
                        {bill.status === 'Paid' && (
                          <span style={{color:'#006633',fontSize:'12px',fontWeight:600}}>
                            ✅ Paid
                          </span>
                        )}
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

export default VendorBillsPage
