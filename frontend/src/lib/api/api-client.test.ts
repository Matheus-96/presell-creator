import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { ApiClient, ADMIN_AUTH_REQUIRED_EVENT, ApiClientError } from './api-client'

describe('ApiClient', () => {
  let apiClient: ApiClient
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    apiClient = new ApiClient({ baseUrl: 'http://localhost:3000' })
    fetchMock = vi.fn()
    global.fetch = fetchMock
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('request() with successful response', () => {
    it('should return parsed JSON response', async () => {
      const mockData = { id: 1, name: 'Test' }
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockData,
        text: async () => JSON.stringify(mockData),
      })

      const result = await apiClient.request('/api/test')
      expect(result).toEqual(mockData)
    })

    it('should return text response when parseAs=text', async () => {
      const mockText = 'Plain text response'
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers(),
        text: async () => mockText,
      })

      const result = await apiClient.request('/api/test', { parseAs: 'text' })
      expect(result).toBe(mockText)
    })

    it('should return undefined for 204 No Content', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 204,
        headers: new Headers(),
      })

      const result = await apiClient.request('/api/test')
      expect(result).toBeUndefined()
    })
  })

  describe('request() with 401 error', () => {
    it('should dispatch ADMIN_AUTH_REQUIRED_EVENT for 401 on /api/admin/presells', async () => {
      const dispatchEventSpy = vi.spyOn(window, 'dispatchEvent')
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 401,
        url: 'http://localhost:3000/api/admin/presells',
        headers: new Headers(),
        text: async () => 'Unauthorized',
      })

      try {
        await apiClient.request('/api/admin/presells')
      } catch (error) {
        // Expected to throw
      }

      expect(dispatchEventSpy).toHaveBeenCalledWith(expect.objectContaining({
        type: ADMIN_AUTH_REQUIRED_EVENT,
      }))
    })

    it('should NOT dispatch ADMIN_AUTH_REQUIRED_EVENT for 401 on /api/admin/auth/login', async () => {
      const dispatchEventSpy = vi.spyOn(window, 'dispatchEvent')
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 401,
        url: 'http://localhost:3000/api/admin/auth/login',
        headers: new Headers(),
        text: async () => 'Invalid credentials',
      })

      try {
        await apiClient.request('/api/admin/auth/login', { method: 'POST' })
      } catch (error) {
        // Expected to throw
      }

      expect(dispatchEventSpy).not.toHaveBeenCalledWith(expect.objectContaining({
        type: ADMIN_AUTH_REQUIRED_EVENT,
      }))
    })

    it('should NOT dispatch ADMIN_AUTH_REQUIRED_EVENT for 401 outside /api/admin/', async () => {
      const dispatchEventSpy = vi.spyOn(window, 'dispatchEvent')
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 401,
        url: 'http://localhost:3000/api/public/something',
        headers: new Headers(),
        text: async () => 'Unauthorized',
      })

      try {
        await apiClient.request('/api/public/something')
      } catch (error) {
        // Expected to throw
      }

      expect(dispatchEventSpy).not.toHaveBeenCalledWith(expect.objectContaining({
        type: ADMIN_AUTH_REQUIRED_EVENT,
      }))
    })

    it('should throw ApiClientError with correct status for 401', async () => {
      const mockResponse = {
        ok: false,
        status: 401,
        url: 'http://localhost:3000/api/admin/presells',
        headers: new Headers(),
        text: async () => 'Unauthorized',
      }
      fetchMock.mockResolvedValueOnce(mockResponse)

      try {
        await apiClient.request('/api/admin/presells')
        expect.fail('Should have thrown an error')
      } catch (error) {
        expect(error).toBeInstanceOf(ApiClientError)
        expect((error as ApiClientError).status).toBe(401)
      }
    })
  })

  describe('request() with error.code === "auth_required"', () => {
    it('should dispatch ADMIN_AUTH_REQUIRED_EVENT when error.code is auth_required', async () => {
      const dispatchEventSpy = vi.spyOn(window, 'dispatchEvent')
      const errorPayload = JSON.stringify({
        error: { code: 'auth_required', message: 'Session expired' },
      })
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 403,
        url: 'http://localhost:3000/api/admin/presells',
        headers: new Headers(),
        text: async () => errorPayload,
      })

      try {
        await apiClient.request('/api/admin/presells')
      } catch (error) {
        // Expected to throw
      }

      expect(dispatchEventSpy).toHaveBeenCalledWith(expect.objectContaining({
        type: ADMIN_AUTH_REQUIRED_EVENT,
      }))
    })

    it('should NOT dispatch event if url is not /api/admin/', async () => {
      const dispatchEventSpy = vi.spyOn(window, 'dispatchEvent')
      const errorPayload = JSON.stringify({
        error: { code: 'auth_required', message: 'Session expired' },
      })
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 403,
        url: 'http://localhost:3000/api/public/data',
        headers: new Headers(),
        text: async () => errorPayload,
      })

      try {
        await apiClient.request('/api/public/data')
      } catch (error) {
        // Expected to throw
      }

      expect(dispatchEventSpy).not.toHaveBeenCalledWith(expect.objectContaining({
        type: ADMIN_AUTH_REQUIRED_EVENT,
      }))
    })
  })

  describe('request() with other error statuses', () => {
    it('should NOT dispatch ADMIN_AUTH_REQUIRED_EVENT for 400 Bad Request', async () => {
      const dispatchEventSpy = vi.spyOn(window, 'dispatchEvent')
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 400,
        url: 'http://localhost:3000/api/admin/presells',
        headers: new Headers(),
        text: async () => 'Bad request',
      })

      try {
        await apiClient.request('/api/admin/presells')
      } catch (error) {
        // Expected to throw
      }

      expect(dispatchEventSpy).not.toHaveBeenCalledWith(expect.objectContaining({
        type: ADMIN_AUTH_REQUIRED_EVENT,
      }))
    })

    it('should NOT dispatch ADMIN_AUTH_REQUIRED_EVENT for 500 Server Error', async () => {
      const dispatchEventSpy = vi.spyOn(window, 'dispatchEvent')
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 500,
        url: 'http://localhost:3000/api/admin/presells',
        headers: new Headers(),
        text: async () => 'Internal server error',
      })

      try {
        await apiClient.request('/api/admin/presells')
      } catch (error) {
        // Expected to throw
      }

      expect(dispatchEventSpy).not.toHaveBeenCalledWith(expect.objectContaining({
        type: ADMIN_AUTH_REQUIRED_EVENT,
      }))
    })
  })

  describe('HTTP methods convenience functions', () => {
    it('should support GET method', async () => {
      const mockData = { id: 1 }
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockData,
        text: async () => JSON.stringify(mockData),
      })

      const result = await apiClient.get('/api/test')
      expect(result).toEqual(mockData)
      expect(fetchMock).toHaveBeenCalledWith(
        expect.any(URL),
        expect.objectContaining({ method: 'GET' }),
      )
    })

    it('should support POST method', async () => {
      const mockData = { success: true }
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockData,
        text: async () => JSON.stringify(mockData),
      })

      const result = await apiClient.post('/api/test', { body: { name: 'Test' } })
      expect(result).toEqual(mockData)
      expect(fetchMock).toHaveBeenCalledWith(
        expect.any(URL),
        expect.objectContaining({ method: 'POST' }),
      )
    })
  })
})
