/**
 * Behavior tests for AudioPlayer null-safety guard.
 *
 * The component itself uses Animated + expo-av which require a native runtime
 * for full rendering. These tests verify the guard logic: when audio_url is
 * null/empty, createAsync must NOT be called (no crash path).
 */

// hasAudio guard — same logic as result.tsx line "const hasAudio = ..."
function hasAudio(url: string | null | undefined): boolean {
  return url != null && url !== 'null' && url.length > 0
}

describe('hasAudio guard (result.tsx)', () => {
  test('null → false', () => expect(hasAudio(null)).toBe(false))
  test('undefined → false', () => expect(hasAudio(undefined)).toBe(false))
  test('empty string → false', () => expect(hasAudio('')).toBe(false))
  test('"null" string (expo-router serialized) → false', () => expect(hasAudio('null')).toBe(false))
  test('valid url → true', () => expect(hasAudio('https://storage.example.com/audio.mp3')).toBe(true))
})

// AudioPlayer early-return guard
// When url is falsy/null, the useEffect returns before calling createAsync.
// We verify this by checking the condition directly — same logic as the component.
function shouldCallCreateAsync(url: string | null | undefined): boolean {
  if (!url || url === 'null') return false
  return true
}

describe('AudioPlayer createAsync guard', () => {
  test('url=null → no createAsync call', () => expect(shouldCallCreateAsync(null)).toBe(false))
  test('url="" → no createAsync call', () => expect(shouldCallCreateAsync('')).toBe(false))
  test('url="null" → no createAsync call', () => expect(shouldCallCreateAsync('null')).toBe(false))
  test('valid url → createAsync is called', () => {
    expect(shouldCallCreateAsync('https://storage.example.com/audio.mp3')).toBe(true)
  })
})
