// ============================================================
// src/App.jsx
//
// WHY THIS FILE EXISTS:
//   App.jsx is the ROOT COMPONENT of the React application.
//   Its job is to define WHICH page component renders at WHICH URL.
//
// ROUTING IN REACT:
//   In a normal website, different URLs load different HTML files.
//   In React, there is only ONE HTML file (index.html).
//   react-router-dom watches the browser URL and renders
//   the matching component — without reloading the page.
//
//   URL: /login     → renders <LoginPage />
//   URL: /dashboard → renders <Dashboard />
//   URL: /          → redirects to /login
//   URL: anything else → redirects to /login
// ============================================================

import React from 'react'

// Routes: the container for all route definitions
// Route: defines one URL → component mapping
// Navigate: immediately redirects to another URL
import { Routes, Route, Navigate } from 'react-router-dom'

// Our page components
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import Dashboard from './pages/Dashboard'
import ContactsPage from './pages/ContactsPage'


function App() {
  return (
    // Routes: React Router looks at the current URL
    // and renders the first <Route> whose path matches.
    <Routes>

      {/*
        path="/login" → when URL is /login, render <LoginPage />
        This is where users land to sign in.
      */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/*
        path="/dashboard" → when URL is /dashboard, render <Dashboard />
        This is where users land after successful login.
      */}
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/contacts"  element={<ContactsPage />} />

      {/*
        path="/" → root URL
        <Navigate to="/login" replace />
        → immediately redirects to /login
        "replace" means the redirect replaces history instead of adding to it
        (so pressing Back doesn't bring you to "/" again)
      */}
      <Route path="/" element={<Navigate to="/login" replace />} />

      {/*
        path="*" → catches ALL other URLs that didn't match above
        → also redirects to /login
        This prevents blank pages on unknown routes.
      */}
      <Route path="*" element={<Navigate to="/login" replace />} />

    </Routes>
  )
}

export default App
