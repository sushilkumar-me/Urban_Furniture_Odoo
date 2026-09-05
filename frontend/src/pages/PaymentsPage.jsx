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

const PAYMENT_METHODS = ['Bank Transfer', 'Cash', 'Cheque', 'UPI', 'NEFT', 'RTGS']

function PaymentsPage() {
  const [payments, setPayments]         = useState([])
  const [postedBills, setPostedBills]   = useState([])
  const [postedInvoices, setPostedInvoices] = useState([])
  const [showForm, setShowForm]         = useState(false)
  const [paymentMode, setPaymentMode]   = useState('Send') // 'Send' (Vendor) or 'Receive' (Customer)
  const [filterType, setFilterType]     = useState('All')

  const [formData, setFormData] = useState({
    vendor_bill_id: '',
    customer_invoice_id: '',
    payment_type: 'Send',
    payment_method: 'Bank Transfer',
    payment_date: '',
    amount: '',
    note: ''
  })
  const [error, setError]     = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  const navigate = useNavigate()
  const location = useLocation()
  const loginId  = localStorage.getItem('login_id') || 'User'

  const handleLogout = () => {
    localStorage.removeItem('token'); localStorage.removeItem('login_id'); navigate('/login')
  }

  useEffect(() => {
    initPage()
  }, [location.search])

  const initPage = async () => {
    await fetchPayments()
    const bills = await fetchPostedBills()
    const invoices = await fetchPostedInvoices()

    const params = new URLSearchParams(location.search)
    const targetBillId = params.get('bill_id')
    const targetInvoiceId = params.get('invoice_id')
    const today = new Date().toISOString().split('T')[0]

    if (targetInvoiceId && invoices) {
      const selected = invoices.find(inv => String(inv.id) === String(targetInvoiceId))
      setPaymentMode('Receive')
      setFormData({
        vendor_bill_id: '',
        customer_invoice_id: targetInvoiceId,
        payment_type: 'Receive',
        payment_method: 'Bank Transfer',
        payment_date: today,
        amount: selected ? String(selected.total_amount) : '',
        note: selected ? `Customer receipt for ${selected.invoice_number}` : ''
      })
      setShowForm(true)
    } else if (targetBillId && bills) {
      const selected = bills.find(b => String(b.id) === String(targetBillId))
      setPaymentMode('Send')
      setFormData({
        vendor_bill_id: targetBillId,
        customer_invoice_id: '',
        payment_type: 'Send',
        payment_method: 'Bank Transfer',
        payment_date: today,
        amount: selected ? String(selected.total_amount) : '',
        note: selected ? `Settlement for ${selected.bill_number}` : ''
      })
      setShowForm(true)
    }
  }

  const fetchPayments = async () => {
    try {
      const r = await api.get('/payments/')
      setPayments(r.data)
    } catch {
      setError('Failed to load payments.')
    }
  }

  const fetchPostedBills = async () => {
    try {
      const r = await api.get('/vendor-bills/')
      const posted = r.data.filter(b => b.status === 'Posted')
      setPostedBills(posted)
      return posted
    } catch {
      return []
    }
  }

  const fetchPostedInvoices = async () => {
    try {
      const r = await api.get('/customer-invoices/')
      const posted = r.data.filter(inv => inv.status === 'Posted')
      setPostedInvoices(posted)
      return posted
    } catch {
      return []
    }
  }

  const handleModeToggle = (mode) => {
    setPaymentMode(mode)
    const today = new Date().toISOString().split('T')[0]
    setFormData({
      vendor_bill_id: '',
      customer_invoice_id: '',
      payment_type: mode,
      payment_method: 'Bank Transfer',
      payment_date: today,
      amount: '',
      note: ''
    })
  }

  const handleChange = (e) => {
    const updated = { ...formData, [e.target.name]: e.target.value }

    // When vendor bill is selected, auto-fill amount
    if (e.target.name === 'vendor_bill_id' && e.target.value) {
      const bill = postedBills.find(b => String(b.id) === e.target.value)
      if (bill) updated.amount = String(bill.total_amount)
    }

    // When customer invoice is selected, auto-fill amount
    if (e.target.name === 'customer_invoice_id' && e.target.value) {
      const inv = postedInvoices.find(i => String(i.id) === e.target.value)
      if (inv) updated.amount = String(inv.total_amount)
    }

    setFormData(updated)
  }

  const handleSubmit = async (e) => {
    e.preventDefault(); setError(''); setLoading(true)
    const payload = {
      vendor_bill_id:      paymentMode === 'Send' ? Number(formData.vendor_bill_id) : null,
      customer_invoice_id: paymentMode === 'Receive' ? Number(formData.customer_invoice_id) : null,
      payment_type:        paymentMode,
      payment_method:      formData.payment_method,
      payment_date:        formData.payment_date,
      amount:              Number(formData.amount),
      note:                formData.note || null
    }
    try {
      await api.post('/payments/', payload)
      setSuccess(`Payment recorded successfully. ${paymentMode === 'Send' ? 'Vendor bill' : 'Customer invoice'} marked as Paid.`)
      await fetchPayments(); await fetchPostedBills(); await fetchPostedInvoices()
      setShowForm(false)
      setFormData({
        vendor_bill_id:'', customer_invoice_id:'', payment_type: paymentMode,
        payment_method:'Bank Transfer', payment_date:'', amount:'', note:''
      })
    } catch (err) {
      setError(err.response?.data?.detail || 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  const deletePayment = async (p) => {
    const label = p.payment_type === 'Receive' ? 'customer receipt' : 'vendor payment'
    if (!window.confirm(`Delete ${label} of ₹${p.amount}? Linked record will revert to Posted.`)) return
    try {
      await api.delete(`/payments/${p.id}`)
      setSuccess('Payment deleted. Linked invoice/bill reverted to Posted.')
      await fetchPayments(); await fetchPostedBills(); await fetchPostedInvoices()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to delete payment.')
    }
  }

  const openNewForm = () => {
    const today = new Date().toISOString().split('T')[0]
    setFormData({
      vendor_bill_id: '',
      customer_invoice_id: '',
      payment_type: paymentMode,
      payment_method: 'Bank Transfer',
      payment_date: today,
      amount: '',
      note: ''
    })
    setError('')
    setShowForm(true)
  }

  const displayedPayments = payments.filter(p => {
    if (filterType === 'Send') return p.payment_type === 'Send'
    if (filterType === 'Receive') return p.payment_type === 'Receive'
    return true
  })

  const totalReceived = payments
    .filter(p => p.payment_type === 'Receive')
    .reduce((s, p) => s + Number(p.amount), 0)

  const totalDisbursed = payments
    .filter(p => p.payment_type === 'Send')
    .reduce((s, p) => s + Number(p.amount), 0)

  return (
    <div className="dashboard-container">
      <nav className="navbar">
        <div className="navbar-brand">🪑 Urban Furniture Accounting</div>
        <div className="navbar-links">
          {navLinks.map(l => (
            <button
              key={l.path}
              className={`nav-link ${location.pathname === l.path ? 'nav-link-active' : ''}`}
              onClick={() => navigate(l.path)}
            >
              {l.label}
            </button>
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
            <h2>Payments & Treasury</h2>
            <p className="page-subtitle">Track incoming customer receipts and outgoing vendor disbursements</p>
          </div>
          <button className="btn-primary" onClick={openNewForm}>
            + Record Transaction
          </button>
        </div>

        {/* Financial Summary Cards */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(240px, 1fr))',gap:'16px',marginBottom:'20px'}}>
          <div style={{background:'white',padding:'16px 20px',borderRadius:'10px',boxShadow:'0 2px 10px rgba(0,0,0,0.06)',borderLeft:'4px solid #00aa44'}}>
            <div style={{fontSize:'12px',color:'#888',textTransform:'uppercase',fontWeight:600}}>Total Inflow (Receipts)</div>
            <div style={{fontSize:'22px',fontWeight:700,color:'#006633',marginTop:'4px'}}>
              ₹{totalReceived.toLocaleString('en-IN')}
            </div>
            <div style={{fontSize:'12px',color:'#666',marginTop:'2px'}}>From customer invoices</div>
          </div>
          <div style={{background:'white',padding:'16px 20px',borderRadius:'10px',boxShadow:'0 2px 10px rgba(0,0,0,0.06)',borderLeft:'4px solid #cc0000'}}>
            <div style={{fontSize:'12px',color:'#888',textTransform:'uppercase',fontWeight:600}}>Total Outflow (Disbursed)</div>
            <div style={{fontSize:'22px',fontWeight:700,color:'#cc0000',marginTop:'4px'}}>
              ₹{totalDisbursed.toLocaleString('en-IN')}
            </div>
            <div style={{fontSize:'12px',color:'#666',marginTop:'2px'}}>To vendor bills</div>
          </div>
        </div>

        {success && <div className="success-message" style={{marginBottom:'16px'}}>✅ {success}</div>}
        {!showForm && error && <div className="error-message" style={{marginBottom:'16px'}}>⚠️ {error}</div>}

        {showForm && (
          <div className="form-card">
            <h3>Record Payment / Receipt</h3>

            {/* Mode Selector Tabs */}
            <div style={{display:'flex',gap:'10px',marginBottom:'20px'}}>
              <button
                type="button"
                className={`filter-tab ${paymentMode === 'Send' ? 'active' : ''}`}
                onClick={() => handleModeToggle('Send')}
                style={{padding:'8px 18px'}}
              >
                📤 Outgoing to Vendor (Send)
              </button>
              <button
                type="button"
                className={`filter-tab ${paymentMode === 'Receive' ? 'active' : ''}`}
                onClick={() => handleModeToggle('Receive')}
                style={{padding:'8px 18px'}}
              >
                📥 Inbound from Customer (Receive)
              </button>
            </div>

            <form onSubmit={handleSubmit} className="contact-form">

              <div className="form-row">
                {paymentMode === 'Send' ? (
                  <div className="form-group">
                    <label>Vendor Bill * (Posted only)</label>
                    <select
                      name="vendor_bill_id"
                      value={formData.vendor_bill_id}
                      onChange={handleChange}
                      className="form-select"
                      required
                    >
                      <option value="">-- Select Posted Bill --</option>
                      {postedBills.map(b => (
                        <option key={b.id} value={b.id}>
                          {b.bill_number} — ₹{Number(b.total_amount).toLocaleString('en-IN')} ({b.purchase_order?.vendor?.name || 'Vendor'})
                        </option>
                      ))}
                    </select>
                    {postedBills.length === 0 && (
                      <span style={{fontSize:'12px',color:'#cc0000'}}>No posted bills available.</span>
                    )}
                  </div>
                ) : (
                  <div className="form-group">
                    <label>Customer Invoice * (Posted only)</label>
                    <select
                      name="customer_invoice_id"
                      value={formData.customer_invoice_id}
                      onChange={handleChange}
                      className="form-select"
                      required
                    >
                      <option value="">-- Select Posted Invoice --</option>
                      {postedInvoices.map(inv => (
                        <option key={inv.id} value={inv.id}>
                          {inv.invoice_number} — ₹{Number(inv.total_amount).toLocaleString('en-IN')} ({inv.sales_order?.customer?.name || 'Customer'})
                        </option>
                      ))}
                    </select>
                    {postedInvoices.length === 0 && (
                      <span style={{fontSize:'12px',color:'#cc0000'}}>No posted invoices available.</span>
                    )}
                  </div>
                )}

                <div className="form-group">
                  <label>Payment Method</label>
                  <select
                    name="payment_method"
                    value={formData.payment_method}
                    onChange={handleChange}
                    className="form-select"
                  >
                    {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Payment Date *</label>
                  <input
                    type="date"
                    name="payment_date"
                    value={formData.payment_date}
                    onChange={handleChange}
                    required
                    style={{padding:'10px 14px',border:'2px solid #e1e5e9',borderRadius:'8px',fontSize:'14px',outline:'none'}}
                  />
                </div>

                <div className="form-group">
                  <label>Amount (₹) *</label>
                  <input
                    type="number"
                    name="amount"
                    value={formData.amount}
                    onChange={handleChange}
                    placeholder="Auto-filled from bill/invoice"
                    min="0.01"
                    step="0.01"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Note / Reference</label>
                <input
                  type="text"
                  name="note"
                  value={formData.note}
                  onChange={handleChange}
                  placeholder="e.g. Transaction Ref / UTR / Cheque Number"
                />
              </div>

              {error && <div className="error-message">⚠️ {error}</div>}

              <div className="form-actions">
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? 'Recording...' : `Record ${paymentMode === 'Receive' ? 'Receipt' : 'Payment'}`}
                </button>
                <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
              </div>
            </form>
          </div>
        )}

        <div className="card">
          <div className="table-toolbar" style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div className="filter-tabs">
              <button className={`filter-tab ${filterType === 'All' ? 'active' : ''}`} onClick={() => setFilterType('All')}>
                All ({payments.length})
              </button>
              <button className={`filter-tab ${filterType === 'Receive' ? 'active' : ''}`} onClick={() => setFilterType('Receive')}>
                📥 Receipts ({payments.filter(p => p.payment_type === 'Receive').length})
              </button>
              <button className={`filter-tab ${filterType === 'Send' ? 'active' : ''}`} onClick={() => setFilterType('Send')}>
                📤 Disbursements ({payments.filter(p => p.payment_type === 'Send').length})
              </button>
            </div>
            <span className="contact-count">
              Showing {displayedPayments.length} of {payments.length}
            </span>
          </div>

          {displayedPayments.length === 0 ? (
            <div className="empty-state">No payment records match the selected filter.</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Flow Type</th>
                  <th>Linked Reference</th>
                  <th>Method</th>
                  <th>Date</th>
                  <th>Amount</th>
                  <th>Note</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {displayedPayments.map(p => (
                  <tr key={p.id}>
                    <td>#{p.id}</td>
                    <td>
                      <span className={`status-badge ${p.payment_type === 'Receive' ? 'status-paid' : 'status-cancelled'}`}>
                        {p.payment_type === 'Receive' ? '📥 Receipt' : '📤 Payment'}
                      </span>
                    </td>
                    <td>
                      {p.vendor_bill && (
                        <div>
                          <strong>{p.vendor_bill.bill_number}</strong>
                          <div style={{fontSize:'11px',color:'#888'}}>Vendor Bill</div>
                        </div>
                      )}
                      {p.customer_invoice && (
                        <div>
                          <strong>{p.customer_invoice.invoice_number}</strong>
                          <div style={{fontSize:'11px',color:'#888'}}>Customer Invoice</div>
                        </div>
                      )}
                      {!p.vendor_bill && !p.customer_invoice && '—'}
                    </td>
                    <td><span className="role-badge role-accountant">{p.payment_method || '—'}</span></td>
                    <td>{p.payment_date ? new Date(p.payment_date).toLocaleDateString('en-IN') : '—'}</td>
                    <td style={{fontWeight:700, color: p.payment_type === 'Receive' ? '#006633' : '#cc0000'}}>
                      {p.payment_type === 'Receive' ? '+ ' : '- '}₹{Number(p.amount).toLocaleString('en-IN')}
                    </td>
                    <td style={{fontSize:'13px',color:'#666'}}>{p.note || <span style={{color:'#bbb'}}>—</span>}</td>
                    <td>
                      <button className="btn-delete" onClick={() => deletePayment(p)}>Delete</button>
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

export default PaymentsPage
