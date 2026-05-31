import React from 'react'
import { render } from '@testing-library/react-native'
import { ScanOverlay } from '../components/ScanOverlay'

describe('ScanOverlay', () => {
  it('renders hint text', () => {
    const { getByTestId } = render(<ScanOverlay hint="Apunta al tronco" state="scanning" />)
    expect(getByTestId('hint-text').props.children).toBe('Apunta al tronco')
  })

  it('renders data overlays element in scanning state', () => {
    const { getByTestId } = render(<ScanOverlay hint="hint" state="scanning" />)
    expect(getByTestId('data-overlays')).toBeTruthy()
  })

  it('renders data overlays element in detected state', () => {
    const { getByTestId } = render(<ScanOverlay hint="hint" state="detected" />)
    expect(getByTestId('data-overlays')).toBeTruthy()
  })

  it('shows ÁRBOL DETECTADO status text in detected state', () => {
    const { getByText } = render(<ScanOverlay hint="hint" state="detected" />)
    expect(getByText('ÁRBOL DETECTADO')).toBeTruthy()
  })

  it('shows ESCANEANDO status text in scanning state', () => {
    const { getByText } = render(<ScanOverlay hint="hint" state="scanning" />)
    expect(getByText('ESCANEANDO')).toBeTruthy()
  })
})
