import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import api from '../api'

const navLinks = [
  { label: 'Dashboard',         path: '/dashboard'         },
  { label: 'Contacts',          path: '/contacts'          },
  { label: 'Categories',        path: '/categories'        },
  { label: 'Products',          path: '/products'          },
  { label: 'Accounts',          path: '/accounts'          },
  { label: 'Journals',          path: '/journals'          },
  { label: 'Analytics',         path: '/analytic-accounts' },
  { label: 'Budgets',           path: '/budgets'           },
  { label: 'Purchase Orders',   path: '/purchase-orders'   },
  { label: 'Vendor Bills',      path: '/vendor-bills'      },
  { label: 'Sales Orders',      path: '/sales-orders'      },
  { label: 'Customer Invoices', path: '/customer-invoices' },
  { label: 'Payments',          path: '/payments'          },
  { label: 'Journal Entries',   path: '/journal-entries'   },
  { label: 'Reports',           path: '/reports'           },
]

function Dashboard() {
  const [summary, setSummary]       = useState(null)
  const [users, setUsers]           = useState([])
  const [userPage, setUserPage]     = useState(1)
  const userPageSize = 10
  const [txnFilter, setTxnFilter]   = useState('All')
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState('')

  const [loginId] = useState(localStorage.getItem('login_id') || 'User')
  const navigate  = useNavigate()
  const location  = useLocation()

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    setLoading(true)
    setError('')
    try {
      const [sumRes, usersRes] = await Promise.all([
        api.get('/dashboard/summary'),
        api.get('/auth/users')
      ])
      setSummary(sumRes.data)
      setUsers(usersRes.data)
    } catch (err) {
      console.error('Failed to load dashboard:', err)
      setError('Could not connect to dashboard APIs. Ensure backend server is running.')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('login_id')
    navigate('/login')
  }

  const kpis = summary?.kpis || {
    total_sales: 0,
    total_purchases: 0,
    net_profit: 0,
    net_margin: 0,
    accounts_receivable: 0,
    accounts_payable: 0,
    bank_balance: 0,
    open_sales_orders_count: 0,
    open_purchase_orders_count: 0,
    products_count: 0,
    contacts_count: 0
  }

  // Filter recent transactions
  const filteredTxns = summary?.recent_transactions?.filter(t => {
    if (txnFilter === 'All') return true
    if (txnFilter === 'Invoices') return t.type === 'Customer Invoice'
    if (txnFilter === 'Bills') return t.type === 'Vendor Bill'
    if (txnFilter === 'Payments') return t.type.includes('Payment')
    if (txnFilter === 'Journal') return t.type === 'Journal Entry'
    return true
  }) || []

  // Users pagination and sequential sorting by ID
  const sortedUsers = [...users].sort((a, b) => a.id - b.id)
  const totalUserPages = Math.ceil(sortedUsers.length / userPageSize) || 1
  const startIdx = (userPage - 1) * userPageSize
  const paginatedUsers = sortedUsers.slice(startIdx, startIdx + userPageSize)

  // Pure SVG Bar Chart Dimensions & Scaling
  const chartData = summary?.chart_data || []
  const maxBarValue = Math.max(...chartData.map(d => Math.max(d.sales, d.purchases)), 100000)
  const svgHeight = 180
  const svgWidth = 460
  const barGroupWidth = svgWidth / (chartData.length || 1)
  const singleBarWidth = 14

  // Donut chart calculations
  const totalInflow = Number(kpis.total_sales) || 1
  const totalOutflow = Number(kpis.total_purchases) || 1
  const totalCashflow = totalInflow + totalOutflow
  const inflowPercent = Math.round((totalInflow / totalCashflow) * 100)
  const outflowPercent = 100 - inflowPercent

  return (
    <div className="dashboard-container">

      {/* Navigation Header */}
      <nav className="navbar">
        <div className="navbar-brand">🪑 Urban Furniture Accounting</div>
        <div className="navbar-links">
          {navLinks.map(link => (
            <button
              key={link.path}
              className={`nav-link ${location.pathname === link.path ? 'nav-link-active' : ''}`}
              onClick={() => navigate(link.path)}
            >
              {link.label}
            </button>
          ))}
        </div>
        <div className="navbar-user">
          <span>Welcome, <strong>{loginId}</strong></span>
          <button onClick={handleLogout} className="logout-button">Logout</button>
        </div>
      </nav>

      <div className="page-container">

        {/* Dashboard Title & Subtitle */}
        <div className="page-header" style={{marginBottom:'16px'}}>
          <div>
            <h2>🏢 Executive Financial Command Center</h2>
            <p className="page-subtitle">
              Real-time enterprise visibility across Sales, Procurement, General Ledger, and Cash Flow
            </p>
          </div>
          <button className="btn-secondary" onClick={loadDashboardData} disabled={loading} style={{fontSize:'13px'}}>
            {loading ? 'Refreshing...' : '🔄 Refresh Data'}
          </button>
        </div>

        {error && <div className="error-message" style={{marginBottom:'16px'}}>⚠️ {error}</div>}

        {/* Quick Action Navigation Bar */}
        <div className="dashboard-quick-actions">
          <button className="quick-action-btn" onClick={() => navigate('/sales-orders')}>
            🛍️ + New Sales Order
          </button>
          <button className="quick-action-btn" onClick={() => navigate('/customer-invoices')}>
            📑 + Customer Invoice
          </button>
          <button className="quick-action-btn" onClick={() => navigate('/purchase-orders')}>
            📦 + Purchase Order
          </button>
          <button className="quick-action-btn" onClick={() => navigate('/vendor-bills')}>
            🧾 + Vendor Bill
          </button>
          <button className="quick-action-btn" onClick={() => navigate('/payments')}>
            💳 + Record Payment
          </button>
          <button className="quick-action-btn" onClick={() => navigate('/journal-entries')}>
            📖 + Journal Entry
          </button>
          <button className="quick-action-btn" onClick={() => navigate('/reports')}>
            📊 View Reports (P&L, Balance Sheet)
          </button>
        </div>

        {/* ---------------------------------------------------- */}
        {/* 1. EXECUTIVE FINANCIAL KPI CARDS                     */}
        {/* ---------------------------------------------------- */}
        <div className="report-kpi-grid" style={{marginBottom:'24px'}}>
          {/* Card 1: Total Sales Revenue */}
          <div className="report-kpi-card" style={{borderLeftColor:'#008844', cursor:'pointer'}} onClick={() => navigate('/customer-invoices')}>
            <div className="report-kpi-title">Total Sales Revenue</div>
            <div className="report-kpi-value" style={{color:'#008844'}}>
              ₹{Number(kpis.total_sales).toLocaleString('en-IN', {minimumFractionDigits:2})}
            </div>
            <div className="report-kpi-subtext">
              {kpis.open_sales_orders_count} Open Orders | Margin: {kpis.net_margin}%
            </div>
          </div>

          {/* Card 2: Total Procurement Cost */}
          <div className="report-kpi-card" style={{borderLeftColor:'#cc0000', cursor:'pointer'}} onClick={() => navigate('/vendor-bills')}>
            <div className="report-kpi-title">Total Procurement / Purchases</div>
            <div className="report-kpi-value" style={{color:'#cc0000'}}>
              ₹{Number(kpis.total_purchases).toLocaleString('en-IN', {minimumFractionDigits:2})}
            </div>
            <div className="report-kpi-subtext">
              {kpis.open_purchase_orders_count} Open POs | Inventory Inflow
            </div>
          </div>

          {/* Card 3: Net Profit */}
          <div className="report-kpi-card" style={{borderLeftColor: Number(kpis.net_profit) >= 0 ? '#0f3460' : '#aa0000', cursor:'pointer'}} onClick={() => navigate('/reports')}>
            <div className="report-kpi-title">Net Profit (Bottom Line)</div>
            <div className="report-kpi-value" style={{color: Number(kpis.net_profit) >= 0 ? '#0f3460' : '#aa0000'}}>
              ₹{Number(kpis.net_profit).toLocaleString('en-IN', {minimumFractionDigits:2})}
            </div>
            <div className="report-kpi-subtext">
              {Number(kpis.net_profit) >= 0 ? 'Profitable Operations ✓' : 'Operating Deficit'}
            </div>
          </div>

          {/* Card 4: Liquid Cash & Bank Balance */}
          <div className="report-kpi-card" style={{borderLeftColor:'#0055cc', cursor:'pointer'}} onClick={() => navigate('/payments')}>
            <div className="report-kpi-title">Bank & Treasury Liquidity</div>
            <div className="report-kpi-value" style={{color:'#0055cc'}}>
              ₹{Number(kpis.bank_balance).toLocaleString('en-IN', {minimumFractionDigits:2})}
            </div>
            <div className="report-kpi-subtext">HDFC Operating Bank Accounts</div>
          </div>

          {/* Card 5: Accounts Receivable */}
          <div className="report-kpi-card" style={{borderLeftColor:'#e67e22', cursor:'pointer'}} onClick={() => navigate('/customer-invoices')}>
            <div className="report-kpi-title">Accounts Receivable (Unpaid)</div>
            <div className="report-kpi-value" style={{color:'#e67e22'}}>
              ₹{Number(kpis.accounts_receivable).toLocaleString('en-IN', {minimumFractionDigits:2})}
            </div>
            <div className="report-kpi-subtext">Customer Inflow Awaiting Payment</div>
          </div>

          {/* Card 6: Accounts Payable */}
          <div className="report-kpi-card" style={{borderLeftColor:'#8e44ad', cursor:'pointer'}} onClick={() => navigate('/vendor-bills')}>
            <div className="report-kpi-title">Accounts Payable (Owed)</div>
            <div className="report-kpi-value" style={{color:'#8e44ad'}}>
              ₹{Number(kpis.accounts_payable).toLocaleString('en-IN', {minimumFractionDigits:2})}
            </div>
            <div className="report-kpi-subtext">Vendor Obligations to Settle</div>
          </div>
        </div>

        {/* ---------------------------------------------------- */}
        {/* 2. CHARTS SECTION (PURE RESPONSIVE SVG)             */}
        {/* ---------------------------------------------------- */}
        <div className="dashboard-charts-grid">

          {/* Chart 1: Revenue vs Purchases Bar Chart */}
          <div className="chart-card">
            <div className="chart-header">
              <h3 className="chart-title">📈 Revenue vs Procurement Trend</h3>
              <div className="chart-legend">
                <div className="legend-item">
                  <div className="legend-dot" style={{background:'#00aa44'}}></div>
                  <span>Sales</span>
                </div>
                <div className="legend-item">
                  <div className="legend-dot" style={{background:'#0f3460'}}></div>
                  <span>Purchases</span>
                </div>
              </div>
            </div>

            <div style={{width:'100%', overflowX:'auto'}}>
              <svg width="100%" height={svgHeight + 35} viewBox={`0 0 ${svgWidth} ${svgHeight + 35}`} style={{overflow:'visible'}}>
                {/* Y-axis grid lines */}
                {[0.25, 0.5, 0.75, 1].map((lvl, idx) => (
                  <line
                    key={idx}
                    x1="0"
                    y1={svgHeight - svgHeight * lvl}
                    x2={svgWidth}
                    y2={svgHeight - svgHeight * lvl}
                    stroke="#e2e8f0"
                    strokeDasharray="4 4"
                  />
                ))}

                {/* Bars per month */}
                {chartData.map((d, i) => {
                  const groupX = i * barGroupWidth + 15
                  const salesHeight = (d.sales / maxBarValue) * svgHeight
                  const purchHeight = (d.purchases / maxBarValue) * svgHeight

                  return (
                    <g key={i}>
                      {/* Sales Bar */}
                      <rect
                        x={groupX}
                        y={svgHeight - salesHeight}
                        width={singleBarWidth}
                        height={salesHeight}
                        fill="#00aa44"
                        rx="3"
                      >
                        <title>{`${d.label} Sales: ₹${d.sales.toLocaleString('en-IN')}`}</title>
                      </rect>

                      {/* Purchases Bar */}
                      <rect
                        x={groupX + singleBarWidth + 4}
                        y={svgHeight - purchHeight}
                        width={singleBarWidth}
                        height={purchHeight}
                        fill="#0f3460"
                        rx="3"
                      >
                        <title>{`${d.label} Purchases: ₹${d.purchases.toLocaleString('en-IN')}`}</title>
                      </rect>

                      {/* X-axis Month Label */}
                      <text
                        x={groupX + singleBarWidth}
                        y={svgHeight + 20}
                        fontSize="11"
                        fill="#64748b"
                        textAnchor="middle"
                        fontWeight="500"
                      >
                        {d.label}
                      </text>
                    </g>
                  )
                })}
              </svg>
            </div>
            <div style={{fontSize:'12px', color:'#64748b', marginTop:'6px', textAlign:'right'}}>
              Live time-series analysis (Last 6 Months)
            </div>
          </div>

          {/* Chart 2: Cash Flow Inflow vs Outflow Donut */}
          <div className="chart-card">
            <div className="chart-header">
              <h3 className="chart-title">💳 Cash Flow Ratio (Inflow vs Outflow)</h3>
              <div className="chart-legend">
                <div className="legend-item">
                  <div className="legend-dot" style={{background:'#00aa44'}}></div>
                  <span>Inflow ({inflowPercent}%)</span>
                </div>
                <div className="legend-item">
                  <div className="legend-dot" style={{background:'#cc0000'}}></div>
                  <span>Outflow ({outflowPercent}%)</span>
                </div>
              </div>
            </div>

            <div style={{display:'flex', alignItems:'center', justifyContent:'center', height:'180px'}}>
              <svg width="170" height="170" viewBox="0 0 100 100">
                {/* Background Ring */}
                <circle cx="50" cy="50" r="38" fill="transparent" stroke="#e2e8f0" strokeWidth="16" />
                
                {/* Inflow Arc */}
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="transparent"
                  stroke="#00aa44"
                  strokeWidth="16"
                  strokeDasharray={`${(inflowPercent / 100) * 238.76} 238.76`}
                  strokeDashoffset="0"
                  transform="rotate(-90 50 50)"
                />

                {/* Outflow Arc */}
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="transparent"
                  stroke="#cc0000"
                  strokeWidth="16"
                  strokeDasharray={`${(outflowPercent / 100) * 238.76} 238.76`}
                  strokeDashoffset={`${-((inflowPercent / 100) * 238.76)}`}
                  transform="rotate(-90 50 50)"
                />

                {/* Center Text */}
                <text x="50" y="47" fontSize="11" fill="#64748b" textAnchor="middle" fontWeight="600">
                  CASHFLOW
                </text>
                <text x="50" y="62" fontSize="13" fill="#0f3460" textAnchor="middle" fontWeight="700">
                  {inflowPercent}% / {outflowPercent}%
                </text>
              </svg>
            </div>

            <div style={{display:'flex', justifyContent:'space-between', fontSize:'12px', marginTop:'10px', padding:'0 10px'}}>
              <span><strong>Inflow:</strong> ₹{Number(kpis.total_sales).toLocaleString('en-IN')}</span>
              <span><strong>Outflow:</strong> ₹{Number(kpis.total_purchases).toLocaleString('en-IN')}</span>
            </div>
          </div>

          {/* Chart 3: Department Budget Progress */}
          <div className="chart-card">
            <div className="chart-header">
              <h3 className="chart-title">🎯 Department Budget Utilization</h3>
              <span style={{fontSize:'12px', color:'#0f3460', fontWeight:600, cursor:'pointer'}} onClick={() => navigate('/budgets')}>
                View All →
              </span>
            </div>

            <div style={{display:'flex', flexDirection:'column', gap:'14px', marginTop:'6px'}}>
              {summary?.budget_progress?.length === 0 ? (
                <div style={{color:'#64748b', fontSize:'13px', fontStyle:'italic'}}>No departmental budgets allocated.</div>
              ) : (
                summary?.budget_progress?.slice(0, 4).map((b, idx) => (
                  <div key={idx}>
                    <div style={{display:'flex', justifyContent:'space-between', fontSize:'12px', marginBottom:'4px'}}>
                      <strong style={{color:'#334155'}}>{b.department}</strong>
                      <span style={{color: b.utilization_percentage > 100 ? '#cc0000' : '#00aa44', fontWeight:600}}>
                        ₹{b.spent.toLocaleString('en-IN')} / ₹{b.planned.toLocaleString('en-IN')} ({b.utilization_percentage}%)
                      </span>
                    </div>
                    <div className="progress-bar-bg">
                      <div
                        className="progress-bar-fill"
                        style={{
                          width: `${Math.min(b.utilization_percentage, 100)}%`,
                          background: b.utilization_percentage > 100 ? '#cc0000' : b.utilization_percentage >= 80 ? '#e67e22' : '#00aa44'
                        }}
                      ></div>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div style={{fontSize:'12px', color:'#64748b', marginTop:'16px', textAlign:'right'}}>
              Monitored by Cost Centers (Analytic Accounts)
            </div>
          </div>

        </div>

        {/* ---------------------------------------------------- */}
        {/* 3. QUICK NAVIGATION MODULES SHORTCUTS               */}
        {/* ---------------------------------------------------- */}
        <h3 style={{fontSize:'16px', color:'#0f3460', marginBottom:'12px'}}>
          ⚡ Operational Modules Directory
        </h3>
        <div className="stats-row" style={{marginBottom:'28px'}}>
          <div className="stat-card" onClick={() => navigate('/sales-orders')} style={{ cursor: 'pointer', borderLeft: '4px solid #00aa44' }}>
            <div className="stat-icon">🛍️</div>
            <div className="stat-info">
              <div className="stat-label">Sales Orders</div>
              <div className="stat-hint">{kpis.open_sales_orders_count} Open Orders</div>
            </div>
          </div>
          <div className="stat-card" onClick={() => navigate('/customer-invoices')} style={{ cursor: 'pointer', borderLeft: '4px solid #0055cc' }}>
            <div className="stat-icon">📑</div>
            <div className="stat-info">
              <div className="stat-label">Customer Invoices</div>
              <div className="stat-hint">Receivables & billing</div>
            </div>
          </div>
          <div className="stat-card" onClick={() => navigate('/purchase-orders')} style={{ cursor: 'pointer', borderLeft: '4px solid #0f3460' }}>
            <div className="stat-icon">📦</div>
            <div className="stat-info">
              <div className="stat-label">Purchase Orders</div>
              <div className="stat-hint">{kpis.open_purchase_orders_count} Open POs</div>
            </div>
          </div>
          <div className="stat-card" onClick={() => navigate('/vendor-bills')} style={{ cursor: 'pointer', borderLeft: '4px solid #aa4400' }}>
            <div className="stat-icon">🧾</div>
            <div className="stat-info">
              <div className="stat-label">Vendor Bills</div>
              <div className="stat-hint">Accounts payable</div>
            </div>
          </div>
          <div className="stat-card" onClick={() => navigate('/payments')} style={{ cursor: 'pointer', borderLeft: '4px solid #cc0000' }}>
            <div className="stat-icon">💳</div>
            <div className="stat-info">
              <div className="stat-label">Treasury & Payments</div>
              <div className="stat-hint">Bank inflows & outflows</div>
            </div>
          </div>
          <div className="stat-card" onClick={() => navigate('/journal-entries')} style={{ cursor: 'pointer', borderLeft: '4px solid #8e44ad' }}>
            <div className="stat-icon">📖</div>
            <div className="stat-info">
              <div className="stat-label">Journal Entries</div>
              <div className="stat-hint">General ledger & items</div>
            </div>
          </div>
          <div className="stat-card" onClick={() => navigate('/reports')} style={{ cursor: 'pointer', borderLeft: '4px solid #00aa88' }}>
            <div className="stat-icon">📊</div>
            <div className="stat-info">
              <div className="stat-label">Financial Reports</div>
              <div className="stat-hint">P&L, Balance Sheet, Budgets</div>
            </div>
          </div>
          <div className="stat-card" onClick={() => navigate('/products')} style={{ cursor: 'pointer' }}>
            <div className="stat-icon">🪑</div>
            <div className="stat-info">
              <div className="stat-label">Products</div>
              <div className="stat-hint">{kpis.products_count} Items in Catalogue</div>
            </div>
          </div>
          <div className="stat-card" onClick={() => navigate('/contacts')} style={{ cursor: 'pointer' }}>
            <div className="stat-icon">👥</div>
            <div className="stat-info">
              <div className="stat-label">Contacts</div>
              <div className="stat-hint">{kpis.contacts_count} Partners & Vendors</div>
            </div>
          </div>
          <div className="stat-card" onClick={() => navigate('/accounts')} style={{ cursor: 'pointer' }}>
            <div className="stat-icon">📊</div>
            <div className="stat-info">
              <div className="stat-label">Chart of Accounts</div>
              <div className="stat-hint">Ledger account master</div>
            </div>
          </div>
          <div className="stat-card" onClick={() => navigate('/journals')} style={{ cursor: 'pointer' }}>
            <div className="stat-icon">📓</div>
            <div className="stat-info">
              <div className="stat-label">Journals</div>
              <div className="stat-hint">Transaction books</div>
            </div>
          </div>
          <div className="stat-card" onClick={() => navigate('/budgets')} style={{ cursor: 'pointer' }}>
            <div className="stat-icon">💰</div>
            <div className="stat-info">
              <div className="stat-label">Budgets</div>
              <div className="stat-hint">Cost center planning</div>
            </div>
          </div>
        </div>

        {/* ---------------------------------------------------- */}
        {/* 4. RECENT LIVE TRANSACTIONS FEED                     */}
        {/* ---------------------------------------------------- */}
        <div className="card" style={{marginBottom:'28px'}}>
          <div className="table-toolbar">
            <div>
              <h3 style={{fontSize:'16px', color:'#0f3460', margin:0}}>
                🕒 Recent Financial Transactions
              </h3>
              <p style={{fontSize:'12px', color:'#64748b', margin:'2px 0 0 0'}}>
                Real-time cross-module audit trail across Invoices, Bills, Payments, and Journal Entries
              </p>
            </div>

            {/* Filter Tabs */}
            <div className="filter-tabs">
              {['All', 'Invoices', 'Bills', 'Payments', 'Journal'].map(tab => (
                <button
                  key={tab}
                  className={`filter-tab ${txnFilter === tab ? 'active' : ''}`}
                  onClick={() => setTxnFilter(tab)}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {filteredTxns.length === 0 ? (
            <div className="empty-state">No recent transactions recorded for this filter.</div>
          ) : (
            <table className="data-table" style={{fontSize:'13px'}}>
              <thead>
                <tr>
                  <th>Transaction Type</th>
                  <th>Reference #</th>
                  <th>Partner / Memo</th>
                  <th>Date</th>
                  <th style={{textAlign:'right'}}>Amount (₹)</th>
                  <th style={{textAlign:'center'}}>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredTxns.map((txn, idx) => {
                  let badgeClass = 'type-invoice'
                  let isPositive = true
                  if (txn.type === 'Vendor Bill') {
                    badgeClass = 'type-bill'
                    isPositive = false
                  } else if (txn.type.includes('Payment')) {
                    badgeClass = 'type-payment'
                    isPositive = txn.type.includes('Receive')
                  } else if (txn.type === 'Journal Entry') {
                    badgeClass = 'type-journal'
                  }

                  return (
                    <tr key={idx}>
                      <td>
                        <span className={`txn-type-badge ${badgeClass}`}>
                          {txn.type}
                        </span>
                      </td>
                      <td style={{fontWeight:600, color:'#0f3460'}}>{txn.number}</td>
                      <td>{txn.partner_name || '—'}</td>
                      <td>{txn.date}</td>
                      <td style={{textAlign:'right', fontWeight:600, color: isPositive ? '#008844' : '#cc0000'}}>
                        {isPositive ? '+' : '-'}₹{txn.amount.toLocaleString('en-IN', {minimumFractionDigits:2})}
                      </td>
                      <td style={{textAlign:'center'}}>
                        <span className={`status-badge ${
                          txn.status === 'Paid' || txn.status === 'Posted' 
                            ? 'status-confirmed' 
                            : txn.status === 'Draft' 
                            ? 'status-draft' 
                            : 'status-paid'
                        }`}>
                          {txn.status}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* ---------------------------------------------------- */}
        {/* 5. REGISTERED SYSTEM USERS                          */}
        {/* ---------------------------------------------------- */}
        <div className="card">
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'14px', flexWrap:'wrap', gap:'10px'}}>
            <div>
              <h3 style={{fontSize:'15px', color:'#0f3460', margin:0}}>
                👥 Registered System Users ({users.length})
              </h3>
              <p style={{fontSize:'12px', color:'#64748b', margin:'2px 0 0 0'}}>
                Sequenced by ID — Showing {sortedUsers.length === 0 ? 0 : startIdx + 1}–{Math.min(startIdx + userPageSize, sortedUsers.length)} of {users.length} (10 per slide)
              </p>
            </div>
            <div style={{display:'flex', gap:'8px', alignItems:'center'}}>
              <button className="btn-secondary" style={{fontSize:'12px'}} onClick={() => navigate('/register')}>
                + Add User
              </button>
            </div>
          </div>

          {users.length === 0 ? (
            <p style={{color:'#64748b'}}>Loading users...</p>
          ) : (
            <>
              <table className="data-table" style={{fontSize:'13px'}}>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Full Name</th>
                    <th>Login ID</th>
                    <th>Email</th>
                    <th>Assigned Role</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedUsers.map((user) => (
                    <tr key={user.id}>
                      <td style={{fontWeight:700, color:'#0f3460'}}>#{user.id}</td>
                      <td style={{fontWeight:500}}>{user.name}</td>
                      <td style={{fontWeight:600, color:'#0f3460'}}>{user.login_id}</td>
                      <td>{user.email}</td>
                      <td>
                        <span className={`role-badge role-${user.role.toLowerCase()}`}>
                          {user.role}
                        </span>
                      </td>
                      <td>
                        <span className={user.is_active ? 'status-active' : 'status-inactive'}>
                          {user.is_active ? '● Active' : '● Inactive'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination Slide Controls */}
              {totalUserPages > 1 && (
                <div style={{
                  display:'flex',
                  justifyContent:'space-between',
                  alignItems:'center',
                  marginTop:'14px',
                  paddingTop:'10px',
                  borderTop:'1px solid #e2e8f0',
                  flexWrap:'wrap',
                  gap:'10px'
                }}>
                  <span style={{fontSize:'12px', color:'#64748b'}}>
                    Slide <strong>{userPage}</strong> of <strong>{totalUserPages}</strong> (10 users per slide)
                  </span>
                  <div style={{display:'flex', gap:'6px', alignItems:'center'}}>
                    <button
                      className="btn-secondary"
                      style={{padding:'4px 10px', fontSize:'12px', opacity: userPage === 1 ? 0.5 : 1}}
                      onClick={() => setUserPage(p => Math.max(p - 1, 1))}
                      disabled={userPage === 1}
                    >
                      ◀ Prev
                    </button>
                    {Array.from({ length: totalUserPages }, (_, i) => i + 1).map(pageNum => (
                      <button
                        key={pageNum}
                        onClick={() => setUserPage(pageNum)}
                        style={{
                          padding:'4px 10px',
                          fontSize:'12px',
                          fontWeight:600,
                          borderRadius:'6px',
                          border: userPage === pageNum ? '1px solid #0f3460' : '1px solid #d0d7de',
                          background: userPage === pageNum ? '#0f3460' : 'white',
                          color: userPage === pageNum ? 'white' : '#333',
                          cursor:'pointer'
                        }}
                      >
                        {pageNum}
                      </button>
                    ))}
                    <button
                      className="btn-secondary"
                      style={{padding:'4px 10px', fontSize:'12px', opacity: userPage === totalUserPages ? 0.5 : 1}}
                      onClick={() => setUserPage(p => Math.min(p + 1, totalUserPages))}
                      disabled={userPage === totalUserPages}
                    >
                      Next ▶
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

      </div>
    </div>
  )
}

export default Dashboard
