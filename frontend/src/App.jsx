import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import SignUpPage from './pages/SignUpPage'
import RoleSelectionPage from './pages/RoleSelectionPage'
import Dashboard from './pages/Dashboard'
import ContactsPage from './pages/ContactsPage'
import CategoriesPage from './pages/CategoriesPage'
import ProductsPage from './pages/ProductsPage'
import AccountsPage from './pages/AccountsPage'
import JournalsPage from './pages/JournalsPage'
import AnalyticAccountsPage from './pages/AnalyticAccountsPage'
import BudgetsPage from './pages/BudgetsPage'
import PurchaseOrdersPage from './pages/PurchaseOrdersPage'
import VendorBillsPage from './pages/VendorBillsPage'
import PaymentsPage from './pages/PaymentsPage'

function App() {
  return (
    <Routes>
      <Route path="/login"         element={<LoginPage />} />
      <Route path="/signup"        element={<SignUpPage />} />
      <Route path="/register"      element={<RegisterPage />} />
      <Route path="/select-role"   element={<RoleSelectionPage />} />
      <Route path="/dashboard"     element={<Dashboard />} />
      <Route path="/customer-dashboard" element={<Dashboard />} />
      <Route path="/contacts"   element={<ContactsPage />} />
      <Route path="/categories" element={<CategoriesPage />} />
      <Route path="/products"   element={<ProductsPage />} />
      <Route path="/accounts"          element={<AccountsPage />} />
      <Route path="/journals"          element={<JournalsPage />} />
      <Route path="/analytic-accounts" element={<AnalyticAccountsPage />} />
      <Route path="/budgets"           element={<BudgetsPage />} />
      <Route path="/purchase-orders"   element={<PurchaseOrdersPage />} />
      <Route path="/vendor-bills"      element={<VendorBillsPage />} />
      <Route path="/payments"          element={<PaymentsPage />} />
      <Route path="/"           element={<Navigate to="/login" replace />} />
      <Route path="*"           element={<Navigate to="/login" replace />} />
    </Routes>
  )
}

export default App
