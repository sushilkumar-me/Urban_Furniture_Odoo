import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import api from '../api'

const todayStr = () => new Date().toISOString().split('T')[0]

const emptyForm = {
  purchase_order_id: '',
  bill_number:       '',
  bill_reference:    '',
  vendor_name:       '',
  bill_date:         todayStr(),
  due_date:          '',
  status:            'Not Paid',
  total_amount:      0,
  amount_paid:       0
}

function VendorBillsPage() {
  const [bills, setBills]             = useState([])
  const [pos, setPOs]                 = useState([])
  const [accounts, setAccounts]       = useState([])
  const [analytics, setAnalytics]     = useState([])
  const [contacts, setContacts]       = useState([])
  const [showForm, setShowForm]       = useState(false)
  const [editingId, setEditingId]     = useState(null)
  const [formData, setFormData]       = useState(emptyForm)
  const [selectedPO, setSelectedPO]   = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState('All')
  const [error, setError]             = useState('')
  const [success, setSuccess]         = useState('')
  const [loading, setLoading]         = useState(false)

  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    initData()
  }, [location.search])

  const initData = async () => {
    try {
      const [bRes, poRes, accRes, anaRes, cRes] = await Promise.all([
        api.get('/vendor-bills/'),
        api.get('/purchase-orders/'),
        api.get('/accounts/'),
        api.get('/analytic-accounts/'),
        api.get('/contacts/')
      ])
      setBills(bRes.data)
      setPOs(poRes.data)
      setAccounts(accRes.data)
      setAnalytics(anaRes.data)
      setContacts(cRes.data)

      // Handle query param ?po_id=XYZ
      const params = new URLSearchParams(location.search)
      const targetPoId = params.get('po_id')
      if (targetPoId) {
        const po = poRes.data.find(p => String(p.id) === String(targetPoId))
        if (po) {
          handlePrefillFromPO(po, bRes.data.length)
        }
      }
    } catch {
      setError('Failed to load vendor bills data.')
    }
  }

  const fetchBills = async () => {
    try {
      const r = await api.get('/vendor-bills/')
      setBills(r.data)
    } catch {
      setError('Failed to refresh bills.')
    }
  }

  const generateBillNumber = (count) => {
    const nextSeq = (count !== undefined ? count : bills.length) + 1
    return `Bill/2026/${String(nextSeq).padStart(4, '0')}`
  }

  const handlePrefillFromPO = (po, count) => {
    setSelectedPO(po)
    setFormData({
      purchase_order_id: String(po.id),
      bill_number:       generateBillNumber(count),
      bill_reference:    `PO-REF-${po.po_number}`,
      vendor_name:       po.vendor?.name || '',
      bill_date:         todayStr(),
      due_date:          '',
      status:            'Not Paid',
      total_amount:      Number(po.total_amount) || 0,
      amount_paid:       0
    })
    setEditingId(null)
    setShowForm(true)
  }

  const handleNew = () => {
    const firstPO = pos.find(p => p.status === 'Confirmed') || pos[0]
    if (firstPO) {
      handlePrefillFromPO(firstPO, bills.length)
    } else {
      setFormData({
        ...emptyForm,
        bill_number: generateBillNumber(bills.length)
      })
      setSelectedPO(null)
      setShowForm(true)
    }
  }

  const openEditForm = (bill) => {
    const matchedPO = pos.find(p => p.id === bill.purchase_order_id)
    setSelectedPO(matchedPO || null)

    // Calculate wireframe status pill: Paid / Partial / Not Paid
    let computedStatus = 'Not Paid'
    if (bill.status === 'Paid') computedStatus = 'Paid'
    else if (bill.status === 'Partial') computedStatus = 'Partial'

    setFormData({
      purchase_order_id: String(bill.purchase_order_id),
      bill_number:       bill.bill_number,
      bill_reference:    matchedPO ? `PO-REF-${matchedPO.po_number}` : 'REF-MANUAL',
      vendor_name:       matchedPO?.vendor?.name || 'Vendor',
      bill_date:         bill.bill_date || todayStr(),
      due_date:          bill.due_date || '',
      status:            computedStatus,
      total_amount:      Number(bill.total_amount) || 0,
      amount_paid:       bill.status === 'Paid' ? Number(bill.total_amount) : 0
    })
    setEditingId(bill.id)
    setError('')
    setSuccess('')
    setShowForm(true)
  }

  const closeForm = () => {
    setShowForm(false)
    setEditingId(null)
    setSelectedPO(null)
    setFormData(emptyForm)
    setError('')
  }

  const handleHeaderChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
    if (e.target.name === 'purchase_order_id' && e.target.value) {
      const po = pos.find(p => String(p.id) === e.target.value)
      if (po) {
        setSelectedPO(po)
        setFormData(prev => ({
          ...prev,
          purchase_order_id: String(po.id),
          vendor_name:       po.vendor?.name || '',
          total_amount:      Number(po.total_amount) || 0
        }))
      }
    }
    if (error) setError('')
  }

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault()
    setError('')
    setLoading(true)

    if (!formData.purchase_order_id) {
      setError('Please link a Purchase Order.')
      setLoading(false)
      return
    }
    if (!formData.bill_number.trim()) {
      setError('Bill Number is required.')
      setLoading(false)
      return
    }

    const payload = {
      purchase_order_id: Number(formData.purchase_order_id),
      bill_number:       formData.bill_number.trim(),
      bill_date:         formData.bill_date,
      due_date:          formData.due_date || null,
      total_amount:      Number(formData.total_amount)
    }

    try {
      if (editingId) {
        await api.patch(`/vendor-bills/${editingId}`, {
          bill_number: formData.bill_number.trim(),
          bill_date:   formData.bill_date,
          due_date:    formData.due_date || null
        })
        setSuccess(`Vendor Bill "${formData.bill_number}" updated.`)
      } else {
        await api.post('/vendor-bills/', payload)
        setSuccess(`Vendor Bill "${formData.bill_number}" created successfully.`)
      }
      await fetchBills()
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
        setError('Failed to save vendor bill.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleConfirmBill = async () => {
    if (!editingId) {
      await handleSubmit()
      return
    }
    try {
      setLoading(true)
      await api.patch(`/vendor-bills/${editingId}`, { status: 'Posted' })
      setSuccess(`Vendor Bill "${formData.bill_number}" Confirmed & Posted to General Ledger!`)
      setFormData(prev => ({ ...prev, status: 'Not Paid' }))
      await fetchBills()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to confirm vendor bill.')
    } finally {
      setLoading(false)
    }
  }

  const handleCancelBill = async () => {
    if (!editingId) {
      closeForm()
      return
    }
    if (!window.confirm(`Cancel bill "${formData.bill_number}"?`)) return
    try {
      setLoading(true)
      await api.patch(`/vendor-bills/${editingId}`, { status: 'Cancelled' })
      setSuccess(`Bill "${formData.bill_number}" cancelled.`)
      await fetchBills()
      closeForm()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to cancel bill.')
    } finally {
      setLoading(false)
    }
  }

  // [ Pay ] -> Opens Bill Payment screen prefilling bill details
  const handlePayBill = () => {
    if (!editingId) return
    navigate(`/payments?bill_id=${editingId}`)
  }

  const handleDelete = async (bill, e) => {
    if (e) e.stopPropagation()
    if (!window.confirm(`Delete bill "${bill.bill_number}"?`)) return
    try {
      await api.delete(`/vendor-bills/${bill.id}`)
      setSuccess(`Vendor Bill "${bill.bill_number}" deleted.`)
      await fetchBills()
    } catch (err) {
      const detail = err.response?.data?.detail
      setError(typeof detail === 'string' ? detail : 'Failed to delete bill.')
    }
  }

  // Filter bills
  const filteredBills = bills.filter(b => {
    if (filterStatus !== 'All' && b.status !== filterStatus) return false
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      const matchNum = (b.bill_number || '').toLowerCase().includes(q)
      const matchPo  = (b.purchase_order?.po_number || '').toLowerCase().includes(q)
      if (!matchNum && !matchPo) return false
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

  // Default Chart of Account for Purchase is 'Purchase Expense A/c'
  const defaultPurchaseAccount = accounts.find(a => a.account_name === 'Purchase Expense A/c') || { account_name: 'Purchase Expense A/c' }

  // Items from selected PO
  const poLineItems = selectedPO?.items || []
  const totalBillAmount = Number(formData.total_amount) || 0
  const paidViaCash = formData.status === 'Paid' ? totalBillAmount : 0
  const paidViaBank = 0
  const amountDue = Math.max(0, totalBillAmount - (paidViaCash + paidViaBank))

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
      {/* 1. VENDOR BILL FORM VIEW                                     */}
      {/* ============================================================ */}
      {showForm ? (
        <div>
          {/* Top Title: Vendor Bill */}
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <h1 style={{
              fontSize: '28px',
              fontWeight: 800,
              color: '#1a1a2e',
              letterSpacing: '-0.5px',
              margin: 0
            }}>
              Vendor Bill
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

              {/* Action Bar matching wireframe:
                  [ New ] [ Confirm ] [ Pay ]  ...  [ PO ] [ Budget ] [ Cancel ] [ Back ] */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '28px',
                flexWrap: 'wrap',
                gap: '12px'
              }}>
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
                    onClick={handleConfirmBill}
                    disabled={loading || formData.status === 'Paid'}
                    style={{
                      background: '#0f3460',
                      border: '2px solid #0f3460',
                      color: '#ffffff',
                      fontWeight: 700,
                      fontSize: '14px',
                      borderRadius: '10px',
                      padding: '7px 22px',
                      cursor: 'pointer',
                      boxShadow: '0 2px 8px rgba(15, 52, 96, 0.2)'
                    }}
                  >
                    Confirm
                  </button>

                  <button
                    type="button"
                    onClick={handlePayBill}
                    disabled={!editingId || formData.status === 'Paid'}
                    style={{
                      background: formData.status === 'Paid' ? '#e2e8f0' : '#16a34a',
                      border: '2px solid',
                      borderColor: formData.status === 'Paid' ? '#cbd5e1' : '#16a34a',
                      color: formData.status === 'Paid' ? '#64748b' : '#ffffff',
                      fontWeight: 700,
                      fontSize: '14px',
                      borderRadius: '10px',
                      padding: '7px 22px',
                      cursor: formData.status === 'Paid' ? 'not-allowed' : 'pointer',
                      boxShadow: formData.status !== 'Paid' ? '0 2px 8px rgba(22, 163, 74, 0.2)' : 'none'
                    }}
                    title={editingId ? 'Open Bill Payment' : 'Save/Confirm bill first'}
                  >
                    Pay
                  </button>
                </div>

                {/* Right Group: Smart Pill Buttons [ PO ] [ Budget ] [ Cancel ] [ Back ] */}
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  {/* Smart Pill [ PO ] - only show if created from PO */}
                  {selectedPO && (
                    <button
                      type="button"
                      onClick={() => navigate('/purchase-orders')}
                      style={{
                        background: '#f8fafc',
                        border: '1.5px solid #0f3460',
                        color: '#0f3460',
                        fontWeight: 700,
                        fontSize: '13px',
                        borderRadius: '8px',
                        padding: '5px 14px',
                        cursor: 'pointer'
                      }}
                      title="On click open the PO from which Bill Created"
                    >
                      PO ({selectedPO.po_number})
                    </button>
                  )}

                  {/* Smart Pill [ Budget ] */}
                  <button
                    type="button"
                    onClick={() => navigate('/budgets')}
                    style={{
                      background: '#f8fafc',
                      border: '1.5px solid #0284c7',
                      color: '#0284c7',
                      fontWeight: 700,
                      fontSize: '13px',
                      borderRadius: '8px',
                      padding: '5px 14px',
                      cursor: 'pointer'
                    }}
                    title="On click open the Budget Analytic Report that is used in the bill"
                  >
                    Budget
                  </button>

                  <button
                    type="button"
                    onClick={handleCancelBill}
                    style={{
                      background: '#ffffff',
                      border: '2px solid #94a3b8',
                      color: '#64748b',
                      fontWeight: 700,
                      fontSize: '14px',
                      borderRadius: '10px',
                      padding: '7px 18px',
                      cursor: 'pointer'
                    }}
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
                      fontSize: '14px',
                      borderRadius: '10px',
                      padding: '7px 20px',
                      cursor: 'pointer'
                    }}
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

              {/* Header Fields Frame matching wireframe */}
              <div style={{
                background: '#fcfdfe',
                border: '1.5px solid #e2e8f0',
                borderRadius: '18px',
                padding: '24px 28px',
                marginBottom: '28px'
              }}>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1.2fr 1fr',
                  gap: '28px',
                  alignItems: 'start'
                }}>
                  {/* Left Column: Vendor Bill No, Vendor Name, Status */}
                  <div>
                    {/* Vendor Bill No. */}
                    <div style={{ marginBottom: '20px' }}>
                      <label htmlFor="bill_number" style={{ fontSize: '15px', fontWeight: 700, color: '#dc2626', display: 'block', marginBottom: '4px' }}>
                        Vendor Bill No. * <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 500 }}>(Auto-generated sequence)</span>
                      </label>
                      <input
                        type="text"
                        id="bill_number"
                        name="bill_number"
                        value={formData.bill_number}
                        onChange={handleHeaderChange}
                        placeholder="e.g. Bill/2026/0001"
                        required
                        style={{
                          ...underlineInputStyle,
                          fontSize: '17px',
                          fontWeight: 700,
                          color: '#0f3460',
                          borderBottomColor: '#0f3460'
                        }}
                      />
                    </div>

                    {/* Linked PO Selector */}
                    <div style={{ marginBottom: '20px' }}>
                      <label htmlFor="purchase_order_id" style={{ fontSize: '15px', fontWeight: 700, color: '#dc2626', display: 'block', marginBottom: '4px' }}>
                        Linked Purchase Order *
                      </label>
                      <select
                        id="purchase_order_id"
                        name="purchase_order_id"
                        value={formData.purchase_order_id}
                        onChange={handleHeaderChange}
                        required
                        style={{
                          ...underlineInputStyle,
                          fontWeight: 600,
                          borderBottomColor: '#0f3460',
                          cursor: 'pointer'
                        }}
                      >
                        <option value="">-- Select Confirmed PO --</option>
                        {pos.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.po_number} – {p.vendor?.name} (₹{Number(p.total_amount).toLocaleString('en-IN')})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Vendor Name */}
                    <div style={{ marginBottom: '20px' }}>
                      <label htmlFor="vendor_name" style={{ fontSize: '15px', fontWeight: 700, color: '#dc2626', display: 'block', marginBottom: '4px' }}>
                        Vendor Name * <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 500 }}>(From Contact Master)</span>
                      </label>
                      <input
                        type="text"
                        id="vendor_name"
                        name="vendor_name"
                        value={formData.vendor_name}
                        readOnly
                        style={{
                          ...underlineInputStyle,
                          borderBottomColor: '#0f3460',
                          fontWeight: 600
                        }}
                      />
                    </div>

                    {/* Status Pill Badges: [ Paid ] [ Partial ] [ Not Paid ] */}
                    <div>
                      <label style={{ fontSize: '15px', fontWeight: 700, color: '#dc2626', display: 'block', marginBottom: '8px' }}>
                        Status
                      </label>
                      <div style={{ display: 'inline-flex', border: '1px solid #cbd5e1', borderRadius: '8px', overflow: 'hidden' }}>
                        {['Paid', 'Partial', 'Not Paid'].map(st => {
                          const isActive = formData.status === st
                          return (
                            <div
                              key={st}
                              style={{
                                padding: '6px 14px',
                                fontSize: '12px',
                                fontWeight: 700,
                                background: isActive ? '#0f3460' : '#f8fafc',
                                color: isActive ? '#ffffff' : '#64748b',
                                cursor: 'default'
                              }}
                            >
                              {st}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Bill Reference, Bill Date, Due Date */}
                  <div>
                    {/* Bill Reference */}
                    <div style={{ marginBottom: '20px' }}>
                      <label htmlFor="bill_reference" style={{ fontSize: '15px', fontWeight: 700, color: '#dc2626', display: 'block', marginBottom: '4px' }}>
                        Bill Reference <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 500 }}>(Alpha-numeric Text)</span>
                      </label>
                      <input
                        type="text"
                        id="bill_reference"
                        name="bill_reference"
                        value={formData.bill_reference}
                        onChange={handleHeaderChange}
                        placeholder="e.g. ABC-26-001"
                        style={{
                          ...underlineInputStyle,
                          borderBottomColor: '#0f3460'
                        }}
                      />
                    </div>

                    {/* Bill Date */}
                    <div style={{ marginBottom: '20px' }}>
                      <label htmlFor="bill_date" style={{ fontSize: '15px', fontWeight: 700, color: '#dc2626', display: 'block', marginBottom: '4px' }}>
                        Bill Date *
                      </label>
                      <input
                        type="date"
                        id="bill_date"
                        name="bill_date"
                        value={formData.bill_date}
                        onChange={handleHeaderChange}
                        required
                        style={{
                          ...underlineInputStyle,
                          borderBottomColor: '#0f3460'
                        }}
                      />
                    </div>

                    {/* Due Date */}
                    <div>
                      <label htmlFor="due_date" style={{ fontSize: '15px', fontWeight: 700, color: '#dc2626', display: 'block', marginBottom: '4px' }}>
                        Due Date
                      </label>
                      <input
                        type="date"
                        id="due_date"
                        name="due_date"
                        value={formData.due_date}
                        onChange={handleHeaderChange}
                        style={{
                          ...underlineInputStyle,
                          borderBottomColor: '#0f3460'
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Line Items Table matching wireframe:
                  Sr. No. | Product | Chart of Account | Budget Analytics | Qty | Unit Price | Total */}
              <div style={{ marginBottom: '24px' }}>
                <div style={{ overflowX: 'auto', border: '1.5px solid #e2e8f0', borderRadius: '14px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                        <th style={{ width: '50px', textAlign: 'center', padding: '12px 6px', fontSize: '13px', color: '#1e293b' }}>
                          Sr. No.
                        </th>
                        <th style={{ textAlign: 'left', padding: '12px 12px', fontSize: '13px', color: '#1e293b', width: '24%' }}>
                          Product <span style={{ fontSize: '11px', color: '#64748b' }}>(Product Master)</span>
                        </th>
                        <th style={{ textAlign: 'left', padding: '12px 12px', fontSize: '13px', color: '#1e293b', width: '22%' }}>
                          Chart of Account <span style={{ fontSize: '11px', color: '#059669' }}>(Default: Purchase)</span>
                        </th>
                        <th style={{ textAlign: 'left', padding: '12px 12px', fontSize: '13px', color: '#1e293b', width: '20%' }}>
                          Budget Analytics <span style={{ fontSize: '11px', color: '#64748b' }}>(Analytics Master)</span>
                        </th>
                        <th style={{ textAlign: 'center', padding: '12px 8px', fontSize: '13px', color: '#1e293b', width: '8%' }}>
                          Qty
                        </th>
                        <th style={{ textAlign: 'right', padding: '12px 10px', fontSize: '13px', color: '#1e293b', width: '13%' }}>
                          Unit Price (₹)
                        </th>
                        <th style={{ textAlign: 'right', padding: '12px 12px', fontSize: '13px', color: '#1e293b', width: '13%' }}>
                          Total (₹)
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {poLineItems.length === 0 ? (
                        <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ textAlign: 'center', padding: '12px 6px', color: '#64748b' }}>1.</td>
                          <td style={{ padding: '12px 12px', fontWeight: 600, color: '#0f3460' }}>
                            {selectedPO ? 'Furniture Inventory Items' : 'Standard Purchase'}
                          </td>
                          <td style={{ padding: '12px 12px', color: '#059669', fontWeight: 600 }}>
                            {defaultPurchaseAccount.account_name}
                          </td>
                          <td style={{ padding: '12px 12px', color: '#64748b' }}>
                            Furniture (Expense)
                          </td>
                          <td style={{ textAlign: 'center', padding: '12px 8px', fontWeight: 600 }}>1</td>
                          <td style={{ textAlign: 'right', padding: '12px 10px', fontWeight: 600 }}>
                            ₹{totalBillAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td style={{ textAlign: 'right', padding: '12px 12px', fontWeight: 700, color: '#0f3460' }}>
                            ₹{totalBillAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ) : (
                        poLineItems.map((it, idx) => (
                          <tr key={it.id || idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ textAlign: 'center', padding: '12px 6px', color: '#64748b' }}>{idx + 1}.</td>
                            <td style={{ padding: '12px 12px', fontWeight: 600, color: '#0f3460' }}>
                              {it.product?.product_name || `Product #${it.product_id}`}
                            </td>
                            <td style={{ padding: '12px 12px', color: '#059669', fontWeight: 600 }}>
                              {defaultPurchaseAccount.account_name}
                            </td>
                            <td style={{ padding: '12px 12px', color: '#475569' }}>
                              {it.analytic_account?.analytic_name || 'Furniture (Expense)'}
                            </td>
                            <td style={{ textAlign: 'center', padding: '12px 8px', fontWeight: 600 }}>
                              {it.quantity}
                            </td>
                            <td style={{ textAlign: 'right', padding: '12px 10px', fontWeight: 600 }}>
                              ₹{Number(it.unit_price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </td>
                            <td style={{ textAlign: 'right', padding: '12px 12px', fontWeight: 700, color: '#0f3460' }}>
                              ₹{Number(it.total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        ))
                      )}

                      {/* Bottom Total Rows matching wireframe */}
                      <tr style={{ background: '#f8fafc', borderTop: '2px solid #cbd5e1' }}>
                        <td colSpan="6" style={{ textAlign: 'right', padding: '12px 16px', fontWeight: 800, fontSize: '15px', color: '#0f3460' }}>
                          Total:
                        </td>
                        <td style={{ textAlign: 'right', padding: '12px 16px', fontWeight: 800, fontSize: '17px', color: '#0f3460' }}>
                          ₹{totalBillAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                      <tr style={{ background: '#ffffff' }}>
                        <td colSpan="6" style={{ textAlign: 'right', padding: '8px 16px', color: '#64748b', fontSize: '13px' }}>
                          Paid Via Cash:
                        </td>
                        <td style={{ textAlign: 'right', padding: '8px 16px', fontWeight: 600, fontSize: '14px', color: '#16a34a' }}>
                          ₹{paidViaCash.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                      <tr style={{ background: '#ffffff' }}>
                        <td colSpan="6" style={{ textAlign: 'right', padding: '8px 16px', color: '#64748b', fontSize: '13px' }}>
                          Paid Via Bank:
                        </td>
                        <td style={{ textAlign: 'right', padding: '8px 16px', fontWeight: 600, fontSize: '14px', color: '#0284c7' }}>
                          ₹{paidViaBank.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                      <tr style={{ background: '#fef2f2', borderTop: '1.5px solid #fecaca' }}>
                        <td colSpan="6" style={{ textAlign: 'right', padding: '10px 16px', fontWeight: 700, color: '#dc2626', fontSize: '14px' }}>
                          Amount Due (Total - Amount Paid):
                        </td>
                        <td style={{ textAlign: 'right', padding: '10px 16px', fontWeight: 800, color: '#dc2626', fontSize: '16px' }}>
                          ₹{amountDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Wireframe Guidance Note */}
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
                  📌 Double Entry & General Ledger Linkage:
                </div>
                As soon as the Vendor Bill is confirmed, a journal entry is posted to General Ledger (Debit: <strong>Purchase Expense A/c</strong>, Credit: <strong>Creditors A/c</strong>).
              </div>

            </form>
          </div>
        </div>
      ) : (
        /* ============================================================ */
        /* 2. VENDOR BILLS LIST VIEW                                    */
        /* ============================================================ */
        <div>
          {/* Top Title */}
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <h1 style={{
              fontSize: '28px',
              fontWeight: 800,
              color: '#1a1a2e',
              letterSpacing: '-0.5px',
              margin: '0 0 6px 0'
            }}>
              Vendor Bills (List View)
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

            {/* Top Toolbar matching wireframe: [ New ] ... [ Search ] ... [ Back ] */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '20px',
              flexWrap: 'wrap',
              gap: '12px'
            }}>
              {/* Left Actions */}
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
                    padding: '7px 24px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#0f3460'; e.currentTarget.style.color = '#ffffff' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.color = '#0f3460' }}
                >
                  New
                </button>

                <div className="filter-tabs" style={{ display: 'flex', gap: '6px' }}>
                  {['All', 'Draft', 'Posted', 'Paid'].map(st => (
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
                  placeholder="Search bills..."
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

            {/* Vendor Bills Table */}
            {filteredBills.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '48px 20px',
                color: '#64748b',
                fontSize: '15px'
              }}>
                No vendor bills found. Click <strong>"New"</strong> or create one from a confirmed Purchase Order.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                      <th style={{ textAlign: 'left', padding: '12px 14px', fontSize: '14px', color: '#1e293b', fontWeight: 700 }}>
                        Vendor Bill No.
                      </th>
                      <th style={{ textAlign: 'left', padding: '12px 14px', fontSize: '14px', color: '#1e293b', fontWeight: 700 }}>
                        Source PO
                      </th>
                      <th style={{ textAlign: 'left', padding: '12px 14px', fontSize: '14px', color: '#1e293b', fontWeight: 700 }}>
                        Bill Date
                      </th>
                      <th style={{ textAlign: 'left', padding: '12px 14px', fontSize: '14px', color: '#1e293b', fontWeight: 700 }}>
                        Due Date
                      </th>
                      <th style={{ textAlign: 'right', padding: '12px 14px', fontSize: '14px', color: '#1e293b', fontWeight: 700 }}>
                        Total Amount (₹)
                      </th>
                      <th style={{ textAlign: 'center', padding: '12px 14px', fontSize: '14px', color: '#1e293b', fontWeight: 700 }}>
                        Status
                      </th>
                      <th style={{ textAlign: 'center', width: '120px', padding: '12px 14px', fontSize: '14px', color: '#1e293b', fontWeight: 700 }}>
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBills.map((bill) => (
                      <tr
                        key={bill.id}
                        onClick={() => openEditForm(bill)}
                        style={{
                          cursor: 'pointer',
                          borderBottom: '1px solid #f1f5f9',
                          transition: 'background 0.12s ease'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        <td style={{ padding: '12px 14px', color: '#0f3460', fontWeight: 700, fontSize: '15px' }}>
                          {bill.bill_number}
                        </td>
                        <td style={{ padding: '12px 14px', color: '#334155', fontSize: '14px', fontWeight: 600 }}>
                          {bill.purchase_order?.po_number || `PO #${bill.purchase_order_id}`}
                        </td>
                        <td style={{ padding: '12px 14px', color: '#475569', fontSize: '14px' }}>
                          {bill.bill_date ? new Date(bill.bill_date).toLocaleDateString('en-IN') : '—'}
                        </td>
                        <td style={{ padding: '12px 14px', color: '#475569', fontSize: '14px' }}>
                          {bill.due_date ? new Date(bill.due_date).toLocaleDateString('en-IN') : '—'}
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700, color: '#0f3460', fontSize: '15px' }}>
                          ₹{Number(bill.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                          <span className={`status-badge ${bill.status === 'Paid' ? 'status-confirmed' : bill.status === 'Posted' ? 'status-partially-paid' : 'status-draft'}`}>
                            {bill.status}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center', padding: '12px 14px' }} onClick={(e) => e.stopPropagation()}>
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                            <button
                              type="button"
                              className="btn-edit"
                              onClick={() => openEditForm(bill)}
                              style={{ padding: '4px 10px', fontSize: '12px' }}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="btn-delete"
                              onClick={(e) => handleDelete(bill, e)}
                              style={{ padding: '4px 8px', fontSize: '12px' }}
                              title="Delete bill"
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
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
                Showing {filteredBills.length} vendor bill{filteredBills.length !== 1 ? 's' : ''}
              </span>
            </div>

          </div>
        </div>
      )}

    </div>
  )
}

export default VendorBillsPage
