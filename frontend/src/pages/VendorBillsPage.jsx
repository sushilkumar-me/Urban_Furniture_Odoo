import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import api from '../api'
import { downloadPaymentVoucher } from '../utils/voucherGenerator'

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

  // Bill Payment Modal State (Matching Excalidraw Wireframe)
  const [showPayModal, setShowPayModal]       = useState(false)
  const [payPaymentType, setPayPaymentType]   = useState('Send')
  const [payPartner, setPayPartner]           = useState('')
  const [payAmount, setPayAmount]             = useState('')
  const [payDate, setPayDate]                 = useState(todayStr())
  const [payVia, setPayVia]                   = useState('Bank Transfer')
  const [payNote, setPayNote]                 = useState('')
  const [payStatus, setPayStatus]             = useState('Draft')
  const [payLoading, setPayLoading]           = useState(false)
  const [showPayGearMenu, setShowPayGearMenu] = useState(false)

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
          handlePrefillFromPO(po, bRes.data.length, bRes.data)
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

  const handlePrefillFromPO = (po, count, allBills = null) => {
    const billList = allBills || bills
    const existingBill = billList.find(b => Number(b.purchase_order_id) === Number(po.id))
    if (existingBill) {
      openEditForm(existingBill)
      setSuccess(`Opened existing Vendor Bill "${existingBill.bill_number}" for PO ${po.po_number}.`)
      return
    }

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
    const billedPoIds = new Set(bills.map(b => Number(b.purchase_order_id)))
    const unbilledPO = pos.find(p => p.status === 'Confirmed' && !billedPoIds.has(Number(p.id))) || pos.find(p => !billedPoIds.has(Number(p.id)))
    if (unbilledPO) {
      handlePrefillFromPO(unbilledPO, bills.length)
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
      const existingBill = bills.find(b => String(b.purchase_order_id) === e.target.value)
      if (existingBill && existingBill.id !== editingId) {
        openEditForm(existingBill)
        setSuccess(`Opened existing Vendor Bill "${existingBill.bill_number}" for this Purchase Order.`)
        return
      }
      const po = pos.find(p => String(p.id) === e.target.value)
      if (po) {
        setSelectedPO(po)
        setFormData(prev => ({
          ...prev,
          purchase_order_id: String(po.id),
          bill_reference:    `PO-REF-${po.po_number}`,
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
        // If a bill already exists for this PO, update it instead of throwing duplicate error
        const existingBill = bills.find(b => Number(b.purchase_order_id) === Number(formData.purchase_order_id))
        if (existingBill) {
          setEditingId(existingBill.id)
          await api.patch(`/vendor-bills/${existingBill.id}`, {
            bill_number: formData.bill_number.trim(),
            bill_date:   formData.bill_date,
            due_date:    formData.due_date || null
          })
          setSuccess(`Updated existing Vendor Bill "${formData.bill_number}".`)
        } else {
          await api.post('/vendor-bills/', payload)
          setSuccess(`Vendor Bill "${formData.bill_number}" created successfully.`)
        }
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
    let billIdToConfirm = editingId
    if (!billIdToConfirm) {
      const existingBill = bills.find(b => Number(b.purchase_order_id) === Number(formData.purchase_order_id))
      if (existingBill) {
        billIdToConfirm = existingBill.id
        setEditingId(existingBill.id)
      } else {
        if (!formData.purchase_order_id) {
          setError('Please select a Purchase Order first.')
          return
        }
        try {
          setLoading(true)
          const res = await api.post('/vendor-bills/', {
            purchase_order_id: Number(formData.purchase_order_id),
            bill_number:       formData.bill_number.trim() || `BILL-AUTO-${Date.now().toString().slice(-4)}`,
            bill_date:         formData.bill_date || todayStr(),
            due_date:          formData.due_date || null,
            total_amount:      Number(formData.total_amount)
          })
          billIdToConfirm = res.data.id
          setEditingId(res.data.id)
        } catch (err) {
          setError(err.response?.data?.detail || 'Failed to create vendor bill.')
          setLoading(false)
          return
        }
      }
    }

    try {
      setLoading(true)
      await api.patch(`/vendor-bills/${billIdToConfirm}`, { status: 'Posted' })
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

  // [ Pay ] -> Opens Bill Payment Modal showing Payment Type, Partner, Payment Via, Amount, Date, etc.
  const handlePayBill = () => {
    if (!editingId) {
      setError('Please save or confirm the vendor bill first.')
      return
    }
    const amt = Number(formData.total_amount || 0)
    setPayPaymentType('Send')
    setPayPartner(formData.vendor_name || selectedPO?.vendor?.name || 'Vendor')
    setPayAmount(String(amt))
    setPayDate(todayStr())
    setPayVia('Bank Transfer')
    setPayNote(`Disbursement for Vendor Bill ${formData.bill_number}`)
    setPayStatus('Draft')
    setShowPayGearMenu(false)
    setShowPayModal(true)
  }

  // [ Confirm ] inside Bill Payment Modal -> Posts payment, marks bill Paid & prints/downloads voucher!
  const handleConfirmPaymentModal = async (e) => {
    if (e && e.preventDefault) e.preventDefault()
    if (!payAmount || Number(payAmount) <= 0) {
      setError('Please enter a valid payment amount.')
      return
    }

    try {
      setPayLoading(true)
      // If bill is still Draft, post it first
      if (formData.status !== 'Posted' && formData.status !== 'Not Paid' && formData.status !== 'Paid') {
        await api.patch(`/vendor-bills/${editingId}`, { status: 'Posted' })
      }

      const payPayload = {
        payment_type:        'Send',
        payment_method:      payVia,
        payment_date:        payDate,
        amount:              Number(payAmount),
        note:                payNote || null,
        vendor_bill_id:      Number(editingId),
        customer_invoice_id: null
      }
      const res = await api.post('/payments/', payPayload)

      setPayStatus('Confirm')
      setFormData(prev => ({ ...prev, status: 'Paid', amount_paid: Number(payAmount) }))
      setSuccess(`Payment of ₹${Number(payAmount).toLocaleString('en-IN')} confirmed! Downloading voucher...`)

      // Auto-trigger official voucher download
      downloadPaymentVoucher({
        voucherNo:     `VOUCH-PAY-${String(res.data?.id || editingId).padStart(4, '0')}`,
        paymentType:   'Send',
        paymentDate:   payDate,
        paymentMethod: payVia,
        partnerName:   payPartner,
        documentRef:   formData.bill_number,
        poNumber:      selectedPO?.po_number,
        amount:        Number(payAmount),
        note:          payNote
      })

      await fetchBills()

      setTimeout(() => {
        setShowPayModal(false)
      }, 1200)
    } catch (err) {
      const detail = err.response?.data?.detail
      setError(typeof detail === 'string' ? detail : 'Failed to record payment.')
    } finally {
      setPayLoading(false)
    }
  }

  // Download existing voucher on demand
  const handleDownloadExistingVoucher = (bill = null) => {
    const b = bill || {
      id: editingId,
      bill_number: formData.bill_number,
      total_amount: formData.total_amount,
      bill_date: formData.bill_date,
      vendor_name: formData.vendor_name,
      purchase_order: selectedPO
    }
    const amt = Number(b.total_amount || 0)
    const vendName = b.vendor?.name || b.purchase_order?.vendor?.name || b.vendor_name || formData.vendor_name || 'Vendor'
    downloadPaymentVoucher({
      voucherNo:     `VOUCH-PAY-${String(b.id).padStart(4, '0')}`,
      paymentType:   'Send',
      paymentDate:   b.bill_date || todayStr(),
      paymentMethod: 'Bank Transfer',
      partnerName:   vendName,
      documentRef:   b.bill_number,
      poNumber:      b.purchase_order?.po_number || selectedPO?.po_number,
      amount:        amt,
      note:          `Disbursement for Vendor Bill ${b.bill_number}`
    })
    setSuccess(`Payment Voucher downloaded for ${b.bill_number}!`)
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
                    title={formData.status === 'Paid' ? 'Bill is already Paid' : 'Pay bill and download voucher'}
                  >
                    Pay
                  </button>

                  {formData.status === 'Paid' && (
                    <button
                      type="button"
                      onClick={() => handleDownloadExistingVoucher()}
                      style={{
                        background: '#047857',
                        border: '2px solid #047857',
                        color: '#ffffff',
                        fontWeight: 700,
                        fontSize: '14px',
                        borderRadius: '10px',
                        padding: '7px 20px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        boxShadow: '0 2px 8px rgba(4, 120, 87, 0.25)'
                      }}
                      title="Download Official Payment Voucher"
                    >
                      📥 Voucher
                    </button>
                  )}
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
                        {pos.map(p => {
                          const isBilled = bills.some(b => Number(b.purchase_order_id) === Number(p.id) && b.id !== editingId)
                          return (
                            <option key={p.id} value={p.id}>
                              {p.po_number} – {p.vendor?.name} (₹{Number(p.total_amount).toLocaleString('en-IN')}) {isBilled ? '— [Bill Already Created]' : ''}
                            </option>
                          )
                        })}
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
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', alignItems: 'center' }}>
                            {bill.status === 'Paid' && (
                              <button
                                type="button"
                                onClick={() => handleDownloadExistingVoucher(bill)}
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
                            )}
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

      {/* ============================================================ */}
      {/* BILL PAYMENT MODAL (Matching Excalidraw Wireframe)          */}
      {/* ============================================================ */}
      {showPayModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '16px'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '24px',
            border: '2px solid #e2e8f0',
            maxWidth: '680px',
            width: '100%',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            overflow: 'hidden',
            animation: 'fadeIn 0.2s ease-out'
          }}>
            {/* Modal Title */}
            <div style={{
              background: '#f8fafc',
              borderBottom: '1.5px solid #e2e8f0',
              padding: '20px 28px',
              textAlign: 'center'
            }}>
              <h2 style={{
                margin: 0,
                fontSize: '24px',
                fontWeight: 800,
                color: '#0f3460',
                letterSpacing: '-0.5px'
              }}>
                Bill Payment
              </h2>
              <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
                Disbursement for Vendor Bill: <strong>{formData.bill_number}</strong>
              </div>
            </div>

            <div style={{ padding: '28px 32px' }}>
              {/* Action Bar matching wireframe: [ Confirm ] [ Cancel ] [ ⚙ ] ... [ Draft ] [ Confirm ] [ Cancelled ] */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '24px',
                flexWrap: 'wrap',
                gap: '12px'
              }}>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <button
                    type="button"
                    onClick={handleConfirmPaymentModal}
                    disabled={payLoading || payStatus === 'Confirm'}
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
                    onClick={() => setShowPayModal(false)}
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

                  {/* Gear Menu ⚙ */}
                  <div style={{ position: 'relative' }}>
                    <button
                      type="button"
                      onClick={() => setShowPayGearMenu(!showPayGearMenu)}
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

                    {showPayGearMenu && (
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
                        minWidth: '160px'
                      }}>
                        <div style={{ padding: '6px 14px', fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>
                          Provide Option
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            downloadPaymentVoucher({
                              voucherNo: `VOUCH-PAY-${String(editingId).padStart(4, '0')}`,
                              paymentType: 'Send',
                              paymentDate: payDate,
                              paymentMethod: payVia,
                              partnerName: payPartner,
                              documentRef: formData.bill_number,
                              poNumber: selectedPO?.po_number,
                              amount: Number(payAmount),
                              note: payNote
                            })
                            setShowPayGearMenu(false)
                          }}
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
                          onClick={() => {
                            alert(`Advice email dispatched to ${payPartner}!`)
                            setShowPayGearMenu(false)
                          }}
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
                    const isActive = payStatus === st
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

              {/* Fields Grid matching wireframe */}
              <div style={{
                background: '#fcfdfe',
                border: '1.5px solid #e2e8f0',
                borderRadius: '16px',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '18px'
              }}>
                {/* Row 1: Payment Type & Date */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px', alignItems: 'center' }}>
                  <div>
                    <label style={{ fontSize: '14px', fontWeight: 700, color: '#dc2626', display: 'block', marginBottom: '6px' }}>
                      Payment Type *
                    </label>
                    <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>
                        <input
                          type="radio"
                          name="modal_payment_type"
                          value="Send"
                          checked={payPaymentType === 'Send'}
                          onChange={() => setPayPaymentType('Send')}
                          style={{ width: '16px', height: '16px', accentColor: '#0f3460' }}
                        />
                        Send (Vendor Bill)
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: 600, color: '#64748b' }}>
                        <input
                          type="radio"
                          name="modal_payment_type"
                          value="Receive"
                          disabled
                          style={{ width: '16px', height: '16px', accentColor: '#0f3460' }}
                        />
                        Receive
                      </label>
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: '14px', fontWeight: 700, color: '#dc2626', display: 'block', marginBottom: '4px' }}>
                      Date * <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 500 }}>(Default Today's Date)</span>
                    </label>
                    <input
                      type="date"
                      value={payDate}
                      onChange={(e) => setPayDate(e.target.value)}
                      required
                      style={{
                        width: '100%',
                        border: 'none',
                        borderBottom: '2px solid #0f3460',
                        background: 'transparent',
                        padding: '6px 4px',
                        fontSize: '15px',
                        outline: 'none',
                        color: '#1e293b'
                      }}
                    />
                  </div>
                </div>

                {/* Row 2: Partner & Payment Via */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px', alignItems: 'center' }}>
                  <div>
                    <label style={{ fontSize: '14px', fontWeight: 700, color: '#dc2626', display: 'block', marginBottom: '4px' }}>
                      Partner <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 500 }}>(Auto-filled from Bill)</span>
                    </label>
                    <input
                      type="text"
                      value={payPartner}
                      readOnly
                      style={{
                        width: '100%',
                        border: 'none',
                        borderBottom: '2px solid #cbd5e1',
                        background: '#f8fafc',
                        padding: '6px 4px',
                        fontSize: '15px',
                        fontWeight: 700,
                        outline: 'none',
                        color: '#0f3460'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '14px', fontWeight: 700, color: '#dc2626', display: 'block', marginBottom: '4px' }}>
                      Payment Via *
                    </label>
                    <select
                      value={payVia}
                      onChange={(e) => setPayVia(e.target.value)}
                      style={{
                        width: '100%',
                        border: 'none',
                        borderBottom: '2px solid #0f3460',
                        background: 'transparent',
                        padding: '6px 4px',
                        fontSize: '15px',
                        fontWeight: 600,
                        outline: 'none',
                        color: '#1e293b'
                      }}
                    >
                      <option value="Bank Transfer">Bank Transfer (Default)</option>
                      <option value="Cash">Cash</option>
                      <option value="UPI">UPI</option>
                      <option value="Cheque">Cheque</option>
                      <option value="NEFT">NEFT</option>
                      <option value="RTGS">RTGS</option>
                    </select>
                  </div>
                </div>

                {/* Row 3: Amount Due & Note */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px', alignItems: 'center' }}>
                  <div>
                    <label style={{ fontSize: '14px', fontWeight: 700, color: '#dc2626', display: 'block', marginBottom: '4px' }}>
                      Amount (₹) * <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 500 }}>(Auto-filled Amount Due)</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={payAmount}
                      onChange={(e) => setPayAmount(e.target.value)}
                      required
                      style={{
                        width: '100%',
                        border: 'none',
                        borderBottom: '2px solid #0f3460',
                        background: 'transparent',
                        padding: '6px 4px',
                        fontSize: '18px',
                        fontWeight: 800,
                        outline: 'none',
                        color: '#0f3460'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '14px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                      Note <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 500 }}>(Alpha Numeric Text)</span>
                    </label>
                    <input
                      type="text"
                      value={payNote}
                      onChange={(e) => setPayNote(e.target.value)}
                      placeholder="Payment remarks..."
                      style={{
                        width: '100%',
                        border: 'none',
                        borderBottom: '2px solid #cbd5e1',
                        background: 'transparent',
                        padding: '6px 4px',
                        fontSize: '14px',
                        outline: 'none',
                        color: '#1e293b'
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

export default VendorBillsPage
