import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import Dashboard from './pages/Dashboard'
import ContactsPage from './pages/ContactsPage'
import CategoriesPage from './pages/CategoriesPage'
import ProductsPage from './pages/ProductsPage'

function App() {
  return (
    <Routes>
      <Route path="/login"      element={<LoginPage />} />
      <Route path="/register"   element={<RegisterPage />} />
      <Route path="/dashboard"  element={<Dashboard />} />
      <Route path="/contacts"   element={<ContactsPage />} />
      <Route path="/categories" element={<CategoriesPage />} />
      <Route path="/products"   element={<ProductsPage />} />
      <Route path="/"           element={<Navigate to="/login" replace />} />
      <Route path="*"           element={<Navigate to="/login" replace />} />
    </Routes>
  )
}

export default App
