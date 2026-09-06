import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api'

function Dashboard() {
  const [summary, setSummary]             = useState(null)
  const [users, setUsers]                 = useState([])
  const [userPage, setUserPage]           = useState(1)
  const userPageSize                      = 10
  const [txnFilter, setTxnFilter]         = useState('All')
  const [loading, setLoading]             = useState(true)
  const [error, setError]                 = useState('')
  const [showAnalytics, setShowAnalytics] = useState(false)

  const userRole = localStorage.getItem('role') || localStorage.getItem('active_role') || 'Admin'
  const navigate = useNavigate()

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
      setUsers(usersRes.data || [])
    } catch (err) {
      console.error('Failed to load dashboard:', err)
      setError('Could not connect to dashboard APIs. Ensure backend server is running.')
    } finally {
      setLoading(false)
    }
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
    contacts_count: 0,
    sales_orders_all: 0,
    sales_orders_confirmed: 0,
    sales_orders_draft: 0,
    purchase_orders_all: 0,
    purchase_orders_confirmed: 0,
    purchase_orders_draft: 0,
    budgets_total: 0,
    budgets_achieved: 0,
    budgets_committed: 0
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

  // Users pagination and sorting
  const sortedUsers = [...users].sort((a, b) => a.id - b.id)
  const totalUserPages = Math.ceil(sortedUsers.length / userPageSize) || 1
  const startIdx = (userPage - 1) * userPageSize
  const paginatedUsers = sortedUsers.slice(startIdx, startIdx + userPageSize)

  // Chart data calculations
  const chartData = summary?.chart_data || []
  const maxBarValue = Math.max(...chartData.map(d => Math.max(d.sales, d.purchases)), 100000)
  const svgHeight = 180
  const svgWidth = 460
  const barGroupWidth = svgWidth / (chartData.length || 1)
  const singleBarWidth = 14

  const totalInflow = Number(kpis.total_sales) || 1
  const totalOutflow = Number(kpis.total_purchases) || 1
  const totalCashflow = totalInflow + totalOutflow
  const inflowPercent = Math.round((totalInflow / totalCashflow) * 100)
  const outflowPercent = 100 - inflowPercent

  return (
    <div className="page-container" style={{ maxWidth: '960px', margin: '0 auto', padding: '24px 16px' }}>

      {/* Page Title (Matching Excalidraw Wireframe) */}
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <h1 style={{
          fontSize: '32px',
          fontWeight: 800,
          color: '#1a1a2e',
          letterSpacing: '-0.5px',
          margin: 0
        }}>
          App Dashboard
        </h1>
        <p style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
          Overview of Sales, Purchases, and Budget Allocations
        </p>
      </div>

      {error && <div className="error-message" style={{ marginBottom: '16px' }}>⚠️ {error}</div>}

      {/* Outer Card Container (Matching Excalidraw Wireframe outer card) */}
      <div style={{
        background: '#ffffff',
        border: '2px solid #e2e8f0',
        borderRadius: '24px',
        padding: '24px 28px',
        boxShadow: '0 10px 25px rgba(0,0,0,0.05)',
        marginBottom: '28px'
      }}>

        {/* 1. Top Navigation Bar inside container (Sales | Purchase | Account | Report) */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-around',
          alignItems: 'center',
          borderBottom: '2px solid #f1f5f9',
          paddingBottom: '20px',
          marginBottom: '24px'
        }}>
          {[
            { label: 'Sales',    path: '/sales-orders' },
            { label: 'Purchase', path: '/purchase-orders' },
            { label: 'Account',  path: '/accounts' },
            { label: 'Report',   path: '/reports' }
          ].map((tab) => (
            <button
              key={tab.label}
              onClick={() => navigate(tab.path)}
              style={{
                background: 'transparent',
                border: 'none',
                fontSize: '20px',
                fontWeight: 800,
                color: '#1e293b',
                cursor: 'pointer',
                padding: '8px 20px',
                borderRadius: '10px',
                transition: 'all 0.18s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#0f3460'
                e.currentTarget.style.backgroundColor = '#f1f5f9'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = '#1e293b'
                e.currentTarget.style.backgroundColor = 'transparent'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* 2. SECTION 1: SALES CARD */}
        <div style={{
          border: '2px solid #cbd5e1',
          borderRadius: '18px',
          padding: '20px 24px',
          marginBottom: '20px',
          background: '#fcfdfd'
        }}>
          {/* Card Header (Sales + [ New ] Button) */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
            <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#0f3460', margin: 0 }}>
              Sales
            </h2>
            <button
              onClick={() => navigate('/sales-orders?new=true')}
              style={{
                background: '#1a4971',
                color: '#ffffff',
                border: 'none',
                borderRadius: '10px',
                padding: '8px 30px',
                fontSize: '16px',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 3px 8px rgba(26, 73, 113, 0.25)',
                transition: 'transform 0.15s ease'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#153a5b'; e.currentTarget.style.transform = 'translateY(-1px)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#1a4971'; e.currentTarget.style.transform = 'translateY(0)' }}
            >
              New
            </button>
          </div>

          {/* 3 Metric Badges: All | Confirmed | Draft */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
            {[
              { label: 'All',       val: kpis.sales_orders_all || 0,       status: 'All' },
              { label: 'Confirmed', val: kpis.sales_orders_confirmed || 0, status: 'Confirmed' },
              { label: 'Draft',     val: kpis.sales_orders_draft || 0,     status: 'Draft' }
            ].map((badge) => (
              <div
                key={badge.label}
                onClick={() => navigate(`/sales-orders?status=${badge.status}`)}
                style={{
                  border: '2px solid #cbd5e1',
                  borderRadius: '14px',
                  padding: '16px 12px',
                  textAlign: 'center',
                  background: '#ffffff',
                  cursor: 'pointer',
                  transition: 'all 0.18s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#0f3460'
                  e.currentTarget.style.transform = 'translateY(-2px)'
                  e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.06)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#cbd5e1'
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = 'none'
                }}
              >
                <div style={{ fontSize: '15px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                  {badge.label}
                </div>
                <div style={{ fontSize: '26px', fontWeight: 800, color: '#0f3460' }}>
                  {badge.val}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 3. SECTION 2: PURCHASE CARD */}
        <div style={{
          border: '2px solid #cbd5e1',
          borderRadius: '18px',
          padding: '20px 24px',
          marginBottom: '20px',
          background: '#fcfdfd'
        }}>
          {/* Card Header (Purchase + [ New ] Button) */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
            <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#0f3460', margin: 0 }}>
              Purchase
            </h2>
            <button
              onClick={() => navigate('/purchase-orders?new=true')}
              style={{
                background: '#1a4971',
                color: '#ffffff',
                border: 'none',
                borderRadius: '10px',
                padding: '8px 30px',
                fontSize: '16px',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 3px 8px rgba(26, 73, 113, 0.25)',
                transition: 'transform 0.15s ease'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#153a5b'; e.currentTarget.style.transform = 'translateY(-1px)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#1a4971'; e.currentTarget.style.transform = 'translateY(0)' }}
            >
              New
            </button>
          </div>

          {/* 3 Metric Badges: All | Confirmed | Draft */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
            {[
              { label: 'All',       val: kpis.purchase_orders_all || 0,       status: 'All' },
              { label: 'Confirmed', val: kpis.purchase_orders_confirmed || 0, status: 'Confirmed' },
              { label: 'Draft',     val: kpis.purchase_orders_draft || 0,     status: 'Draft' }
            ].map((badge) => (
              <div
                key={badge.label}
                onClick={() => navigate(`/purchase-orders?status=${badge.status}`)}
                style={{
                  border: '2px solid #cbd5e1',
                  borderRadius: '14px',
                  padding: '16px 12px',
                  textAlign: 'center',
                  background: '#ffffff',
                  cursor: 'pointer',
                  transition: 'all 0.18s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#0f3460'
                  e.currentTarget.style.transform = 'translateY(-2px)'
                  e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.06)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#cbd5e1'
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = 'none'
                }}
              >
                <div style={{ fontSize: '15px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                  {badge.label}
                </div>
                <div style={{ fontSize: '26px', fontWeight: 800, color: '#0f3460' }}>
                  {badge.val}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 4. SECTION 3: BUDGET REPORTS CARD */}
        <div style={{
          border: '2px solid #cbd5e1',
          borderRadius: '18px',
          padding: '20px 24px',
          background: '#fcfdfd'
        }}>
          {/* Card Header (Budget Reports + [ Report ] Button) */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
            <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#0f3460', margin: 0 }}>
              Budget Reports
            </h2>
            <button
              onClick={() => navigate('/reports?tab=budget')}
              style={{
                background: '#1a4971',
                color: '#ffffff',
                border: 'none',
                borderRadius: '10px',
                padding: '8px 24px',
                fontSize: '16px',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 3px 8px rgba(26, 73, 113, 0.25)',
                transition: 'transform 0.15s ease'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#153a5b'; e.currentTarget.style.transform = 'translateY(-1px)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#1a4971'; e.currentTarget.style.transform = 'translateY(0)' }}
            >
              Report
            </button>
          </div>

          {/* 3 Metric Badges: Achieved | Budget | Committed */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
            {[
              { label: 'Achieved',  val: kpis.budgets_achieved || 0,  path: '/budgets' },
              { label: 'Budget',    val: kpis.budgets_total || 0,     path: '/budgets' },
              { label: 'Committed', val: kpis.budgets_committed || 0, path: '/budgets' }
            ].map((badge) => (
              <div
                key={badge.label}
                onClick={() => navigate(badge.path)}
                style={{
                  border: '2px solid #cbd5e1',
                  borderRadius: '14px',
                  padding: '16px 12px',
                  textAlign: 'center',
                  background: '#ffffff',
                  cursor: 'pointer',
                  transition: 'all 0.18s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#0f3460'
                  e.currentTarget.style.transform = 'translateY(-2px)'
                  e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.06)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#cbd5e1'
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = 'none'
                }}
              >
                <div style={{ fontSize: '15px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                  {badge.label}
                </div>
                <div style={{ fontSize: '26px', fontWeight: 800, color: '#0f3460' }}>
                  {badge.val}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Expandable Accordion for In-Depth Financial Ledger & Analytics */}
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <button
          onClick={() => setShowAnalytics(!showAnalytics)}
          style={{
            background: showAnalytics ? '#f1f5f9' : '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: '10px',
            padding: '10px 24px',
            fontSize: '14px',
            fontWeight: 700,
            color: '#334155',
            cursor: 'pointer',
            boxShadow: '0 2px 5px rgba(0,0,0,0.04)',
            transition: 'all 0.2s ease'
          }}
        >
          {showAnalytics ? '▲ Hide Financial Ledger & Analytics' : '📊 View In-Depth Financial Ledger & Analytics'}
        </button>
      </div>

      {showAnalytics && (
        <div style={{ animation: 'fadeIn 0.2s ease-in' }}>

          {/* 1. EXECUTIVE FINANCIAL KPI CARDS */}
          <div className="report-kpi-grid" style={{ marginBottom: '24px' }}>
            <div className="report-kpi-card" style={{ borderLeftColor: '#008844', cursor: 'pointer' }} onClick={() => navigate('/customer-invoices')}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="report-kpi-title">Total Sales Revenue</span>
                <span style={{ fontSize: '16px' }}>🛍️</span>
              </div>
              <div className="report-kpi-value" style={{ color: '#008844' }}>
                ₹{Number(kpis.total_sales).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
              <div className="report-kpi-subtext">
                {kpis.open_sales_orders_count} Open Orders
              </div>
            </div>

            <div className="report-kpi-card" style={{ borderLeftColor: '#cc0000', cursor: 'pointer' }} onClick={() => navigate('/vendor-bills')}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="report-kpi-title">Total Procurement</span>
                <span style={{ fontSize: '16px' }}>🛒</span>
              </div>
              <div className="report-kpi-value" style={{ color: '#cc0000' }}>
                ₹{Number(kpis.total_purchases).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
              <div className="report-kpi-subtext">
                {kpis.open_purchase_orders_count} Open POs
              </div>
            </div>

            <div className="report-kpi-card" style={{ borderLeftColor: Number(kpis.net_profit) >= 0 ? '#0f3460' : '#aa0000', cursor: 'pointer' }} onClick={() => navigate('/reports')}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="report-kpi-title">Net Profit</span>
                <span style={{ fontSize: '16px' }}>📈</span>
              </div>
              <div className="report-kpi-value" style={{ color: Number(kpis.net_profit) >= 0 ? '#0f3460' : '#aa0000' }}>
                ₹{Number(kpis.net_profit).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
              <div className="report-kpi-subtext">
                Margin: {kpis.net_margin}%
              </div>
            </div>

            <div className="report-kpi-card" style={{ borderLeftColor: '#0055cc', cursor: 'pointer' }} onClick={() => navigate('/payments')}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="report-kpi-title">Bank & Treasury</span>
                <span style={{ fontSize: '16px' }}>🏦</span>
              </div>
              <div className="report-kpi-value" style={{ color: '#0055cc' }}>
                ₹{Number(kpis.bank_balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
              <div className="report-kpi-subtext">
                Liquid Operating Cash
              </div>
            </div>

            <div className="report-kpi-card" style={{ borderLeftColor: '#e67e22', cursor: 'pointer' }} onClick={() => navigate('/customer-invoices')}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="report-kpi-title">Accounts Receivable</span>
                <span style={{ fontSize: '16px' }}>📑</span>
              </div>
              <div className="report-kpi-value" style={{ color: '#e67e22' }}>
                ₹{Number(kpis.accounts_receivable).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
              <div className="report-kpi-subtext">
                Customer Due
              </div>
            </div>

            <div className="report-kpi-card" style={{ borderLeftColor: '#8e44ad', cursor: 'pointer' }} onClick={() => navigate('/vendor-bills')}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="report-kpi-title">Accounts Payable</span>
                <span style={{ fontSize: '16px' }}>🧾</span>
              </div>
              <div className="report-kpi-value" style={{ color: '#8e44ad' }}>
                ₹{Number(kpis.accounts_payable).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
              <div className="report-kpi-subtext">
                Vendor Due
              </div>
            </div>
          </div>

          {/* 2. CHARTS SECTION */}
          <div className="dashboard-charts-grid" style={{ marginBottom: '24px' }}>
            <div className="chart-card">
              <div className="chart-header">
                <h3 className="chart-title">📈 Revenue vs Procurement Trend</h3>
                <div className="chart-legend">
                  <div className="legend-item">
                    <div className="legend-dot" style={{ background: '#00aa44' }}></div>
                    <span>Sales</span>
                  </div>
                  <div className="legend-item">
                    <div className="legend-dot" style={{ background: '#0f3460' }}></div>
                    <span>Purchases</span>
                  </div>
                </div>
              </div>

              <div style={{ width: '100%', overflowX: 'auto' }}>
                <svg width="100%" height={svgHeight + 35} viewBox={`0 0 ${svgWidth} ${svgHeight + 35}`} style={{ overflow: 'visible' }}>
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

                  {chartData.map((d, i) => {
                    const groupX = i * barGroupWidth + 15
                    const salesHeight = (d.sales / maxBarValue) * svgHeight
                    const purchHeight = (d.purchases / maxBarValue) * svgHeight

                    return (
                      <g key={i}>
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
            </div>

            <div className="chart-card">
              <div className="chart-header">
                <h3 className="chart-title">💳 Cash Flow Ratio</h3>
                <div className="chart-legend">
                  <div className="legend-item">
                    <div className="legend-dot" style={{ background: '#00aa44' }}></div>
                    <span>Inflow ({inflowPercent}%)</span>
                  </div>
                  <div className="legend-item">
                    <div className="legend-dot" style={{ background: '#cc0000' }}></div>
                    <span>Outflow ({outflowPercent}%)</span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '180px' }}>
                <svg width="170" height="170" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="38" fill="transparent" stroke="#e2e8f0" strokeWidth="16" />
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
                  <text x="50" y="47" fontSize="11" fill="#64748b" textAnchor="middle" fontWeight="600">
                    CASHFLOW
                  </text>
                  <text x="50" y="62" fontSize="13" fill="#0f3460" textAnchor="middle" fontWeight="700">
                    {inflowPercent}% / {outflowPercent}%
                  </text>
                </svg>
              </div>
            </div>
          </div>

          {/* 3. RECENT TRANSACTIONS TABLE */}
          <div className="card" style={{ marginBottom: '28px' }}>
            <div className="table-toolbar">
              <div>
                <h3 style={{ fontSize: '16px', color: '#0f3460', margin: 0 }}>
                  🕒 Recent Financial Transactions
                </h3>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                {['All', 'Invoices', 'Bills', 'Payments', 'Journal'].map(f => (
                  <button
                    key={f}
                    className={`btn-secondary ${txnFilter === f ? 'btn-active' : ''}`}
                    onClick={() => setTxnFilter(f)}
                    style={{ fontSize: '12px', padding: '4px 10px' }}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            <table className="table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Number</th>
                  <th>Partner / Account</th>
                  <th>Date</th>
                  <th style={{ textAlign: 'right' }}>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredTxns.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', color: '#999', padding: '24px' }}>
                      No transactions found for filter "{txnFilter}".
                    </td>
                  </tr>
                ) : (
                  filteredTxns.map((t, idx) => (
                    <tr key={idx}>
                      <td>
                        <span style={{
                          display: 'inline-block',
                          padding: '3px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 600,
                          background: t.type.includes('Invoice') ? '#e8f5e9' : t.type.includes('Bill') ? '#ffebee' : t.type.includes('Payment') ? '#e3f2fd' : '#f3e5f5',
                          color: t.type.includes('Invoice') ? '#2e7d32' : t.type.includes('Bill') ? '#c62828' : t.type.includes('Payment') ? '#1565c0' : '#6a1b9a'
                        }}>
                          {t.type}
                        </span>
                      </td>
                      <td style={{ fontWeight: 600, color: '#0f3460' }}>{t.number}</td>
                      <td>{t.partner_name || '-'}</td>
                      <td>{t.date}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>
                        ₹{Number(t.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td>
                        <span className={`badge badge-${t.status.toLowerCase()}`}>
                          {t.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* 4. SYSTEM USERS DIRECTORY (Admin Only) */}
          {userRole === 'Admin' && (
            <div className="card" style={{ marginBottom: '28px' }}>
              <div className="table-toolbar">
                <div>
                  <h3 style={{ fontSize: '16px', color: '#0f3460', margin: 0 }}>
                    👥 System Users Directory
                  </h3>
                </div>
                <button
                  className="btn-primary"
                  onClick={() => navigate('/register')}
                  style={{ fontSize: '12px', padding: '6px 14px' }}
                >
                  + Add User
                </button>
              </div>

              <table className="table">
                <thead>
                  <tr>
                    <th>User ID</th>
                    <th>Name</th>
                    <th>Login ID</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', color: '#999', padding: '24px' }}>
                        No system users registered.
                      </td>
                    </tr>
                  ) : (
                    paginatedUsers.map(u => (
                      <tr key={u.id}>
                        <td>{u.id}</td>
                        <td style={{ fontWeight: 600 }}>{u.name}</td>
                        <td><code>{u.login_id}</code></td>
                        <td>{u.email}</td>
                        <td>
                          <span className={`badge ${u.role === 'Admin' ? 'badge-danger' : u.role === 'Accountant' ? 'badge-primary' : 'badge-secondary'}`}>
                            {u.role}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${u.is_active ? 'badge-success' : 'badge-danger'}`}>
                            {u.is_active ? 'Active' : 'Disabled'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>

              {totalUserPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '16px' }}>
                  <button
                    className="btn-secondary"
                    onClick={() => setUserPage(p => Math.max(p - 1, 1))}
                    disabled={userPage === 1}
                    style={{ fontSize: '12px' }}
                  >
                    ← Previous
                  </button>
                  <span style={{ alignSelf: 'center', fontSize: '12px', color: '#666' }}>
                    Page {userPage} of {totalUserPages}
                  </span>
                  <button
                    className="btn-secondary"
                    onClick={() => setUserPage(p => Math.min(p + 1, totalUserPages))}
                    disabled={userPage === totalUserPages}
                    style={{ fontSize: '12px' }}
                  >
                    Next →
                  </button>
                </div>
              )}
            </div>
          )}

        </div>
      )}

    </div>
  )
}

export default Dashboard
