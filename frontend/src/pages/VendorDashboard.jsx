import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import api from '../api'
import { navLinks } from '../navLinks'

function VendorDashboard() {
  const [summary, setSummary]   = useState(null)
  const [bills, setBills]       = useState([])
  const [payments, setPayments] = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')

  // Profile Modal State
  const [showProfile, setShowProfile] = useState(false)
  const [profileName, setProfileName] = useState(localStorage.getItem('user_name') || '')
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [profileMsg, setProfileMsg]   = useState('')
  const [savingProfile, setSavingProfile] = useState(false)

  const navigate = useNavigate()
  const location = useLocation()
  const loginId  = localStorage.getItem('login_id') || 'Vendor'
  const userName = localStorage.getItem('user_name') || 'Supplier Partner'
  const userRole = localStorage.getItem('role') || 'Vendor'

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
      // 1. Fetch Vendor KPI summary
      const sumRes = await api.get('/dashboard/vendor-summary')
      setSummary(sumRes.data)

      // 2. Fetch Vendor Bills (auto-scoped to logged in vendor email)
      const billsRes = await api.get('/vendor-bills/')
      setBills(billsRes.data)

      // 3. Fetch Payments (auto-scoped to vendor bills)
      const payRes = await api.get('/payments/')
      setPayments(payRes.data)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load vendor portal data.')
    } finally {
      setLoading(false)
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
          <h2>🚚 Supplier & Vendor Account Hub</h2>
          <p className="page-subtitle">
            Track purchase orders, review submitted bills, and verify incoming payment settlements
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

      {error && <div className="error-message" style={{ marginBottom: '16px' }}>⚠️ {error}</div>}

      {/* 1. Vendor KPI Cards */}
      <div className="report-kpi-grid" style={{ marginBottom: '24px' }}>
        <div className="report-kpi-card" style={{ borderLeftColor: '#cc5500' }}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <span className="report-kpi-title">Total Billed</span>
            <span style={{fontSize:'16px'}}>🧾</span>
          </div>
          <div className="report-kpi-value" style={{ color: '#cc5500' }}>
            ₹{Number(summary?.total_billed || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="report-kpi-subtext">Cumulative supplies invoiced</div>
        </div>

        <div className="report-kpi-card" style={{ borderLeftColor: '#008844' }}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <span className="report-kpi-title">Settlements Received</span>
            <span style={{fontSize:'16px'}}>💳</span>
          </div>
          <div className="report-kpi-value" style={{ color: '#008844' }}>
            ₹{Number(summary?.total_received || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="report-kpi-subtext">Disbursed to your account</div>
        </div>

        <div className="report-kpi-card" style={{ borderLeftColor: Number(summary?.pending_balance || 0) > 0 ? '#0f3460' : '#888' }}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <span className="report-kpi-title">Pending Settlement</span>
            <span style={{fontSize:'16px'}}>⏳</span>
          </div>
          <div className="report-kpi-value" style={{ color: Number(summary?.pending_balance || 0) > 0 ? '#0f3460' : '#1a1a2e' }}>
            ₹{Number(summary?.pending_balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="report-kpi-subtext">
            {summary?.open_bills_count || 0} Open Bills
          </div>
        </div>
      </div>

        {/* 2. My Vendor Bills Section */}
        <div className="card" style={{ marginBottom: '24px' }}>
          <div className="table-toolbar">
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#1a1a2e' }}>
              🧾 My Vendor Bills ({bills.length})
            </h3>
            <span style={{ fontSize: '13px', color: '#666' }}>
              Bills linked to your supplier record
            </span>
          </div>

          {bills.length === 0 ? (
            <div className="empty-state" style={{ padding: '32px' }}>
              No bills recorded for your vendor account yet.
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Bill Number</th>
                  <th>PO Reference</th>
                  <th>Bill Date</th>
                  <th>Due Date</th>
                  <th>Total Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {bills.map(b => (
                  <tr key={b.id}>
                    <td><strong>{b.bill_number}</strong></td>
                    <td>{b.purchase_order?.po_number || '—'}</td>
                    <td>{b.bill_date ? new Date(b.bill_date).toLocaleDateString('en-IN') : '—'}</td>
                    <td>{b.due_date ? new Date(b.due_date).toLocaleDateString('en-IN') : '—'}</td>
                    <td style={{ fontWeight: 700, color: '#1a1a2e' }}>
                      ₹{Number(b.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td>
                      <span className={`status-badge ${statusBadgeClass(b.status)}`}>
                        {b.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* 3. Settlement / Payment History Section */}
        <div className="card">
          <div className="table-toolbar">
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#1a1a2e' }}>
              💳 Settlements Received ({payments.length})
            </h3>
            <span style={{ fontSize: '13px', color: '#666' }}>
              Bank transfers and disbursements made by Urban Furniture
            </span>
          </div>

          {payments.length === 0 ? (
            <div className="empty-state" style={{ padding: '32px' }}>
              No settlement disbursements recorded yet.
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Settlement Ref</th>
                  <th>Payment Date</th>
                  <th>Bill Settled</th>
                  <th>Method</th>
                  <th>Amount Received</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {payments.map(p => (
                  <tr key={p.id}>
                    <td><strong>{p.payment_number || `PAY-${p.id}`}</strong></td>
                    <td>{p.payment_date ? new Date(p.payment_date).toLocaleDateString('en-IN') : '—'}</td>
                    <td>{p.vendor_bill?.bill_number || 'Direct Payment'}</td>
                    <td><span className="badge" style={{ background: '#f0f4f8', color: '#333' }}>{p.payment_method}</span></td>
                    <td style={{ fontWeight: 700, color: '#008844' }}>
                      ₹{Number(p.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td><span className="status-badge status-paid">{p.status || 'Settled'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

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
              Manage supplier contact details & credentials
            </p>

            <form onSubmit={handleProfileUpdate}>
              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label>Contact Name</label>
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

export default VendorDashboard
