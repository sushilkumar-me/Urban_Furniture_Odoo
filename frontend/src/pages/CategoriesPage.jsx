import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import api from '../api'

// emptyForm is the default state of the form fields.
// We define it OUTSIDE the component so it never changes.
// When we reset the form, we just set formData back to this object.
const emptyForm = {
  category_name: '',
  description: ''
}

function CategoriesPage() {

  // categories: the list fetched from GET /categories/
  const [categories, setCategories] = useState([])

  // showForm: true = form is visible, false = form is hidden
  const [showForm, setShowForm]     = useState(false)

  // editingId: null = we are adding a new category
  //            number = we are editing the category with this id
  // This one variable controls whether handleSubmit calls POST or PUT
  const [editingId, setEditingId]   = useState(null)

  // formData: what the user has typed in the form fields
  const [formData, setFormData]     = useState(emptyForm)

  // error: red error message shown inside or below the form
  const [error, setError]           = useState('')

  // success: green success message shown on the page
  const [success, setSuccess]       = useState('')

  // loading: true while API request is in progress
  // Disables the submit button to prevent double-clicking
  const [loading, setLoading]       = useState(false)

  const navigate = useNavigate()
  const location = useLocation()
  const loginId  = localStorage.getItem('login_id') || 'User'

  // navLinks: the navigation menu items
  // Adding Categories here so the nav bar stays consistent
  const navLinks = [
    { label: 'Dashboard',   path: '/dashboard'   },
    { label: 'Contacts',    path: '/contacts'    },
    { label: 'Categories',  path: '/categories'  },
  ]

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('login_id')
    navigate('/login')
  }

  // useEffect runs once when the page first loads.
  // [] means: only run on mount, not on every re-render.
  // It fetches all categories from the backend immediately.
  useEffect(() => {
    fetchCategories()
  }, [])

  // fetchCategories: calls GET /categories/ and stores the result.
  // The axios interceptor in api.js automatically adds the JWT token.
  // So we don't need to manually add Authorization header here.
  const fetchCategories = async () => {
    try {
      const response = await api.get('/categories/')
      // response.data is the JSON array FastAPI returned
      // We store it in the categories state variable
      // React re-renders the page with the new data automatically
      setCategories(response.data)
    } catch (err) {
      setError('Failed to load categories.')
    }
  }

  // handleChange runs every time the user types in any input field.
  // e.target.name  = which field changed ("category_name" or "description")
  // e.target.value = what the user typed
  // The spread "...formData" copies all existing fields first,
  // then [e.target.name]: e.target.value updates only the changed field.
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  // openAddForm: resets everything and shows the form for a NEW category.
  // editingId = null means handleSubmit will call POST not PUT.
  const openAddForm = () => {
    setFormData(emptyForm)
    setEditingId(null)
    setError('')
    setSuccess('')
    setShowForm(true)
  }

  // openEditForm: fills the form with the clicked category's data.
  // editingId = category.id means handleSubmit will call PUT not POST.
  const openEditForm = (category) => {
    setFormData({
      category_name: category.category_name,
      // description might be null in the DB — we use '' for the input
      // because HTML inputs should never have null as their value
      description: category.description || ''
    })
    setEditingId(category.id)
    setError('')
    setSuccess('')
    setShowForm(true)
  }

  // closeForm: hides the form and resets everything back to defaults.
  const closeForm = () => {
    setShowForm(false)
    setEditingId(null)
    setFormData(emptyForm)
    setError('')
  }

  // handleSubmit: runs when the user clicks "Create Category" or "Update Category".
  // It is async because we need to wait for the API response.
  // e.preventDefault() stops the HTML form from reloading the page.
  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    // Build the payload to send.
    // If description is empty string, send null instead.
    // The backend accepts null for optional fields.
    const payload = {
      category_name: formData.category_name,
      description: formData.description === '' ? null : formData.description
    }

    try {
      if (editingId) {
        // editingId is set → we are EDITING an existing category
        // PUT /categories/{editingId} with the changed data
        await api.put(`/categories/${editingId}`, payload)
        setSuccess('Category updated successfully.')
      } else {
        // editingId is null → we are CREATING a new category
        // POST /categories/ with the new category data
        await api.post('/categories/', payload)
        setSuccess('Category created successfully.')
      }

      // Refresh the list to show the new/updated category
      await fetchCategories()

      // Hide the form after successful save
      closeForm()

    } catch (err) {
      // err.response.data.detail is the error message from FastAPI's HTTPException
      // For example: "Category 'Sofas' already exists."
      if (err.response?.data?.detail) {
        setError(err.response.data.detail)
      } else {
        setError('Something went wrong. Please try again.')
      }
    } finally {
      // Always runs — whether success or error
      // Hides the loading state and re-enables the button
      setLoading(false)
    }
  }

  // handleDelete: runs when the user clicks the Delete button on a row.
  // window.confirm() shows a browser popup asking "Are you sure?".
  // If user clicks Cancel → confirm returns false → we do nothing.
  // If user clicks OK → confirm returns true → we call the delete API.
  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete category "${name}"?\n\nNote: categories with products cannot be deleted.`)) return

    try {
      await api.delete(`/categories/${id}`)
      setSuccess(`"${name}" deleted successfully.`)
      // Refresh the list — the deleted category disappears
      await fetchCategories()
    } catch (err) {
      // This catches the IntegrityError we handle in the service
      // Example error: "Cannot delete category 'Sofas'. It is linked to products."
      if (err.response?.data?.detail) {
        setError(err.response.data.detail)
      } else {
        setError('Failed to delete category.')
      }
    }
  }

  return (
    <div className="dashboard-container">

      {/* Navbar — same structure as ContactsPage */}
      <nav className="navbar">
        <div className="navbar-brand">🪑 Urban Furniture Accounting</div>
        <div className="navbar-links">
          {navLinks.map(link => (
            <button
              key={link.path}
              className={`nav-link ${location.pathname === link.path ? 'nav-link-active' : ''}`}
              onClick={() => navigate(link.path)}
            >
              {link.label}
            </button>
          ))}
        </div>
        <div className="navbar-user">
          <span>Welcome, <strong>{loginId}</strong></span>
          <button onClick={handleLogout} className="logout-button">Logout</button>
        </div>
      </nav>

      <div className="page-container">

        {/* Page header with title and Add button */}
        <div className="page-header">
          <div>
            <h2>Categories</h2>
            <p className="page-subtitle">Organise your furniture product categories</p>
          </div>
          <button className="btn-primary" onClick={openAddForm}>
            + Add Category
          </button>
        </div>

        {/* Success message — green box shown after add/edit/delete */}
        {success && (
          <div className="success-message" style={{ marginBottom: '16px' }}>
            ✅ {success}
          </div>
        )}

        {/* Error message — shown outside form only (form has its own) */}
        {!showForm && error && (
          <div className="error-message" style={{ marginBottom: '16px' }}>
            ⚠️ {error}
          </div>
        )}

        {/* Form — only shown when showForm is true */}
        {showForm && (
          <div className="form-card">

            {/* Title changes based on whether we are adding or editing */}
            <h3>{editingId ? 'Edit Category' : 'Add New Category'}</h3>

            <form onSubmit={handleSubmit} className="contact-form">

              <div className="form-group">
                <label>Category Name *</label>
                <input
                  type="text"
                  name="category_name"
                  value={formData.category_name}
                  onChange={handleChange}
                  placeholder="e.g. Sofas, Dining Tables, Wardrobes"
                  required
                />
                {/* required → browser validates this field is not empty
                    before even calling handleSubmit */}
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Optional description of this category"
                  rows={3}
                  style={{
                    padding: '10px 14px',
                    border: '2px solid #e1e5e9',
                    borderRadius: '8px',
                    fontSize: '14px',
                    resize: 'vertical',
                    outline: 'none',
                    fontFamily: 'inherit'
                  }}
                />
                {/* textarea is used for multi-line text.
                    rows={3} sets the default visible height.
                    resize: 'vertical' lets the user make it taller. */}
              </div>

              {/* Error shown inside the form */}
              {error && <div className="error-message">⚠️ {error}</div>}

              <div className="form-actions">
                <button type="submit" className="btn-primary" disabled={loading}>
                  {/* Ternary operator:
                      loading=true  → "Saving..."
                      editingId set → "Update Category"
                      editingId null → "Create Category" */}
                  {loading ? 'Saving...' : editingId ? 'Update Category' : 'Create Category'}
                </button>
                <button type="button" className="btn-secondary" onClick={closeForm}>
                  Cancel
                </button>
              </div>

            </form>
          </div>
        )}

        {/* Table card */}
        <div className="card">

          <div className="table-toolbar">
            <span className="contact-count">
              {categories.length} categor{categories.length !== 1 ? 'ies' : 'y'}
            </span>
          </div>

          {/* If no categories yet, show a helpful empty state message */}
          {categories.length === 0 ? (
            <div className="empty-state">
              No categories yet. Click "+ Add Category" to create one.
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Category Name</th>
                  <th>Description</th>
                  <th>Created At</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {/* categories.map() loops through the array.
                    For each category object, returns one <tr> row.
                    key={category.id} → React needs unique keys on list items
                    to efficiently track which rows changed. */}
                {categories.map(category => (
                  <tr key={category.id}>
                    <td>{category.id}</td>
                    <td>
                      <strong>{category.category_name}</strong>
                    </td>
                    <td>
                      {/* Show description or — if null */}
                      {category.description || <span style={{ color: '#bbb' }}>—</span>}
                    </td>
                    <td>
                      {/* Format the ISO timestamp to a readable date */}
                      {category.created_at
                        ? new Date(category.created_at).toLocaleDateString('en-IN')
                        : '—'
                      }
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button
                          className="btn-edit"
                          onClick={() => openEditForm(category)}
                        >
                          Edit
                        </button>
                        <button
                          className="btn-delete"
                          onClick={() => handleDelete(category.id, category.category_name)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

      </div>
    </div>
  )
}

export default CategoriesPage
