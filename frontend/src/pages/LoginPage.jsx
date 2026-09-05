// ============================================================
// src/pages/LoginPage.jsx
//
// WHY THIS FILE EXISTS:
//   This is the Login page component.
//   It renders a form with login_id and password fields.
//   When submitted, it calls POST /auth/login on our FastAPI backend.
//   On success, it stores the JWT token and redirects to the dashboard.
//
// WHAT IS A COMPONENT?
//   A component is a JavaScript function that returns JSX (HTML-like code).
//   React calls this function and puts the result on the screen.
//   When state changes, React re-calls the function and updates the screen.
//
// CONCEPTS USED:
//   useState   → remembers values between renders (form fields, errors)
//   useNavigate → programmatically go to a different page
//   api.post   → sends POST request to FastAPI using our axios instance
// ============================================================

// React: required in every file that uses JSX
import React, { useState } from 'react'

// useState: a React Hook.
// Hooks are special functions that give components superpowers.
// useState lets a component REMEMBER a value between re-renders.
//
// const [value, setValue] = useState(initialValue)
//   value    → the current stored value (read it)
//   setValue → a function to update the value
//   When setValue is called, React re-renders the component
//   with the new value. The screen updates automatically.

// useNavigate: a hook from react-router-dom.
// Returns a function we can call to navigate to a different page.
// navigate("/dashboard") → browser goes to /dashboard
import { useNavigate } from 'react-router-dom'

// Our configured axios instance from api.js
import api from '../api'


