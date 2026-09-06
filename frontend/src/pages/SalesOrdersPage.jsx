import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import api from '../api'

const todayStr = () => new Date().toISOString().split('T')[0]

const emptyForm = {
  customer_id: '',
  so_number:   '',
  so_date:     todayStr(),
  status:      'Draft',
  items: [
    { product_id: '', analytic_account_id: '', quantity: 1, unit_price: '' }
  ]
}

function SalesOrdersPage() {
  const [sos, setSOs]                 = useState([])
  const [customers, setCustomers]     = useState([])
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
  const location = useLocation()

  useEffect(() => {
    fetchInitialData()
  }, [location.search])

  const fetchInitialData = async () => {
    try {
      const [soRes, contactRes, prodRes, anaRes] = await Promise.all([
        api.get('/sales-orders/'),
        api.get('/contacts/'),
        api.get('/products/'),
        api.get('/analytic-accounts/')
      ])
      setSOs(soRes.data)
      setCustomers(contactRes.data)
      setProducts(prodRes.data)
      setAnalytics(anaRes.data)

      const params = new URLSearchParams(location.search)
      const statusParam = params.get('status')
      const isNew = params.get('new')

      if (statusParam) {
        setFilterStatus(statusParam)
        setShowForm(false)
      }
      if (isNew === 'true') {
        const nextSeq = soRes.data.length + 1
        setFormData({
          customer_id: contactRes.data.length > 0 ? String(contactRes.data[0].id) : '',
          so_number:   `SO${String(nextSeq).padStart(5, '0')}`,
          so_date:     todayStr(),
          status:      'Draft',
          items: [
            {
              product_id: prodRes.data.length > 0 ? String(prodRes.data[0].id) : '',
              analytic_account_id: anaRes.data.length > 0 ? String(anaRes.data[0].id) : '',
              quantity: 1,
              unit_price: prodRes.data.length > 0 ? String(prodRes.data[0].sales_price || 0) : ''
            }
          ]
        })
        setEditingId(null)
        setShowForm(true)
      }
    } catch {
      setError('Failed to load sales orders data.')
    }
  }

  const fetchSOs = async () => {
    try {
      const r = await api.get('/sales-orders/')
      setSOs(r.data)
    } catch {
      setError('Failed to refresh sales orders.')
    }
  }

  // Generate sequence SO number: SO00001, SO00002...
  const generateSONumber = () => {
    const nextSeq = sos.length + 1
    return `SO${String(nextSeq).padStart(5, '0')}`
  }

  const handleNew = () => {
    setFormData({
      customer_id: customers.length > 0 ? String(customers[0].id) : '',
      so_number:   generateSONumber(),
      so_date:     todayStr(),
      status:      'Draft',
      items: [
        {
          product_id:          products.length > 0 ? String(products[0].id) : '',
          analytic_account_id: analytics.length > 0 ? String(analytics[0].id) : '',
          quantity:            1,
          unit_price:          products.length > 0 ? String(products[0].sales_price || 0) : ''
        }
      ]
    })
    setEditingId(null)
    setError('')
    setSuccess('')
    setShowForm(true)
  }

  const openEditForm = (so) => {
    setFormData({
      customer_id: String(so.customer_id),
      so_number:   so.so_number,
      so_date:     so.so_date ? String(so.so_date).split('T')[0] : todayStr(),
      status:      so.status || 'Draft',
      items: so.items && so.items.length > 0
        ? so.items.map(it => ({
            product_id:          String(it.product_id),
            analytic_account_id: it.analytic_account_id ? String(it.analytic_account_id) : '',
            quantity:            it.quantity,
            unit_price:          String(it.unit_price)
          }))
        : [{ product_id: '', analytic_account_id: '', quantity: 1, unit_price: '' }]
    })
    setEditingId(so.id)
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

    // When product changes, auto-fill standard sales price
    if (field === 'product_id' && val) {
      const prod = products.find(p => String(p.id) === String(val))
      if (prod) {
        updated[idx].unit_price = String(prod.sales_price || 0)
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
          product_id:          products.length > 0 ? String(products[0].id) : '',
          analytic_account_id: analytics.length > 0 ? String(analytics[0].id) : '',
          quantity:            1,
          unit_price:          products.length > 0 ? String(products[0].sales_price || 0) : ''
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

  const calculateTotal = () => {
    return formData.items.reduce((sum, it) => {
      const q = Number(it.quantity) || 0
      const p = Number(it.unit_price) || 0
      return sum + (q * p)
    }, 0)
  }

  // Lifecycle Actions
  const handleConfirmSO = async () => {
    if (!editingId) {
      await handleSubmit(null, 'Confirmed')
      return
    }
    try {
      setLoading(true)
      await api.patch(`/sales-orders/${editingId}/status`, { status: 'Confirmed' })
      setSuccess(`Sales Order "${formData.so_number}" Confirmed!`)
      setFormData(prev => ({ ...prev, status: 'Confirmed' }))
      await fetchSOs()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to confirm sales order.')
    } finally {
      setLoading(false)
    }
  }

  const handleCancelSO = async () => {
    if (!editingId) {
      closeForm()
      return
    }
    if (!window.confirm(`Cancel sales order "${formData.so_number}"?`)) return
    try {
      setLoading(true)
      await api.patch(`/sales-orders/${editingId}/status`, { status: 'Cancelled' })
      setSuccess(`Sales Order "${formData.so_number}" Cancelled.`)
      setFormData(prev => ({ ...prev, status: 'Cancelled' }))
      await fetchSOs()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to cancel sales order.')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateInvoice = () => {
    if (!editingId) return
    navigate(`/customer-invoices?so_id=${editingId}`)
  }

  const handleSubmit = async (e, overrideStatus = null) => {
    if (e && e.preventDefault) e.preventDefault()
    setError('')
    setLoading(true)

    if (!formData.customer_id) {
      setError('Please select a Customer.')
      setLoading(false)
      return
    }
    if (!formData.so_number.trim()) {
      setError('SO Number is required.')
      setLoading(false)
      return
    }
    if (formData.items.length === 0 || !formData.items[0].product_id) {
      setError('At least one product line item is required.')
      setLoading(false)
      return
    }

    const currentUserId = Number(localStorage.getItem('user_id')) || 49
    const payload = {
      customer_id: Number(formData.customer_id),
      created_by:  currentUserId,
      so_number:   formData.so_number.trim(),
      so_date:     formData.so_date,
      items: formData.items.map(it => ({
        product_id:          Number(it.product_id),
        analytic_account_id: it.analytic_account_id ? Number(it.analytic_account_id) : null,
        quantity:            Number(it.quantity) || 1,
        unit_price:          Number(it.unit_price) || 0
      }))
    }

    try {
      if (editingId) {
        await api.put(`/sales-orders/${editingId}`, payload)
        if (overrideStatus) {
          await api.patch(`/sales-orders/${editingId}/status`, { status: overrideStatus })
        }
        setSuccess(`Sales Order "${formData.so_number}" updated.`)
      } else {
        const res = await api.post('/sales-orders/', payload)
        if (overrideStatus && overrideStatus !== 'Draft') {
          await api.patch(`/sales-orders/${res.data.id}/status`, { status: overrideStatus })
        }
        setSuccess(`Sales Order "${formData.so_number}" created successfully.`)
      }
      await fetchSOs()
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
        setError('Failed to save sales order.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (so, e) => {
    if (e) e.stopPropagation()
    if (!window.confirm(`Delete sales order "${so.so_number}"?`)) return
    try {
      await api.delete(`/sales-orders/${so.id}`)
      setSuccess(`Sales Order "${so.so_number}" deleted.`)
      await fetchSOs()
    } catch (err) {
      const detail = err.response?.data?.detail
      setError(typeof detail === 'string' ? detail : 'Failed to delete SO.')
    }
  }

  // Filter SOs
  const filteredSOs = sos.filter(s => {
    if (filterStatus !== 'All' && s.status !== filterStatus) return false
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      const matchNum = (s.so_number || '').toLowerCase().includes(q)
      const matchCust = (s.customer?.name || '').toLowerCase().includes(q)
      if (!matchNum && !matchCust) return false
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
      {/* 1. SALES ORDER FORM VIEW                                     */}
      {/* ============================================================ */}
      {showForm ? (
        <div>
          {/* Top Title: Sales Order */}
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <h1 style={{
              fontSize: '28px',
              fontWeight: 800,
              color: '#1a1a2e',
              letterSpacing: '-0.5px',
              margin: 0
            }}>
              Sales Order
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

              {/* Action Bar matching wireframe: [ New ] [ Confirm ] [ Create Invoice ] ... [ Cancel ] [ Back ] */}
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
                    onClick={handleConfirmSO}
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
                    onClick={handleCreateInvoice}
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
                    title={formData.status === 'Confirmed' ? 'Create Customer Invoice from SO' : 'Confirm SO first to create invoice'}
                  >
                    Create Invoice
                  </button>
                </div>

                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <span className={`status-badge ${formData.status === 'Confirmed' ? 'status-confirmed' : formData.status === 'Cancelled' ? 'status-cancelled' : 'status-draft'}`} style={{ marginRight: '8px' }}>
                    {formData.status}
                  </span>

                  <button
                    type="button"
                    onClick={handleCancelSO}
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

              {/* Header Details Frame: SO No. | Customer Name | SO Date */}
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
                  {/* SO No. */}
                  <div>
                    <label htmlFor="so_number" style={{ fontSize: '15px', fontWeight: 700, color: '#dc2626', display: 'block', marginBottom: '4px' }}>
                      SO No. *
                    </label>
                    <input
                      type="text"
                      id="so_number"
                      name="so_number"
                      value={formData.so_number}
                      onChange={handleHeaderChange}
                      placeholder="e.g. SO00001"
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

                  {/* Customer Name (From Contact Master) */}
                  <div>
                    <label htmlFor="customer_id" style={{ fontSize: '15px', fontWeight: 700, color: '#dc2626', display: 'block', marginBottom: '4px' }}>
                      Customer Name * <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 500 }}>(From Contact Master)</span>
                    </label>
                    <select
                      id="customer_id"
                      name="customer_id"
                      value={formData.customer_id}
                      onChange={handleHeaderChange}
                      required
                      style={{
                        ...underlineInputStyle,
                        fontWeight: 600,
                        borderBottomColor: '#0f3460',
                        cursor: 'pointer'
                      }}
                    >
                      <option value="">-- Select Customer --</option>
                      {customers.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.contact_type})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* SO Date */}
                  <div>
                    <label htmlFor="so_date" style={{ fontSize: '15px', fontWeight: 700, color: '#dc2626', display: 'block', marginBottom: '4px' }}>
                      SO Date *
                    </label>
                    <input
                      type="date"
                      id="so_date"
                      name="so_date"
                      value={formData.so_date}
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

              {/* Line Items Table:
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

                      {/* Bottom Total Row matching wireframe */}
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
                  {loading ? 'Saving...' : editingId ? 'Update Sales Order' : 'Save Sales Order'}
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
        /* 2. SALES ORDERS LIST VIEW                                    */
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
              Sales Orders (List View)
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
                  placeholder="Search SOs..."
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

            {/* SOs Table */}
            {filteredSOs.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '48px 20px',
                color: '#64748b',
                fontSize: '15px'
              }}>
                No sales orders found. Click <strong>"New"</strong> to create one.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                      <th style={{ textAlign: 'left', padding: '12px 14px', fontSize: '14px', color: '#1e293b', fontWeight: 700 }}>
                        SO Number
                      </th>
                      <th style={{ textAlign: 'left', padding: '12px 14px', fontSize: '14px', color: '#1e293b', fontWeight: 700 }}>
                        Customer Name
                      </th>
                      <th style={{ textAlign: 'left', padding: '12px 14px', fontSize: '14px', color: '#1e293b', fontWeight: 700 }}>
                        SO Date
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
                    {filteredSOs.map((so) => (
                      <tr
                        key={so.id}
                        onClick={() => openEditForm(so)}
                        style={{
                          cursor: 'pointer',
                          borderBottom: '1px solid #f1f5f9',
                          transition: 'background 0.12s ease'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        <td style={{ padding: '12px 14px', color: '#0f3460', fontWeight: 700, fontSize: '15px' }}>
                          {so.so_number}
                        </td>
                        <td style={{ padding: '12px 14px', color: '#1e293b', fontWeight: 600, fontSize: '14px' }}>
                          {so.customer?.name || `Customer #${so.customer_id}`}
                        </td>
                        <td style={{ padding: '12px 14px', color: '#475569', fontSize: '14px' }}>
                          {so.so_date ? new Date(so.so_date).toLocaleDateString('en-IN') : '—'}
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700, color: '#0f3460', fontSize: '15px' }}>
                          ₹{Number(so.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                          <span className={`status-badge ${so.status === 'Confirmed' ? 'status-confirmed' : so.status === 'Cancelled' ? 'status-cancelled' : 'status-draft'}`}>
                            {so.status}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center', padding: '12px 14px' }} onClick={(e) => e.stopPropagation()}>
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                            <button
                              type="button"
                              className="btn-edit"
                              onClick={() => openEditForm(so)}
                              style={{ padding: '4px 10px', fontSize: '12px' }}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="btn-delete"
                              onClick={(e) => handleDelete(so, e)}
                              style={{ padding: '4px 8px', fontSize: '12px' }}
                              title="Delete SO"
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
                Showing {filteredSOs.length} sales order{filteredSOs.length !== 1 ? 's' : ''}
              </span>
            </div>

          </div>
        </div>
      )}

    </div>
  )
}

export default SalesOrdersPage
