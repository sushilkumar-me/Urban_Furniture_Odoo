// ============================================================
// vite.config.js
//
// WHY THIS FILE EXISTS:
//   Vite is our build tool and development server.
//   This file tells Vite how to build our React project.
//
// @vitejs/plugin-react:
//   React uses JSX syntax (<div>, <button>, etc.)
//   Normal JavaScript does not understand JSX.
//   This plugin teaches Vite how to convert JSX to regular JS.
//   Without it, the browser cannot run our React components.
// ============================================================

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173   // the port React runs on during development
  }
})
