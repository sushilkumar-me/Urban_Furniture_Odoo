import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import api from '../api'

const emptyForm = {
  vendor_id: '', created_by: '', po_number: '', po_date: '',
  items: [{ product_id: '', quantity: 1, unit_price: '' }]
}

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

function PurchaseOrdersPage() {
  const [pos, setPOs]           = useState([])
  const [vendors, setVendors]   = useState([])
  const [products, setProducts] = useState([])
  const [users, setUsers]       = useState([])
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState(emptyForm)
  const [error, setError]       = useState('')
  const [success, setSuccess]   = useState('')
  const [loading, setLoading]   = useState(false)

  // Line items inspection & modification modal
  const [selectedPO, setSelectedPO]         = useState(null)
  const [poItems, setPoItems]               = useState([])
  const [loadingItems, setLoadingItems]     = useState(false)
  const [newItemProduct, setNewItemProduct] = useState('')
  const [newItemQty, setNewItemQty]         = useState(1)
  const [newItemPrice, setNewItemPrice]     = useState('')
  const [itemsError, setItemsError]         = useState('')

  const navigate = useNavigate()
  const location = useLocation()
  const loginId  = localStorage.getItem('login_id') || 'User'

  const handleLogout = () => {
    localStorage.removeItem('token'); localStorage.removeItem('login_id'); navigate('/login')
  }

  useEffect(() => {
    fetchPOs(); fetchVendors(); fetchProducts(); fetchUsers()
  }, [])

  const fetchPOs       = async () => { try { const r = await api.get('/purchase-orders/'); setPOs(r.data) } catch { setError('Failed to load purchase orders.') } }
  const fetchVendors   = async () => { try { const r = await api.get('/contacts/'); setVendors(r.data.filter(c => c.contact_type === 'Vendor')) } catch {} }
  const fetchProducts  = async () => { try { const r = await api.get('/products/'); setProducts(r.data) } catch {} }
  const fetchUsers     = async () => { try { const r = await api.get('/auth/users'); setUsers(r.data) } catch {} }

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value })

  const handleItemChange = (index, field, value) => {
    const newItems = [...formData.items]
    newItems[index] = { ...newItems[index], [field]: value }
    setFormData({ ...formData, items: newItems })
  }

  const addItem    = () => setFormData({ ...formData, items: [...formData.items, { product_id: '', quantity: 1, unit_price: '' }] })
  const removeItem = (i) => { if (formData.items.length === 1) return; const items = formData.items.filter((_, idx) => idx !== i); setFormData({ ...formData, items }) }

  const openForm  = () => { setFormData(emptyForm); setError(''); setSuccess(''); setShowForm(true) }
  const closeForm = () => { setShowForm(false); setFormData(emptyForm); setError('') }

  const handleSubmit = async (e) => {
    e.preventDefault(); setError(''); setLoading(true)
    const payload = {
      vendor_id:  Number(formData.vendor_id),
      created_by: Number(formData.created_by),
      po_number:  formData.po_number,
      po_date:    formData.po_date,
      items: formData.items.map(i => ({
        product_id: Number(i.product_id),
        quantity:   Number(i.quantity),
        unit_price: Number(i.unit_price)
      }))
    }
    try {
      await api.post('/purchase-orders/', payload)
      setSuccess('Purchase order created.'); await fetchPOs(); closeForm()
    } catch (err) {
      setError(err.response?.data?.detail || 'Something went wrong.')
    } finally { setLoading(false) }
  }

  const changeStatus = async (po, newStatus) => {
    try {
      await api.patch(`/purchase-orders/${po.id}/status`, { status: newStatus })
      setSuccess(`PO ${po.po_number} → ${newStatus}`); await fetchPOs()
    } catch (err) { setError(err.response?.data?.detail || 'Failed to update.') }
  }

  const deletePO = async (po) => {
    if (!window.confirm(`Delete ${po.po_number}?`)) return
    try { await api.delete(`/purchase-orders/${po.id}`); setSuccess('Deleted.'); await fetchPOs() }
    catch (err) { setError(err.response?.data?.detail || 'Failed to delete.') }
  }

  // ---- LINE ITEMS MODAL LOGIC ----
  const openItemsModal = async (po) => {
    setSelectedPO(po)
    setItemsError('')
    setLoadingItems(true)
    try {
      const res = await api.get(`/purchase-order-items/by-po/${po.id}`)
      setPoItems(res.data)
    } catch (err) {
      setItemsError('Failed to load items for this PO.')
    } finally {
      setLoadingItems(false)
    }
  }

  const closeItemsModal = () => {
    setSelectedPO(null)
    setPoItems([])
    setNewItemProduct('')
    setNewItemQty(1)
    setNewItemPrice('')
    setItemsError('')
  }

  const handleAddLineItemToExistingPO = async (e) => {
    e.preventDefault()
    if (!newItemProduct || !newItemQty || newItemPrice === '') return
    setItemsError('')
    try {
      await api.post(`/purchase-order-items/by-po/${selectedPO.id}`, {
        product_id: Number(newItemProduct),
        quantity:   Number(newItemQty),
        unit_price: Number(newItemPrice)
      })
      const res = await api.get(`/purchase-order-items/by-po/${selectedPO.id}`)
      setPoItems(res.data)
      setNewItemProduct('')
      setNewItemQty(1)
      setNewItemPrice('')
      await fetchPOs()
      setSuccess('Line item added and PO total recalculated.')
    } catch (err) {
      setItemsError(err.response?.data?.detail || 'Failed to add item.')
    }
  }

  const handleDeleteLineItem = async (itemId) => {
    if (!window.confirm('Delete this line item?')) return
    setItemsError('')
    try {
      await api.delete(`/purchase-order-items/${itemId}`)
      const res = await api.get(`/purchase-order-items/by-po/${selectedPO.id}`)
      setPoItems(res.data)
      await fetchPOs()
      setSuccess('Line item removed and PO total recalculated.')
    } catch (err) {
      setItemsError(err.response?.data?.detail || 'Failed to delete item.')
    }
  }

  const statusClass = (s) => ({ Draft:'status-draft', Confirmed:'status-confirmed', Cancelled:'status-cancelled' })[s] || ''
  const lineTotal = formData.items.reduce((sum, i) => sum + (Number(i.quantity) * Number(i.unit_price) || 0), 0)

  return (
    <div className="dashboard-container">
      <nav className="navbar">
        <div className="navbar-brand">🪑 Urban Furniture Accounting</div>
        <div className="navbar-links">
          {navLinks.map(l => (
            <button key={l.path} className={`nav-link ${location.pathname===l.path?'nav-link-active':''}`} onClick={() => navigate(l.path)}>
              {l.label}
            </button>
          ))}
        </div>
        <div className="navbar-user"><span>Welcome, <strong>{loginId}</strong></span><button onClick={handleLogout} className="logout-button">Logout</button></div>
      </nav>

      <div className="page-container">
        <div className="page-header">
          <div><h2>Purchase Orders</h2><p className="page-subtitle">Manage procurement orders placed with vendors</p></div>
          <button className="btn-primary" onClick={openForm}>+ New Purchase Order</button>
        </div>

        {success && <div className="success-message" style={{marginBottom:'16px'}}>✅ {success}</div>}
        {!showForm && error && <div className="error-message" style={{marginBottom:'16px'}}>⚠️ {error}</div>}

        {showForm && (
          <div className="form-card">
            <h3>Create Purchase Order</h3>
            <form onSubmit={handleSubmit} className="contact-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Vendor *</label>
                  <select name="vendor_id" value={formData.vendor_id} onChange={handleChange} className="form-select" required>
                    <option value="">-- Select Vendor --</option>
                    {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Created By *</label>
                  <select name="created_by" value={formData.created_by} onChange={handleChange} className="form-select" required>
                    <option value="">-- Select User --</option>
                    {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>PO Number *</label>
                  <input type="text" name="po_number" value={formData.po_number} onChange={handleChange} placeholder="PO-2026-001" required />
                </div>
                <div className="form-group">
                  <label>PO Date *</label>
                  <input type="date" name="po_date" value={formData.po_date} onChange={handleChange} required style={{padding:'10px 14px',border:'2px solid #e1e5e9',borderRadius:'8px',fontSize:'14px',outline:'none'}} />
                </div>
              </div>

              {/* Line Items during PO creation */}
              <div style={{background:'#f8f9fa',borderRadius:'8px',padding:'16px'}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:'12px'}}>
                  <strong>Line Items</strong>
                  <button type="button" className="btn-primary" onClick={addItem} style={{padding:'4px 12px',fontSize:'12px'}}>+ Add Item</button>
                </div>
                {formData.items.map((item, i) => (
                  <div key={i} className="form-row" style={{alignItems:'center',marginBottom:'8px'}}>
                    <div className="form-group">
                      <select value={item.product_id} onChange={e => handleItemChange(i,'product_id',e.target.value)} className="form-select" required>
                        <option value="">-- Product --</option>
                        {products.map(p => <option key={p.id} value={p.id}>{p.product_name}</option>)}
                      </select>
                    </div>
                    <div className="form-group" style={{maxWidth:'100px'}}>
                      <input type="number" value={item.quantity} onChange={e => handleItemChange(i,'quantity',e.target.value)} placeholder="Qty" min="1" required />
                    </div>
                    <div className="form-group">
                      <input type="number" value={item.unit_price} onChange={e => handleItemChange(i,'unit_price',e.target.value)} placeholder="Unit Price ₹" min="0" step="0.01" required />
                    </div>
                    <div style={{fontWeight:700,color:'#0f3460',minWidth:'100px'}}>
                      ₹{((Number(item.quantity)||0)*(Number(item.unit_price)||0)).toLocaleString('en-IN')}
                    </div>
                    {formData.items.length > 1 && (
                      <button type="button" className="btn-delete" onClick={() => removeItem(i)} style={{padding:'4px 10px',fontSize:'12px'}}>✕</button>
                    )}
                  </div>
                ))}
                <div style={{textAlign:'right',fontWeight:700,fontSize:'16px',color:'#1a1a2e'}}>
                  Total: ₹{lineTotal.toLocaleString('en-IN')}
                </div>
              </div>

              {error && <div className="error-message">⚠️ {error}</div>}
              <div className="form-actions">
                <button type="submit" className="btn-primary" disabled={loading}>{loading ? 'Creating...' : 'Create PO'}</button>
                <button type="button" className="btn-secondary" onClick={closeForm}>Cancel</button>
              </div>
            </form>
          </div>
        )}

        <div className="card">
          <div className="table-toolbar">
            <span className="contact-count">{pos.length} purchase order{pos.length!==1?'s':''}</span>
          </div>
          {pos.length === 0 ? <div className="empty-state">No purchase orders yet.</div> : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>PO Number</th>
                  <th>Vendor</th>
                  <th>Date</th>
                  <th>Items Breakdown</th>
                  <th>Total Amount</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pos.map(po => (
                  <tr key={po.id}>
                    <td><strong>{po.po_number}</strong></td>
                    <td>{po.vendor?.name || '—'}</td>
                    <td>{po.po_date ? new Date(po.po_date).toLocaleDateString('en-IN') : '—'}</td>
                    <td>
                      <button className="btn-view" onClick={() => openItemsModal(po)}>
                        🔍 {po.items?.length || 0} Item{po.items?.length !== 1 ? 's' : ''} (View)
                      </button>
                    </td>
                    <td style={{fontWeight:700, color:'#0f3460'}}>₹{Number(po.total_amount).toLocaleString('en-IN')}</td>
                    <td><span className={`status-badge ${statusClass(po.status)}`}>{po.status}</span></td>
                    <td>
                      <div className="action-buttons">
                        {po.status === 'Draft' && (
                          <button className="btn-edit" onClick={() => changeStatus(po,'Confirmed')}>Confirm</button>
                        )}
                        {po.status === 'Confirmed' && (
                          <>
                            <button
                              className="btn-success"
                              onClick={() => navigate(`/vendor-bills?po_id=${po.id}`)}
                              title="Generate Vendor Bill from this PO"
                            >
                              + Create Bill
                            </button>
                            <button className="btn-delete" onClick={() => changeStatus(po,'Cancelled')}>Cancel</button>
                          </>
                        )}
                        {po.status === 'Draft' && (
                          <button className="btn-delete" onClick={() => deletePO(po)}>Delete</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* LINE ITEMS DETAIL & EDIT MODAL */}
      {selectedPO && (
        <div className="modal-backdrop" onClick={closeItemsModal}>
          <div className="modal-dialog" onClick={e => e.stopPropagation()}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'16px'}}>
              <div>
                <h3 style={{margin:0,fontSize:'18px',color:'#1a1a2e'}}>
                  Line Items: {selectedPO.po_number}
                </h3>
                <div style={{fontSize:'13px',color:'#666',marginTop:'4px'}}>
                  Vendor: <strong>{selectedPO.vendor?.name}</strong> | Status: <span className={`status-badge ${statusClass(selectedPO.status)}`}>{selectedPO.status}</span>
                </div>
              </div>
              <button className="btn-secondary" onClick={closeItemsModal} style={{padding:'4px 10px',fontSize:'16px'}}>✕</button>
            </div>

            {itemsError && <div className="error-message" style={{marginBottom:'12px'}}>⚠️ {itemsError}</div>}

            {loadingItems ? (
              <p>Loading items...</p>
            ) : (
              <div>
                <table className="data-table" style={{marginBottom:'16px'}}>
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Quantity</th>
                      <th>Unit Price</th>
                      <th>Line Total</th>
                      {selectedPO.status === 'Draft' && <th>Action</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {poItems.map(it => (
                      <tr key={it.id}>
                        <td>{it.product?.product_name || `Product #${it.product_id}`}</td>
                        <td>{it.quantity}</td>
                        <td>₹{Number(it.unit_price).toLocaleString('en-IN')}</td>
                        <td style={{fontWeight:700}}>₹{Number(it.total).toLocaleString('en-IN')}</td>
                        {selectedPO.status === 'Draft' && (
                          <td>
                            {poItems.length > 1 && (
                              <button
                                className="btn-delete"
                                onClick={() => handleDeleteLineItem(it.id)}
                                style={{padding:'2px 8px',fontSize:'11px'}}
                              >
                                Delete
                              </button>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div style={{textAlign:'right',fontSize:'16px',fontWeight:700,color:'#0f3460',marginBottom:'16px'}}>
                  PO Total Amount: ₹{poItems.reduce((acc, curr) => acc + Number(curr.total), 0).toLocaleString('en-IN')}
                </div>

                {/* Inline item adder for Draft POs */}
                {selectedPO.status === 'Draft' && (
                  <form onSubmit={handleAddLineItemToExistingPO} style={{background:'#f8f9fa',padding:'14px',borderRadius:'8px'}}>
                    <div style={{fontWeight:600,fontSize:'13px',marginBottom:'8px',color:'#333'}}>
                      + Add Another Line Item to this Order
                    </div>
                    <div style={{display:'flex',gap:'10px',alignItems:'center'}}>
                      <select
                        value={newItemProduct}
                        onChange={e => setNewItemProduct(e.target.value)}
                        className="form-select"
                        style={{flex:2}}
                        required
                      >
                        <option value="">-- Select Product --</option>
                        {products.map(p => <option key={p.id} value={p.id}>{p.product_name}</option>)}
                      </select>
                      <input
                        type="number"
                        min="1"
                        placeholder="Qty"
                        value={newItemQty}
                        onChange={e => setNewItemQty(e.target.value)}
                        style={{flex:1,padding:'10px',border:'2px solid #e1e5e9',borderRadius:'8px'}}
                        required
                      />
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="Unit Price ₹"
                        value={newItemPrice}
                        onChange={e => setNewItemPrice(e.target.value)}
                        style={{flex:1.5,padding:'10px',border:'2px solid #e1e5e9',borderRadius:'8px'}}
                        required
                      />
                      <button type="submit" className="btn-primary" style={{padding:'10px 16px'}}>
                        Add Item
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  )
}

export default PurchaseOrdersPage
