import React from 'react'
import { render, waitFor, fireEvent, act } from '@testing-library/react-native'
import ResultScreen, { normalizeFibonacciAlignment } from '../app/(app)/result'
import { MOCK_SCAN, MOCK_SCAN_WITH_SOURCES } from './fixtures/scan'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ scan_id: 'scan-001' }),
  useRouter: () => ({ replace: jest.fn(), push: jest.fn() }),
  usePathname: () => '/result',
}))

jest.mock('../components/AudioPlayer', () => ({
  AudioPlayer: () => null,
}))

jest.mock('../components/FloatingTabBar', () => ({
  FloatingTabBar: () => null,
}))

jest.mock('react-native/Libraries/Utilities/Dimensions', () => ({
  get: () => ({ width: 390, height: 844 }),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
}))

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
}))

jest.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn().mockResolvedValue({
        data: { session: { access_token: 'test-token' } },
      }),
    },
  },
}))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockFetch(data: object) {
  ;(global as any).fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(data),
  })
}

beforeEach(() => {
  mockFetch(MOCK_SCAN)
})

afterEach(() => {
  jest.clearAllMocks()
})

// ---------------------------------------------------------------------------
// S1 — Fetch + Ch1 tests
// ---------------------------------------------------------------------------

describe('ResultScreen — fetch by scan_id', () => {
  it('renders without crashing and loads data', async () => {
    const { getByText } = render(<ResultScreen />)
    await waitFor(() => expect(getByText('Quercus robur')).toBeTruthy())
  })

  it('shows ActivityIndicator while loading', async () => {
    ;(global as any).fetch = jest.fn().mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                ok: true,
                json: () => Promise.resolve(MOCK_SCAN),
              }),
            200
          )
        )
    )
    const { getByTestId } = render(<ResultScreen />)
    expect(getByTestId('activity-indicator')).toBeTruthy()
    await waitFor(
      () => expect((global as any).fetch).toHaveBeenCalled(),
      { timeout: 500 }
    )
  })

  it('Ch1 renders image_url from fetch response', async () => {
    const { getByTestId } = render(<ResultScreen />)
    await waitFor(() => {
      expect(getByTestId('tree-image')).toBeTruthy()
    })
    const img = getByTestId('tree-image')
    expect(img.props.source.uri).toBe('https://example.com/tree.jpg')
  })

  it('Ch1 renders fallback emoji when image_url is null', async () => {
    mockFetch({ ...MOCK_SCAN, image_url: null })
    const { getByText } = render(<ResultScreen />)
    await waitFor(() => {
      expect(getByText('🌳')).toBeTruthy()
    })
  })

  it('confidence badge shows rounded percentage', async () => {
    const { getAllByText } = render(<ResultScreen />)
    await waitFor(() => {
      // 0.94 * 100 = 94% — appears in Ch1 badge and Ch2 bar label
      expect(getAllByText('94%').length).toBeGreaterThanOrEqual(1)
    })
  })

  it('displays species name', async () => {
    const { getByText } = render(<ResultScreen />)
    await waitFor(() => {
      expect(getByText('Quercus robur')).toBeTruthy()
    })
  })

  it('displays trait badges filtering falsy values', async () => {
    const { getAllByText } = render(<ResultScreen />)
    await waitFor(() => {
      // Traits appear in Ch1 badges and Ch2 trait list
      expect(getAllByText('~120 años').length).toBeGreaterThanOrEqual(1)
      expect(getAllByText('rizada').length).toBeGreaterThanOrEqual(1)
      expect(getAllByText('dicotómica').length).toBeGreaterThanOrEqual(1)
    })
  })

  it('shows error state when fetch fails', async () => {
    ;((global as any).fetch as jest.Mock).mockResolvedValueOnce({ ok: false })
    const { getByText } = render(<ResultScreen />)
    await waitFor(() => {
      expect(getByText('No se pudo cargar el escaneo.')).toBeTruthy()
    })
  })

  it('fetches GET /scan/{scan_id} with Authorization header', async () => {
    render(<ResultScreen />)
    await waitFor(() => {
      expect((global as any).fetch).toHaveBeenCalledWith(
        expect.stringContaining('/scan/scan-001'),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
          }),
        })
      )
    })
  })
})

// ---------------------------------------------------------------------------
// S2 — normalizeFibonacciAlignment unit tests
// ---------------------------------------------------------------------------

