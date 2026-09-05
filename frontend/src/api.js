import axios from 'axios'

const api = axios.create({
  baseURL: 'http://127.0.0.1:8000',
  headers: {
    'Content-Type': 'application/json'
  }
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  // When uploading a file (FormData), the browser must set
  // Content-Type automatically — it includes a unique boundary string:
  //   Content-Type: multipart/form-data; boundary=----WebKitFormBoundaryXXX
  // If we leave our default "application/json" header in place,
  // FastAPI receives the wrong content type and rejects the upload.
  // Deleting the header here tells the browser to set it correctly.
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type']
  }

  return config
})

export default api
