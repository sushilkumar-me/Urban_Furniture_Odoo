import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import api from '../api'
import { downloadPaymentVoucher } from '../utils/voucherGenerator'

const todayStr = () => new Date().toISOString().split('T')[0]

const emptyForm = {
  sales_order_id:    '',
  invoice_number:    '',
  invoice_reference: '',
  customer_name:     '',
  invoice_date:      todayStr(),
  due_date:          '',
  status:            'Not Paid',
  total_amount:      0,
  amount_paid:       0
}

function CustomerInvoicesPage() {
  const [invoices, setInvoices]       = useState([])
  const [sos, setSOs]                 = useState([])
  const [accounts, setAccounts]       = useState([])
  const [analytics, setAnalytics]     = useState([])
  const [contacts, setContacts]       = useState([])
  const [showForm, setShowForm]       = useState(false)
  const [editingId, setEditingId]     = useState(null)
  const [formData, setFormData]       = useState(emptyForm)
  const [selectedSO, setSelectedSO]   = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState('All')
  const [error, setError]             = useState('')
  const [success, setSuccess]         = useState('')
  const [loading, setLoading]         = useState(false)

  // Invoice Payment Modal State (Matching Excalidraw Wireframe)
  const [showPayModal, setShowPayModal]       = useState(false)
  const [payPaymentType, setPayPaymentType]   = useState('Receive')
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
      const [invRes, soRes, accRes, anaRes, cRes] = await Promise.all([
        api.get('/customer-invoices/'),
        api.get('/sales-orders/'),
        api.get('/accounts/'),
        api.get('/analytic-accounts/'),
        api.get('/contacts/')
      ])
      setInvoices(invRes.data)
      setSOs(soRes.data)
      setAccounts(accRes.data)
      setAnalytics(anaRes.data)
      setContacts(cRes.data)

      // Handle query param ?so_id=XYZ
      const params = new URLSearchParams(location.search)
      const targetSoId = params.get('so_id')
      if (targetSoId) {
        const so = soRes.data.find(s => String(s.id) === String(targetSoId))
        if (so) {
          handlePrefillFromSO(so, invRes.data.length, invRes.data)
        }
      }
    } catch {
      setError('Failed to load customer invoices data.')
    }
  }

  const fetchInvoices = async () => {
    try {
      const r = await api.get('/customer-invoices/')
      setInvoices(r.data)
    } catch {
      setError('Failed to refresh customer invoices.')
    }
  }

  const generateInvoiceNumber = (count) => {
    const nextSeq = (count !== undefined ? count : invoices.length) + 1
    return `INV/2026/${String(nextSeq).padStart(4, '0')}`
  }

  const handlePrefillFromSO = (so, count, allInvoices = null) => {
    const invList = allInvoices || invoices
    const existingInv = invList.find(i => Number(i.sales_order_id) === Number(so.id))
    if (existingInv) {
      openEditForm(existingInv)
      setSuccess(`Opened existing Customer Invoice "${existingInv.invoice_number}" for SO ${so.so_number}.`)
      return
    }

    setSelectedSO(so)
    setFormData({
      sales_order_id:    String(so.id),
      invoice_number:    generateInvoiceNumber(count),
      invoice_reference: `SO-REF-${so.so_number}`,
      customer_name:     so.customer?.name || '',
      invoice_date:      todayStr(),
      due_date:          '',
      status:            'Not Paid',
      total_amount:      Number(so.total_amount) || 0,
      amount_paid:       0
    })
    setEditingId(null)
    setShowForm(true)
  }

  const handleNew = () => {
    const invoicedSoIds = new Set(invoices.map(i => Number(i.sales_order_id)))
    const unbilledSO = sos.find(s => s.status === 'Confirmed' && !invoicedSoIds.has(Number(s.id))) || sos.find(s => !invoicedSoIds.has(Number(s.id)))
    if (unbilledSO) {
      handlePrefillFromSO(unbilledSO, invoices.length)
    } else {
      setFormData({
        ...emptyForm,
        invoice_number: generateInvoiceNumber(invoices.length)
      })
      setSelectedSO(null)
      setShowForm(true)
    }
  }

  const openEditForm = (inv) => {
    const matchedSO = sos.find(s => s.id === inv.sales_order_id)
    setSelectedSO(matchedSO || null)

    // Compute status pill: Paid / Partial / Not Paid
    let computedStatus = 'Not Paid'
    if (inv.status === 'Paid') computedStatus = 'Paid'
    else if (inv.status === 'Partial') computedStatus = 'Partial'

    setFormData({
      sales_order_id:    String(inv.sales_order_id),
      invoice_number:    inv.invoice_number,
      invoice_reference: matchedSO ? `SO-REF-${matchedSO.so_number}` : 'REF-MANUAL',
      customer_name:     matchedSO?.customer?.name || 'Customer',
      invoice_date:      inv.invoice_date || todayStr(),
      due_date:          inv.due_date || '',
      status:            computedStatus,
      total_amount:      Number(inv.total_amount) || 0,
      amount_paid:       inv.status === 'Paid' ? Number(inv.total_amount) : 0
    })
    setEditingId(inv.id)
    setError('')
    setSuccess('')
    setShowForm(true)
  }

  const closeForm = () => {
    setShowForm(false)
    setEditingId(null)
    setSelectedSO(null)
    setFormData(emptyForm)
    setError('')
  }

  const handleHeaderChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
    if (e.target.name === 'sales_order_id' && e.target.value) {
      const existingInv = invoices.find(i => String(i.sales_order_id) === e.target.value)
      if (existingInv && existingInv.id !== editingId) {
        openEditForm(existingInv)
        setSuccess(`Opened existing Customer Invoice "${existingInv.invoice_number}" for this Sales Order.`)
        return
      }
      const so = sos.find(s => String(s.id) === e.target.value)
      if (so) {
        setSelectedSO(so)
        setFormData(prev => ({
          ...prev,
          sales_order_id:    String(so.id),
          invoice_reference: `SO-REF-${so.so_number}`,
          customer_name:     so.customer?.name || '',
          total_amount:      Number(so.total_amount) || 0
        }))
      }
    }
    if (error) setError('')
  }

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault()
    setError('')
    setLoading(true)

    if (!formData.sales_order_id) {
      setError('Please link a Sales Order.')
      setLoading(false)
      return
    }
    if (!formData.invoice_number.trim()) {
      setError('Invoice Number is required.')
      setLoading(false)
      return
    }

    const payload = {
      sales_order_id: Number(formData.sales_order_id),
      invoice_number: formData.invoice_number.trim(),
      invoice_date:   formData.invoice_date,
      due_date:       formData.due_date || null,
      total_amount:   Number(formData.total_amount)
    }

    try {
      if (editingId) {
        await api.patch(`/customer-invoices/${editingId}`, {
          invoice_number: formData.invoice_number.trim(),
          invoice_date:   formData.invoice_date,
          due_date:       formData.due_date || null
        })
        setSuccess(`Customer Invoice "${formData.invoice_number}" updated.`)
      } else {
        const existingInv = invoices.find(i => Number(i.sales_order_id) === Number(formData.sales_order_id))
        if (existingInv) {
          setEditingId(existingInv.id)
          await api.patch(`/customer-invoices/${existingInv.id}`, {
            invoice_number: formData.invoice_number.trim(),
            invoice_date:   formData.invoice_date,
            due_date:       formData.due_date || null
          })
          setSuccess(`Updated existing Customer Invoice "${formData.invoice_number}".`)
        } else {
          await api.post('/customer-invoices/', payload)
          setSuccess(`Customer Invoice "${formData.invoice_number}" created successfully.`)
        }
      }
      await fetchInvoices()
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
        setError('Failed to save customer invoice.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleConfirmInvoice = async () => {
    let invIdToConfirm = editingId
    if (!invIdToConfirm) {
      const existingInv = invoices.find(i => Number(i.sales_order_id) === Number(formData.sales_order_id))
      if (existingInv) {
        invIdToConfirm = existingInv.id
        setEditingId(existingInv.id)
      } else {
        if (!formData.sales_order_id) {
          setError('Please select a Sales Order first.')
          return
        }
        try {
          setLoading(true)
          const res = await api.post('/customer-invoices/', {
            sales_order_id: Number(formData.sales_order_id),
            invoice_number: formData.invoice_number.trim() || `INV-AUTO-${Date.now().toString().slice(-4)}`,
            invoice_date:   formData.invoice_date || todayStr(),
            due_date:       formData.due_date || null,
            total_amount:   Number(formData.total_amount)
          })
          invIdToConfirm = res.data.id
          setEditingId(res.data.id)
        } catch (err) {
          setError(err.response?.data?.detail || 'Failed to create customer invoice.')
          setLoading(false)
          return
        }
      }
    }

    try {
      setLoading(true)
      await api.patch(`/customer-invoices/${invIdToConfirm}`, { status: 'Posted' })
      setSuccess(`Customer Invoice "${formData.invoice_number}" Confirmed & Posted to General Ledger!`)
      setFormData(prev => ({ ...prev, status: 'Not Paid' }))
      await fetchInvoices()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to confirm customer invoice.')
    } finally {
      setLoading(false)
    }
  }

  const handleCancelInvoice = async () => {
    if (!editingId) {
      closeForm()
      return
    }
    if (!window.confirm(`Cancel invoice "${formData.invoice_number}"?`)) return
    try {
      setLoading(true)
      await api.patch(`/customer-invoices/${editingId}`, { status: 'Draft' })
      setSuccess(`Customer invoice "${formData.invoice_number}" reverted to Draft.`)
      await fetchInvoices()
      closeForm()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to cancel invoice.')
    } finally {
      setLoading(false)
    }
  }

  // [ Pay ] -> Opens Invoice Payment Modal showing Payment Type, Partner, Payment Via, Amount, Date, etc.
  const handlePayInvoice = () => {
    if (!editingId) {
      setError('Please save or confirm the customer invoice first.')
      return
    }
    const amt = Number(formData.total_amount || 0)
    setPayPaymentType('Receive')
    setPayPartner(formData.customer_name || selectedSO?.customer?.name || 'Customer')
    setPayAmount(String(amt))
    setPayDate(todayStr())
    setPayVia('Bank Transfer')
    setPayNote(`Settlement for Customer Invoice ${formData.invoice_number}`)
    setPayStatus('Draft')
    setShowPayGearMenu(false)
    setShowPayModal(true)
  }

  // [ Confirm ] inside Invoice Payment Modal -> Posts receipt, marks invoice Paid & prints/downloads voucher!
  const handleConfirmPaymentModal = async (e) => {
    if (e && e.preventDefault) e.preventDefault()
    if (!payAmount || Number(payAmount) <= 0) {
      setError('Please enter a valid payment amount.')
      return
    }

    try {
      setPayLoading(true)
      // If invoice is still Draft, post it first
      if (formData.status !== 'Posted' && formData.status !== 'Not Paid' && formData.status !== 'Paid') {
        await api.patch(`/customer-invoices/${editingId}`, { status: 'Posted' })
      }

      const payPayload = {
        payment_type:        'Receive',
        payment_method:      payVia,
        payment_date:        payDate,
        amount:              Number(payAmount),
        note:                payNote || null,
        vendor_bill_id:      null,
        customer_invoice_id: Number(editingId)
      }
      const res = await api.post('/payments/', payPayload)

      setPayStatus('Confirm')
      setFormData(prev => ({ ...prev, status: 'Paid', amount_paid: Number(payAmount) }))
      setSuccess(`Payment receipt of ₹${Number(payAmount).toLocaleString('en-IN')} confirmed! Downloading voucher...`)

      // Auto-trigger official voucher download
      downloadPaymentVoucher({
        voucherNo:     `VOUCH-REC-${String(res.data?.id || editingId).padStart(4, '0')}`,
        paymentType:   'Receive',
        paymentDate:   payDate,
        paymentMethod: payVia,
        partnerName:   payPartner,
        documentRef:   formData.invoice_number,
        soNumber:      selectedSO?.so_number,
        amount:        Number(payAmount),
        note:          payNote
      })

      await fetchInvoices()

      setTimeout(() => {
        setShowPayModal(false)
      }, 1200)
    } catch (err) {
      const detail = err.response?.data?.detail
      setError(typeof detail === 'string' ? detail : 'Failed to record payment receipt.')
    } finally {
      setPayLoading(false)
    }
  }

  // Download existing voucher on demand
  const handleDownloadExistingVoucher = (inv = null) => {
    const item = inv || {
      id: editingId,
      invoice_number: formData.invoice_number,
      total_amount: formData.total_amount,
      invoice_date: formData.invoice_date,
      customer_name: formData.customer_name,
      sales_order: selectedSO
    }
    const amt = Number(item.total_amount || 0)
    const custName = item.sales_order?.customer?.name || item.customer_name || formData.customer_name || 'Customer'
    downloadPaymentVoucher({
      voucherNo:     `VOUCH-REC-${String(item.id).padStart(4, '0')}`,
      paymentType:   'Receive',
      paymentDate:   item.invoice_date || todayStr(),
      paymentMethod: 'Bank Transfer',
      partnerName:   custName,
      documentRef:   item.invoice_number,
      soNumber:      item.sales_order?.so_number || selectedSO?.so_number,
      amount:        amt,
      note:          `Settlement for Customer Invoice ${item.invoice_number}`
    })
    setSuccess(`Receipt Voucher downloaded for ${item.invoice_number}!`)
  }

  const handleDelete = async (inv, e) => {
    if (e) e.stopPropagation()
    if (!window.confirm(`Delete invoice "${inv.invoice_number}"?`)) return
    try {
      await api.delete(`/customer-invoices/${inv.id}`)
      setSuccess(`Customer Invoice "${inv.invoice_number}" deleted.`)
      await fetchInvoices()
    } catch (err) {
      const detail = err.response?.data?.detail
      setError(typeof detail === 'string' ? detail : 'Failed to delete invoice.')
    }
  }

  // Filter invoices
  const filteredInvoices = invoices.filter(inv => {
    if (filterStatus !== 'All' && inv.status !== filterStatus) return false
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      const matchNum = (inv.invoice_number || '').toLowerCase().includes(q)
      const matchSo  = (inv.sales_order?.so_number || '').toLowerCase().includes(q)
      const matchCust = (inv.sales_order?.customer?.name || '').toLowerCase().includes(q)
      if (!matchNum && !matchSo && !matchCust) return false
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

  // Default Chart of Account for Sales is 'Sales Income A/c'
  const defaultSalesAccount = accounts.find(a => a.account_name === 'Sales Income A/c') || { account_name: 'Sales Income A/c' }

  // Items from selected SO
  const soLineItems = selectedSO?.items || []
  const totalInvoiceAmount = Number(formData.total_amount) || 0
  const paidViaCash = formData.status === 'Paid' ? totalInvoiceAmount : 0
  const paidViaBank = 0
  const amountDue = Math.max(0, totalInvoiceAmount - (paidViaCash + paidViaBank))

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
      {/* 1. CUSTOMER INVOICE FORM VIEW                                */}
      {/* ============================================================ */}
      {showForm ? (
        <div>
          {/* Top Title: Customer Invoice */}
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <h1 style={{
              fontSize: '28px',
              fontWeight: 800,
              color: '#1a1a2e',
              letterSpacing: '-0.5px',
              margin: 0
            }}>
              Customer Invoice
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
                  [ New ] [ Confirm ] [ Pay ]  ...  [ SO ] [ Budget ] [ Cancel ] [ Back ] */}
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
                    onClick={handleConfirmInvoice}
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
                    onClick={handlePayInvoice}
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
                    title={formData.status === 'Paid' ? 'Invoice is already Paid' : 'Receive payment and download voucher'}
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

                {/* Right Group: Smart Pill Buttons [ SO ] [ Budget ] [ Cancel ] [ Back ] */}
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  {/* Smart Pill [ SO ] - only show if created from SO */}
                  {selectedSO && (
                    <button
                      type="button"
                      onClick={() => navigate('/sales-orders')}
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
                      title="On click open the SO from which Invoice Created"
                    >
                      SO ({selectedSO.so_number})
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
                    title="On click open the Budget Analytic Report that is used in the invoice"
                  >
                    Budget
                  </button>

                  <button
                    type="button"
                    onClick={handleCancelInvoice}
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
                  {/* Left Column: Customer Invoice No, Customer Name, Status */}
                  <div>
                    {/* Customer Invoice No. */}
                    <div style={{ marginBottom: '20px' }}>
                      <label htmlFor="invoice_number" style={{ fontSize: '15px', fontWeight: 700, color: '#dc2626', display: 'block', marginBottom: '4px' }}>
                        Customer Invoice No. * <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 500 }}>(Auto-generated sequence)</span>
                      </label>
                      <input
                        type="text"
                        id="invoice_number"
                        name="invoice_number"
                        value={formData.invoice_number}
                        onChange={handleHeaderChange}
                        placeholder="e.g. INV/2026/0001"
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

                    {/* Linked SO Selector */}
                    <div style={{ marginBottom: '20px' }}>
                      <label htmlFor="sales_order_id" style={{ fontSize: '15px', fontWeight: 700, color: '#dc2626', display: 'block', marginBottom: '4px' }}>
                        Linked Sales Order *
                      </label>
                      <select
                        id="sales_order_id"
                        name="sales_order_id"
                        value={formData.sales_order_id}
                        onChange={handleHeaderChange}
                        required
                        style={{
                          ...underlineInputStyle,
                          fontWeight: 600,
                          borderBottomColor: '#0f3460',
                          cursor: 'pointer'
                        }}
                      >
                        <option value="">-- Select Confirmed SO --</option>
                        {sos.map(s => {
                          const isInvoiced = invoices.some(i => Number(i.sales_order_id) === Number(s.id) && i.id !== editingId)
                          return (
                            <option key={s.id} value={s.id}>
                              {s.so_number} – {s.customer?.name} (₹{Number(s.total_amount).toLocaleString('en-IN')}) {isInvoiced ? '— [Invoice Already Created]' : ''}
                            </option>
                          )
                        })}
                      </select>
                    </div>

                    {/* Customer Name */}
                    <div style={{ marginBottom: '20px' }}>
                      <label htmlFor="customer_name" style={{ fontSize: '15px', fontWeight: 700, color: '#dc2626', display: 'block', marginBottom: '4px' }}>
                        Customer Name * <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 500 }}>(From Contact Master)</span>
                      </label>
                      <input
                        type="text"
                        id="customer_name"
                        name="customer_name"
                        value={formData.customer_name}
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

                  {/* Right Column: Invoice Reference, Invoice Date, Due Date */}
                  <div>
                    {/* Invoice Reference */}
                    <div style={{ marginBottom: '20px' }}>
                      <label htmlFor="invoice_reference" style={{ fontSize: '15px', fontWeight: 700, color: '#dc2626', display: 'block', marginBottom: '4px' }}>
                        Invoice Reference <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 500 }}>(Alpha-numeric Text)</span>
                      </label>
                      <input
                        type="text"
                        id="invoice_reference"
                        name="invoice_reference"
                        value={formData.invoice_reference}
                        onChange={handleHeaderChange}
                        placeholder="e.g. ABC-26-001"
                        style={{
                          ...underlineInputStyle,
                          borderBottomColor: '#0f3460'
                        }}
                      />
                    </div>

                    {/* Invoice Date */}
                    <div style={{ marginBottom: '20px' }}>
                      <label htmlFor="invoice_date" style={{ fontSize: '15px', fontWeight: 700, color: '#dc2626', display: 'block', marginBottom: '4px' }}>
                        Invoice Date *
                      </label>
                      <input
                        type="date"
                        id="invoice_date"
                        name="invoice_date"
                        value={formData.invoice_date}
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
                  Sr. No. | Product | Chart of Accounts | Budget Analytics | Qty | Unit Price | Total */}
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
                          Chart of Accounts <span style={{ fontSize: '11px', color: '#059669' }}>(Default: Sales)</span>
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
                      {soLineItems.length === 0 ? (
                        <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ textAlign: 'center', padding: '12px 6px', color: '#64748b' }}>1.</td>
                          <td style={{ padding: '12px 12px', fontWeight: 600, color: '#0f3460' }}>
                            {selectedSO ? 'Furniture Products' : 'Custom Item'}
                          </td>
                          <td style={{ padding: '12px 12px', color: '#059669', fontWeight: 600 }}>
                            {defaultSalesAccount.account_name}
                          </td>
                          <td style={{ padding: '12px 12px', color: '#64748b' }}>
                            Furniture (Income)
                          </td>
                          <td style={{ textAlign: 'center', padding: '12px 8px', fontWeight: 600 }}>1</td>
                          <td style={{ textAlign: 'right', padding: '12px 10px', fontWeight: 600 }}>
                            ₹{totalInvoiceAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td style={{ textAlign: 'right', padding: '12px 12px', fontWeight: 700, color: '#0f3460' }}>
                            ₹{totalInvoiceAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ) : (
                        soLineItems.map((it, idx) => (
                          <tr key={it.id || idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ textAlign: 'center', padding: '12px 6px', color: '#64748b' }}>{idx + 1}.</td>
                            <td style={{ padding: '12px 12px', fontWeight: 600, color: '#0f3460' }}>
                              {it.product?.product_name || `Product #${it.product_id}`}
                            </td>
                            <td style={{ padding: '12px 12px', color: '#059669', fontWeight: 600 }}>
                              {defaultSalesAccount.account_name}
                            </td>
                            <td style={{ padding: '12px 12px', color: '#475569' }}>
                              {it.analytic_account?.analytic_name || 'Furniture (Income)'}
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
                          ₹{totalInvoiceAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
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
                      <tr style={{ background: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
                        <td colSpan="6" style={{ textAlign: 'right', padding: '10px 16px', fontWeight: 700, fontSize: '14px', color: amountDue > 0 ? '#dc2626' : '#16a34a' }}>
                          Amount Due:
                        </td>
                        <td style={{ textAlign: 'right', padding: '10px 16px', fontWeight: 800, fontSize: '15px', color: amountDue > 0 ? '#dc2626' : '#16a34a' }}>
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
                As soon as the Customer Invoice is confirmed, a journal entry is posted to General Ledger (Debit: <strong>Debtors A/c</strong>, Credit: <strong>Sales Income A/c</strong>).
              </div>

            </form>
          </div>
        </div>
      ) : (
        /* ============================================================ */
        /* 2. CUSTOMER INVOICES LIST VIEW                               */
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
              Customer Invoices (List View)
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
                  placeholder="Search invoices..."
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

            {/* Invoices Table */}
            {filteredInvoices.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '48px 20px',
                color: '#64748b',
                fontSize: '15px'
              }}>
                No customer invoices found. Click <strong>"New"</strong> or create one from a confirmed Sales Order.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                      <th style={{ textAlign: 'left', padding: '12px 14px', fontSize: '14px', color: '#1e293b', fontWeight: 700 }}>
                        Customer Invoice No.
                      </th>
                      <th style={{ textAlign: 'left', padding: '12px 14px', fontSize: '14px', color: '#1e293b', fontWeight: 700 }}>
                        Customer Name
                      </th>
                      <th style={{ textAlign: 'left', padding: '12px 14px', fontSize: '14px', color: '#1e293b', fontWeight: 700 }}>
                        Source SO
                      </th>
                      <th style={{ textAlign: 'left', padding: '12px 14px', fontSize: '14px', color: '#1e293b', fontWeight: 700 }}>
                        Invoice Date
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
                    {filteredInvoices.map((inv) => (
                      <tr
                        key={inv.id}
                        onClick={() => openEditForm(inv)}
                        style={{
                          borderBottom: '1px solid #f1f5f9',
                          cursor: 'pointer',
                          transition: 'background 0.15s ease'
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = '#f8fafc' }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = '#ffffff' }}
                      >
                        <td style={{ padding: '12px 14px', fontWeight: 700, color: '#0f3460' }}>
                          {inv.invoice_number}
                        </td>
                        <td style={{ padding: '12px 14px', fontWeight: 600, color: '#1e293b' }}>
                          {inv.sales_order?.customer?.name || 'Customer'}
                        </td>
                        <td style={{ padding: '12px 14px', color: '#475569' }}>
                          {inv.sales_order?.so_number || '-'}
                        </td>
                        <td style={{ padding: '12px 14px', color: '#475569' }}>
                          {inv.invoice_date || '-'}
                        </td>
                        <td style={{ padding: '12px 14px', color: '#475569' }}>
                          {inv.due_date || '-'}
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700, color: '#0f3460' }}>
                          ₹{Number(inv.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                          <span style={{
                            display: 'inline-block',
                            padding: '4px 12px',
                            borderRadius: '12px',
                            fontSize: '12px',
                            fontWeight: 700,
                            background: inv.status === 'Paid' ? '#dcfce7' : inv.status === 'Posted' ? '#e0e7ff' : '#fef3c7',
                            color: inv.status === 'Paid' ? '#166534' : inv.status === 'Posted' ? '#3730a3' : '#92400e'
                          }}>
                            {inv.status}
                          </span>
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', alignItems: 'center' }}>
                            {inv.status === 'Paid' && (
                              <button
                                type="button"
                                onClick={() => handleDownloadExistingVoucher(inv)}
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
                                title="Download Payment Receipt Voucher"
                              >
                                📥 Voucher
                              </button>
                            )}
                            <button
                              onClick={(e) => { e.stopPropagation(); openEditForm(inv) }}
                              style={{
                                background: '#f8fafc',
                                border: '1px solid #cbd5e1',
                                color: '#0f3460',
                                borderRadius: '6px',
                                padding: '4px 10px',
                                fontSize: '12px',
                                fontWeight: 600,
                                cursor: 'pointer'
                              }}
                            >
                              View
                            </button>
                            <button
                              onClick={(e) => handleDelete(inv, e)}
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
                              title="Delete Invoice"
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
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* INVOICE PAYMENT MODAL (Matching Excalidraw Wireframe)        */}
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
                Invoice Payment
              </h2>
              <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
                Collection for Customer Invoice: <strong>{formData.invoice_number}</strong>
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
                              voucherNo: `VOUCH-REC-${String(editingId).padStart(4, '0')}`,
                              paymentType: 'Receive',
                              paymentDate: payDate,
                              paymentMethod: payVia,
                              partnerName: payPartner,
                              documentRef: formData.invoice_number,
                              soNumber: selectedSO?.so_number,
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
                          1. 🖨️ Print Receipt
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            alert(`Receipt email dispatched to ${payPartner}!`)
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
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: 600, color: '#64748b' }}>
                        <input
                          type="radio"
                          name="modal_inv_payment_type"
                          value="Send"
                          disabled
                          style={{ width: '16px', height: '16px', accentColor: '#0f3460' }}
                        />
                        Send
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>
                        <input
                          type="radio"
                          name="modal_inv_payment_type"
                          value="Receive"
                          checked={payPaymentType === 'Receive'}
                          onChange={() => setPayPaymentType('Receive')}
                          style={{ width: '16px', height: '16px', accentColor: '#0f3460' }}
                        />
                        Receive (Customer Invoice)
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
                      Partner <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 500 }}>(Auto-filled from Invoice)</span>
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

export default CustomerInvoicesPage