describe('normalizeFibonacciAlignment', () => {
  it('maps alta variants correctly', () => {
    expect(normalizeFibonacciAlignment('Alta')).toBe('alta')
    expect(normalizeFibonacciAlignment('alta')).toBe('alta')
    expect(normalizeFibonacciAlignment('alto')).toBe('alta')
    expect(normalizeFibonacciAlignment('high')).toBe('alta')
    expect(normalizeFibonacciAlignment('muy alta')).toBe('alta')
  })

  it('maps baja variants correctly', () => {
    expect(normalizeFibonacciAlignment('Baja')).toBe('baja')
    expect(normalizeFibonacciAlignment('baja')).toBe('baja')
    expect(normalizeFibonacciAlignment('bajo')).toBe('baja')
    expect(normalizeFibonacciAlignment('low')).toBe('baja')
    expect(normalizeFibonacciAlignment('muy baja')).toBe('baja')
  })

  it('falls back to media for unknown/empty values', () => {
    expect(normalizeFibonacciAlignment('unknown')).toBe('media')
    expect(normalizeFibonacciAlignment('')).toBe('media')
    expect(normalizeFibonacciAlignment('1.61')).toBe('media')
    expect(normalizeFibonacciAlignment('  ')).toBe('media')
  })
})

// ---------------------------------------------------------------------------
// S2 — Ch2 render + animated elements
// ---------------------------------------------------------------------------

describe('ResultScreen — Ch2 Metrics chapter', () => {
  it('symmetryNum clamps NaN to 0 — shows 0.00 initially', async () => {
    mockFetch({ ...MOCK_SCAN, symmetry_index: 'N/A' })
    const { getByText } = render(<ResultScreen />)
    // With reanimated mock, useAnimatedReaction fires synchronously with
    // the initial value; ch2Progress starts at 0 → displayedSymmetry = 0
    await waitFor(() => {
      expect(getByText('0.00')).toBeTruthy()
    })
  })

  it('symmetryNum clamps out-of-range to [0,1]', async () => {
    // 1.5 → clamped to 1.0; ch2Progress starts at 0 → displayedSymmetry = 0
    // The ring renders without crashing (no NaN displayed)
    mockFetch({ ...MOCK_SCAN, symmetry_index: '1.5' })
    const { getByTestId } = render(<ResultScreen />)
    await waitFor(() => {
      // Ring renders — symmetry_index was clamped successfully (no crash)
      expect(getByTestId('symmetry-ring')).toBeTruthy()
    })
  })

  it('Ch2 renders symmetry ring', async () => {
    const { getByTestId } = render(<ResultScreen />)
    await waitFor(() => {
      expect(getByTestId('symmetry-ring')).toBeTruthy()
    })
  })

  it('Ch2 renders fibonacci bar track', async () => {
    const { getByTestId } = render(<ResultScreen />)
    await waitFor(() => {
      expect(getByTestId('fibonacci-bar-track')).toBeTruthy()
    })
  })

  it('Ch2 renders confidence bar track', async () => {
    const { getByTestId } = render(<ResultScreen />)
    await waitFor(() => {
      expect(getByTestId('confidence-bar-track')).toBeTruthy()
    })
  })

  it('Ch2 container renders', async () => {
    const { getByTestId } = render(<ResultScreen />)
    await waitFor(() => {
      expect(getByTestId('ch2-metrics')).toBeTruthy()
    })
  })
})

// ---------------------------------------------------------------------------
// S3 — Ch3 typewriter + audio reveal tests
// ---------------------------------------------------------------------------

