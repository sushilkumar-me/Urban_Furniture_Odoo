import axios from 'axios'

const api = axios.create({
  baseURL: 'http://127.0.0.1:8000',
  headers: {
    'Content-Type': 'application/json'
  }
})

// -------------------------------------------------------
// REQUEST INTERCEPTOR
//
// An interceptor is a function that runs automatically
// BEFORE every request this axios instance makes.
//
// Here is what it does:
//   1. Before any request is sent, this function runs
//   2. It reads the JWT token from localStorage
//   3. If a token exists, it adds it to the request header:
//      Authorization: Bearer eyJhbGci...
//   4. FastAPI reads this header and knows who is making the request
//
// WHY use an interceptor instead of adding the header manually?
//   Without interceptor — every file that calls a protected
//   endpoint must manually add:
//     headers: { Authorization: `Bearer ${token}` }
//   That's repetitive and easy to forget.
//
//   With interceptor — we write it ONCE here.
//   Every api.get(), api.post(), api.put(), api.delete()
//   automatically gets the token attached. No exceptions.
//
// config → the outgoing request configuration object
//   config.headers → the headers that will be sent
// -------------------------------------------------------
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

export default api
