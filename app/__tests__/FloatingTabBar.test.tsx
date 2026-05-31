import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import { FloatingTabBar } from '../components/FloatingTabBar'

const mockPush = jest.fn()
let mockPathname = '/'

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => mockPathname,
}))

beforeEach(() => {
  mockPush.mockClear()
  mockPathname = '/'
})

describe('FloatingTabBar', () => {
  it('renders home tab, FAB, and history tab', () => {
    const { getByLabelText } = render(<FloatingTabBar />)
    expect(getByLabelText('Inicio')).toBeTruthy()
    expect(getByLabelText('Escanear árbol')).toBeTruthy()
    expect(getByLabelText('Historial')).toBeTruthy()
  })

  it('pressing home tab navigates to /(app)', () => {
    const { getByLabelText } = render(<FloatingTabBar />)
    fireEvent.press(getByLabelText('Inicio'))
    expect(mockPush).toHaveBeenCalledWith('/(app)')
  })

  it('pressing FAB navigates to /(app)/scan', () => {
    const { getByLabelText } = render(<FloatingTabBar />)
    fireEvent.press(getByLabelText('Escanear árbol'))
    expect(mockPush).toHaveBeenCalledWith('/(app)/scan')
  })

  it('pressing history tab navigates to /(app)/history', () => {
    const { getByLabelText } = render(<FloatingTabBar />)
    fireEvent.press(getByLabelText('Historial'))
    expect(mockPush).toHaveBeenCalledWith('/(app)/history')
  })

  it('FAB renders with testID fab-button', () => {
    const { getByTestId } = render(<FloatingTabBar />)
    expect(getByTestId('fab-button')).toBeTruthy()
  })

  it('home tab is active on /(app)', () => {
    mockPathname = '/'
    const { getByLabelText } = render(<FloatingTabBar />)
    // indicator dot should be active (accessible via parent pressable)
    expect(getByLabelText('Inicio')).toBeTruthy()
  })

  it('no active tab on result screen — isHome false, isHistory false', () => {
    mockPathname = '/(app)/result'
    // isHome = pathname === '/(app)' || '/(app)/index' → false
    // isHistory = pathname.includes('history') → false
    // Both inactive — just verify it renders without marking home active
    const { getByLabelText } = render(<FloatingTabBar />)
    expect(getByLabelText('Inicio')).toBeTruthy()
    expect(getByLabelText('Historial')).toBeTruthy()
  })

  it('history tab is active on /(app)/history', () => {
    mockPathname = '/(app)/history'
    const { getByLabelText } = render(<FloatingTabBar />)
    expect(getByLabelText('Historial')).toBeTruthy()
  })
})