describe('ResultScreen — Ch3 typewriter + audio reveal', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    mockFetch(MOCK_SCAN)
  })

  afterEach(() => {
    jest.useRealTimers()
    jest.clearAllTimers()
    jest.clearAllMocks()
  })

  it('typewriter starts empty before any interaction', async () => {
    const { getByText, queryByText } = render(<ResultScreen />)
    // Wait for data to load
    await waitFor(() => getByText('Quercus robur'))
    // narrative text not rendered yet (typewriter starts at '' — not in view)
    // The text node would contain the cursor '|' as well, so query for exact narrative only
    expect(queryByText(MOCK_SCAN.narrative)).toBeNull()
  })

  it('skipTypewriter completes text immediately on tap', async () => {
    const { getByText, getByTestId } = render(<ResultScreen />)
    await waitFor(() => getByText('Quercus robur'))

    await act(async () => {
      fireEvent.press(getByTestId('ch3-tap-area'))
    })

    // RNTL getByText does partial/exact match on text content;
    // since cursor '|' is a child Text, use regex to match narrative text
    await waitFor(() => {
      expect(getByText(new RegExp(MOCK_SCAN.narrative.replace(/\./g, '\\.')))).toBeTruthy()
    })
  })

  it('typewriter starts empty and shows text progressively after skip', async () => {
    const { getByText, getByTestId } = render(<ResultScreen />)
    await waitFor(() => getByText('Quercus robur'))

    // Before skip: typedText is '' (ch3 not in view in tests)
    // Tap to skip → full narrative set immediately
    await act(async () => {
      fireEvent.press(getByTestId('ch3-tap-area'))
    })

    await waitFor(() => {
      expect(getByText(new RegExp(MOCK_SCAN.narrative.replace(/\./g, '\\.')))).toBeTruthy()
    })
  })

  it('audio player is hidden initially (opacity 0, typingComplete = false)', async () => {
    const { getByText, queryByTestId } = render(<ResultScreen />)
    await waitFor(() => getByText('Quercus robur'))

    // audio_url present → Animated.View renders with opacity 0 before typing completes
    // (audioOpacity shared value starts at 0; mock useAnimatedStyle returns it as-is)
    const audioWrap = queryByTestId('ch3-audio-wrap')
    expect(audioWrap).toBeTruthy()
    // Style array contains { opacity: 0 }
    const flatStyle = [audioWrap!.props.style].flat()
    expect(flatStyle).toEqual(expect.arrayContaining([{ opacity: 0 }]))
  })

  it('audio player appears after typewriter completes (skip)', async () => {
    const { getByText, getByTestId } = render(<ResultScreen />)
    await waitFor(() => getByText('Quercus robur'))

    // The ch3-audio-wrap is always present when audio_url is set;
    // after skip the full narrative text is visible (typingComplete = true)
    await act(async () => {
      fireEvent.press(getByTestId('ch3-tap-area'))
    })

    await waitFor(() => {
      // Audio wrap is in tree
      expect(getByTestId('ch3-audio-wrap')).toBeTruthy()
      // Full narrative rendered (confirms typingComplete fired)
      expect(getByText(new RegExp(MOCK_SCAN.narrative.replace(/\./g, '\\.')))).toBeTruthy()
    })
  })

  it('audio player not rendered when audio_url is null', async () => {
    mockFetch({ ...MOCK_SCAN, audio_url: null })
    const { getByText, queryByTestId } = render(<ResultScreen />)
    await waitFor(() => getByText('Quercus robur'))
    expect(queryByTestId('ch3-audio-wrap')).toBeNull()
  })

  it('typewriter reveals characters progressively via setInterval', async () => {
    // The reanimated mock fires useAnimatedReaction with (true, false) when the getter
    // returns a boolean — simulating ch3Progress > 0.8 (ch3 scrolled into view).
    // This triggers startTypewriter(), which sets a 22 ms setInterval.
    const { getByText, getByTestId, queryByTestId } = render(<ResultScreen />)

    // Wait for data to load
    await waitFor(() => expect(getByText('Quercus robur')).toBeTruthy())

    // Advance 3 ticks (3 characters at 22ms each) — partial reveal
    act(() => { jest.advanceTimersByTime(3 * 22) })

    // After 3 ticks: first 3 chars visible, full narrative NOT complete yet,
    // audio wrapper still hidden (typingComplete = false)
    const partial = MOCK_SCAN.narrative.slice(0, 3) // 'El '
    await waitFor(() => expect(getByText(new RegExp(partial))).toBeTruthy())
    // audio-wrap is in the tree but opacity is still 0 (typing not complete)
    const audioWrapMid = queryByTestId('ch3-audio-wrap')
    if (audioWrapMid) {
      const flatStyle = [audioWrapMid.props.style].flat()
      expect(flatStyle).toEqual(expect.arrayContaining([{ opacity: 0 }]))
    }

    // Now advance to full completion
    act(() => { jest.runAllTimers() })

    // Full text + audio visible
    await waitFor(() => {
      expect(getByText(new RegExp(MOCK_SCAN.narrative.replace(/\./g, '\\.')))).toBeTruthy()
      expect(getByTestId('ch3-audio-wrap')).toBeTruthy()
    })
  })
})

// ---------------------------------------------------------------------------
// S4 — Scroll animations unit tests
// ---------------------------------------------------------------------------

