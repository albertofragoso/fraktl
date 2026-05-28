export interface ScanItem {
  id: string
  species: string
  symmetry_index: number
  fibonacci_alignment: string
  narrative: string
  image_url: string
  audio_url: string
  scanned_at: string
  location?: string
}

export interface ScanSection {
  title: string
  data: ScanItem[]
}

export function groupScansByDate(scans: ScanItem[]): ScanSection[] {
  if (scans.length === 0) return []

  const now = new Date()
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterdayMidnight = new Date(todayMidnight)
  yesterdayMidnight.setDate(yesterdayMidnight.getDate() - 1)

  const map = new Map<string, ScanItem[]>()

  for (const scan of scans) {
    const d = new Date(scan.scanned_at)
    const scanMidnight = new Date(d.getFullYear(), d.getMonth(), d.getDate())

    let title: string
    if (scanMidnight.getTime() === todayMidnight.getTime()) {
      title = 'Hoy'
    } else if (scanMidnight.getTime() === yesterdayMidnight.getTime()) {
      title = 'Ayer'
    } else {
      title = d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })
    }

    const existing = map.get(title) ?? []
    map.set(title, [...existing, scan])
  }

  return Array.from(map.entries()).map(([title, data]) => ({ title, data }))
}
