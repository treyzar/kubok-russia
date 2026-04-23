import axios, { type AxiosRequestConfig } from 'axios'

import { http } from './http'

export class ApiClientError extends Error {
  status: number | null
  details: unknown

  constructor(message: string, status: number | null, details: unknown) {
    super(message)
    this.name = 'ApiClientError'
    this.status = status
    this.details = details
  }
}

export async function apiRequest<TResponse>(config: AxiosRequestConfig): Promise<TResponse> {
  try {
    const response = await http.request<TResponse>(config)
    return response.data
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      const fallbackMessage = error.message || 'API request failed'
      const responseMessage =
        (error.response?.data as { detail?: string; message?: string } | undefined)?.detail ||
        (error.response?.data as { detail?: string; message?: string } | undefined)?.message
      throw new ApiClientError(responseMessage || fallbackMessage, error.response?.status ?? null, error.response?.data)
    }

    throw new ApiClientError('Unknown API error', null, null)
  }
}

