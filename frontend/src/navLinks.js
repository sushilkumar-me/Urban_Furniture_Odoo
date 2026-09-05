/**
 * Role-Aware Navigation Links Configuration with Visual Icons and Grouping
 * 
 * Defines accessible menu links for:
 * - Admin: Full enterprise access + User Management
 * - Accountant: Operational & Financial modules (no user creation)
 * - Customer: Portal Dashboard, My Invoices, Payment Receipts
 * - Vendor: Vendor Portal, My Bills, Payment Settlements
 */

export function getNavLinks(role) {
  const currentRole = role || localStorage.getItem('role') || localStorage.getItem('active_role') || 'Admin'

  if (currentRole === 'Customer') {
    return [
      { label: 'Portal Dashboard', path: '/customer-dashboard', icon: '🛒', group: 'Portal' },
      { label: 'My Invoices',      path: '/customer-invoices',  icon: '📑', group: 'Billing' },
      { label: 'Payment Receipts', path: '/payments',           icon: '💳', group: 'Billing' },
    ]
  }

  if (currentRole === 'Vendor') {
    return [
      { label: 'Vendor Portal',    path: '/vendor-dashboard',   icon: '🚚', group: 'Portal' },
      { label: 'My Bills',         path: '/vendor-bills',       icon: '🧾', group: 'Payables' },
      { label: 'Settlements',      path: '/payments',           icon: '💳', group: 'Payables' },
    ]
  }

  // Common accounting & operations links for Admin & Accountant
  const staffLinks = [
    { label: 'Dashboard',         path: '/dashboard',         icon: '🏢', group: 'Overview' },
    { label: 'Sales Orders',      path: '/sales-orders',      icon: '🛍️', group: 'Sales & Revenue' },
    { label: 'Customer Invoices', path: '/customer-invoices', icon: '📑', group: 'Sales & Revenue' },
    { label: 'Purchase Orders',   path: '/purchase-orders',   icon: '🛒', group: 'Purchases & Vendors' },
    { label: 'Vendor Bills',      path: '/vendor-bills',      icon: '🧾', group: 'Purchases & Vendors' },
    { label: 'Payments',          path: '/payments',          icon: '💳', group: 'Treasury & Ledger' },
    { label: 'Accounts',          path: '/accounts',          icon: '💰', group: 'Treasury & Ledger' },
    { label: 'Journals',          path: '/journals',          icon: '📖', group: 'Treasury & Ledger' },
    { label: 'Journal Entries',   path: '/journal-entries',   icon: '⚖️', group: 'Treasury & Ledger' },
    { label: 'Analytics',         path: '/analytic-accounts', icon: '📈', group: 'Management & Budget' },
    { label: 'Budgets',           path: '/budgets',           icon: '🎯', group: 'Management & Budget' },
    { label: 'Contacts',          path: '/contacts',          icon: '👥', group: 'Master Data' },
    { label: 'Products',          path: '/products',          icon: '📦', group: 'Master Data' },
    { label: 'Categories',        path: '/categories',        icon: '🏷️', group: 'Master Data' },
    { label: 'Reports',           path: '/reports',           icon: '📊', group: 'Financial Intelligence' },
  ]

  // Admin gets User Management in addition to staff links
  if (currentRole === 'Admin') {
    return [
      ...staffLinks,
      { label: 'User Admin', path: '/register', icon: '🛡️', group: 'Administration' },
    ]
  }

  return staffLinks
}

/**
 * navLinks Proxy
 * Automatically proxies array calls (map, filter, forEach, length, iterator)
 * to dynamically evaluate getNavLinks() based on the currently logged-in user's role.
 */
export const navLinks = new Proxy([], {
  get(target, prop) {
    const list = getNavLinks()
    if (typeof list[prop] === 'function') {
      return list[prop].bind(list)
    }
    return list[prop]
  }
})
