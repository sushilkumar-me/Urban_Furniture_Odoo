import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import api from '../api'
import { downloadPaymentVoucher } from '../utils/voucherGenerator'

const todayStr = () => new Date().toISOString().split('T')[0]

function PaymentsPage() {
  const [payments, setPayments]         = useState([])
  const [bills, setBills]               = useState([])
  const [invoices, setInvoices]         = useState([])
  const [contacts, setContacts]         = useState([])
  const [showForm, setShowForm]         = useState(false)
  const [showGearMenu, setShowGearMenu] = useState(false)
  const [filterType, setFilterType]     = useState('All')

  // Form State
  const [paymentType, setPaymentType]   = useState('Receive') // 'Send' (Bill) or 'Receive' (Invoice)
  const [selectedDocId, setSelectedDocId] = useState('')
  const [partnerName, setPartnerName]   = useState('')
  const [paymentVia, setPaymentVia]     = useState('Bank')    // 'Bank' or 'Cash'
  const [paymentDate, setPaymentDate]   = useState(todayStr())
  const [amount, setAmount]             = useState('')
  const [note, setNote]                 = useState('')
  const [pipelineStatus, setPipelineStatus] = useState('Draft') // 'Draft' | 'Confirm' | 'Cancelled'

  const [error, setError]     = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  const navigate = useNavigate()
  const location = useLocation()
  const userRole = localStorage.getItem('role') || localStorage.getItem('active_role') || ''

  useEffect(() => {
    initData()
  }, [location.search])

  const initData = async () => {
    try {
      const [pRes, bRes, iRes, cRes] = await Promise.all([
        api.get('/payments/'),
        api.get('/vendor-bills/'),
        api.get('/customer-invoices/'),
        api.get('/contacts/')
      ])
      setPayments(pRes.data)
      setBills(bRes.data)
      setInvoices(iRes.data)
      setContacts(cRes.data)

      // Query params handler: ?bill_id=XYZ or ?invoice_id=XYZ
      const params = new URLSearchParams(location.search)
      const billId = params.get('bill_id')
      const invId = params.get('invoice_id')

      if (invId) {
        const inv = iRes.data.find(i => String(i.id) === String(invId))
        setPaymentType('Receive')
        setSelectedDocId(String(invId))
        if (inv) {
          const custName = inv.sales_order?.customer?.name || 'Customer'
          setPartnerName(custName)
          setAmount(String(inv.total_amount))
          setNote(`Settlement for Customer Invoice ${inv.invoice_number}`)
        }
        setPaymentVia('Bank')
        setPaymentDate(todayStr())
        setPipelineStatus('Draft')
        setShowForm(true)
      } else if (billId) {
        const bill = bRes.data.find(b => String(b.id) === String(billId))
        setPaymentType('Send')
        setSelectedDocId(String(billId))
        if (bill) {
          const vendName = bill.purchase_order?.vendor?.name || 'Vendor'
          setPartnerName(vendName)
          setAmount(String(bill.total_amount))
          setNote(`Disbursement for Vendor Bill ${bill.bill_number}`)
        }
        setPaymentVia('Bank')
        setPaymentDate(todayStr())
        setPipelineStatus('Draft')
        setShowForm(true)
      }
    } catch {
      setError('Failed to load payments data.')
    }
  }

  const fetchAll = async () => {
    try {
      const [pRes, bRes, iRes] = await Promise.all([
        api.get('/payments/'),
        api.get('/vendor-bills/'),
        api.get('/customer-invoices/')
      ])
      setPayments(pRes.data)
      setBills(bRes.data)
      setInvoices(iRes.data)
    } catch {
      setError('Failed to refresh data.')
    }
  }

  // When payment type switches between Send and Receive
  const handleTypeChange = (newType) => {
    setPaymentType(newType)
    setSelectedDocId('')
    setPartnerName('')
    setAmount('')
    setNote('')
    setError('')
  }

  // When linked document is selected
  const handleDocChange = (docId) => {
    setSelectedDocId(docId)
    if (!docId) {
      setPartnerName('')
      setAmount('')
      setNote('')
      return
    }

    if (paymentType === 'Send') {
      const b = bills.find(x => String(x.id) === docId)
      if (b) {
        setPartnerName(b.purchase_order?.vendor?.name || 'Vendor')
        setAmount(String(b.total_amount))
        setNote(`Disbursement for Vendor Bill ${b.bill_number}`)
      }
    } else {
      const inv = invoices.find(x => String(x.id) === docId)
      if (inv) {
        setPartnerName(inv.sales_order?.customer?.name || 'Customer')
        setAmount(String(inv.total_amount))
        setNote(`Settlement for Customer Invoice ${inv.invoice_number}`)
      }
    }
  }

  const handleOpenNew = () => {
    setPaymentType(userRole === 'Vendor' ? 'Send' : 'Receive')
    setSelectedDocId('')
    setPartnerName('')
    setPaymentVia('Bank')
    setPaymentDate(todayStr())
    setAmount('')
    setNote('')
    setPipelineStatus('Draft')
    setError('')
    setShowForm(true)
  }

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault()
    setError('')
    setLoading(true)

    if (!amount || Number(amount) <= 0) {
      setError('Please enter a valid payment amount.')
      setLoading(false)
      return
    }

    const payload = {
      payment_type:        paymentType,
      payment_method:      paymentVia === 'Bank' ? 'Bank Transfer' : 'Cash',
      payment_date:        paymentDate,
      amount:              Number(amount),
      note:                note || null,
      vendor_bill_id:      paymentType === 'Send' && selectedDocId ? Number(selectedDocId) : null,
      customer_invoice_id: paymentType === 'Receive' && selectedDocId ? Number(selectedDocId) : null
    }

    try {
      const res = await api.post('/payments/', payload)
      const createdPayment = res.data
      setPipelineStatus('Confirm')
      setSuccess(`Payment of ₹${Number(amount).toLocaleString('en-IN')} confirmed and posted to Treasury & General Ledger! Downloading voucher...`)

      const docRef = paymentType === 'Send'
        ? (bills.find(b => String(b.id) === selectedDocId)?.bill_number || (selectedDocId ? `Bill #${selectedDocId}` : 'Direct Settlement'))
        : (invoices.find(i => String(i.id) === selectedDocId)?.invoice_number || (selectedDocId ? `Invoice #${selectedDocId}` : 'Direct Receipt'))

      downloadPaymentVoucher({
        voucherNo:     `VOUCH-PAY-${String(createdPayment?.id || Date.now().toString().slice(-4)).padStart(4, '0')}`,
        paymentType:   paymentType,
        paymentDate:   paymentDate,
        paymentMethod: paymentVia === 'Bank' ? 'Bank Transfer' : 'Cash',
        partnerName:   partnerName || (paymentType === 'Send' ? 'Vendor' : 'Customer'),
        documentRef:   docRef,
        amount:        Number(amount),
        note:          note
      })

      await fetchAll()
      setTimeout(() => {
        setShowForm(false)
      }, 1500)
    } catch (err) {
      const detail = err.response?.data?.detail
      if (Array.isArray(detail)) {
        setError(detail.map(d => d.msg || d.loc?.join('.')).join(' | '))
      } else if (typeof detail === 'object') {
        setError(JSON.stringify(detail))
      } else if (detail) {
        setError(String(detail))
      } else {
        setError('Failed to record payment.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleCancelPayment = () => {
    setPipelineStatus('Cancelled')
    setShowForm(false)
  }

  const handleDelete = async (p, e) => {
    if (e) e.stopPropagation()
    const label = p.payment_type === 'Receive' ? 'Customer Receipt' : 'Vendor Payment'
    if (!window.confirm(`Delete ${label} of ₹${p.amount}?`)) return
    try {
      await api.delete(`/payments/${p.id}`)
      setSuccess('Payment record deleted.')
      await fetchAll()
    } catch (err) {
      const detail = err.response?.data?.detail
      setError(typeof detail === 'string' ? detail : 'Failed to delete payment.')
    }
  }

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

  // Filtered displayed payments
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

  // Candidate un-paid or posted documents for selection dropdown
  const candidateBills = bills.filter(b => b.status !== 'Paid')
  const candidateInvoices = invoices.filter(i => i.status !== 'Paid')

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
      {/* 1. PAYMENT FORM VIEW (BILL PAYMENT / INVOICE PAYMENT)        */}
      {/* ============================================================ */}
      {showForm ? (
        <div>
          {/* Dynamic Top Title: Invoice Payment vs Bill Payment */}
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <h1 style={{
              fontSize: '28px',
              fontWeight: 800,
              color: '#1a1a2e',
              letterSpacing: '-0.5px',
              margin: 0
            }}>
              {paymentType === 'Receive' ? 'Invoice Payment' : 'Bill Payment'}
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
                  [ Confirm ] [ Cancel ] [ ⚙ ] ... [ Draft ] [ Confirm ] [ Cancelled ] */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '28px',
                flexWrap: 'wrap',
                gap: '12px'
              }}>
                {/* Left Actions */}
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <button
                    type="submit"
                    disabled={loading || pipelineStatus === 'Confirm'}
                    style={{
                      background: '#0f3460',
                      border: '2px solid #0f3460',
                      color: '#ffffff',
                      fontWeight: 700,
                      fontSize: '14px',
                      borderRadius: '10px',
                      padding: '7px 24px',
                      cursor: 'pointer',
                      boxShadow: '0 2px 8px rgba(15, 52, 96, 0.2)'
                    }}
                  >
                    Confirm
                  </button>

                  <button
                    type="button"
                    onClick={handleCancelPayment}
                    style={{
                      background: '#ffffff',
                      border: '2px solid #94a3b8',
                      color: '#64748b',
                      fontWeight: 700,
                      fontSize: '14px',
                      borderRadius: '10px',
                      padding: '7px 20px',
                      cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </button>

                  {/* Settings Gear ⚙ with Wireframe Popup: 1. Print, 2. Send */}
                  <div style={{ position: 'relative' }}>
                    <button
                      type="button"
                      onClick={() => setShowGearMenu(!showGearMenu)}
                      style={{
                        background: '#f8fafc',
                        border: '1.5px solid #cbd5e1',
                        color: '#475569',
                        fontWeight: 700,
                        fontSize: '16px',
                        borderRadius: '8px',
                        padding: '6px 12px',
                        cursor: 'pointer'
                      }}
                      title="Settings & Options"
                    >
                      ⚙
                    </button>

                    {showGearMenu && (
                      <div style={{
                        position: 'absolute',
                        top: '115%',
                        left: 0,
                        background: '#ffffff',
                        border: '1.5px solid #e2e8f0',
                        borderRadius: '12px',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                        padding: '8px 0',
                        zIndex: 100,
                        minWidth: '150px'
                      }}>
                        <div style={{ padding: '6px 14px', fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>
                          Provide Option
                        </div>
                        <button
                          type="button"
                          onClick={() => { window.print(); setShowGearMenu(false) }}
                          style={{
                            width: '100%',
                            textAlign: 'left',
                            padding: '8px 14px',
                            background: 'transparent',
                            border: 'none',
                            fontSize: '13px',
                            fontWeight: 600,
                            color: '#1e293b',
                            cursor: 'pointer'
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = '#f1f5f9' }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                        >
                          1. 🖨️ Print Voucher
                        </button>
                        <button
                          type="button"
                          onClick={() => { alert(`Advice email dispatched to ${partnerName || 'Partner'}!`); setShowGearMenu(false) }}
                          style={{
                            width: '100%',
                            textAlign: 'left',
                            padding: '8px 14px',
                            background: 'transparent',
                            border: 'none',
                            fontSize: '13px',
                            fontWeight: 600,
                            color: '#1e293b',
                            cursor: 'pointer'
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = '#f1f5f9' }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                        >
                          2. ✉️ Send Email
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right State Pipeline matching wireframe: [ Draft ] [ Confirm ] [ Cancelled ] */}
                <div style={{ display: 'inline-flex', border: '1px solid #cbd5e1', borderRadius: '8px', overflow: 'hidden' }}>
                  {['Draft', 'Confirm', 'Cancelled'].map(st => {
                    const isActive = pipelineStatus === st
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

              {/* Form Error Banner */}
              {error && (
                <div className="error-message" style={{ marginBottom: '20px' }}>
                  ⚠️ {error}
                </div>
              )}

              {/* Underlined Fields Frame matching wireframe */}
              <div style={{
                background: '#fcfdfe',
                border: '1.5px solid #e2e8f0',
                borderRadius: '18px',
                padding: '28px 32px',
                marginBottom: '24px'
              }}>

                {/* Row 1: Payment Type & Date */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1.2fr 1fr',
                  gap: '32px',
                  alignItems: 'center',
                  marginBottom: '24px'
                }}>
                  {/* Payment Type: Send vs Receive */}
                  <div>
                    <label style={{ fontSize: '15px', fontWeight: 700, color: '#dc2626', display: 'block', marginBottom: '8px' }}>
                      Payment Type *
                    </label>
                    <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '15px', fontWeight: 600, color: '#1e293b' }}>
                        <input
                          type="radio"
                          name="payment_type"
                          value="Send"
                          checked={paymentType === 'Send'}
                          onChange={() => handleTypeChange('Send')}
                          style={{ width: '18px', height: '18px', accentColor: '#0f3460' }}
                        />
                        Send (Vendor Bill)
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '15px', fontWeight: 600, color: '#1e293b' }}>
                        <input
                          type="radio"
                          name="payment_type"
                          value="Receive"
                          checked={paymentType === 'Receive'}
                          onChange={() => handleTypeChange('Receive')}
                          style={{ width: '18px', height: '18px', accentColor: '#0f3460' }}
                        />
                        Receive (Customer Invoice)
                      </label>
                    </div>
                  </div>

                  {/* Date: Default Today's Date */}
                  <div>
                    <label htmlFor="payment_date" style={{ fontSize: '15px', fontWeight: 700, color: '#dc2626', display: 'block', marginBottom: '4px' }}>
                      Date * <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 500 }}>(Default Today's Date)</span>
                    </label>
                    <input
                      type="date"
                      id="payment_date"
                      value={paymentDate}
                      onChange={(e) => setPaymentDate(e.target.value)}
                      required
                      style={{
                        ...underlineInputStyle,
                        borderBottomColor: '#0f3460'
                      }}
                    />
                  </div>
                </div>

                {/* Row 2: Linked Document Picker & Partner AutoFill */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1.2fr 1fr',
                  gap: '32px',
                  alignItems: 'start',
                  marginBottom: '24px'
                }}>
                  {/* Document Selector */}
                  <div>
                    <label htmlFor="doc_id" style={{ fontSize: '15px', fontWeight: 700, color: '#dc2626', display: 'block', marginBottom: '4px' }}>
                      {paymentType === 'Send' ? 'Linked Vendor Bill' : 'Linked Customer Invoice'}
                    </label>
                    <select
                      id="doc_id"
                      value={selectedDocId}
                      onChange={(e) => handleDocChange(e.target.value)}
                      style={{
                        ...underlineInputStyle,
                        fontWeight: 600,
                        borderBottomColor: '#0f3460',
                        cursor: 'pointer'
                      }}
                    >
                      <option value="">-- Direct Manual Settlement --</option>
                      {paymentType === 'Send' ? (
                        candidateBills.map(b => (
                          <option key={b.id} value={b.id}>
                            {b.bill_number} – {b.purchase_order?.vendor?.name || 'Vendor'} (₹{Number(b.total_amount).toLocaleString('en-IN')})
                          </option>
                        ))
                      ) : (
                        candidateInvoices.map(i => (
                          <option key={i.id} value={i.id}>
                            {i.invoice_number} – {i.sales_order?.customer?.name || 'Customer'} (₹{Number(i.total_amount).toLocaleString('en-IN')})
                          </option>
                        ))
                      )}
                    </select>
                  </div>

                  {/* Partner Name: AutoFill from Invoice/Bill */}
                  <div>
                    <label htmlFor="partner_name" style={{ fontSize: '15px', fontWeight: 700, color: '#dc2626', display: 'block', marginBottom: '4px' }}>
                      Partner * <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 500 }}>(AutoFill Partner Name from Invoice/Bill)</span>
                    </label>
                    <input
                      type="text"
                      id="partner_name"
                      value={partnerName}
                      onChange={(e) => setPartnerName(e.target.value)}
                      placeholder="e.g. Mr Rahul"
                      required
                      style={{
                        ...underlineInputStyle,
                        fontWeight: 700,
                        fontSize: '17px',
                        color: '#0f3460',
                        borderBottomColor: '#0f3460'
                      }}
                    />
                  </div>
                </div>

                {/* Row 3: Payment Via & Amount */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1.2fr 1fr',
                  gap: '32px',
                  alignItems: 'start',
                  marginBottom: '24px'
                }}>
                  {/* Payment Via: Bank vs Cash */}
                  <div>
                    <label style={{ fontSize: '15px', fontWeight: 700, color: '#dc2626', display: 'block', marginBottom: '8px' }}>
                      Payment Via * <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 500 }}>(Default set to Bank, can be selected to Cash)</span>
                    </label>
                    <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '15px', fontWeight: 600, color: '#1e293b' }}>
                        <input
                          type="radio"
                          name="payment_via"
                          value="Bank"
                          checked={paymentVia === 'Bank'}
                          onChange={() => setPaymentVia('Bank')}
                          style={{ width: '18px', height: '18px', accentColor: '#0f3460' }}
                        />
                        Bank (Bank A/c)
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '15px', fontWeight: 600, color: '#1e293b' }}>
                        <input
                          type="radio"
                          name="payment_via"
                          value="Cash"
                          checked={paymentVia === 'Cash'}
                          onChange={() => setPaymentVia('Cash')}
                          style={{ width: '18px', height: '18px', accentColor: '#0f3460' }}
                        />
                        Cash (Cash A/c)
                      </label>
                    </div>
                  </div>

                  {/* Amount: AutoFill Amount Due from Invoice/Bill */}
                  <div>
                    <label htmlFor="amount" style={{ fontSize: '15px', fontWeight: 700, color: '#dc2626', display: 'block', marginBottom: '4px' }}>
                      Amount (₹) * <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 500 }}>(AutoFill Amount Due from Invoice/Bill)</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      id="amount"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="e.g. 6000"
                      required
                      style={{
                        ...underlineInputStyle,
                        fontWeight: 800,
                        fontSize: '18px',
                        color: '#0f3460',
                        borderBottomColor: '#0f3460'
                      }}
                    />
                  </div>
                </div>

                {/* Row 4: Note (Alpha Numeric Text) */}
                <div>
                  <label htmlFor="note" style={{ fontSize: '15px', fontWeight: 700, color: '#dc2626', display: 'block', marginBottom: '4px' }}>
                    Note <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 500 }}>(Alpha Numeric Text)</span>
                  </label>
                  <input
                    type="text"
                    id="note"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="e.g. Cleared via Cheque #98120 / Direct Bank Transfer"
                    style={{
                      ...underlineInputStyle,
                      borderBottomColor: '#0f3460'
                    }}
                  />
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
                  📌 Treasury & Double Entry Verification:
                </div>
                {paymentType === 'Receive' ? (
                  <>Customer Receipt debits <strong>{paymentVia === 'Bank' ? 'Bank A/c' : 'Cash A/c'}</strong> and credits <strong>Debtors A/c</strong>. Customer Invoice status updates to <strong>Paid</strong>.</>
                ) : (
                  <>Vendor Payment debits <strong>Creditors A/c</strong> and credits <strong>{paymentVia === 'Bank' ? 'Bank A/c' : 'Cash A/c'}</strong>. Vendor Bill status updates to <strong>Paid</strong>.</>
                )}
              </div>

            </form>
          </div>
        </div>
      ) : (
        /* ============================================================ */
        /* 2. PAYMENTS LIST VIEW                                        */
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
              Payments & Treasury
            </h1>
            <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>
              Track incoming customer receipts and outgoing vendor disbursements
            </p>
          </div>

          {/* Financial Summary Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '20px',
            marginBottom: '24px'
          }}>
            <div style={{
              background: '#ffffff',
              border: '2px solid #e2e8f0',
              borderLeft: '5px solid #16a34a',
              borderRadius: '16px',
              padding: '20px 24px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.03)'
            }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                Total Inflow (Customer Receipts)
              </div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#16a34a', marginTop: '6px' }}>
                ₹{totalReceived.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
              <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
                Credited to Bank / Cash from Invoices
              </div>
            </div>

            <div style={{
              background: '#ffffff',
              border: '2px solid #e2e8f0',
              borderLeft: '5px solid #dc2626',
              borderRadius: '16px',
              padding: '20px 24px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.03)'
            }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                Total Outflow (Vendor Disbursements)
              </div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#dc2626', marginTop: '6px' }}>
                ₹{totalDisbursed.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
              <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
                Debited from Bank / Cash for Bills
              </div>
            </div>
          </div>

          {/* Main Card Frame */}
          <div style={{
            background: '#ffffff',
            border: '2px solid #e2e8f0',
            borderRadius: '24px',
            padding: '24px 28px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.06)'
          }}>

            {/* Top Toolbar matching wireframe */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '20px',
              flexWrap: 'wrap',
              gap: '12px'
            }}>
              {/* Left Actions: [ New Payment ] and Filter Tabs */}
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={handleOpenNew}
                  style={{
                    background: '#0f3460',
                    border: '2px solid #0f3460',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '14px',
                    borderRadius: '10px',
                    padding: '7px 24px',
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(15, 52, 96, 0.2)'
                  }}
                >
                  + Record Transaction
                </button>

                <div className="filter-tabs" style={{ display: 'flex', gap: '6px' }}>
                  {[
                    { key: 'All', label: 'All' },
                    { key: 'Receive', label: 'Customer Receipts' },
                    { key: 'Send', label: 'Vendor Payments' }
                  ].map(tab => (
                    <button
                      key={tab.key}
                      className={`filter-tab ${filterType === tab.key ? 'active' : ''}`}
                      onClick={() => setFilterType(tab.key)}
                      style={{
                        padding: '6px 14px',
                        fontSize: '13px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        background: filterType === tab.key ? '#0f3460' : '#ffffff',
                        color: filterType === tab.key ? '#ffffff' : '#334155',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
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

            {/* Payments Table */}
            {displayedPayments.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '48px 20px',
                color: '#64748b',
                fontSize: '15px'
              }}>
                No transactions recorded. Click <strong>"+ Record Transaction"</strong> or use the <strong>"Pay"</strong> button from any Bill/Invoice.
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
                        Payment Type
                      </th>
                      <th style={{ textAlign: 'left', padding: '12px 14px', fontSize: '14px', color: '#1e293b', fontWeight: 700 }}>
                        Partner / Linked Doc
                      </th>
                      <th style={{ textAlign: 'left', padding: '12px 14px', fontSize: '14px', color: '#1e293b', fontWeight: 700 }}>
                        Payment Via
                      </th>
                      <th style={{ textAlign: 'right', padding: '12px 14px', fontSize: '14px', color: '#1e293b', fontWeight: 700 }}>
                        Amount (₹)
                      </th>
                      <th style={{ textAlign: 'center', padding: '12px 14px', fontSize: '14px', color: '#1e293b', fontWeight: 700 }}>
                        Status
                      </th>
                      <th style={{ textAlign: 'center', width: '90px', padding: '12px 14px', fontSize: '14px', color: '#1e293b', fontWeight: 700 }}>
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedPayments.map((p) => {
                      const isReceive = p.payment_type === 'Receive'
                      const partner = isReceive
                        ? (p.customer_invoice?.sales_order?.customer?.name || 'Customer')
                        : (p.vendor_bill?.purchase_order?.vendor?.name || 'Vendor')
                      const docNumber = isReceive
                        ? (p.customer_invoice?.invoice_number || 'Direct Receipt')
                        : (p.vendor_bill?.bill_number || 'Direct Settlement')

                      return (
                        <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '12px 14px', color: '#475569', fontWeight: 500 }}>
                            {p.payment_date || '-'}
                          </td>
                          <td style={{ padding: '12px 14px' }}>
                            <span style={{
                              display: 'inline-block',
                              padding: '4px 10px',
                              borderRadius: '12px',
                              fontSize: '12px',
                              fontWeight: 700,
                              background: isReceive ? '#dcfce7' : '#fee2e2',
                              color: isReceive ? '#166534' : '#991b1b'
                            }}>
                              {isReceive ? '📥 Customer Receipt' : '📤 Vendor Payment'}
                            </span>
                          </td>
                          <td style={{ padding: '12px 14px' }}>
                            <div style={{ fontWeight: 700, color: '#1e293b' }}>{partner}</div>
                            <div style={{ fontSize: '12px', color: '#64748b' }}>{docNumber}</div>
                          </td>
                          <td style={{ padding: '12px 14px', color: '#475569', fontWeight: 600 }}>
                            {p.payment_method || 'Bank Transfer'}
                          </td>
                          <td style={{
                            padding: '12px 14px',
                            textAlign: 'right',
                            fontWeight: 800,
                            fontSize: '15px',
                            color: isReceive ? '#16a34a' : '#dc2626'
                          }}>
                            {isReceive ? '+' : '-'}₹{Number(p.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                            <span style={{
                              display: 'inline-block',
                              padding: '4px 10px',
                              borderRadius: '12px',
                              fontSize: '12px',
                              fontWeight: 700,
                              background: '#e0e7ff',
                              color: '#3730a3'
                            }}>
                              Confirmed
                            </span>
                          </td>
                          <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                            <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', alignItems: 'center' }}>
                              <button
                                type="button"
                                onClick={() => {
                                  downloadPaymentVoucher({
                                    voucherNo:     `VOUCH-PAY-${String(p.id).padStart(4, '0')}`,
                                    paymentType:   p.payment_type,
                                    paymentDate:   p.payment_date,
                                    paymentMethod: p.payment_method || 'Bank Transfer',
                                    partnerName:   partner,
                                    documentRef:   docNumber,
                                    amount:        Number(p.amount),
                                    note:          p.note || ''
                                  })
                                }}
                                style={{
                                  background: '#ecfdf5',
                                  border: '1px solid #10b981',
                                  color: '#047857',
                                  padding: '4px 8px',
                                  fontSize: '12px',
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  fontWeight: 600
                                }}
                                title="Download Payment Voucher"
                              >
                                📥 Voucher
                              </button>
                              <button
                                onClick={(e) => handleDelete(p, e)}
                                style={{
                                  background: '#fff1f2',
                                  border: '1px solid #fecdd3',
                                  color: '#e11d48',
                                  borderRadius: '6px',
                                  padding: '4px 8px',
                                  fontSize: '12px',
                                  fontWeight: 600,
                                  cursor: 'pointer'
                                }}
                                title="Delete Payment"
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
          </div>
        </div>
      )}

    </div>
  )
}

export default PaymentsPage
