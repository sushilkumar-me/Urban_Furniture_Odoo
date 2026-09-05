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

function CustomerInvoicesPage() {
  const [invoices, setInvoices] = useState([])
  const [sos, setSOs]           = useState([])
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({ sales_order_id:'', invoice_number:'', invoice_date:'', due_date:'' })
  const [error, setError]       = useState('')
  const [success, setSuccess]   = useState('')
  const [loading, setLoading]   = useState(false)

  const navigate = useNavigate()
  const location = useLocation()
  const loginId  = localStorage.getItem('login_id') || 'User'

  const handleLogout = () => { localStorage.removeItem('token'); localStorage.removeItem('login_id'); navigate('/login') }

  useEffect(() => {
    initPage()
  }, [location.search])

  const initPage = async () => {
    await fetchInvoices()
    const soList = await fetchSOs()

    // Check if so_id passed in URL query parameter
    const params = new URLSearchParams(location.search)
    const targetSoId = params.get('so_id')
    if (targetSoId && soList) {
      const selected = soList.find(s => String(s.id) === String(targetSoId))
      const today = new Date().toISOString().split('T')[0]
      setFormData({
        sales_order_id: targetSoId,
        invoice_number: selected ? `INV-${selected.so_number}` : `INV-${Date.now().toString().slice(-4)}`,
        invoice_date: today,
        due_date: ''
      })
      setShowForm(true)
    }
  }

  const fetchInvoices = async () => {
    try {
      const r = await api.get('/customer-invoices/')
      setInvoices(r.data)
    } catch {
      setError('Failed to load customer invoices.')
    }
  }

  const fetchSOs = async () => {
    try {
      const r = await api.get('/sales-orders/')
      const confirmedSOs = r.data.filter(s => s.status === 'Confirmed')
      setSOs(confirmedSOs)
      return confirmedSOs
    } catch {
      return []
    }
  }

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault(); setError(''); setLoading(true)
    const payload = {
      sales_order_id: Number(formData.sales_order_id),
      invoice_number: formData.invoice_number,
      invoice_date:   formData.invoice_date,
      due_date:       formData.due_date || null
    }
    try {
      await api.post('/customer-invoices/', payload)
      setSuccess('Customer invoice generated successfully.'); await fetchInvoices(); setShowForm(false)
      setFormData({ sales_order_id:'', invoice_number:'', invoice_date:'', due_date:'' })
    } catch (err) {
      setError(err.response?.data?.detail || 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  const changeStatus = async (inv, newStatus) => {
    try {
      await api.patch(`/customer-invoices/${inv.id}`, { status: newStatus })
      setSuccess(`Invoice ${inv.invoice_number} → ${newStatus}`); await fetchInvoices()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to update invoice status.')
    }
  }

  const deleteInvoice = async (inv) => {
    if (!window.confirm(`Delete invoice ${inv.invoice_number}?`)) return
    try {
      await api.delete(`/customer-invoices/${inv.id}`)
      setSuccess('Invoice deleted.'); await fetchInvoices()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to delete invoice.')
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
          <div><h2>Customer Invoices</h2><p className="page-subtitle">Billing and tax invoices issued to customers against confirmed sales orders</p></div>
          <button className="btn-primary" onClick={() => { setShowForm(true); setError('') }}>+ New Customer Invoice</button>
        </div>

        {success && <div className="success-message" style={{marginBottom:'16px'}}>✅ {success}</div>}
        {!showForm && error && <div className="error-message" style={{marginBottom:'16px'}}>⚠️ {error}</div>}

        {showForm && (
          <div className="form-card">
            <h3>Create Customer Invoice</h3>
            <form onSubmit={handleSubmit} className="contact-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Sales Order * (Confirmed only)</label>
                  <select name="sales_order_id" value={formData.sales_order_id} onChange={handleChange} className="form-select" required>
                    <option value="">-- Select Confirmed SO --</option>
                    {sos.map(s => <option key={s.id} value={s.id}>{s.so_number} – {s.customer?.name} (₹{Number(s.total_amount).toLocaleString('en-IN')})</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Invoice Number *</label>
                  <input type="text" name="invoice_number" value={formData.invoice_number} onChange={handleChange} placeholder="e.g. INV-2026-001" required />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Invoice Date *</label>
                  <input type="date" name="invoice_date" value={formData.invoice_date} onChange={handleChange} required style={{padding:'10px 14px',border:'2px solid #e1e5e9',borderRadius:'8px',fontSize:'14px',outline:'none'}} />
                </div>
                <div className="form-group">
                  <label>Due Date</label>
                  <input type="date" name="due_date" value={formData.due_date} onChange={handleChange} style={{padding:'10px 14px',border:'2px solid #e1e5e9',borderRadius:'8px',fontSize:'14px',outline:'none'}} />
                </div>
              </div>
              <div style={{background:'#e6fff0',borderRadius:'8px',padding:'12px 16px',fontSize:'13px',color:'#006633'}}>
                💡 Total amount is automatically transferred from the selected Sales Order.
              </div>
              {error && <div className="error-message">⚠️ {error}</div>}
              <div className="form-actions">
                <button type="submit" className="btn-primary" disabled={loading}>{loading ? 'Creating...' : 'Create Invoice'}</button>
                <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
              </div>
            </form>
          </div>
        )}

        <div className="card">
          <div className="table-toolbar">
            <span className="contact-count">{invoices.length} customer invoice{invoices.length!==1?'s':''}</span>
          </div>
          {invoices.length === 0 ? <div className="empty-state">No customer invoices issued yet.</div> : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Invoice Number</th>
                  <th>SO Reference</th>
                  <th>Customer</th>
                  <th>Date</th>
                  <th>Due Date</th>
                  <th>Total Amount</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map(inv => (
                  <tr key={inv.id}>
                    <td><strong>{inv.invoice_number}</strong></td>
                    <td>{inv.sales_order?.so_number || '—'}</td>
                    <td>{inv.sales_order?.customer?.name || '—'}</td>
                    <td>{inv.invoice_date ? new Date(inv.invoice_date).toLocaleDateString('en-IN') : '—'}</td>
                    <td>{inv.due_date ? new Date(inv.due_date).toLocaleDateString('en-IN') : <span style={{color:'#bbb'}}>—</span>}</td>
                    <td style={{fontWeight:700, color:'#006633'}}>₹{Number(inv.total_amount).toLocaleString('en-IN')}</td>
                    <td><span className={`status-badge ${statusClass(inv.status)}`}>{inv.status}</span></td>
                    <td>
                      <div className="action-buttons">
                        {inv.status === 'Draft' && (
                          <>
                            <button className="btn-edit" onClick={() => changeStatus(inv,'Posted')}>Post Invoice</button>
                            <button className="btn-delete" onClick={() => deleteInvoice(inv)}>Delete</button>
                          </>
                        )}
                        {inv.status === 'Posted' && (
                          <button
                            className="btn-success"
                            onClick={() => navigate(`/payments?invoice_id=${inv.id}`)}
                            title="Record Customer Payment Receipt"
                          >
                            💳 Register Payment
                          </button>
                        )}
                        {inv.status === 'Paid' && (
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

export default CustomerInvoicesPage
