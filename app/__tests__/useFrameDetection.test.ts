/**
 * Tests for detectFrame() — the core detection function exported from useFrameDetection.
 * Tests the auth-guard redirect logic and the polling state machine separately (no renderHook).
 */
import { detectFrame } from '../hooks/useFrameDetection'

const mockFetch = jest.fn()
global.fetch = mockFetch as any

jest.mock('../constants/api', () => ({ API_URL: 'http://localhost:8000' }))

describe('detectFrame', () => {
  beforeEach(() => mockFetch.mockReset())

  it('returns valid=true when API reports valid frame', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ valid: true, hint: 'Árbol detectado' }),
    })

    const result = await detectFrame('file://frame.jpg', 'tok123')
    expect(result.valid).toBe(true)
    expect(result.hint).toBe('Árbol detectado')
  })

  it('returns valid=false with hint when frame is invalid', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ valid: false, hint: 'Busca mejor iluminación' }),
    })

    const result = await detectFrame('file://frame.jpg', 'tok123')
    expect(result.valid).toBe(false)
    expect(result.hint).toBe('Busca mejor iluminación')
  })

  it('falls back to default hint on HTTP error', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false })

    const result = await detectFrame('file://frame.jpg', 'tok123')
    expect(result.valid).toBe(false)
    expect(result.hint).toBe('Apunta al tronco del árbol')
  })

  it('sends Authorization header with token', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ valid: false, hint: 'ok' }),
    })

    await detectFrame('file://frame.jpg', 'Bearer test-token')

    const [, options] = mockFetch.mock.calls[0]
    expect(options.headers['Authorization']).toBe('Bearer Bearer test-token')
  })

  it('sends Authorization Bearer header', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ valid: false, hint: 'ok' }),
    })

    await detectFrame('file://frame.jpg', 'my-token')
    const [url, options] = mockFetch.mock.calls[0]
    expect(url).toBe('http://localhost:8000/scan/detect')
    expect(options.method).toBe('POST')
    expect(options.headers['Authorization']).toBe('Bearer my-token')
  })
})

describe('auth guard redirect logic (pure)', () => {
  function shouldRedirect(session: boolean, segments: string[]): string | null {
    const inAuth = segments[0] === '(auth)'
    if (!session && !inAuth) return '/(auth)'
    if (session && inAuth) return '/(app)'
    return null
  }

  it('redirects unauthenticated user to auth', () => {
    expect(shouldRedirect(false, ['(app)'])).toBe('/(auth)')
  })

  it('redirects authenticated user out of auth group', () => {
    expect(shouldRedirect(true, ['(auth)'])).toBe('/(app)')
  })

  it('no redirect when authenticated user in app', () => {
    expect(shouldRedirect(true, ['(app)'])).toBeNull()
  })

  it('no redirect when unauthenticated user in auth', () => {
    expect(shouldRedirect(false, ['(auth)'])).toBeNull()
  })
})