function LoginPage() {

  // ---- STATE VARIABLES ------------------------------------
  //
  // formData: stores what the user types in the form fields.
  // We use ONE object with two properties instead of two separate states.
  // When the user types, we update the matching property.
  const [formData, setFormData] = useState({
    login_id: '',   // matches the "login_id" field FastAPI expects
    password: ''    // matches the "password" field FastAPI expects
  })

  // error: stores an error message to show if login fails.
  // Empty string = no error shown. A message = error shown.
  const [error, setError] = useState('')

  // loading: true while the API request is in progress.
  // We use it to disable the button so the user can't click twice.
  const [loading, setLoading] = useState(false)

  // useNavigate gives us the navigate function
  const navigate = useNavigate()


  // ---- EVENT HANDLER: handleChange ------------------------
  //
  // This function runs every time the user types in an input field.
  // "e" is the browser event object — it contains info about what happened.
  //
  // e.target.name  → the "name" attribute of the input that changed
  //                   e.g. "login_id" or "password"
  // e.target.value → what the user just typed
  //
  // The spread operator "..." copies all existing properties of formData.
  // [e.target.name]: e.target.value  → updates only the changed field.
  //
  // Example: user types "A" in the login_id field:
  //   e.target.name  = "login_id"
  //   e.target.value = "A"
  //   setFormData({ ...formData, login_id: "A" })
  //   → formData becomes { login_id: "A", password: "" }
  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }


  // ---- EVENT HANDLER: handleSubmit ------------------------
  //
  // This function runs when the user clicks "Login" or presses Enter.
  // It is async because we need to wait for the API response.
  //
  // e.preventDefault():
  //   By default, submitting an HTML form reloads the page.
  //   preventDefault() stops that — we handle submission ourselves.
  const handleSubmit = async (e) => {
    e.preventDefault()

    // Clear any previous error message before a new attempt
    setError('')

    // Show loading state — disables the button
    setLoading(true)

    try {
      // api.post("/auth/login", formData)
      //   → sends POST http://127.0.0.1:8000/auth/login
      //   → with body: { "login_id": "ADMIN001", "password": "admin@1234" }
      //   → Axios automatically converts formData object to JSON string
      //   → FastAPI receives it and processes the login
      //
      // "await" pauses this function until the response arrives.
      // Without await, we'd move on before having the response.
      //
      // response.data is the JSON body FastAPI returned:
      //   { "access_token": "eyJ...", "token_type": "bearer" }
      const response = await api.post('/auth/login', formData)

      // Extract the token from the response
      const token = response.data.access_token

      // localStorage.setItem(): stores the token in the browser.
      // localStorage is a key-value store that persists across page reloads.
      // Even if the user refreshes, the token stays.
      // Key: "token" → Value: the JWT string
      //
      // Later, when making authenticated requests, we read it back:
      //   const token = localStorage.getItem("token")
      //   api.get("/invoices", { headers: { Authorization: `Bearer ${token}` }})
      localStorage.setItem('token', token)

      // Also store basic user info for the dashboard to display
      // We decode nothing — just store what the API gave us
      localStorage.setItem('login_id', formData.login_id)

      // Navigate to dashboard after successful login
      // navigate() from useNavigate — changes the URL without page reload
      navigate('/dashboard')

    } catch (err) {
      // err.response exists when FastAPI returned an error (4xx, 5xx)
      // err.response.data.detail is the "detail" field from HTTPException
      // If the network is down, err.response is undefined — we fallback
      if (err.response && err.response.data && err.response.data.detail) {
        setError(err.response.data.detail)
      } else {
        setError('Something went wrong. Please try again.')
      }
    } finally {
      // Always runs — hide the loading state whether success or failure
      setLoading(false)
    }
  }


  // ---- RENDER: JSX ----------------------------------------
  //
  // This is what gets shown on screen.
  // JSX looks like HTML but it is JavaScript under the hood.
  //
  // Key differences from HTML:
  //   class     → className  (class is a reserved word in JS)
  //   for       → htmlFor    (for is a reserved word in JS)
  //   onclick   → onClick    (camelCase in JSX)
  //   onchange  → onChange
  //   onsubmit  → onSubmit
  //
  // {expression} → curly braces execute JavaScript inside JSX
  //   {error}           → renders the error string variable
  //   {loading ? ... : ...} → ternary: if loading show X else Y
  //   {handleChange}    → passes the function as an event handler
  return (
    <div className="login-container">

      {/* The Urban Furniture brand header */}
      <div className="login-card">
        <div className="login-header">
          <h1>🪑 Urban Furniture</h1>
          <h2>Accounting System</h2>
          <p>Sign in to your account</p>
        </div>

        {/*
          onSubmit={handleSubmit}
          When the form is submitted (button click or Enter key),
          React calls our handleSubmit function.
        */}
        <form onSubmit={handleSubmit} className="login-form">

          {/* Login ID Field */}
          <div className="form-group">
            <label htmlFor="login_id">Login ID</label>
            <input
              type="text"
              id="login_id"
              name="login_id"
              value={formData.login_id}
              onChange={handleChange}
              placeholder="Enter your Login ID (e.g. ADMIN001)"
              required
              autoComplete="username"
            />
            {/*
              name="login_id" MUST match the key in formData.
              When handleChange runs, it uses e.target.name
              to know which formData property to update.
            */}
          </div>

          {/* Password Field */}
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Enter your password"
              required
              autoComplete="current-password"
            />
          </div>

          {/*
            Conditional rendering: {error && <p>...</p>}
            If error is an empty string (falsy), nothing renders.
            If error has a message (truthy), the <p> renders.
            This is cleaner than using if/else inside JSX.
          */}
          {error && (
            <div className="error-message">
              ⚠️ {error}
            </div>
          )}

          {/*
            disabled={loading}:
            While the request is in progress, the button is disabled.
            This prevents double-clicking and sending duplicate requests.

            {loading ? 'Signing in...' : 'Sign In'}:
            Ternary operator — show different text based on state.
          */}
          <button
            type="submit"
            className="login-button"
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>

        </form>

        {/* Small hint for the demo */}
        <div className="login-hint">
          <p>Demo credentials:</p>
          <p>Login ID: <strong>ADMIN001</strong> | Password: <strong>admin@1234</strong></p>
          <p style={{ marginTop: '10px' }}>
            No account?{' '}
            <span
              onClick={() => navigate('/register')}
              style={{ color: '#0f3460', fontWeight: 600, cursor: 'pointer' }}
            >
              Create Account
            </span>
          </p>
        </div>

      </div>
    </div>
  )
}

// Export the component so other files can import it.
// App.jsx will import LoginPage and render it at the /login route.
export default LoginPage
