// Utility for generating and auto-downloading professional Payment Vouchers
// for both Vendor Bill Disbursements (Outbound) and Customer Invoice Receipts (Inbound).

function numberToWords(num) {
  const a = [
    '', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ',
    'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ',
    'Seventeen ', 'Eighteen ', 'Nineteen '
  ]
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']

  const n = ('000000000' + Math.floor(num)).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/)
  if (!n) return 'Zero Rupees'
  let str = ''
  str += (Number(n[1]) !== 0) ? (a[Number(n[1])] || b[n[1][0]] + ' ' + a[n[1][1]]) + 'Crore ' : ''
  str += (Number(n[2]) !== 0) ? (a[Number(n[2])] || b[n[2][0]] + ' ' + a[n[2][1]]) + 'Lakh ' : ''
  str += (Number(n[3]) !== 0) ? (a[Number(n[3])] || b[n[3][0]] + ' ' + a[n[3][1]]) + 'Thousand ' : ''
  str += (Number(n[4]) !== 0) ? (a[Number(n[4])] || b[n[4][0]] + ' ' + a[n[4][1]]) + 'Hundred ' : ''
  str += (Number(n[5]) !== 0) ? ((str !== '') ? 'and ' : '') + (a[Number(n[5])] || b[n[5][0]] + ' ' + a[n[5][1]]) : ''
  return str.trim() ? `${str.trim()} Rupees Only` : 'Zero Rupees Only'
}

