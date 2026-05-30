import React from 'react'
import { render, waitFor } from '@testing-library/react-native'
import ResultScreen from '../app/(app)/result'

// Mock scan data returned by GET /scan/:id
const mockScanData = {
  id: 'scan-123',
  species: 'Quercus robur',
  symmetry_index: 0.89,
  fibonacci_alignment: '1.61',
  narrative: 'El roble codifica las memorias del suelo.',
  audio_url: null,
  image_url: 'https://example.com/tree.jpg',
  age_estimate: '~120 años',
  bark_type: 'rizada',
  branching_pattern: 'alterna',
  confidence: 0.94,
  scanned_at: '2026-05-29T10:00:00Z',
  rag_sources: ['Semiosis Botánica', 'Morfología Fractal'],
}

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ scan_id: 'scan-123' }),
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

beforeEach(() => {
  ;(global as any).fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(mockScanData),
  })
})

afterEach(() => {
  jest.clearAllMocks()
})

describe('ResultScreen — fetch by scan_id', () => {
  it('renders without crashing and loads data', async () => {
    const { getByText } = render(<ResultScreen />)
    await waitFor(() => expect(getByText('Quercus robur')).toBeTruthy())
  })

  it('shows ActivityIndicator while loading', async () => {
    // Delay fetch so we can catch the loading state
    ;(global as any).fetch = jest.fn().mockImplementation(
      () => new Promise((resolve) => setTimeout(() =>
        resolve({ ok: true, json: () => Promise.resolve(mockScanData) }), 200))
    )
    const { getByTestId } = render(<ResultScreen />)
    expect(getByTestId('activity-indicator')).toBeTruthy()
    await waitFor(() => expect((global as any).fetch).toHaveBeenCalled(), { timeout: 500 })
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
    ;((global as any).fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ ...mockScanData, image_url: null }),
    })
    const { getByText } = render(<ResultScreen />)
    await waitFor(() => {
      expect(getByText('🌳')).toBeTruthy()
    })
  })

  it('confidence badge shows rounded percentage', async () => {
    const { getByText } = render(<ResultScreen />)
    await waitFor(() => {
      // 0.94 * 100 = 94%
      expect(getByText('94%')).toBeTruthy()
    })
  })

  it('displays species name', async () => {
    const { getByText } = render(<ResultScreen />)
    await waitFor(() => {
      expect(getByText('Quercus robur')).toBeTruthy()
    })
  })

  it('displays trait badges filtering falsy values', async () => {
    const { getByText } = render(<ResultScreen />)
    await waitFor(() => {
      expect(getByText('~120 años')).toBeTruthy()
      expect(getByText('rizada')).toBeTruthy()
      expect(getByText('alterna')).toBeTruthy()
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
        expect.stringContaining('/scan/scan-123'),
        expect.objectContaining({
          headers: expect.objectContaining({ Authorization: 'Bearer test-token' }),
        })
      )
    })
  })
})