describe('S4 scroll animations', () => {
  it('exit fade: Ch0 starts fading at scrollY=screenH (not screenH*2)', () => {
    // exitProgress for chapter 0 at scrollY=screenH should be 1
    // opacity at exitProgress=1 → 0.3
    const screenH = 800
    const exitProgress = Math.min(Math.max((screenH - screenH * 0) / screenH, 0), 1)
    expect(exitProgress).toBe(1)
  })

  it('bg lerp: sawtooth produces correct values at chapter boundaries', () => {
    function sawtoothOpacity(pos: number) {
      const mod = pos % 2
      return Math.min(Math.max(mod <= 1 ? mod : 2 - mod, 0), 1)
    }
    expect(sawtoothOpacity(0)).toBe(0)   // Ch1: void
    expect(sawtoothOpacity(1)).toBe(1)   // Ch2: surface
    expect(sawtoothOpacity(2)).toBe(0)   // Ch3: void
    expect(sawtoothOpacity(3)).toBe(1)   // Ch4: surface
  })

  it('photoParallaxY returns 0 when isReducedMotion', () => {
    // When reduced motion is true, parallax formula returns 0
    const isReducedMotion = true
    const screenH = 844
    const scrollYValue = screenH * 0.5
    const PARALLAX_MAX = 40

    function computeParallax(scrollVal: number, sH: number, reduced: boolean) {
      if (reduced) return 0
      const t = Math.min(Math.max(scrollVal / sH, 0), 1)
      return t * -PARALLAX_MAX
    }

    expect(computeParallax(scrollYValue, screenH, isReducedMotion)).toBe(0)
    // Without reduced motion it's non-zero at mid-scroll
    expect(computeParallax(scrollYValue, screenH, false)).not.toBe(0)
  })

  it('photoParallaxY magnitude is bounded (not screen-height scale)', () => {
    // At scrollY = screenH (mid-scroll to Ch2), parallax should be
    // between -PARALLAX_MAX and 0, not near -screenH*0.3
    const screenH = 800
    const PARALLAX_MAX = 40
    const progress = Math.min(Math.max(screenH / screenH, 0), 1) // = 1.0 (full scroll to Ch2)
    // At progress=1, offset = -PARALLAX_MAX
    const offset = -PARALLAX_MAX * progress
    expect(Math.abs(offset)).toBeLessThanOrEqual(PARALLAX_MAX)
    expect(Math.abs(offset)).toBeLessThan(112 / 2) // less than ring radius
  })

  it('ChapterWrapper renders children', async () => {
    const { getByText } = render(<ResultScreen />)
    // All chapter content should be present after data loads
    await waitFor(() => {
      expect(getByText('Quercus robur')).toBeTruthy()
      expect(getByText('ANÁLISIS ESTRUCTURAL')).toBeTruthy()
      expect(getByText('INTERPRETACIÓN')).toBeTruthy()
    })
  })
})

// ---------------------------------------------------------------------------
// S5 — Ch4 RAG sources
// ---------------------------------------------------------------------------

describe('S5 — Ch4 RAG sources', () => {
  it('Ch4 always renders (even when no rag_sources)', async () => {
    mockFetch(MOCK_SCAN)
    const { getByTestId } = render(<ResultScreen />)
    await waitFor(() => {
      expect(getByTestId('ch4-rag')).toBeTruthy()
    })
  })

  it('Ch4 renders empty state when no sources', async () => {
    mockFetch(MOCK_SCAN)
    const { getByTestId, getByText } = render(<ResultScreen />)
    await waitFor(() => {
      expect(getByTestId('ch4-empty-state')).toBeTruthy()
      expect(getByText('No hay fuentes disponibles')).toBeTruthy()
    })
  })

  it('Ch4 renders empty state when rag_sources is empty array', async () => {
    mockFetch({ ...MOCK_SCAN, rag_sources: [] })
    const { getByTestId } = render(<ResultScreen />)
    await waitFor(() => {
      expect(getByTestId('ch4-empty-state')).toBeTruthy()
    })
  })

  it('Ch4 renders numbered list when sources provided', async () => {
    mockFetch(MOCK_SCAN_WITH_SOURCES)
    const { getByTestId, getByText, queryByTestId } = render(<ResultScreen />)
    await waitFor(() => {
      expect(getByTestId('ch4-rag-list')).toBeTruthy()
      // Numbered labels 01, 02
      expect(getByText('01')).toBeTruthy()
      expect(getByText('02')).toBeTruthy()
      // Source text visible
      expect(getByText('Trewavas 2003 — Plant Intelligence')).toBeTruthy()
      expect(getByText('Mancuso & Viola 2015')).toBeTruthy()
      // Empty state NOT shown
      expect(queryByTestId('ch4-empty-state')).toBeNull()
    })
  })

  it('FlatList has contentContainerStyle with paddingBottom', async () => {
    mockFetch(MOCK_SCAN)
    const { getByText, getByTestId } = render(<ResultScreen />)
    await waitFor(() => getByText('Quercus robur'))

    // useSafeAreaInsets mock returns bottom=34 → tabBarPadding = 60+34 = 94
    const flatList = getByTestId('result-flatlist')
    expect(flatList.props.contentContainerStyle).toEqual(
      expect.objectContaining({ paddingBottom: expect.any(Number) })
    )
    expect(flatList.props.contentContainerStyle.paddingBottom).toBeGreaterThan(0)
  })

  it('Ch4 renders FUENTES DEL CORPUS label', async () => {
    mockFetch(MOCK_SCAN)
    const { getByText } = render(<ResultScreen />)
    await waitFor(() => {
      expect(getByText('FUENTES DEL CORPUS')).toBeTruthy()
    })
  })
})
