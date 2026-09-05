import React, { useState, useEffect, useRef } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import api from '../api'
import { getNavLinks } from '../navLinks'

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(() => {
    return localStorage.getItem('sidebar_collapsed') === 'true'
  })
  const [showNotifications, setShowNotifications] = useState(false)
  const [showUserDropdown, setShowUserDropdown]   = useState(false)
  const [showProfileModal, setShowProfileModal]   = useState(false)

  // Profile Form State
  const [profileName, setProfileName]       = useState(localStorage.getItem('user_name') || '')
  const [oldPassword, setOldPassword]       = useState('')
  const [newPassword, setNewPassword]       = useState('')
  const [profileMsg, setProfileMsg]         = useState('')
  const [savingProfile, setSavingProfile]   = useState(false)

  const navigate = useNavigate()
  const location = useLocation()

  const notifRef = useRef(null)
  const userMenuRef = useRef(null)

  const userName = localStorage.getItem('user_name') || 'User'
  const userRole = localStorage.getItem('role') || localStorage.getItem('active_role') || 'Admin'
  const userEmail = localStorage.getItem('email') || ''
  const loginId = localStorage.getItem('login_id') || 'User'

  // Dynamic role-scoped navigation links
  const links = getNavLinks(userRole)

  // Mock recent notifications for quick enterprise visibility
  const notifications = [
    { id: 1, text: 'Customer invoice INV-SARAH-001 posted', time: '10m ago', icon: '📑' },
    { id: 2, text: 'Receipt of ₹10,000 recorded via UPI', time: '25m ago', icon: '💳' },
    { id: 3, text: 'Vendor bill BILL-TIMBER-001 verified', time: '1h ago', icon: '🧾' },
  ]

  // Persist sidebar state
  const toggleSidebar = () => {
    const nextState = !collapsed
    setCollapsed(nextState)
    localStorage.setItem('sidebar_collapsed', String(nextState))
  }

  // Handle outside clicks to close popovers
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifications(false)
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setShowUserDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = () => {
    localStorage.clear()
    navigate('/login')
  }

  const handleProfileSave = async (e) => {
    e.preventDefault()
    setSavingProfile(true)
    setProfileMsg('')
    try {
      const payload = {
        name: profileName,
        old_password: oldPassword || null,
        new_password: newPassword || null
      }
      const res = await api.put('/auth/profile', payload)
      localStorage.setItem('user_name', res.data.name)
      setProfileMsg('✅ Profile updated successfully!')
      setOldPassword('')
      setNewPassword('')
      setTimeout(() => {
        setShowProfileModal(false)
        setProfileMsg('')
      }, 1500)
    } catch (err) {
      setProfileMsg(`⚠️ ${err.response?.data?.detail || 'Failed to update profile'}`)
    } finally {
      setSavingProfile(false)
    }
  }

  // Group links for clean sidebar sectioning
  const groupedLinks = links.reduce((acc, item) => {
    const groupName = item.group || 'Navigation'
    if (!acc[groupName]) acc[groupName] = []
    acc[groupName].push(item)
    return acc
  }, {})

  const userInitial = (userName || 'U').charAt(0).toUpperCase()

  // Role badge styles
  const roleBadgeStyle = {
    Admin:      { bg: '#ffebee', color: '#c62828', border: '#ffcdd2' },
    Accountant: { bg: '#e8eaf6', color: '#283593', border: '#c5cae9' },
    Customer:   { bg: '#e8f5e9', color: '#2e7d32', border: '#c8e6c9' },
    Vendor:     { bg: '#fff3e0', color: '#ef6c00', border: '#ffe0b2' },
  }[userRole] || { bg: '#f5f5f5', color: '#333', border: '#ddd' }

  return (
    <div className={`app-shell ${collapsed ? 'sidebar-collapsed' : 'sidebar-expanded'}`}>
      
      {/* ---------------------------------------------------- */}
      {/* 1. PROFESSIONAL COLLAPSIBLE LEFT SIDEBAR            */}
      {/* ---------------------------------------------------- */}
      <aside className="app-sidebar">
        
        {/* Brand Header */}
        <div className="sidebar-brand">
          <div className="brand-logo-icon">🪑</div>
          {!collapsed && (
            <div className="brand-text">
              <span className="brand-title">Urban Furniture</span>
              <span className="brand-badge">Accounting ERP</span>
            </div>
          )}
        </div>

        {/* Navigation Menu */}
        <div className="sidebar-nav">
          {Object.entries(groupedLinks).map(([groupName, groupItems]) => (
            <div key={groupName} className="nav-group">
              {!collapsed && <div className="nav-group-title">{groupName}</div>}
              {groupItems.map(item => {
                const isActive = location.pathname === item.path
                return (
                  <button
                    key={item.path}
                    className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
                    onClick={() => navigate(item.path)}
                    title={collapsed ? item.label : undefined}
                  >
                    <span className="nav-item-icon">{item.icon}</span>
                    {!collapsed && <span className="nav-item-label">{item.label}</span>}
                    {!collapsed && isActive && <span className="active-dot"></span>}
                  </button>
                )
              })}
            </div>
          ))}
        </div>

        {/* Sidebar Footer Collapse Toggle */}
        <div className="sidebar-footer">
          <button
            className="collapse-toggle-btn"
            onClick={toggleSidebar}
            title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            <span>{collapsed ? '▶' : '◀'}</span>
            {!collapsed && <span style={{ marginLeft: '8px' }}>Collapse Menu</span>}
          </button>
        </div>
      </aside>

      {/* ---------------------------------------------------- */}
      {/* 2. MAIN WORKSPACE WITH CLEAN TOP HEADER              */}
      {/* ---------------------------------------------------- */}
      <div className="app-workspace">
        
        {/* Top Header */}
        <header className="app-header">
          
          {/* Left: Sidebar Toggle + Title */}
          <div className="header-left">
            <button
              className="hamburger-btn"
              onClick={toggleSidebar}
              title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
              aria-label="Toggle Sidebar"
            >
              ☰
            </button>
            <div className="header-brand-title">
              🪑 Urban Furniture Accounting
            </div>
          </div>

          {/* Right: Role, Notifications, User Menu, Logout */}
          <div className="header-right">
            
            {/* Role Badge */}
            <span
              className="header-role-badge"
              style={{
                background: roleBadgeStyle.bg,
                color: roleBadgeStyle.color,
                borderColor: roleBadgeStyle.border
              }}
            >
              {userRole}
            </span>

            {/* Notifications Bell */}
            <div className="header-popover-container" ref={notifRef}>
              <button
                className="header-icon-btn"
                onClick={() => setShowNotifications(!showNotifications)}
                title="Notifications"
                aria-label="Notifications"
              >
                🔔
                <span className="notif-badge">{notifications.length}</span>
              </button>

              {showNotifications && (
                <div className="popover-dropdown notif-dropdown">
                  <div className="popover-header">
                    <strong>Notifications</strong>
                    <span className="text-muted" style={{ fontSize: '11px' }}>Recent</span>
                  </div>
                  <div className="popover-list">
                    {notifications.map(n => (
                      <div key={n.id} className="popover-item">
                        <span style={{ fontSize: '16px' }}>{n.icon}</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '13px', color: '#1a1a2e' }}>{n.text}</div>
                          <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>{n.time}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* User Profile Dropdown */}
            <div className="header-popover-container" ref={userMenuRef}>
              <button
                className="user-profile-btn"
                onClick={() => setShowUserDropdown(!showUserDropdown)}
                aria-label="User profile menu"
              >
                <div className="user-avatar-circle">{userInitial}</div>
                <div className="user-info-text">
                  <span className="user-display-name">{userName}</span>
                </div>
                <span className="dropdown-caret">▼</span>
              </button>

              {showUserDropdown && (
                <div className="popover-dropdown user-dropdown">
                  <div className="user-dropdown-header">
                    <div className="user-avatar-circle large">{userInitial}</div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '14px', color: '#1a1a2e' }}>{userName}</div>
                      <div style={{ fontSize: '12px', color: '#666' }}>{userEmail || loginId}</div>
                      <div style={{ fontSize: '11px', fontWeight: 600, color: roleBadgeStyle.color, marginTop: '2px' }}>
                        Role: {userRole}
                      </div>
                    </div>
                  </div>

                  <div className="dropdown-divider"></div>

                  <button
                    className="dropdown-item"
                    onClick={() => {
                      setShowUserDropdown(false)
                      setShowProfileModal(true)
                    }}
                  >
                    <span>👤</span> Update Profile & Password
                  </button>

                  <div className="dropdown-divider"></div>

                  <button className="dropdown-item text-danger" onClick={handleLogout}>
                    <span>🚪</span> Logout
                  </button>
                </div>
              )}
            </div>

            {/* Direct Quick Logout Button */}
            <button onClick={handleLogout} className="header-logout-btn" title="Logout">
              Logout
            </button>
          </div>
        </header>

        {/* ---------------------------------------------------- */}
        {/* 3. PAGE VIEWPORT OUTLET                              */}
        {/* ---------------------------------------------------- */}
        <main className="app-main-content">
          <Outlet />
        </main>
      </div>

      {/* ---------------------------------------------------- */}
      {/* 4. GLOBAL PROFILE UPDATE MODAL                       */}
      {/* ---------------------------------------------------- */}
      {showProfileModal && (
        <div className="modal-backdrop">
          <div className="modal-dialog" style={{ maxWidth: '420px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', color: '#1a1a2e' }}>👤 User Profile Settings</h3>
              <button
                onClick={() => { setShowProfileModal(false); setProfileMsg('') }}
                style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#888' }}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: '13px', color: '#666', marginBottom: '16px' }}>
              Update your account credentials for <strong>{loginId}</strong> ({userRole})
            </p>

            <form onSubmit={handleProfileSave} className="contact-form">
              <div className="form-group">
                <label>Full Name *</label>
                <input
                  type="text"
                  value={profileName}
                  onChange={e => setProfileName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Current Password (optional)</label>
                <input
                  type="password"
                  value={oldPassword}
                  onChange={e => setOldPassword(e.target.value)}
                  placeholder="Enter current password to change"
                />
              </div>

              <div className="form-group">
                <label>New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Leave blank to keep unchanged"
                />
              </div>

              {profileMsg && <div style={{ fontSize: '13px', marginTop: '4px' }}>{profileMsg}</div>}

              <div className="form-actions" style={{ marginTop: '16px' }}>
                <button type="submit" className="btn-primary" disabled={savingProfile}>
                  {savingProfile ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => { setShowProfileModal(false); setProfileMsg('') }}
                  disabled={savingProfile}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
