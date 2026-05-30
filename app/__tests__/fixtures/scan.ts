export type ScanData = {
  id: string
  species: string
  symmetry_index: string | number
  fibonacci_alignment: string
  narrative: string
  audio_url: string | null
  image_url: string | null
  age_estimate: string
  bark_type: string
  branching_pattern: string
  confidence: number
  scanned_at: string
  // rag_sources not persisted in DB (no scans column) — optional, absent = graceful empty state
  rag_sources?: string[]
}

export const MOCK_SCAN: ScanData = {
  id: 'scan-001',
  species: 'Quercus robur',
  symmetry_index: '0.87',
  fibonacci_alignment: 'Alta',
  narrative: 'El roble habla...',
  audio_url: 'https://example.com/audio.mp3',
  image_url: 'https://example.com/tree.jpg',
  age_estimate: '~120 años',
  bark_type: 'rizada',
  branching_pattern: 'dicotómica',
  confidence: 0.94,
  scanned_at: '2026-05-29T12:00:00Z',
}

export const MOCK_SCAN_WITH_SOURCES: ScanData = {
  ...MOCK_SCAN,
  rag_sources: ['Trewavas 2003 — Plant Intelligence', 'Mancuso & Viola 2015'],
}
