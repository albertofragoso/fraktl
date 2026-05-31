import { groupScansByDate, ScanItem } from '../utils/groupScansByDate'

function makeScan(id: string, scanned_at: string): ScanItem {
  return {
    id,
    species: 'Quercus robur',
    symmetry_index: 0.89,
    fibonacci_alignment: '1.61',
    narrative: 'test narrative',
    image_url: '',
    audio_url: '',
    scanned_at,
  }
}

function isoToday(): string {
  return new Date().toISOString()
}

function isoYesterday(): string {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return d.toISOString()
}

function isoOlder(daysAgo: number): string {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  return d.toISOString()
}

describe('groupScansByDate', () => {
  it('returns empty array for empty input', () => {
    expect(groupScansByDate([])).toEqual([])
  })

  it('labels today scans as "Hoy"', () => {
    const result = groupScansByDate([makeScan('1', isoToday())])
    expect(result[0].title).toBe('Hoy')
    expect(result[0].data).toHaveLength(1)
  })

  it('labels yesterday scans as "Ayer"', () => {
    const result = groupScansByDate([makeScan('1', isoYesterday())])
    expect(result[0].title).toBe('Ayer')
  })

  it('formats scans older than yesterday as "DD MMM" (not Hoy or Ayer)', () => {
    const result = groupScansByDate([makeScan('1', isoOlder(5))])
    expect(result[0].title).not.toBe('Hoy')
    expect(result[0].title).not.toBe('Ayer')
    expect(result[0].title).toMatch(/\d/)
  })

  it('groups multiple scans from the same day into one section', () => {
    const today = isoToday()
    const result = groupScansByDate([makeScan('1', today), makeScan('2', today)])
    expect(result).toHaveLength(1)
    expect(result[0].data).toHaveLength(2)
  })

  it('creates separate sections for different days', () => {
    const scans = [
      makeScan('1', isoToday()),
      makeScan('2', isoYesterday()),
      makeScan('3', isoOlder(5)),
    ]
    const result = groupScansByDate(scans)
    expect(result).toHaveLength(3)
  })

  it('preserves scan data inside sections', () => {
    const scan = makeScan('abc', isoToday())
    const result = groupScansByDate([scan])
    expect(result[0].data[0].id).toBe('abc')
  })
})