export function generatePaymentVoucherHtml({
  voucherNo,
  paymentType = 'Send', // 'Send' (Vendor Disbursement) or 'Receive' (Customer Receipt)
  paymentDate,
  paymentMethod = 'Bank Transfer',
  partnerName = 'Beneficiary',
  documentRef = 'N/A',
  poNumber = '',
  soNumber = '',
  amount = 0,
  note = ''
}) {
  const isSend = paymentType === 'Send'
  const title = isSend ? 'PAYMENT DISBURSEMENT VOUCHER' : 'PAYMENT RECEIPT VOUCHER'
  const partyLabel = isSend ? 'Paid To (Beneficiary)' : 'Received From (Customer)'
  const formattedAmount = Number(amount || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
  const amountWords = numberToWords(amount || 0)
  const displayDate = paymentDate || new Date().toISOString().split('T')[0]
  const displayVoucherNo = voucherNo || `VOUCH-${Date.now().toString().slice(-6)}`

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${title} - ${displayVoucherNo}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
    
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    }
    body {
      background: #f8fafc;
      color: #0f172a;
      padding: 32px 16px;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .print-bar {
      max-width: 800px;
      width: 100%;
      display: flex;
      justifyContent: space-between;
      align-items: center;
      margin-bottom: 20px;
    }
    .print-btn {
      background: #0f3460;
      color: #ffffff;
      border: none;
      padding: 10px 24px;
      font-size: 14px;
      font-weight: 700;
      border-radius: 8px;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(15, 52, 96, 0.25);
    }
    .voucher-card {
      background: #ffffff;
      width: 100%;
      max-width: 800px;
      border: 2px solid #e2e8f0;
      border-radius: 16px;
      padding: 40px 48px;
      box-shadow: 0 10px 25px rgba(0,0,0,0.05);
    }
    .header-table {
      width: 100%;
      border-bottom: 2px solid #0f3460;
      padding-bottom: 20px;
      margin-bottom: 24px;
    }
    .company-title {
      font-size: 24px;
      font-weight: 800;
      color: #0f3460;
      letter-spacing: -0.5px;
    }
    .company-sub {
      font-size: 12px;
      color: #64748b;
      margin-top: 4px;
      line-height: 1.5;
    }
    .voucher-badge {
      text-align: right;
    }
    .voucher-pill {
      display: inline-block;
      background: ${isSend ? '#eff6ff' : '#ecfdf5'};
      color: ${isSend ? '#1d4ed8' : '#047857'};
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      padding: 6px 14px;
      border-radius: 20px;
      letter-spacing: 0.5px;
      border: 1px solid ${isSend ? '#bfdbfe' : '#a7f3d0'};
    }
    .voucher-h1 {
      font-size: 20px;
      font-weight: 800;
      color: #1e293b;
      margin-top: 8px;
    }
    .voucher-num {
      font-size: 14px;
      font-weight: 600;
      color: #0f3460;
      margin-top: 2px;
    }
    .meta-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 18px 20px;
      margin-bottom: 24px;
    }
    .meta-item {
      display: flex;
      flex-direction: column;
    }
    .meta-label {
      font-size: 11px;
      font-weight: 600;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .meta-val {
      font-size: 14px;
      font-weight: 700;
      color: #0f172a;
      margin-top: 3px;
    }
    .data-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 24px;
    }
    .data-table th {
      background: #0f3460;
      color: #ffffff;
      font-size: 12px;
      font-weight: 700;
      text-align: left;
      padding: 10px 14px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .data-table td {
      padding: 12px 14px;
      font-size: 13px;
      border-bottom: 1px solid #e2e8f0;
      color: #334155;
    }
    .total-box {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 24px;
    }
    .total-inner {
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      border-radius: 10px;
      padding: 14px 24px;
      text-align: right;
      min-width: 280px;
    }
    .total-title {
      font-size: 12px;
      color: #64748b;
      font-weight: 600;
      text-transform: uppercase;
    }
    .total-figure {
      font-size: 26px;
      font-weight: 800;
      color: #0f3460;
      margin-top: 4px;
    }
    .words-box {
      background: #fffbeb;
      border: 1px solid #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 12px 16px;
      border-radius: 6px;
      margin-bottom: 28px;
    }
    .words-title {
      font-size: 11px;
      font-weight: 700;
      color: #b45309;
      text-transform: uppercase;
    }
    .words-content {
      font-size: 13px;
      font-weight: 700;
      color: #92400e;
      margin-top: 2px;
      font-style: italic;
    }
    .accounting-box {
      background: #faf5ff;
      border: 1px solid #f3e8ff;
      border-radius: 8px;
      padding: 12px 16px;
      margin-bottom: 36px;
      font-size: 12px;
      color: #6b21a8;
    }
    .sig-table {
      width: 100%;
      margin-top: 30px;
      border-top: 1px dashed #cbd5e1;
      padding-top: 24px;
    }
    .sig-col {
      text-align: center;
      width: 33.33%;
    }
    .sig-line {
      width: 70%;
      margin: 40px auto 8px auto;
      border-bottom: 1.5px solid #94a3b8;
    }
    .sig-text {
      font-size: 12px;
      font-weight: 600;
      color: #475569;
    }
    @media print {
      body {
        background: #ffffff;
        padding: 0;
      }
      .print-bar {
        display: none !important;
      }
      .voucher-card {
        border: none;
        box-shadow: none;
        padding: 20px 0;
      }
    }
  </style>
</head>
<body>

  <div class="print-bar">
    <div style="font-size: 13px; color: #64748b;">Official ERP Transaction Record &bull; Urban Furniture Ltd.</div>
    <button class="print-btn" onclick="window.print()">🖨️ Print / Save as PDF</button>
  </div>

  <div class="voucher-card">
    <table class="header-table">
      <tr>
        <td style="vertical-align: top;">
          <div class="company-title">🛋️ Urban Furniture Ltd.</div>
          <div class="company-sub">
            Corporate Office: Plot 42, Industrial Area, Sector 62<br>
            Noida, Uttar Pradesh - 201301 | GSTIN: 07AAAAU0000A1Z5<br>
            Email: accounts@urbanfurniture.com | Tel: +91 (120) 456-7890
          </div>
        </td>
        <td style="vertical-align: top;" class="voucher-badge">
          <span class="voucher-pill">● POSTED & VERIFIED</span>
          <div class="voucher-h1">${title}</div>
          <div class="voucher-num">${displayVoucherNo}</div>
        </td>
      </tr>
    </table>

    <div class="meta-grid">
      <div class="meta-item">
        <span class="meta-label">Payment Date</span>
        <span class="meta-val">${displayDate}</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">Payment Method</span>
        <span class="meta-val">${paymentMethod}</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">${partyLabel}</span>
        <span class="meta-val">${partnerName}</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">Linked Reference</span>
        <span class="meta-val">${documentRef} ${poNumber ? `(PO: ${poNumber})` : ''} ${soNumber ? `(SO: ${soNumber})` : ''}</span>
      </div>
    </div>

    <table class="data-table">
      <thead>
        <tr>
          <th>Particulars / Description</th>
          <th>Reference</th>
          <th>Payment Mode</th>
          <th style="text-align: right;">Amount (INR)</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>
            <strong>${isSend ? 'Disbursement for Vendor Bill' : 'Collection for Customer Invoice'}</strong><br>
            <span style="font-size: 11px; color: #64748b;">${note || 'Full account settlement against confirmed invoice/bill.'}</span>
          </td>
          <td>${documentRef}</td>
          <td>${paymentMethod}</td>
          <td style="text-align: right; font-weight: 700; color: #0f172a;">₹${formattedAmount}</td>
        </tr>
      </tbody>
    </table>

    <div class="total-box">
      <div class="total-inner">
        <div class="total-title">Total Amount Settled</div>
        <div class="total-figure">₹${formattedAmount}</div>
      </div>
    </div>

    <div class="words-box">
      <div class="words-title">Amount in Words:</div>
      <div class="words-content">${amountWords}</div>
    </div>

    <div class="accounting-box">
      <strong>GL Double-Entry Posting Audit:</strong><br>
      ${isSend 
        ? `&bull; Debit: <strong>2010 - Accounts Payable (${partnerName})</strong>: ₹${formattedAmount}<br>&bull; Credit: <strong>1010 - ${paymentMethod === 'Cash' ? 'Cash Account' : 'Main Operating Bank Account'}</strong>: ₹${formattedAmount}` 
        : `&bull; Debit: <strong>1010 - ${paymentMethod === 'Cash' ? 'Cash Account' : 'Main Operating Bank Account'}</strong>: ₹${formattedAmount}<br>&bull; Credit: <strong>1100 - Accounts Receivable (${partnerName})</strong>: ₹${formattedAmount}`
      }
    </div>

    <table class="sig-table">
      <tr>
        <td class="sig-col">
          <div class="sig-line"></div>
          <div class="sig-text">Prepared By<br><small style="color:#94a3b8">Accounts Officer</small></div>
        </td>
        <td class="sig-col">
          <div class="sig-line"></div>
          <div class="sig-text">Verified By<br><small style="color:#94a3b8">Finance Manager</small></div>
        </td>
        <td class="sig-col">
          <div class="sig-line"></div>
          <div class="sig-text">Authorized Signatory & Seal<br><small style="color:#94a3b8">Urban Furniture Ltd.</small></div>
        </td>
      </tr>
    </table>
  </div>

</body>
</html>`
}

export function downloadPaymentVoucher(voucherData) {
  try {
    const htmlContent = generatePaymentVoucherHtml(voucherData)
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    const safeRef = (voucherData.voucherNo || voucherData.documentRef || 'payment').replace(/[^a-zA-Z0-9_-]/g, '_')
    link.setAttribute('download', `Voucher_${safeRef}.html`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  } catch (err) {
    console.error('Failed to download voucher:', err)
  }
}
