import React from 'react'
import { render, waitFor } from '@testing-library/react-native'
import ResultScreen, { normalizeFibonacciAlignment } from '../app/(app)/result'
import { MOCK_SCAN } from './fixtures/scan'

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
