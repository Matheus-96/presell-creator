import { appConfig } from '@/config/app-config.ts'

type ApiPrimitive = string | number | boolean

type ApiQuery = Record<string, ApiPrimitive | null | undefined>

type ApiRequestOptions = Omit<RequestInit, 'body'> & {
  body?: BodyInit | Record<string, unknown> | null
  parseAs?: 'auto' | 'json' | 'text'
  query?: ApiQuery
}

type ApiClientOptions = {
  baseUrl: string
}

type ApiErrorShape = {
  error?: {
    code?: string
    message?: string
  } | string
  message?: string
}

export const ADMIN_AUTH_REQUIRED_EVENT = 'presell-admin-auth-required'

function isAbsoluteUrl(value: string) {
  return /^https?:\/\//.test(value)
}

function trimTrailingSlash(value: string) {
  return value.replace(/\/$/, '')
}

function normalizePath(path: string) {
  return path.startsWith('/') ? path : `/${path}`
}

function buildRequestUrl(baseUrl: string, path: string, query?: ApiQuery) {
  const requestUrl = isAbsoluteUrl(path)
    ? new URL(path)
    : isAbsoluteUrl(baseUrl)
      ? new URL(`${trimTrailingSlash(baseUrl)}${normalizePath(path)}`)
      : new URL(
          `${trimTrailingSlash(baseUrl)}${normalizePath(path)}`,
          window.location.origin,
        )

  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        requestUrl.searchParams.set(key, String(value))
      }
    })
  }

  return requestUrl
}

function isPlainObject(value: ApiRequestOptions['body']): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !(value instanceof FormData)
}

function serializeBody(body: ApiRequestOptions['body'], headers: Headers) {
  if (body === undefined || body === null) {
    return undefined
  }

  if (isPlainObject(body)) {
    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json')
    }

    return JSON.stringify(body)
  }

  return body
}

function parseApiErrorDetails(details: string, fallbackMessage: string) {
  if (!details) {
    return {
      code: null,
      message: fallbackMessage,
    }
  }

  try {
    const payload = JSON.parse(details) as ApiErrorShape

    if (typeof payload.message === 'string' && payload.message.trim()) {
      return {
        code: null,
        message: payload.message,
      }
    }

    if (typeof payload.error === 'string' && payload.error.trim()) {
      return {
        code: null,
        message: payload.error,
      }
    }

    if (payload.error && typeof payload.error === 'object') {
      return {
        code: typeof payload.error.code === 'string' ? payload.error.code : null,
        message:
          typeof payload.error.message === 'string' && payload.error.message.trim()
            ? payload.error.message
            : fallbackMessage,
      }
    }
  } catch {
    // Fall back to the raw response body when the payload is not JSON.
  }

  return {
    code: null,
    message: details || fallbackMessage,
  }
}

export class ApiClientError extends Error {
  status: number
  details: string
  code: string | null

  constructor(message: string, status: number, details = '', code: string | null = null) {
    super(message)
    this.name = 'ApiClientError'
    this.status = status
    this.details = details
    this.code = code
  }

  static async fromResponse(response: Response) {
    const details = await response.text()
    const fallbackMessage = `Request failed with status ${response.status}`
    const parsedError = parseApiErrorDetails(details, fallbackMessage)

    return new ApiClientError(parsedError.message, response.status, details, parsedError.code)
  }
}

export class ApiClient {
  private readonly baseUrl: string

  constructor({ baseUrl }: ApiClientOptions) {
    this.baseUrl = baseUrl
  }

  async request<T>(path: string, options: ApiRequestOptions = {}) {
    const headers = new Headers(options.headers)

    if (!headers.has('Accept')) {
      headers.set('Accept', 'application/json, text/plain, text/html')
    }

    const response = await fetch(
      buildRequestUrl(this.baseUrl, path, options.query),
      {
        ...options,
        headers,
        body: serializeBody(options.body, headers),
        credentials: options.credentials ?? 'include',
      },
    )

    if (!response.ok) {
      const error = await ApiClientError.fromResponse(response)

      if (
        error.code === 'auth_required'
        && typeof window !== 'undefined'
        && response.url.includes('/api/admin/')
      ) {
        window.dispatchEvent(new CustomEvent(ADMIN_AUTH_REQUIRED_EVENT))
      }

      throw error
    }

    if (response.status === 204) {
      return undefined as T
    }

    if (options.parseAs === 'text') {
      return (await response.text()) as T
    }

    const contentType = response.headers.get('content-type') ?? ''

    if (options.parseAs === 'json' || contentType.includes('application/json')) {
      return (await response.json()) as T
    }

    return (await response.text()) as T
  }

  get<T>(path: string, options: Omit<ApiRequestOptions, 'method' | 'body'> = {}) {
    return this.request<T>(path, { ...options, method: 'GET' })
  }

  post<T>(path: string, options: Omit<ApiRequestOptions, 'method'> = {}) {
    return this.request<T>(path, { ...options, method: 'POST' })
  }

  put<T>(path: string, options: Omit<ApiRequestOptions, 'method'> = {}) {
    return this.request<T>(path, { ...options, method: 'PUT' })
  }

  patch<T>(path: string, options: Omit<ApiRequestOptions, 'method'> = {}) {
    return this.request<T>(path, { ...options, method: 'PATCH' })
  }

  delete<T>(path: string, options: Omit<ApiRequestOptions, 'method' | 'body'> = {}) {
    return this.request<T>(path, { ...options, method: 'DELETE' })
  }
}

export const apiClient = new ApiClient({
  baseUrl: appConfig.apiBaseUrl,
})
