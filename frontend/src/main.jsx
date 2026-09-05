// ============================================================
// src/main.jsx
//
// WHY THIS FILE EXISTS:
//   This is the ENTRY POINT of the React application.
//   It mounts the React app into the HTML page.
//
// HOW IT WORKS:
//   1. Finds the <div id="root"> in index.html
//   2. Creates a React root inside it
//   3. Renders the <App /> component into that root
//   Everything the user sees comes from <App /> and its children.
//
// WHY .jsx EXTENSION?
//   .jsx means this file contains JSX syntax.
//   JSX looks like HTML inside JavaScript: <App />
//   Vite's React plugin converts it to regular JS automatically.
// ============================================================

// React: the core library. Required in every React file.
import React from 'react'

// ReactDOM: handles rendering React components into the real browser DOM.
// "react" knows about components. "react-dom" connects them to the browser.
import ReactDOM from 'react-dom/client'

// BrowserRouter: enables page navigation (routing) in React.
// It watches the browser URL and renders the right component.
// Without it, React cannot handle multiple pages.
import { BrowserRouter } from 'react-router-dom'

// Our root component — the starting point of all UI
import App from './App'

// Global CSS styles (basic reset and layout)
import './index.css'

// ReactDOM.createRoot():
//   Finds <div id="root"> in index.html and creates a React root.
//   .render() puts our component tree inside it.
//
// <React.StrictMode>:
//   A development helper — shows extra warnings in the browser console
//   if we write code that may cause problems. Does nothing in production.
//
// <BrowserRouter>:
//   Wraps everything so any component can use routing hooks.
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
)
