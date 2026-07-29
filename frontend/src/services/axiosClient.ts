import axios from 'axios'
import { getToken, removeToken, removeUser } from './authService'

// ============================================================
// Axios instance — auto-attaches JWT + handles 401 globally
// ============================================================

const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:8000',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15_000,
})

// ------------------------------------------------------------------
// REQUEST interceptor: attach Bearer token if available
// ------------------------------------------------------------------
axiosClient.interceptors.request.use(
  (config) => {
    const token = getToken()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error),
)

// ------------------------------------------------------------------
// RESPONSE interceptor: handle 401 Unauthorized globally
// ------------------------------------------------------------------
axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear stale credentials
      removeToken()
      removeUser()

      // Do NOT redirect/reload if request is from auth endpoints or already on /login page
      const requestUrl = error.config?.url ?? ''
      const isAuthEndpoint = requestUrl.includes('/auth/login') || requestUrl.includes('/auth/register')
      const isAlreadyOnLoginPage = window.location.pathname === '/login'

      if (!isAuthEndpoint && !isAlreadyOnLoginPage) {
        window.location.replace('/login')
      }
    }
    return Promise.reject(error)
  },
)

export default axiosClient