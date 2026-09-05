import React from 'react'
import { Navigate, Outlet } from 'react-router-dom'

/**
 * ProtectedRoute Guard
 * 
 * Enforces Role-Based Access Control (RBAC) at the React Router level.
 * 
 * 1. Checks if the user is authenticated (token exists in localStorage).
 *    If not, redirects to /login.
 * 
 * 2. If allowedRoles is specified, checks if current user's role is permitted.
 *    If unauthorized, redirects the user to their authorized home portal:
 *      - Customer -> /customer-dashboard
 *      - Vendor   -> /vendor-dashboard
 *      - Admin / Accountant -> /dashboard
 */
export default function ProtectedRoute({ children, allowedRoles }) {
  const token = localStorage.getItem('token')
  const role = localStorage.getItem('role') || localStorage.getItem('active_role')

  if (!token) {
    return <Navigate to="/login" replace />
  }

  if (allowedRoles && allowedRoles.length > 0) {
    if (!allowedRoles.includes(role)) {
      // Role not authorized for this specific route -> redirect to their portal
      if (role === 'Customer') {
        return <Navigate to="/customer-dashboard" replace />
      }
      if (role === 'Vendor') {
        return <Navigate to="/vendor-dashboard" replace />
      }
      if (role === 'Accountant' || role === 'Admin') {
        return <Navigate to="/dashboard" replace />
      }
      return <Navigate to="/login" replace />
    }
  }

  return children ? children : <Outlet />
}
