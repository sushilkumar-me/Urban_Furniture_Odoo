import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import api from '../api'
import { navLinks } from '../navLinks'

function CustomerDashboard() {
  const [summary, setSummary]         = useState(null)
  const [invoices, setInvoices]       = useState([])
  const [payments, setPayments]       = useState([])
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState('')
  const [success, setSuccess]         = useState('')

  // Pay Now Modal State
  const [selectedInvoice, setSelectedInvoice] = useState(null)
  const [paymentAmount, setPaymentAmount]     = useState('')
  const [paymentMethod, setPaymentMethod]     = useState('Bank Transfer')
  const [paymentNote, setPaymentNote]         = useState('')
  const [paying, setPaying]                   = useState(false)

  // Profile Modal State
  const [showProfile, setShowProfile] = useState(false)
  const [profileName, setProfileName] = useState(localStorage.getItem('user_name') || '')
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [profileMsg, setProfileMsg]   = useState('')
  const [savingProfile, setSavingProfile] = useState(false)

  const navigate = useNavigate()
  const location = useLocation()
  const loginId  = localStorage.getItem('login_id') || 'Customer'
  const userName = localStorage.getItem('user_name') || 'Valued Customer'
  const userRole = localStorage.getItem('role') || 'Customer'

  const handleLogout = () => {
    localStorage.clear()
    navigate('/login')
  }

  useEffect(() => {
    loadPortalData()
  }, [])

  const loadPortalData = async () => {
    setLoading(true)
    setError('')
    try {
      // 1. Fetch KPI summary
      const sumRes = await api.get('/dashboard/customer-summary')
      setSummary(sumRes.data)

      // 2. Fetch Customer Invoices (auto-scoped to logged in customer email)
      const invRes = await api.get('/customer-invoices/')
      setInvoices(invRes.data)

      // 3. Fetch Payments (auto-scoped to logged in customer email)
      const payRes = await api.get('/payments/')
      setPayments(payRes.data)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load customer portal data.')
    } finally {
      setLoading(false)
    }
  }

  const openPayModal = (inv) => {
    setSelectedInvoice(inv)
    setPaymentAmount(String(inv.total_amount))
    setPaymentMethod('Bank Transfer')
    setPaymentNote(`Payment for ${inv.invoice_number}`)
  }

  const handlePaySubmit = async (e) => {
    e.preventDefault()
    if (!selectedInvoice) return
    setPaying(true)
    setError('')
    setSuccess('')

    const payload = {
      customer_invoice_id: selectedInvoice.id,
      vendor_bill_id: null,
      payment_type: 'Receive',
      payment_method: paymentMethod,
      payment_date: new Date().toISOString().split('T')[0],
      amount: Number(paymentAmount),
      note: paymentNote || `Customer portal settlement for ${selectedInvoice.invoice_number}`
    }

    try {
      await api.post('/payments/', payload)
      setSuccess(`Payment of ₹${Number(paymentAmount).toLocaleString('en-IN')} successfully processed for invoice ${selectedInvoice.invoice_number}!`)
      setSelectedInvoice(null)
      await loadPortalData()
    } catch (err) {
      setError(err.response?.data?.detail || 'Payment failed. Please try again.')
    } finally {
      setPaying(false)
    }
  }

  const handleProfileUpdate = async (e) => {
    e.preventDefault()
    setSavingProfile(true)
    setProfileMsg('')
    try {
      const payload = {
        name: profileName,
        old_password: oldPassword || null,
        new_password: newPassword || null
      }
      const res = await api.put('/auth/profile', payload)
      localStorage.setItem('user_name', res.data.name)
      setProfileMsg('✅ Profile updated successfully!')
      setOldPassword('')
      setNewPassword('')
      setTimeout(() => {
        setShowProfile(false)
        setProfileMsg('')
      }, 1500)
    } catch (err) {
      setProfileMsg(`⚠️ ${err.response?.data?.detail || 'Failed to update profile'}`)
    } finally {
      setSavingProfile(false)
    }
  }

  const statusBadgeClass = (status) => {
    if (status === 'Paid') return 'status-paid'
    if (status === 'Posted') return 'status-posted'
    return 'status-draft'
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header" style={{ marginBottom: '20px' }}>
        <div>
          <h2>🛒 Customer Account & Invoices Portal</h2>
          <p className="page-subtitle">
            Securely review your purchase invoices, track payment status, and make online settlements
          </p>
        </div>
        <button
          className="btn-secondary"
          onClick={loadPortalData}
          disabled={loading}
          style={{ fontSize: '13px' }}
        >
          {loading ? 'Refreshing...' : '🔄 Refresh Data'}
        </button>
      </div>

      {success && <div className="success-message" style={{ marginBottom: '16px' }}>✅ {success}</div>}
      {error && <div className="error-message" style={{ marginBottom: '16px' }}>⚠️ {error}</div>}

      {/* 1. Customer KPI Cards */}
      <div className="report-kpi-grid" style={{ marginBottom: '24px' }}>
        <div className="report-kpi-card" style={{ borderLeftColor: '#0f3460' }}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <span className="report-kpi-title">Total Invoiced</span>
            <span style={{fontSize:'16px'}}>📑</span>
          </div>
          <div className="report-kpi-value" style={{ color: '#0f3460' }}>
            ₹{Number(summary?.total_invoiced || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="report-kpi-subtext">Cumulative across all orders</div>
        </div>

        <div className="report-kpi-card" style={{ borderLeftColor: '#008844' }}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <span className="report-kpi-title">Total Payments Made</span>
            <span style={{fontSize:'16px'}}>💳</span>
          </div>
          <div className="report-kpi-value" style={{ color: '#008844' }}>
            ₹{Number(summary?.total_paid || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="report-kpi-subtext">Settled & verified</div>
        </div>

        <div className="report-kpi-card" style={{ borderLeftColor: Number(summary?.outstanding_due || 0) > 0 ? '#cc0000' : '#888' }}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <span className="report-kpi-title">Outstanding Balance</span>
            <span style={{fontSize:'16px'}}>⏳</span>
          </div>
          <div className="report-kpi-value" style={{ color: Number(summary?.outstanding_due || 0) > 0 ? '#cc0000' : '#1a1a2e' }}>
            ₹{Number(summary?.outstanding_due || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="report-kpi-subtext">
            {summary?.open_invoices_count || 0} Open Invoices
          </div>
        </div>
      </div>

        {/* 2. My Invoices Section */}
        <div className="card" style={{ marginBottom: '24px' }}>
          <div className="table-toolbar">
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#1a1a2e' }}>
              📑 My Invoices ({invoices.length})
            </h3>
            <span style={{ fontSize: '13px', color: '#666' }}>
              Invoices issued to your account
            </span>
          </div>

          {invoices.length === 0 ? (
            <div className="empty-state" style={{ padding: '32px' }}>
              No invoices found for your account yet.
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Invoice Number</th>
                  <th>Order Reference</th>
                  <th>Invoice Date</th>
                  <th>Due Date</th>
                  <th>Total Amount</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map(inv => (
                  <tr key={inv.id}>
                    <td><strong>{inv.invoice_number}</strong></td>
                    <td>{inv.sales_order?.so_number || '—'}</td>
                    <td>{inv.invoice_date ? new Date(inv.invoice_date).toLocaleDateString('en-IN') : '—'}</td>
                    <td>{inv.due_date ? new Date(inv.due_date).toLocaleDateString('en-IN') : '—'}</td>
                    <td style={{ fontWeight: 700, color: '#1a1a2e' }}>
                      ₹{Number(inv.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td>
                      <span className={`status-badge ${statusBadgeClass(inv.status)}`}>
                        {inv.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {inv.status === 'Posted' ? (
                        <button
                          className="btn-success"
                          style={{ padding: '6px 14px', fontSize: '12px', fontWeight: 700 }}
                          onClick={() => openPayModal(inv)}
                        >
                          💳 Pay Now
                        </button>
                      ) : inv.status === 'Paid' ? (
                        <span style={{ color: '#008844', fontWeight: 700, fontSize: '13px' }}>
                          ✓ Settled
                        </span>
                      ) : (
                        <span style={{ color: '#888', fontSize: '12px' }}>Processing</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* 3. Payment History Section */}
        <div className="card">
          <div className="table-toolbar">
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#1a1a2e' }}>
              💳 Payment Receipts & History ({payments.length})
            </h3>
            <span style={{ fontSize: '13px', color: '#666' }}>
              Verified settlements recorded against your account
            </span>
          </div>

          {payments.length === 0 ? (
            <div className="empty-state" style={{ padding: '32px' }}>
              No payments recorded yet.
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Payment Ref</th>
                  <th>Payment Date</th>
                  <th>Invoice Settled</th>
                  <th>Method</th>
                  <th>Amount Paid</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {payments.map(p => (
                  <tr key={p.id}>
                    <td><strong>{p.payment_number || `PAY-${p.id}`}</strong></td>
                    <td>{p.payment_date ? new Date(p.payment_date).toLocaleDateString('en-IN') : '—'}</td>
                    <td>{p.customer_invoice?.invoice_number || 'Direct Receipt'}</td>
                    <td><span className="badge" style={{ background: '#f0f4f8', color: '#333' }}>{p.payment_method}</span></td>
                    <td style={{ fontWeight: 700, color: '#008844' }}>
                      ₹{Number(p.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td><span className="status-badge status-paid">{p.status || 'Confirmed'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

      {/* Pay Now Modal */}
      {selectedInvoice && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', zIndex: 1000, padding: '20px'
        }}>
          <div className="form-card" style={{ maxWidth: '460px', width: '100%', margin: 0 }}>
            <h3>💳 Settle Invoice: {selectedInvoice.invoice_number}</h3>
            <p style={{ fontSize: '13px', color: '#666', marginBottom: '16px' }}>
              Total Invoice Due: <strong>₹{Number(selectedInvoice.total_amount).toLocaleString('en-IN')}</strong>
            </p>

            <form onSubmit={handlePaySubmit}>
              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label>Payment Amount (₹) *</label>
                <input
                  type="number"
                  step="0.01"
                  value={paymentAmount}
                  onChange={e => setPaymentAmount(e.target.value)}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label>Payment Method *</label>
                <select
                  value={paymentMethod}
                  onChange={e => setPaymentMethod(e.target.value)}
                  className="form-select"
                  required
                >
                  <option value="Bank Transfer">Bank Transfer / NEFT / RTGS</option>
                  <option value="Credit Card">Credit / Debit Card</option>
                  <option value="UPI">UPI / NetBanking</option>
                  <option value="Cheque">Cheque</option>
                  <option value="Cash">Cash</option>
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label>Reference Note</label>
                <input
                  type="text"
                  value={paymentNote}
                  onChange={e => setPaymentNote(e.target.value)}
                  placeholder="Transaction ID / Remarks"
                />
              </div>

              <div className="form-actions">
                <button type="submit" className="btn-primary" disabled={paying}>
                  {paying ? 'Processing...' : `Confirm & Pay ₹${Number(paymentAmount || 0).toLocaleString('en-IN')}`}
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setSelectedInvoice(null)}
                  disabled={paying}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Profile Modal */}
      {showProfile && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', zIndex: 1000, padding: '20px'
        }}>
          <div className="form-card" style={{ maxWidth: '420px', width: '100%', margin: 0 }}>
            <h3>👤 Update Profile</h3>
            <p style={{ fontSize: '13px', color: '#666', marginBottom: '16px' }}>
              Manage your personal credentials
            </p>

            <form onSubmit={handleProfileUpdate}>
              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label>Full Name</label>
                <input
                  type="text"
                  value={profileName}
                  onChange={e => setProfileName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label>Current Password (optional)</label>
                <input
                  type="password"
                  value={oldPassword}
                  onChange={e => setOldPassword(e.target.value)}
                  placeholder="Enter to change password"
                />
              </div>

              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label>New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Leave blank to keep same"
                />
              </div>

              {profileMsg && <div style={{ fontSize: '13px', marginBottom: '12px' }}>{profileMsg}</div>}

              <div className="form-actions">
                <button type="submit" className="btn-primary" disabled={savingProfile}>
                  {savingProfile ? 'Saving...' : 'Save Profile'}
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => { setShowProfile(false); setProfileMsg('') }}
                  disabled={savingProfile}
                >
                  Close
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default CustomerDashboard
