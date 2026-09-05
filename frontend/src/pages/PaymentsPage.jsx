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
]

const PAYMENT_METHODS = ['Bank Transfer', 'Cash', 'Cheque', 'UPI', 'NEFT', 'RTGS']

function PaymentsPage() {
  const [payments, setPayments]   = useState([])
  const [postedBills, setPostedBills] = useState([])
  const [showForm, setShowForm]   = useState(false)
  const [formData, setFormData]   = useState({
    vendor_bill_id: '', payment_method: 'Bank Transfer', payment_date: '', amount: '', note: ''
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

    // Check if bill_id passed in URL query
    const params = new URLSearchParams(location.search)
    const targetBillId = params.get('bill_id')
    if (targetBillId && bills) {
      const selected = bills.find(b => String(b.id) === String(targetBillId))
      const today = new Date().toISOString().split('T')[0]
      setFormData({
        vendor_bill_id: targetBillId,
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

  const handleChange = (e) => {
    const updated = { ...formData, [e.target.name]: e.target.value }
    // When bill is selected, auto-fill the amount from the bill's total
    if (e.target.name === 'vendor_bill_id' && e.target.value) {
      const bill = postedBills.find(b => String(b.id) === e.target.value)
      if (bill) updated.amount = String(bill.total_amount)
    }
    setFormData(updated)
  }

  const handleSubmit = async (e) => {
    e.preventDefault(); setError(''); setLoading(true)
    const payload = {
      vendor_bill_id:  Number(formData.vendor_bill_id),
      payment_type:    'Send',
      payment_method:  formData.payment_method,
      payment_date:    formData.payment_date,
      amount:          Number(formData.amount),
      note:            formData.note || null
    }
    try {
      await api.post('/payments/', payload)
      setSuccess('Payment recorded successfully. Vendor bill marked as Paid.')
      await fetchPayments(); await fetchPostedBills()
      setShowForm(false)
      setFormData({ vendor_bill_id:'', payment_method:'Bank Transfer', payment_date:'', amount:'', note:'' })
    } catch (err) {
      setError(err.response?.data?.detail || 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  const deletePayment = async (p) => {
    if (!window.confirm(`Delete payment of ₹${p.amount}? The bill will revert to Posted.`)) return
    try {
      await api.delete(`/payments/${p.id}`)
      setSuccess('Payment deleted. Bill status reverted to Posted.')
      await fetchPayments(); await fetchPostedBills()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to delete payment.')
    }
  }

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
            <h2>Payments</h2>
            <p className="page-subtitle">Record and audit payments made to vendors for posted bills</p>
          </div>
          <button className="btn-primary" onClick={() => { setShowForm(true); setError('') }}>
            + Record Payment
          </button>
        </div>

        {success && <div className="success-message" style={{marginBottom:'16px'}}>✅ {success}</div>}
        {!showForm && error && <div className="error-message" style={{marginBottom:'16px'}}>⚠️ {error}</div>}

        {showForm && (
          <div className="form-card">
            <h3>Record Vendor Payment</h3>
            <form onSubmit={handleSubmit} className="contact-form">

              <div className="form-row">
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
                    <span style={{fontSize:'12px',color:'#cc0000'}}>
                      No posted bills available. Post a bill first.
                    </span>
                  )}
                </div>

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
                    placeholder="Auto-filled from bill"
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
                  placeholder="e.g. Paid via HDFC Bank NEFT / UTR 987123"
                />
              </div>

              {error && <div className="error-message">⚠️ {error}</div>}

              <div className="form-actions">
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? 'Recording...' : 'Record Payment'}
                </button>
                <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
              </div>
            </form>
          </div>
        )}

        <div className="card">
          <div className="table-toolbar">
            <span className="contact-count">
              {payments.length} payment{payments.length !== 1 ? 's' : ''} &nbsp;|&nbsp;
              Total Disbursed: <strong style={{color:'#cc0000'}}>₹{payments.reduce((s,p) => s + Number(p.amount), 0).toLocaleString('en-IN')}</strong>
            </span>
          </div>

          {payments.length === 0 ? (
            <div className="empty-state">No payments recorded yet.</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Bill Reference</th>
                  <th>Method</th>
                  <th>Payment Date</th>
                  <th>Amount</th>
                  <th>Note</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {payments.map(p => (
                  <tr key={p.id}>
                    <td>#{p.id}</td>
                    <td>
                      <strong>{p.vendor_bill?.bill_number || '—'}</strong>
                      {p.vendor_bill && (
                        <div style={{fontSize:'11px',color:'#006633',fontWeight:600}}>
                          ● {p.vendor_bill.status}
                        </div>
                      )}
                    </td>
                    <td><span className="role-badge role-accountant">{p.payment_method || '—'}</span></td>
                    <td>{p.payment_date ? new Date(p.payment_date).toLocaleDateString('en-IN') : '—'}</td>
                    <td style={{fontWeight:700,color:'#cc0000'}}>
                      ₹{Number(p.amount).toLocaleString('en-IN')}
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
