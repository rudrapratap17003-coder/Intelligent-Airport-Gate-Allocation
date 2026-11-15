/**
 * GateWise API Client
 * Configured Axios instance with interceptors for error handling and standard headers.
 */

import axios from 'axios'

export const api = axios.create({
  baseURL: '/api/v1',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json'
  }
})

// Response interceptor for consistent error extraction
api.interceptors.response.use(
  response => response,
  error => {
    let message = 'An unexpected network or server error occurred.'
    if (error.response) {
      // Backend structured HTTPException
      const data = error.response.data
      if (data && data.detail) {
        if (typeof data.detail === 'string') {
          message = data.detail
        } else if (Array.isArray(data.detail)) {
          // Pydantic validation error list
          message = data.detail.map(err => err.msg || JSON.stringify(err)).join(', ')
        } else if (data.detail.message) {
          message = data.detail.message
        }
      } else if (data && data.error && data.error.message) {
        message = data.error.message
      } else if (data && data.message) {
        message = data.message
      }
    } else if (error.request) {
      message = 'Backend server is unreachable. Please verify FastAPI backend is running.'
    } else {
      message = error.message
    }
    const enhancedError = new Error(message)
    enhancedError.status = error.response ? error.response.status : null
    enhancedError.originalError = error
    return Promise.reject(enhancedError)
  }
)

export default api
