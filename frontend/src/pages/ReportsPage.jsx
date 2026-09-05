import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api'

function ReportsPage() {
  const [activeTab, setActiveTab] = useState('pnl') // 'pnl' | 'bs' | 'budget'
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')

  const today = new Date().toISOString().split('T')[0]
  const currentYearStart = `${new Date().getFullYear()}-01-01`

  // P&L State
  const [pnlData, setPnlData]     = useState(null)
  const [pnlStart, setPnlStart]   = useState(currentYearStart)
  const [pnlEnd, setPnlEnd]       = useState(today)

  // Balance Sheet State
  const [bsData, setBsData]       = useState(null)
  const [asOfDate, setAsOfDate]   = useState(today)

  // Budget Report State
  const [budgetData, setBudgetData] = useState(null)
  const [analytics, setAnalytics]   = useState([])
  const [selectedAnalytic, setSelectedAnalytic] = useState('All')

  const navigate = useNavigate()

  useEffect(() => {
    fetchAnalytics()
    loadActiveReport(activeTab)
  }, [activeTab])

  const fetchAnalytics = async () => {
    try {
      const res = await api.get('/analytic-accounts/')
      setAnalytics(res.data)
    } catch (err) {
      console.error('Failed to load analytics:', err)
    }
  }

  const loadActiveReport = async (tab) => {
    setLoading(true)
    setError('')
    try {
      if (tab === 'pnl') {
        const params = {}
        if (pnlStart) params.start_date = pnlStart
        if (pnlEnd) params.end_date = pnlEnd
        const res = await api.get('/reports/profit-and-loss', { params })
        setPnlData(res.data)
      } else if (tab === 'bs') {
        const params = {}
        if (asOfDate) params.as_of_date = asOfDate
        const res = await api.get('/reports/balance-sheet', { params })
        setBsData(res.data)
      } else if (tab === 'budget') {
        const params = {}
        if (selectedAnalytic !== 'All') params.analytic_account_id = selectedAnalytic
        const res = await api.get('/reports/budget-report', { params })
        setBudgetData(res.data)
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to generate financial report.')
    } finally {
      setLoading(false)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="page-container" style={{ maxWidth: '1020px', margin: '0 auto', padding: '24px 16px' }}>

        {/* Page Header */}
        <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 style={{ margin: '0 0 6px 0', fontSize: '26px', fontWeight: 800, color: '#1a1a2e' }}>📊 Financial Reports & Executive Analytics</h2>
            <p className="page-subtitle" style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>
              Authoritative statements for GAAP/IFRS audit compliance and executive decision making
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button className="btn-secondary" onClick={handlePrint} style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              🖨️ Print Statement
            </button>
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              style={{
                background: '#ffffff',
                border: '2px solid #64748b',
                color: '#475569',
                fontWeight: 700,
                fontSize: '13px',
                borderRadius: '8px',
                padding: '7px 18px',
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
        </div>

        {error && <div className="error-message" style={{marginBottom:'16px'}}>⚠️ {error}</div>}

        {/* Report Selector Tabs */}
        <div style={{display:'flex', gap:'8px', borderBottom:'2px solid #e2e8f0', marginBottom:'24px'}}>
          <button
            onClick={() => setActiveTab('pnl')}
            style={{
              padding:'10px 20px',
              fontSize:'14px',
              fontWeight:600,
              background:'none',
              border:'none',
              borderBottom: activeTab === 'pnl' ? '3px solid #0f3460' : '3px solid transparent',
              color: activeTab === 'pnl' ? '#0f3460' : '#64748b',
              cursor:'pointer'
            }}
          >
            📈 Profit & Loss
          </button>
          <button
            onClick={() => setActiveTab('bs')}
            style={{
              padding:'10px 20px',
              fontSize:'14px',
              fontWeight:600,
              background:'none',
              border:'none',
              borderBottom: activeTab === 'bs' ? '3px solid #0f3460' : '3px solid transparent',
              color: activeTab === 'bs' ? '#0f3460' : '#64748b',
              cursor:'pointer'
            }}
          >
            🏛️ Balance Sheet
          </button>
          <button
            onClick={() => setActiveTab('budget')}
            style={{
              padding:'10px 20px',
              fontSize:'14px',
              fontWeight:600,
              background:'none',
              border:'none',
              borderBottom: activeTab === 'budget' ? '3px solid #0f3460' : '3px solid transparent',
              color: activeTab === 'budget' ? '#0f3460' : '#64748b',
              cursor:'pointer'
            }}
          >
            🎯 Budget Performance
          </button>
        </div>

        {/* ---------------------------------------------------- */}
        {/* TAB 1: PROFIT & LOSS STATEMENT                       */}
        {/* ---------------------------------------------------- */}
        {activeTab === 'pnl' && (
          <div>
            {/* Filter Controls Bar */}
            <div className="card" style={{marginBottom:'20px', padding:'14px 20px'}}>
              <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:'12px'}}>
                <div style={{display:'flex', alignItems:'center', gap:'12px'}}>
                  <span style={{fontWeight:600, fontSize:'13px', color:'#334155'}}>Accounting Period:</span>
                  <div style={{display:'flex', alignItems:'center', gap:'6px'}}>
                    <label style={{fontSize:'12px', color:'#64748b'}}>From:</label>
                    <input
                      type="date"
                      value={pnlStart}
                      onChange={e => setPnlStart(e.target.value)}
                      style={{padding:'4px 8px', fontSize:'13px', border:'1px solid #cbd5e1', borderRadius:'6px'}}
                    />
                  </div>
                  <div style={{display:'flex', alignItems:'center', gap:'6px'}}>
                    <label style={{fontSize:'12px', color:'#64748b'}}>To:</label>
                    <input
                      type="date"
                      value={pnlEnd}
                      onChange={e => setPnlEnd(e.target.value)}
                      style={{padding:'4px 8px', fontSize:'13px', border:'1px solid #cbd5e1', borderRadius:'6px'}}
                    />
                  </div>
                </div>
                <button
                  className="btn-primary"
                  onClick={() => loadActiveReport('pnl')}
                  disabled={loading}
                  style={{fontSize:'13px', padding:'6px 14px'}}
                >
                  {loading ? 'Calculating...' : 'Update Statement'}
                </button>
              </div>
            </div>

            {/* KPI Cards */}
            {pnlData && (
              <>
                <div className="report-kpi-grid">
                  <div className="report-kpi-card" style={{borderLeftColor:'#008844'}}>
                    <div className="report-kpi-title">Total Revenue / Income</div>
                    <div className="report-kpi-value" style={{color:'#008844'}}>
                      ₹{Number(pnlData.income.total).toLocaleString('en-IN', {minimumFractionDigits:2})}
                    </div>
                    <div className="report-kpi-subtext">Sales and Operating Inflow</div>
                  </div>

                  <div className="report-kpi-card" style={{borderLeftColor:'#cc0000'}}>
                    <div className="report-kpi-title">Total Expenses</div>
                    <div className="report-kpi-value" style={{color:'#cc0000'}}>
                      ₹{Number(pnlData.expenses.total).toLocaleString('en-IN', {minimumFractionDigits:2})}
                    </div>
                    <div className="report-kpi-subtext">Procurement & Operating Outflow</div>
                  </div>

                  <div className="report-kpi-card" style={{borderLeftColor: Number(pnlData.net_profit) >= 0 ? '#0f3460' : '#aa0000'}}>
                    <div className="report-kpi-title">Net Profit / (Loss)</div>
                    <div className="report-kpi-value" style={{color: Number(pnlData.net_profit) >= 0 ? '#0f3460' : '#aa0000'}}>
                      ₹{Number(pnlData.net_profit).toLocaleString('en-IN', {minimumFractionDigits:2})}
                    </div>
                    <div className="report-kpi-subtext">Bottom Line Performance</div>
                  </div>

                  <div className="report-kpi-card" style={{borderLeftColor:'#8e44ad'}}>
                    <div className="report-kpi-title">Net Profit Margin</div>
                    <div className="report-kpi-value" style={{color:'#8e44ad'}}>
                      {pnlData.net_margin_percentage}%
                    </div>
                    <div className="report-kpi-subtext">Return on Total Revenues</div>
                  </div>
                </div>

                {/* Detailed Statement Table */}
                <div className="card" style={{padding:'20px'}}>
                  <h3 style={{marginBottom:'16px', color:'#0f3460', borderBottom:'1px solid #e2e8f0', paddingBottom:'8px'}}>
                    Income Statement (Statement of Operations)
                  </h3>

                  <table className="je-items-table" style={{fontSize:'14px'}}>
                    <thead>
                      <tr>
                        <th style={{width:'50%'}}>Account Classification</th>
                        <th style={{width:'25%'}}>Category</th>
                        <th style={{width:'25%', textAlign:'right'}}>Amount (₹)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* Section: Income */}
                      <tr className="report-section-row">
                        <td colSpan="3">1. REVENUES & OPERATING INCOME</td>
                      </tr>
                      {pnlData.income.lines.length === 0 ? (
                        <tr>
                          <td colSpan="3" style={{color:'#94a3b8', fontStyle:'italic', paddingLeft:'24px'}}>
                            No revenues recorded for this period.
                          </td>
                        </tr>
                      ) : (
                        pnlData.income.lines.map((l, i) => (
                          <tr key={i}>
                            <td style={{paddingLeft:'24px'}}>{l.account_name}</td>
                            <td><span style={{fontSize:'12px', background:'#e6fff0', color:'#006622', padding:'2px 6px', borderRadius:'4px'}}>{l.account_type}</span></td>
                            <td style={{textAlign:'right', fontWeight:600}}>
                              ₹{Number(l.amount).toLocaleString('en-IN', {minimumFractionDigits:2})}
                            </td>
                          </tr>
                        ))
                      )}
                      <tr className="report-subtotal-row">
                        <td colSpan="2" style={{paddingLeft:'24px'}}>Total Operating Revenues</td>
                        <td style={{textAlign:'right', color:'#008844'}}>
                          ₹{Number(pnlData.income.total).toLocaleString('en-IN', {minimumFractionDigits:2})}
                        </td>
                      </tr>

                      {/* Spacer */}
                      <tr><td colSpan="3" style={{height:'12px', border:'none'}}></td></tr>

                      {/* Section: Expenses */}
                      <tr className="report-section-row">
                        <td colSpan="3">2. COST OF GOODS SOLD & OPERATING EXPENSES</td>
                      </tr>
                      {pnlData.expenses.lines.length === 0 ? (
                        <tr>
                          <td colSpan="3" style={{color:'#94a3b8', fontStyle:'italic', paddingLeft:'24px'}}>
                            No expenses recorded for this period.
                          </td>
                        </tr>
                      ) : (
                        pnlData.expenses.lines.map((l, i) => (
                          <tr key={i}>
                            <td style={{paddingLeft:'24px'}}>{l.account_name}</td>
                            <td><span style={{fontSize:'12px', background:'#fff0f0', color:'#aa0000', padding:'2px 6px', borderRadius:'4px'}}>{l.account_type}</span></td>
                            <td style={{textAlign:'right', fontWeight:600}}>
                              ₹{Number(l.amount).toLocaleString('en-IN', {minimumFractionDigits:2})}
                            </td>
                          </tr>
                        ))
                      )}
                      <tr className="report-subtotal-row">
                        <td colSpan="2" style={{paddingLeft:'24px'}}>Total Operating Expenses</td>
                        <td style={{textAlign:'right', color:'#cc0000'}}>
                          ₹{Number(pnlData.expenses.total).toLocaleString('en-IN', {minimumFractionDigits:2})}
                        </td>
                      </tr>

                      {/* Spacer */}
                      <tr><td colSpan="3" style={{height:'16px', border:'none'}}></td></tr>

                      {/* Grand Totals */}
                      <tr className="report-grandtotal-row">
                        <td colSpan="2">NET PROFIT / (LOSS) FOR THE PERIOD</td>
                        <td style={{textAlign:'right', color: Number(pnlData.net_profit) >= 0 ? '#006622' : '#aa0000'}}>
                          ₹{Number(pnlData.net_profit).toLocaleString('en-IN', {minimumFractionDigits:2})}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* TAB 2: BALANCE SHEET STATEMENT                       */}
        {/* ---------------------------------------------------- */}
        {activeTab === 'bs' && (
          <div>
            {/* Filter Controls Bar */}
            <div className="card" style={{marginBottom:'20px', padding:'14px 20px'}}>
              <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:'12px'}}>
                <div style={{display:'flex', alignItems:'center', gap:'12px'}}>
                  <span style={{fontWeight:600, fontSize:'13px', color:'#334155'}}>Statement As of Date:</span>
                  <input
                    type="date"
                    value={asOfDate}
                    onChange={e => setAsOfDate(e.target.value)}
                    style={{padding:'4px 8px', fontSize:'13px', border:'1px solid #cbd5e1', borderRadius:'6px'}}
                  />
                </div>
                <button
                  className="btn-primary"
                  onClick={() => loadActiveReport('bs')}
                  disabled={loading}
                  style={{fontSize:'13px', padding:'6px 14px'}}
                >
                  {loading ? 'Evaluating...' : 'Update Balance Sheet'}
                </button>
              </div>
            </div>

            {/* KPI Cards */}
            {bsData && (
              <>
                <div className="report-kpi-grid">
                  <div className="report-kpi-card" style={{borderLeftColor:'#0055cc'}}>
                    <div className="report-kpi-title">Total Assets</div>
                    <div className="report-kpi-value" style={{color:'#0055cc'}}>
                      ₹{Number(bsData.total_assets).toLocaleString('en-IN', {minimumFractionDigits:2})}
                    </div>
                    <div className="report-kpi-subtext">Current & Fixed Holdings</div>
                  </div>

                  <div className="report-kpi-card" style={{borderLeftColor:'#e67e22'}}>
                    <div className="report-kpi-title">Total Liabilities</div>
                    <div className="report-kpi-value" style={{color:'#e67e22'}}>
                      ₹{Number(bsData.total_liabilities).toLocaleString('en-IN', {minimumFractionDigits:2})}
                    </div>
                    <div className="report-kpi-subtext">Payables & Obligations</div>
                  </div>

                  <div className="report-kpi-card" style={{borderLeftColor:'#8e44ad'}}>
                    <div className="report-kpi-title">Total Equity</div>
                    <div className="report-kpi-value" style={{color:'#8e44ad'}}>
                      ₹{Number(bsData.total_equity).toLocaleString('en-IN', {minimumFractionDigits:2})}
                    </div>
                    <div className="report-kpi-subtext">Capital + Current Net Earnings</div>
                  </div>

                  <div className="report-kpi-card" style={{borderLeftColor:'#00aa44'}}>
                    <div className="report-kpi-title">Double-Entry Equilibrium</div>
                    <div className="report-kpi-value" style={{color:'#00aa44', fontSize:'18px'}}>
                      {bsData.is_balanced ? 'BALANCED ✓' : 'UNBALANCED ✗'}
                    </div>
                    <div className="report-kpi-subtext">Assets = Liabilities + Equity</div>
                  </div>
                </div>

                {/* Balance Sheet Statement */}
                <div className="card" style={{padding:'20px'}}>
                  <h3 style={{marginBottom:'16px', color:'#0f3460', borderBottom:'1px solid #e2e8f0', paddingBottom:'8px'}}>
                    Statement of Financial Position (Balance Sheet)
                  </h3>

                  <table className="je-items-table" style={{fontSize:'14px'}}>
                    <thead>
                      <tr>
                        <th style={{width:'50%'}}>Ledger Classification</th>
                        <th style={{width:'25%'}}>Classification Type</th>
                        <th style={{width:'25%', textAlign:'right'}}>Amount (₹)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* Section: Assets */}
                      <tr className="report-section-row">
                        <td colSpan="3">1. ASSETS (What the Enterprise Owns)</td>
                      </tr>
                      {bsData.assets.lines.map((l, i) => (
                        <tr key={i}>
                          <td style={{paddingLeft:'24px'}}>{l.account_name}</td>
                          <td><span style={{fontSize:'12px', background:'#e6f0ff', color:'#0044aa', padding:'2px 6px', borderRadius:'4px'}}>{l.account_type}</span></td>
                          <td style={{textAlign:'right', fontWeight:600}}>
                            ₹{Number(l.balance).toLocaleString('en-IN', {minimumFractionDigits:2})}
                          </td>
                        </tr>
                      ))}
                      <tr className="report-subtotal-row">
                        <td colSpan="2" style={{paddingLeft:'24px'}}>TOTAL ASSETS</td>
                        <td style={{textAlign:'right', color:'#0055cc'}}>
                          ₹{Number(bsData.total_assets).toLocaleString('en-IN', {minimumFractionDigits:2})}
                        </td>
                      </tr>

                      {/* Spacer */}
                      <tr><td colSpan="3" style={{height:'16px', border:'none'}}></td></tr>

                      {/* Section: Liabilities */}
                      <tr className="report-section-row">
                        <td colSpan="3">2. LIABILITIES (What the Enterprise Owes)</td>
                      </tr>
                      {bsData.liabilities.lines.map((l, i) => (
                        <tr key={i}>
                          <td style={{paddingLeft:'24px'}}>{l.account_name}</td>
                          <td><span style={{fontSize:'12px', background:'#fff0e6', color:'#aa4400', padding:'2px 6px', borderRadius:'4px'}}>{l.account_type}</span></td>
                          <td style={{textAlign:'right', fontWeight:600}}>
                            ₹{Number(l.balance).toLocaleString('en-IN', {minimumFractionDigits:2})}
                          </td>
                        </tr>
                      ))}
                      <tr className="report-subtotal-row">
                        <td colSpan="2" style={{paddingLeft:'24px'}}>TOTAL LIABILITIES</td>
                        <td style={{textAlign:'right', color:'#e67e22'}}>
                          ₹{Number(bsData.total_liabilities).toLocaleString('en-IN', {minimumFractionDigits:2})}
                        </td>
                      </tr>

                      {/* Spacer */}
                      <tr><td colSpan="3" style={{height:'16px', border:'none'}}></td></tr>

                      {/* Section: Equity */}
                      <tr className="report-section-row">
                        <td colSpan="3">3. EQUITY (Shareholders' / Owner's Interest)</td>
                      </tr>
                      {bsData.equity.lines.map((l, i) => (
                        <tr key={i}>
                          <td style={{paddingLeft:'24px'}}>{l.account_name}</td>
                          <td><span style={{fontSize:'12px', background:'#f3e8ff', color:'#6b21a8', padding:'2px 6px', borderRadius:'4px'}}>{l.account_type}</span></td>
                          <td style={{textAlign:'right', fontWeight:600}}>
                            ₹{Number(l.balance).toLocaleString('en-IN', {minimumFractionDigits:2})}
                          </td>
                        </tr>
                      ))}
                      <tr className="report-subtotal-row">
                        <td colSpan="2" style={{paddingLeft:'24px'}}>TOTAL EQUITY</td>
                        <td style={{textAlign:'right', color:'#8e44ad'}}>
                          ₹{Number(bsData.total_equity).toLocaleString('en-IN', {minimumFractionDigits:2})}
                        </td>
                      </tr>

                      {/* Spacer */}
                      <tr><td colSpan="3" style={{height:'16px', border:'none'}}></td></tr>

                      {/* Summary Equilibrium Row */}
                      <tr className="report-grandtotal-row">
                        <td colSpan="2">TOTAL LIABILITIES & EQUITY</td>
                        <td style={{textAlign:'right', color:'#0f3460'}}>
                          ₹{Number(bsData.total_liabilities_and_equity).toLocaleString('en-IN', {minimumFractionDigits:2})}
                        </td>
                      </tr>
                    </tbody>
                  </table>

                  {/* Accounting Equation Verification Box */}
                  <div className={`balance-box ${bsData.is_balanced ? 'balance-box-balanced' : 'balance-box-unbalanced'}`} style={{marginTop:'20px'}}>
                    <div>
                      <strong>Fundamental Equation:</strong> Assets (₹{Number(bsData.total_assets).toFixed(2)}) =
                      Liabilities & Equity (₹{Number(bsData.total_liabilities_and_equity).toFixed(2)})
                    </div>
                    <div>
                      {bsData.is_balanced ? (
                        <span>✅ <strong>Statement in Equilibrium</strong> (Diff: ₹{Number(bsData.difference).toFixed(2)})</span>
                      ) : (
                        <span>⚠️ <strong>Imbalance Detected:</strong> ₹{Number(bsData.difference).toFixed(2)}</span>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* TAB 3: BUDGET PERFORMANCE REPORT                     */}
        {/* ---------------------------------------------------- */}
        {activeTab === 'budget' && (
          <div>
            {/* Filter Controls Bar */}
            <div className="card" style={{marginBottom:'20px', padding:'14px 20px'}}>
              <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:'12px'}}>
                <div style={{display:'flex', alignItems:'center', gap:'12px'}}>
                  <span style={{fontWeight:600, fontSize:'13px', color:'#334155'}}>Cost Center Filter:</span>
                  <select
                    className="form-select"
                    style={{padding:'6px 10px', fontSize:'13px', minWidth:'220px'}}
                    value={selectedAnalytic}
                    onChange={e => setSelectedAnalytic(e.target.value)}
                  >
                    <option value="All">All Cost Centers / Projects</option>
                    {analytics.map(a => (
                      <option key={a.id} value={a.id}>{a.analytic_name} ({a.type})</option>
                    ))}
                  </select>
                </div>
                <button
                  className="btn-primary"
                  onClick={() => loadActiveReport('budget')}
                  disabled={loading}
                  style={{fontSize:'13px', padding:'6px 14px'}}
                >
                  {loading ? 'Evaluating...' : 'Refresh Budget Report'}
                </button>
              </div>
            </div>

            {/* KPI Cards */}
            {budgetData && (
              <>
                <div className="report-kpi-grid">
                  <div className="report-kpi-card" style={{borderLeftColor:'#0f3460'}}>
                    <div className="report-kpi-title">Total Planned Allocation</div>
                    <div className="report-kpi-value" style={{color:'#0f3460'}}>
                      ₹{Number(budgetData.total_planned).toLocaleString('en-IN', {minimumFractionDigits:2})}
                    </div>
                    <div className="report-kpi-subtext">Approved Budget Ceiling</div>
                  </div>

                  <div className="report-kpi-card" style={{borderLeftColor:'#cc0000'}}>
                    <div className="report-kpi-title">Total Actual Spending</div>
                    <div className="report-kpi-value" style={{color:'#cc0000'}}>
                      ₹{Number(budgetData.total_actual).toLocaleString('en-IN', {minimumFractionDigits:2})}
                    </div>
                    <div className="report-kpi-subtext">Realized Expenditures</div>
                  </div>

                  <div className="report-kpi-card" style={{borderLeftColor: Number(budgetData.total_variance) >= 0 ? '#008844' : '#aa0000'}}>
                    <div className="report-kpi-title">Remaining Variance</div>
                    <div className="report-kpi-value" style={{color: Number(budgetData.total_variance) >= 0 ? '#008844' : '#aa0000'}}>
                      ₹{Number(budgetData.total_variance).toLocaleString('en-IN', {minimumFractionDigits:2})}
                    </div>
                    <div className="report-kpi-subtext">Available Spend Headroom</div>
                  </div>

                  <div className="report-kpi-card" style={{borderLeftColor:'#e67e22'}}>
                    <div className="report-kpi-title">Overall Portfolio Utilization</div>
                    <div className="report-kpi-value" style={{color:'#e67e22'}}>
                      {budgetData.overall_utilization_percentage}%
                    </div>
                    <div className="progress-bar-bg">
                      <div
                        className="progress-bar-fill"
                        style={{
                          width: `${Math.min(budgetData.overall_utilization_percentage, 100)}%`,
                          background: budgetData.overall_utilization_percentage > 100 ? '#cc0000' : budgetData.overall_utilization_percentage >= 80 ? '#e67e22' : '#00aa44'
                        }}
                      ></div>
                    </div>
                  </div>
                </div>

                {/* Budgets Performance Table */}
                <div className="card" style={{padding:'20px'}}>
                  <h3 style={{marginBottom:'16px', color:'#0f3460', borderBottom:'1px solid #e2e8f0', paddingBottom:'8px'}}>
                    Cost Center Budget Performance & Variance Analysis
                  </h3>

                  {budgetData.items.length === 0 ? (
                    <div className="empty-state">No budgets found for the selected filter.</div>
                  ) : (
                    <table className="data-table" style={{fontSize:'13px'}}>
                      <thead>
                        <tr>
                          <th>Budget Name</th>
                          <th>Cost Center</th>
                          <th>Period</th>
                          <th style={{textAlign:'right'}}>Planned (₹)</th>
                          <th style={{textAlign:'right'}}>Actual (₹)</th>
                          <th style={{textAlign:'right'}}>Variance (₹)</th>
                          <th style={{width:'18%'}}>Utilization</th>
                          <th style={{textAlign:'center'}}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {budgetData.items.map(b => (
                          <tr key={b.budget_id}>
                            <td style={{fontWeight:600, color:'#0f3460'}}>{b.budget_name}</td>
                            <td>{b.analytic_name}</td>
                            <td>{b.start_date} <span style={{color:'#94a3b8'}}>to</span> {b.end_date}</td>
                            <td style={{textAlign:'right', fontWeight:500}}>
                              ₹{Number(b.planned_amount).toLocaleString('en-IN', {minimumFractionDigits:2})}
                            </td>
                            <td style={{textAlign:'right', fontWeight:500, color:'#cc0000'}}>
                              ₹{Number(b.actual_amount).toLocaleString('en-IN', {minimumFractionDigits:2})}
                            </td>
                            <td style={{textAlign:'right', fontWeight:600, color: Number(b.variance) >= 0 ? '#006622' : '#aa0000'}}>
                              ₹{Number(b.variance).toLocaleString('en-IN', {minimumFractionDigits:2})}
                            </td>
                            <td>
                              <div style={{display:'flex', justifyContent:'space-between', fontSize:'11px', marginBottom:'2px'}}>
                                <span>{b.utilization_percentage}%</span>
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
                            </td>
                            <td style={{textAlign:'center'}}>
                              <span
                                className={`status-badge ${
                                  b.status === 'Under Budget'
                                    ? 'status-paid'
                                    : b.status === 'Near Limit'
                                    ? 'status-posted'
                                    : 'status-cancelled'
                                }`}
                              >
                                {b.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </>
            )}
          </div>
        )}

      </div>
  )
}

export default ReportsPage
