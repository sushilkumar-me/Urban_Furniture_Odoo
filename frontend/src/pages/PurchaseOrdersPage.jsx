import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api'

const todayStr = () => new Date().toISOString().split('T')[0]

const emptyForm = {
  vendor_id: '',
  po_number: '',
  po_date:   todayStr(),
  status:    'Draft',
  items: [
    { product_id: '', analytic_account_id: '', quantity: 1, unit_price: '' }
  ]
}

function PurchaseOrdersPage() {
  const [pos, setPOs]                 = useState([])
  const [vendors, setVendors]         = useState([])
  const [products, setProducts]       = useState([])
  const [analytics, setAnalytics]     = useState([])
  const [showForm, setShowForm]       = useState(false)
  const [editingId, setEditingId]     = useState(null)
  const [formData, setFormData]       = useState(emptyForm)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState('All')
  const [error, setError]             = useState('')
  const [success, setSuccess]         = useState('')
  const [loading, setLoading]         = useState(false)

  const navigate = useNavigate()

  useEffect(() => {
    fetchInitialData()
  }, [])

  const fetchInitialData = async () => {
    try {
      const [poRes, contactRes, prodRes, anaRes] = await Promise.all([
        api.get('/purchase-orders/'),
        api.get('/contacts/'),
        api.get('/products/'),
        api.get('/analytic-accounts/')
      ])
      setPOs(poRes.data)
      setVendors(contactRes.data)
      setProducts(prodRes.data)
      setAnalytics(anaRes.data)
    } catch {
      setError('Failed to load purchase order data.')
    }
  }

  const fetchPOs = async () => {
    try {
      const r = await api.get('/purchase-orders/')
      setPOs(r.data)
    } catch {
      setError('Failed to refresh purchase orders.')
    }
  }

  // Generate sequence PO number: P00001, P00002...
  const generatePONumber = () => {
    const nextSeq = pos.length + 1
    return `P${String(nextSeq).padStart(5, '0')}`
  }

  const handleNew = () => {
    setFormData({
      vendor_id: vendors.length > 0 ? String(vendors[0].id) : '',
      po_number: generatePONumber(),
      po_date:   todayStr(),
      status:    'Draft',
      items: [
        {
          product_id: products.length > 0 ? String(products[0].id) : '',
          analytic_account_id: analytics.length > 0 ? String(analytics[0].id) : '',
          quantity: 1,
          unit_price: products.length > 0 ? String(products[0].cost_price || 0) : ''
        }
      ]
    })
    setEditingId(null)
    setError('')
    setSuccess('')
    setShowForm(true)
  }

  const openEditForm = (po) => {
    setFormData({
      vendor_id: String(po.vendor_id),
      po_number: po.po_number,
      po_date:   po.po_date || todayStr(),
      status:    po.status || 'Draft',
      items: po.items && po.items.length > 0
        ? po.items.map(it => ({
            product_id:          String(it.product_id),
            analytic_account_id: it.analytic_account_id ? String(it.analytic_account_id) : '',
            quantity:            it.quantity,
            unit_price:          String(it.unit_price)
          }))
        : [{ product_id: '', analytic_account_id: '', quantity: 1, unit_price: '' }]
    })
    setEditingId(po.id)
    setError('')
    setSuccess('')
    setShowForm(true)
  }

  const closeForm = () => {
    setShowForm(false)
    setEditingId(null)
    setFormData(emptyForm)
    setError('')
  }

  const handleHeaderChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
    if (error) setError('')
  }

  const handleItemChange = (idx, field, val) => {
    const updated = [...formData.items]
    updated[idx] = { ...updated[idx], [field]: val }

    // When product changes, auto-fill standard cost price
    if (field === 'product_id' && val) {
      const prod = products.find(p => String(p.id) === String(val))
      if (prod) {
        updated[idx].unit_price = String(prod.cost_price || 0)
      }
    }
    setFormData({ ...formData, items: updated })
  }

  const addLine = () => {
    setFormData({
      ...formData,
      items: [
        ...formData.items,
        {
          product_id: products.length > 0 ? String(products[0].id) : '',
          analytic_account_id: analytics.length > 0 ? String(analytics[0].id) : '',
          quantity: 1,
          unit_price: products.length > 0 ? String(products[0].cost_price || 0) : ''
        }
      ]
    })
  }

  const removeLine = (idx) => {
    if (formData.items.length === 1) return
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== idx)
    })
  }

  // Calculations
  const calculateTotal = () => {
    return formData.items.reduce((sum, it) => {
      const q = Number(it.quantity) || 0
      const p = Number(it.unit_price) || 0
      return sum + (q * p)
    }, 0)
  }

  // Lifecycle Actions
  const handleConfirmPO = async () => {
    if (!editingId) {
      // If still creating, submit with Confirmed status
      await handleSubmit(null, 'Confirmed')
      return
    }
    try {
      setLoading(true)
      await api.patch(`/purchase-orders/${editingId}/status`, { status: 'Confirmed' })
      setSuccess(`Purchase Order "${formData.po_number}" Confirmed!`)
      setFormData(prev => ({ ...prev, status: 'Confirmed' }))
      await fetchPOs()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to confirm purchase order.')
    } finally {
      setLoading(false)
    }
  }

  const handleCancelPO = async () => {
    if (!editingId) {
      closeForm()
      return
    }
    if (!window.confirm(`Cancel purchase order "${formData.po_number}"?`)) return
    try {
      setLoading(true)
      await api.patch(`/purchase-orders/${editingId}/status`, { status: 'Cancelled' })
      setSuccess(`Purchase Order "${formData.po_number}" Cancelled.`)
      setFormData(prev => ({ ...prev, status: 'Cancelled' }))
      await fetchPOs()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to cancel purchase order.')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateBill = () => {
    if (!editingId) return
    navigate(`/vendor-bills?po_id=${editingId}`)
  }

  const handleSubmit = async (e, overrideStatus = null) => {
    if (e && e.preventDefault) e.preventDefault()
    setError('')
    setLoading(true)

    if (!formData.vendor_id) {
      setError('Please select a Vendor.')
      setLoading(false)
      return
    }
    if (!formData.po_number.trim()) {
      setError('PO Number is required.')
      setLoading(false)
      return
    }
    if (formData.items.length === 0 || !formData.items[0].product_id) {
      setError('At least one product line item is required.')
      setLoading(false)
      return
    }

    const payload = {
      vendor_id:  Number(formData.vendor_id),
      created_by: 1, // Default to admin
      po_number:  formData.po_number.trim(),
      po_date:    formData.po_date,
      items: formData.items.map(it => ({
        product_id:          Number(it.product_id),
        analytic_account_id: it.analytic_account_id ? Number(it.analytic_account_id) : null,
        quantity:            Number(it.quantity) || 1,
        unit_price:          Number(it.unit_price) || 0
      }))
    }

    try {
      if (editingId) {
        // If already exists, update status if requested
        if (overrideStatus) {
          await api.patch(`/purchase-orders/${editingId}/status`, { status: overrideStatus })
        }
        setSuccess(`Purchase Order "${formData.po_number}" updated.`)
      } else {
        const res = await api.post('/purchase-orders/', payload)
        if (overrideStatus && overrideStatus !== 'Draft') {
          await api.patch(`/purchase-orders/${res.data.id}/status`, { status: overrideStatus })
        }
        setSuccess(`Purchase Order "${formData.po_number}" created successfully.`)
      }
      await fetchPOs()
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
        setError('Failed to save purchase order.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (po, e) => {
    if (e) e.stopPropagation()
    if (!window.confirm(`Delete purchase order "${po.po_number}"?`)) return
    try {
      await api.delete(`/purchase-orders/${po.id}`)
      setSuccess(`Purchase Order "${po.po_number}" deleted.`)
      await fetchPOs()
    } catch (err) {
      const detail = err.response?.data?.detail
      setError(typeof detail === 'string' ? detail : 'Failed to delete PO.')
    }
  }

  // Filter POs for list
  const filteredPOs = pos.filter(p => {
    if (filterStatus !== 'All' && p.status !== filterStatus) return false
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      const matchNum = (p.po_number || '').toLowerCase().includes(q)
      const matchV   = (p.vendor?.name || '').toLowerCase().includes(q)
      if (!matchNum && !matchV) return false
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

  return (
    <div className="page-container" style={{ maxWidth: '1000px', margin: '0 auto', padding: '24px 16px' }}>

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
      {/* 1. PURCHASE ORDER FORM VIEW                                  */}
      {/* ============================================================ */}
      {showForm ? (
        <div>
          {/* Top Title: Purchase Order */}
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <h1 style={{
              fontSize: '28px',
              fontWeight: 800,
              color: '#1a1a2e',
              letterSpacing: '-0.5px',
              margin: 0
            }}>
              Purchase Order
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

              {/* Action Bar matching wireframe: [ New ] [ Confirm ] [ Create Bill ] ... [ Cancel ] [ Back ] */}
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
                    onClick={handleConfirmPO}
                    disabled={loading || formData.status === 'Confirmed'}
                    style={{
                      background: formData.status === 'Draft' ? '#0f3460' : '#e2e8f0',
                      border: '2px solid',
                      borderColor: formData.status === 'Draft' ? '#0f3460' : '#cbd5e1',
                      color: formData.status === 'Draft' ? '#ffffff' : '#64748b',
                      fontWeight: 700,
                      fontSize: '14px',
                      borderRadius: '10px',
                      padding: '7px 22px',
                      cursor: formData.status === 'Draft' ? 'pointer' : 'not-allowed',
                      boxShadow: formData.status === 'Draft' ? '0 2px 8px rgba(15, 52, 96, 0.2)' : 'none'
                    }}
                  >
                    Confirm
                  </button>

                  <button
                    type="button"
                    onClick={handleCreateBill}
                    disabled={formData.status !== 'Confirmed'}
                    style={{
                      background: formData.status === 'Confirmed' ? '#059669' : '#e2e8f0',
                      border: '2px solid',
                      borderColor: formData.status === 'Confirmed' ? '#059669' : '#cbd5e1',
                      color: formData.status === 'Confirmed' ? '#ffffff' : '#64748b',
                      fontWeight: 700,
                      fontSize: '14px',
                      borderRadius: '10px',
                      padding: '7px 20px',
                      cursor: formData.status === 'Confirmed' ? 'pointer' : 'not-allowed',
                      boxShadow: formData.status === 'Confirmed' ? '0 2px 8px rgba(5, 150, 105, 0.2)' : 'none'
                    }}
                    title={formData.status === 'Confirmed' ? 'Create Vendor Bill from PO' : 'Confirm PO first to create bill'}
                  >
                    Create Bill
                  </button>
                </div>

                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <span className={`status-badge ${formData.status === 'Confirmed' ? 'status-confirmed' : formData.status === 'Cancelled' ? 'status-cancelled' : 'status-draft'}`} style={{ marginRight: '8px' }}>
                    {formData.status}
                  </span>

                  <button
                    type="button"
                    onClick={handleCancelPO}
                    disabled={formData.status === 'Cancelled'}
                    style={{
                      background: '#ffffff',
                      border: '2px solid #94a3b8',
                      color: '#64748b',
                      fontWeight: 700,
                      fontSize: '14px',
                      borderRadius: '10px',
                      padding: '7px 18px',
                      cursor: formData.status === 'Cancelled' ? 'not-allowed' : 'pointer'
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

              {/* Header Details Frame matching wireframe: PO No. | Vendor Name | PO Date */}
              <div style={{
                background: '#fcfdfe',
                border: '1.5px solid #e2e8f0',
                borderRadius: '18px',
                padding: '24px 28px',
                marginBottom: '28px'
              }}>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1.2fr 1.5fr 1.2fr',
                  gap: '24px',
                  alignItems: 'center'
                }}>
                  {/* PO No. */}
                  <div>
                    <label htmlFor="po_number" style={{ fontSize: '15px', fontWeight: 700, color: '#dc2626', display: 'block', marginBottom: '4px' }}>
                      PO No. *
                    </label>
                    <input
                      type="text"
                      id="po_number"
                      name="po_number"
                      value={formData.po_number}
                      onChange={handleHeaderChange}
                      placeholder="e.g. P00001"
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

                  {/* Vendor Name (From Contact Master) */}
                  <div>
                    <label htmlFor="vendor_id" style={{ fontSize: '15px', fontWeight: 700, color: '#dc2626', display: 'block', marginBottom: '4px' }}>
                      Vendor Name * <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 500 }}>(From Contact Master)</span>
                    </label>
                    <select
                      id="vendor_id"
                      name="vendor_id"
                      value={formData.vendor_id}
                      onChange={handleHeaderChange}
                      required
                      style={{
                        ...underlineInputStyle,
                        fontWeight: 600,
                        borderBottomColor: '#0f3460',
                        cursor: 'pointer'
                      }}
                    >
                      <option value="">-- Select Vendor --</option>
                      {vendors.map(v => (
                        <option key={v.id} value={v.id}>
                          {v.name} ({v.contact_type})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* PO Date */}
                  <div>
                    <label htmlFor="po_date" style={{ fontSize: '15px', fontWeight: 700, color: '#dc2626', display: 'block', marginBottom: '4px' }}>
                      PO Date *
                    </label>
                    <input
                      type="date"
                      id="po_date"
                      name="po_date"
                      value={formData.po_date}
                      onChange={handleHeaderChange}
                      required
                      style={{
                        ...underlineInputStyle,
                        borderBottomColor: '#0f3460'
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Line Items Table matching wireframe:
                  Sr. No. | Product | Budget Analytics | Qty | Unit Price | Total */}
              <div style={{ marginBottom: '24px' }}>
                <div style={{ overflowX: 'auto', border: '1.5px solid #e2e8f0', borderRadius: '14px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                        <th style={{ width: '60px', textAlign: 'center', padding: '12px 8px', fontSize: '14px', color: '#1e293b' }}>
                          Sr. No.
                        </th>
                        <th style={{ textAlign: 'left', padding: '12px 14px', fontSize: '14px', color: '#1e293b', width: '28%' }}>
                          Product <span style={{ fontSize: '11px', color: '#64748b' }}>(Product Master)</span>
                        </th>
                        <th style={{ textAlign: 'left', padding: '12px 14px', fontSize: '14px', color: '#1e293b', width: '26%' }}>
                          Budget Analytics <span style={{ fontSize: '11px', color: '#64748b' }}>(Analytics Master)</span>
                        </th>
                        <th style={{ textAlign: 'center', padding: '12px 14px', fontSize: '14px', color: '#1e293b', width: '12%' }}>
                          Qty
                        </th>
                        <th style={{ textAlign: 'right', padding: '12px 14px', fontSize: '14px', color: '#1e293b', width: '14%' }}>
                          Unit Price (₹)
                        </th>
                        <th style={{ textAlign: 'right', padding: '12px 14px', fontSize: '14px', color: '#1e293b', width: '14%' }}>
                          Total (₹)
                        </th>
                        <th style={{ width: '40px', padding: '12px 6px' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {formData.items.map((it, idx) => {
                        const lineTotal = (Number(it.quantity) || 0) * (Number(it.unit_price) || 0)
                        return (
                          <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ textAlign: 'center', padding: '10px 8px', fontWeight: 600, color: '#64748b' }}>
                              {idx + 1}.
                            </td>

                            {/* Product Selector */}
                            <td style={{ padding: '10px 14px' }}>
                              <select
                                value={it.product_id}
                                onChange={(e) => handleItemChange(idx, 'product_id', e.target.value)}
                                required
                                style={{
                                  width: '100%',
                                  padding: '8px 10px',
                                  borderRadius: '8px',
                                  border: '1px solid #cbd5e1',
                                  fontSize: '14px',
                                  outline: 'none',
                                  fontWeight: 600,
                                  color: '#0f3460'
                                }}
                              >
                                <option value="">-- Select Product --</option>
                                {products.map(p => (
                                  <option key={p.id} value={p.id}>
                                    {p.product_name} ({p.product_type})
                                  </option>
                                ))}
                              </select>
                            </td>

                            {/* Budget Analytics Selector */}
                            <td style={{ padding: '10px 14px' }}>
                              <select
                                value={it.analytic_account_id}
                                onChange={(e) => handleItemChange(idx, 'analytic_account_id', e.target.value)}
                                style={{
                                  width: '100%',
                                  padding: '8px 10px',
                                  borderRadius: '8px',
                                  border: '1px solid #cbd5e1',
                                  fontSize: '14px',
                                  outline: 'none'
                                }}
                              >
                                <option value="">-- No Analytic Tag --</option>
                                {analytics.map(a => (
                                  <option key={a.id} value={a.id}>
                                    {a.analytic_name} ({a.type})
                                  </option>
                                ))}
                              </select>
                            </td>

                            {/* Qty */}
                            <td style={{ padding: '10px 14px' }}>
                              <input
                                type="number"
                                min="1"
                                value={it.quantity}
                                onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                                required
                                style={{
                                  width: '100%',
                                  padding: '8px 10px',
                                  borderRadius: '8px',
                                  border: '1px solid #cbd5e1',
                                  fontSize: '14px',
                                  textAlign: 'center',
                                  fontWeight: 600,
                                  outline: 'none'
                                }}
                              />
                            </td>

                            {/* Unit Price */}
                            <td style={{ padding: '10px 14px' }}>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={it.unit_price}
                                onChange={(e) => handleItemChange(idx, 'unit_price', e.target.value)}
                                required
                                style={{
                                  width: '100%',
                                  padding: '8px 10px',
                                  borderRadius: '8px',
                                  border: '1px solid #cbd5e1',
                                  fontSize: '14px',
                                  textAlign: 'right',
                                  fontWeight: 600,
                                  outline: 'none'
                                }}
                              />
                            </td>

                            {/* Total (Qty * Unit Price) */}
                            <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700, color: '#0f3460', fontSize: '15px' }}>
                              ₹{lineTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </td>

                            {/* Delete line */}
                            <td style={{ textAlign: 'center', padding: '10px 6px' }}>
                              {formData.items.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => removeLine(idx)}
                                  style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '16px', fontWeight: 700 }}
                                  title="Remove line"
                                >
                                  ✕
                                </button>
                              )}
                            </td>
                          </tr>
                        )
                      })}

                      {/* Bottom Total Row matching wireframe: Total: 6000 */}
                      <tr style={{ background: '#f8fafc', borderTop: '2px solid #cbd5e1' }}>
                        <td colSpan="5" style={{ textAlign: 'right', padding: '14px 16px', fontWeight: 800, fontSize: '16px', color: '#0f3460' }}>
                          Total:
                        </td>
                        <td style={{ textAlign: 'right', padding: '14px 16px', fontWeight: 800, fontSize: '18px', color: '#0f3460' }}>
                          ₹{calculateTotal().toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td></td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div style={{ marginTop: '12px' }}>
                  <button
                    type="button"
                    onClick={addLine}
                    style={{
                      background: '#ffffff',
                      border: '1.5px solid #0f3460',
                      color: '#0f3460',
                      fontWeight: 600,
                      fontSize: '13px',
                      borderRadius: '8px',
                      padding: '6px 16px',
                      cursor: 'pointer'
                    }}
                  >
                    + Add Line
                  </button>
                </div>
              </div>

              {/* Bottom Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    background: '#0f3460',
                    border: '2px solid #0f3460',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '15px',
                    borderRadius: '12px',
                    padding: '8px 28px',
                    cursor: 'pointer',
                    boxShadow: '0 3px 10px rgba(15, 52, 96, 0.25)'
                  }}
                >
                  {loading ? 'Saving...' : editingId ? 'Update Purchase Order' : 'Save Purchase Order'}
                </button>
                <button
                  type="button"
                  onClick={closeForm}
                  style={{
                    background: '#ffffff',
                    border: '2px solid #64748b',
                    color: '#64748b',
                    fontWeight: 700,
                    fontSize: '15px',
                    borderRadius: '12px',
                    padding: '8px 24px',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
              </div>

            </form>
          </div>
        </div>
      ) : (
        /* ============================================================ */
        /* 2. PURCHASE ORDERS LIST VIEW                                 */
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
              Purchase Orders (List View)
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
              {/* Left Actions: [ New ] + Filter Tabs */}
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
                  {['All', 'Draft', 'Confirmed', 'Cancelled'].map(st => (
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
                  placeholder="Search POs..."
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

            {/* POs Table */}
            {filteredPOs.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '48px 20px',
                color: '#64748b',
                fontSize: '15px'
              }}>
                No purchase orders found. Click <strong>"New"</strong> to create one.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                      <th style={{ textAlign: 'left', padding: '12px 14px', fontSize: '14px', color: '#1e293b', fontWeight: 700 }}>
                        PO Number
                      </th>
                      <th style={{ textAlign: 'left', padding: '12px 14px', fontSize: '14px', color: '#1e293b', fontWeight: 700 }}>
                        Vendor Name
                      </th>
                      <th style={{ textAlign: 'left', padding: '12px 14px', fontSize: '14px', color: '#1e293b', fontWeight: 700 }}>
                        PO Date
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
                    {filteredPOs.map((po) => (
                      <tr
                        key={po.id}
                        onClick={() => openEditForm(po)}
                        style={{
                          cursor: 'pointer',
                          borderBottom: '1px solid #f1f5f9',
                          transition: 'background 0.12s ease'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        <td style={{ padding: '12px 14px', color: '#0f3460', fontWeight: 700, fontSize: '15px' }}>
                          {po.po_number}
                        </td>
                        <td style={{ padding: '12px 14px', color: '#1e293b', fontWeight: 600, fontSize: '14px' }}>
                          {po.vendor?.name || `Vendor #${po.vendor_id}`}
                        </td>
                        <td style={{ padding: '12px 14px', color: '#475569', fontSize: '14px' }}>
                          {po.po_date ? new Date(po.po_date).toLocaleDateString('en-IN') : '—'}
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700, color: '#0f3460', fontSize: '15px' }}>
                          ₹{Number(po.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                          <span className={`status-badge ${po.status === 'Confirmed' ? 'status-confirmed' : po.status === 'Cancelled' ? 'status-cancelled' : 'status-draft'}`}>
                            {po.status}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center', padding: '12px 14px' }} onClick={(e) => e.stopPropagation()}>
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                            <button
                              type="button"
                              className="btn-edit"
                              onClick={() => openEditForm(po)}
                              style={{ padding: '4px 10px', fontSize: '12px' }}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="btn-delete"
                              onClick={(e) => handleDelete(po, e)}
                              style={{ padding: '4px 8px', fontSize: '12px' }}
                              title="Delete PO"
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
                Showing {filteredPOs.length} purchase order{filteredPOs.length !== 1 ? 's' : ''}
              </span>
            </div>

          </div>
        </div>
      )}

    </div>
  )
}

export default PurchaseOrdersPage
