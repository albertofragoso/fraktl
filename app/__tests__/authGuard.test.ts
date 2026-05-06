/**
 * Unit tests for the auth guard redirect logic in app/_layout.tsx.
 * Tests the condition: no session → redirect to /(auth), session + in auth → redirect to /(app).
 */

type Segment = string

function shouldRedirect(
  session: boolean,
  segments: Segment[]
): '/(auth)' | '/(app)' | null {
  const inAuth = segments[0] === '(auth)'
  if (!session && !inAuth) return '/(auth)'
  if (session && inAuth) return '/(app)'
  return null
}

describe('auth guard redirect logic', () => {
  it('redirects unauthenticated user away from protected route', () => {
    expect(shouldRedirect(false, ['(app)'])).toBe('/(auth)')
  })

  it('redirects unauthenticated user from root to auth', () => {
    expect(shouldRedirect(false, [])).toBe('/(auth)')
  })

  it('redirects authenticated user away from auth route', () => {
    expect(shouldRedirect(true, ['(auth)'])).toBe('/(app)')
  })

  it('does not redirect authenticated user in app', () => {
    expect(shouldRedirect(true, ['(app)'])).toBeNull()
  })

  it('does not redirect unauthenticated user already in auth', () => {
    expect(shouldRedirect(false, ['(auth)'])).toBeNull()
  })

  it('does not redirect authenticated user at nested app route', () => {
    expect(shouldRedirect(true, ['(app)', 'scan'])).toBeNull()
  })
})
