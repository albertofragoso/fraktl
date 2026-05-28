import React from 'react'
import { render } from '@testing-library/react-native'
import ResultScreen from '../app/(app)/result'

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({
    species: 'Quercus robur',
    symmetry_index: '0.89',
    fibonacci_alignment: '1.61',
    narrative: 'El roble codifica las memorias del suelo.',
    audio_url: null,
    rag_sources: 'Semiosis Botánica,Morfología Fractal',
  }),
  useRouter: () => ({ replace: jest.fn() }),
}))

jest.mock('../components/AudioPlayer', () => ({
  AudioPlayer: () => null,
}))

jest.mock('react-native/Libraries/Utilities/Dimensions', () => ({
  get: () => ({ width: 390, height: 844 }),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
}))

describe('ResultScreen', () => {
  it('renders without crashing', () => {
    expect(() => render(<ResultScreen />)).not.toThrow()
  })

  it('displays species name', () => {
    const { getByText } = render(<ResultScreen />)
    expect(getByText('Quercus robur')).toBeTruthy()
  })

  it('displays symmetry metric', () => {
    const { getByText } = render(<ResultScreen />)
    expect(getByText('0.89')).toBeTruthy()
  })

  it('displays narrative text', () => {
    const { getByText } = render(<ResultScreen />)
    expect(getByText('El roble codifica las memorias del suelo.')).toBeTruthy()
  })

  it('displays RAG source tags', () => {
    const { getByText } = render(<ResultScreen />)
    expect(getByText('Semiosis Botánica')).toBeTruthy()
    expect(getByText('Morfología Fractal')).toBeTruthy()
  })
})
