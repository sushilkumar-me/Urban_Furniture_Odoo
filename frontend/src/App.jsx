import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import AppLayout from './components/AppLayout'

// Pages
import LoginPage from './pages/LoginPage'
import SignUpPage from './pages/SignUpPage'
import RegisterPage from './pages/RegisterPage'
import RoleSelectionPage from './pages/RoleSelectionPage'
import Dashboard from './pages/Dashboard'
import CustomerDashboard from './pages/CustomerDashboard'
import VendorDashboard from './pages/VendorDashboard'
import ContactsPage from './pages/ContactsPage'
import CategoriesPage from './pages/CategoriesPage'
import ProductsPage from './pages/ProductsPage'
import AccountsPage from './pages/AccountsPage'
import JournalsPage from './pages/JournalsPage'
import AnalyticAccountsPage from './pages/AnalyticAccountsPage'
import BudgetsPage from './pages/BudgetsPage'
import PurchaseOrdersPage from './pages/PurchaseOrdersPage'
import VendorBillsPage from './pages/VendorBillsPage'
import SalesOrdersPage from './pages/SalesOrdersPage'
import CustomerInvoicesPage from './pages/CustomerInvoicesPage'
import PaymentsPage from './pages/PaymentsPage'
import JournalEntriesPage from './pages/JournalEntriesPage'
import ReportsPage from './pages/ReportsPage'

function App() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login"  element={<LoginPage />} />
      <Route path="/signup" element={<SignUpPage />} />

      {/* Standalone Role Selection (Any authenticated user) */}
      <Route
        path="/select-role"
        element={
          <ProtectedRoute>
            <RoleSelectionPage />
          </ProtectedRoute>
        }
      />

      {/* Authenticated ERP Application Shell (Collapsible Sidebar + Top Header) */}
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        {/* Role-Specific Dashboards */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute allowedRoles={['Admin', 'Accountant']}>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/customer-dashboard"
          element={
            <ProtectedRoute allowedRoles={['Customer', 'Admin']}>
              <CustomerDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/vendor-dashboard"
          element={
            <ProtectedRoute allowedRoles={['Vendor', 'Admin']}>
              <VendorDashboard />
            </ProtectedRoute>
          }
        />

        {/* Admin-Only User Provisioning */}
        <Route
          path="/register"
          element={
            <ProtectedRoute allowedRoles={['Admin']}>
              <RegisterPage />
            </ProtectedRoute>
          }
        />

        {/* Master Data */}
        <Route
          path="/contacts"
          element={
            <ProtectedRoute allowedRoles={['Admin', 'Accountant']}>
              <ContactsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/categories"
          element={
            <ProtectedRoute allowedRoles={['Admin', 'Accountant']}>
              <CategoriesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/products"
          element={
            <ProtectedRoute allowedRoles={['Admin', 'Accountant']}>
              <ProductsPage />
            </ProtectedRoute>
          }
        />

        {/* Financial Accounting */}
        <Route
          path="/accounts"
          element={
            <ProtectedRoute allowedRoles={['Admin', 'Accountant']}>
              <AccountsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/journals"
          element={
            <ProtectedRoute allowedRoles={['Admin', 'Accountant']}>
              <JournalsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/analytic-accounts"
          element={
            <ProtectedRoute allowedRoles={['Admin', 'Accountant']}>
              <AnalyticAccountsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/budgets"
          element={
            <ProtectedRoute allowedRoles={['Admin', 'Accountant']}>
              <BudgetsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/journal-entries"
          element={
            <ProtectedRoute allowedRoles={['Admin', 'Accountant']}>
              <JournalEntriesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports"
          element={
            <ProtectedRoute allowedRoles={['Admin', 'Accountant']}>
              <ReportsPage />
            </ProtectedRoute>
          }
        />

        {/* Operations */}
        <Route
          path="/purchase-orders"
          element={
            <ProtectedRoute allowedRoles={['Admin', 'Accountant']}>
              <PurchaseOrdersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/sales-orders"
          element={
            <ProtectedRoute allowedRoles={['Admin', 'Accountant']}>
              <SalesOrdersPage />
            </ProtectedRoute>
          }
        />

        {/* Scoped Invoices & Bills & Payments */}
        <Route
          path="/customer-invoices"
          element={
            <ProtectedRoute allowedRoles={['Admin', 'Accountant', 'Customer']}>
              <CustomerInvoicesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/vendor-bills"
          element={
            <ProtectedRoute allowedRoles={['Admin', 'Accountant', 'Vendor']}>
              <VendorBillsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/payments"
          element={
            <ProtectedRoute allowedRoles={['Admin', 'Accountant', 'Customer', 'Vendor']}>
              <PaymentsPage />
            </ProtectedRoute>
          }
        />
      </Route>

      {/* Fallback Catch-All Route */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}

export default App
