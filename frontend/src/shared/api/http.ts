import axios from 'axios'

function normalizeApiBaseUrl(rawBaseUrl: string): string {
  const trimmed = rawBaseUrl.replace(/\/+$/, '')
  if (trimmed.endsWith('/api/v1')) {
    return trimmed
  }
  return `${trimmed}/api/v1`
}

export const http = axios.create({
  baseURL: normalizeApiBaseUrl(import.meta.env.VITE_API_URL ?? ''),
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Attach access token from localStorage if present
http.interceptors.request.use((config) => {
  const token = localStorage.getItem('kubok26.access-token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// On 401 — clear token and redirect to /auth
http.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      localStorage.removeItem('kubok26.access-token')
      window.location.href = '/auth'
    }
    return Promise.reject(error)
  },
)
