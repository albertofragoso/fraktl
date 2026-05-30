import React, { useState, useRef, useEffect } from 'react'
import { View, Text, FlatList, Dimensions, StyleSheet, Pressable, Image, ActivityIndicator } from 'react-native'
import type { NativeSyntheticEvent, NativeScrollEvent } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { AudioPlayer } from '../../components/AudioPlayer'
import { FloatingTabBar } from '../../components/FloatingTabBar'
import { Colors, Fonts } from '../../constants/theme'
import { supabase } from '../../lib/supabase'

type ScanData = {
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
  rag_sources?: string[]
}

type Chapter =
  | { type: 'scan-lock'; scanData: ScanData }
  | { type: 'metrics'; symmetry: string; fibonacci: string }
  | { type: 'narrative'; narrative: string; audioUrl: string | null }
  | { type: 'rag'; sources: string[] }

export default function ResultScreen() {
  const router = useRouter()
  const [activeChapter, setActiveChapter] = useState(0)
  const [scanData, setScanData] = useState<ScanData | null>(null)
  const [loading, setLoading] = useState(true)
  const screenH = useRef(Dimensions?.get?.('window')?.height ?? 844).current

  const { scan_id } = useLocalSearchParams<{ scan_id: string }>()

  useEffect(() => {
    if (!scan_id) {
      setLoading(false)
      return
    }
    async function fetchScan() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        const res = await fetch(
          `${process.env.EXPO_PUBLIC_API_URL}/scan/${scan_id}`,
          { headers: { Authorization: `Bearer ${session?.access_token}` } }
        )
        if (!res.ok) throw new Error('fetch failed')
        const data: ScanData = await res.json()
        setScanData(data)
      } catch {
        // keep scanData null — will show error state
      } finally {
        setLoading(false)
      }
    }
    fetchScan()
  }, [scan_id])

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator testID="activity-indicator" size="large" color={Colors.sistema} />
      </View>
    )
  }

  if (!scanData) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>No se pudo cargar el escaneo.</Text>
        <Pressable onPress={() => router.replace('/(app)')} style={styles.backLink}>
          <Text style={styles.backLinkText}>← Inicio</Text>
        </Pressable>
      </View>
    )
  }

  // rag_sources not yet persisted server-side — Ch4 deferred to S5
  const ragList: string[] = scanData?.rag_sources ?? []

  const chapters: Chapter[] = [
    { type: 'scan-lock', scanData },
    {
      type: 'metrics',
      symmetry: scanData.symmetry_index != null ? Number(scanData.symmetry_index).toFixed(2) : '—',
      fibonacci: scanData.fibonacci_alignment ?? '—',
    },
    {
      type: 'narrative',
      narrative: scanData.narrative ?? '',
      audioUrl: scanData.audio_url ?? null,
    },
    ...(ragList.length > 0 ? [{ type: 'rag' as const, sources: ragList }] : []),
  ]

  function handleScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const index = Math.round(e.nativeEvent.contentOffset.y / screenH)
    if (index !== activeChapter) setActiveChapter(index)
  }

  return (
    <View style={styles.root}>
      <FlatList
        data={chapters}
        keyExtractor={(_, i) => String(i)}
        renderItem={({ item }) => renderChapter(item, router, screenH)}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={handleScroll}
        getItemLayout={(_, index) => ({
          length: screenH,
          offset: screenH * index,
          index,
        })}
      />

      {/* Spine indicator */}
      <View style={styles.spine} pointerEvents="none">
        {chapters.map((_, i) => (
          <View
            key={i}
            style={[styles.spineDot, activeChapter === i && styles.spineDotActive]}
          />
        ))}
      </View>
    </View>
  )
}

function renderChapter(
  chapter: Chapter,
  router: ReturnType<typeof useRouter>,
  screenH: number,
): React.ReactElement {
  const chapterStyle = { height: screenH }

  switch (chapter.type) {
    case 'scan-lock': {
      const { scanData } = chapter
      const confidencePct = Math.round((scanData.confidence ?? 0) * 100)
      const badgeItems = [
        scanData.age_estimate,
        scanData.bark_type,
        scanData.branching_pattern,
      ].filter(Boolean)

      return (
        <View style={[styles.chapter, styles.chapterScanLock, chapterStyle]}>
          {/* Confidence badge */}
          <View style={styles.confidenceBadge}>
            <Text style={styles.confidenceText}>{confidencePct}%</Text>
          </View>

          {/* Ring structure */}
          <View style={styles.scanRingOuter}>
            <View style={styles.scanRingMiddle}>
              <View style={styles.scanRingInner}>
                {scanData.image_url ? (
                  <Image
                    source={{ uri: scanData.image_url }}
                    style={StyleSheet.absoluteFill}
                    resizeMode="cover"
                    testID="tree-image"
                  />
                ) : (
                  <Text style={styles.fallbackEmoji}>🌳</Text>
                )}
              </View>
            </View>
          </View>

          {/* Species name */}
          <Text style={styles.speciesName}>{scanData.species ?? 'Especie desconocida'}</Text>

          {/* Trait badges */}
          {badgeItems.length > 0 && (
            <View style={styles.badgeRow}>
              {badgeItems.map((badge) => (
                <View key={badge} style={styles.traitBadge}>
                  <Text style={styles.traitBadgeText}>{badge}</Text>
                </View>
              ))}
            </View>
          )}

          <Text style={styles.swipeHint}>↓ desliza</Text>
          <FloatingTabBar />
        </View>
      )
    }

    case 'metrics':
      return (
        <View style={[styles.chapter, { backgroundColor: Colors.surface }, chapterStyle]}>
          <Text style={styles.chapterLabel}>Análisis estructural</Text>
          <View style={styles.metricsGrid}>
            <View style={[styles.metricCell, { borderColor: Colors.sistemaBorder }]}>
              <Text style={[styles.metricValue, { color: Colors.sistema }]}>{chapter.symmetry}</Text>
              <Text style={styles.metricKey}>Índice de simetría</Text>
            </View>
            <View style={[styles.metricCell, { borderColor: Colors.accionBorder }]}>
              <Text style={[styles.metricValue, { color: Colors.accion }]}>{chapter.fibonacci}</Text>
              <Text style={styles.metricKey}>Proporción Fibonacci</Text>
            </View>
          </View>
          <Text style={styles.swipeHint}>↓ desliza</Text>
          <FloatingTabBar />
        </View>
      )

    case 'narrative':
      return (
        <View style={[styles.chapter, chapterStyle]}>
          <Text style={styles.chapterLabel}>Interpretación biosemiótica</Text>
          <Text style={styles.narrativeText}>{chapter.narrative}</Text>
          {chapter.audioUrl && (
            <View style={styles.audioWrap}>
              <AudioPlayer url={chapter.audioUrl} />
            </View>
          )}
          <FloatingTabBar />
        </View>
      )

    case 'rag':
      return (
        <View style={[styles.chapter, { backgroundColor: Colors.surface }, chapterStyle]}>
          <Text style={styles.chapterLabel}>Fuentes del corpus</Text>
          <View style={styles.ragTags}>
            {chapter.sources.map((src) => (
              <View key={src} style={styles.ragTag}>
                <Text style={styles.ragTagText}>{src}</Text>
              </View>
            ))}
          </View>
          <Pressable
            style={({ pressed }) => [styles.homeBtn, pressed && { opacity: 0.6 }]}
            onPress={() => router.replace('/(app)')}
            accessibilityRole="button"
          >
            <Text style={styles.homeBtnText}>← Inicio</Text>
          </Pressable>
          <FloatingTabBar />
        </View>
      )
  }
}

const RING = { outer: 200, middle: 156, inner: 112 }

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.void },

  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.void,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  errorText: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Colors.texto,
    opacity: 0.6,
  },
  backLink: { paddingVertical: 8 },
  backLinkText: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.sistema,
    opacity: 0.5,
  },

  // Spine
  spine: {
    position: 'absolute',
    right: 14,
    top: '50%',
    transform: [{ translateY: -30 }],
    gap: 6,
    alignItems: 'center',
  },
  spineDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(0,255,136,0.2)',
  },
  spineDotActive: {
    width: 4,
    height: 12,
    borderRadius: 2,
    backgroundColor: Colors.accion,
  },

  // Chapters — height injected as inline style
  chapter: {
    backgroundColor: Colors.void,
    paddingHorizontal: 28,
    paddingTop: 80,
    paddingBottom: 120,
    justifyContent: 'center',
    gap: 20,
  },
  chapterScanLock: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000',
    paddingBottom: 120,
  },
  chapterLabel: {
    fontFamily: Fonts.displayBold,
    fontSize: 9,
    color: Colors.sistema,
    letterSpacing: 0.2,
    opacity: 0.7,
    textTransform: 'uppercase',
  },

  // Confidence badge
  confidenceBadge: {
    backgroundColor: Colors.accion,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 5,
    marginBottom: 8,
  },
  confidenceText: {
    fontFamily: Fonts.display,
    fontSize: 13,
    color: '#fff',
    letterSpacing: 1,
  },

  // Scan lock rings
  scanRingOuter: {
    width: RING.outer,
    height: RING.outer,
    borderRadius: RING.outer / 2,
    borderWidth: 1,
    borderColor: 'rgba(0,255,136,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanRingMiddle: {
    width: RING.middle,
    height: RING.middle,
    borderRadius: RING.middle / 2,
    borderWidth: 1,
    borderColor: 'rgba(0,255,136,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanRingInner: {
    width: RING.inner,
    height: RING.inner,
    borderRadius: RING.inner / 2,
    borderWidth: 1.5,
    borderColor: Colors.sistema,
    backgroundColor: 'rgba(0,255,136,0.06)',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackEmoji: {
    fontSize: 40,
    textAlign: 'center',
  },

  speciesName: {
    fontFamily: Fonts.serifItalic,
    fontSize: 26,
    color: Colors.sistema,
    textAlign: 'center',
    lineHeight: 34,
  },

  // Trait badges row
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  traitBadge: {
    borderWidth: 1,
    borderColor: Colors.sistemaBorder,
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  traitBadgeText: {
    fontFamily: Fonts.displayBold,
    fontSize: 9,
    color: Colors.sistema,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },

  swipeHint: {
    fontFamily: Fonts.bodyLight,
    fontSize: 11,
    color: Colors.texto,
    opacity: 0.3,
    textAlign: 'center',
    marginTop: 4,
  },

  // Metrics grid
  metricsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  metricCell: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    backgroundColor: Colors.void,
    gap: 6,
  },
  metricValue: {
    fontFamily: Fonts.display,
    fontSize: 28,
    letterSpacing: 0,
  },
  metricKey: {
    fontFamily: Fonts.bodyLight,
    fontSize: 10,
    color: Colors.texto,
    opacity: 0.5,
  },

  // Narrative
  narrativeText: {
    fontFamily: Fonts.serifItalic,
    fontSize: 16,
    color: Colors.texto,
    lineHeight: 28,
    opacity: 0.9,
    borderLeftWidth: 2,
    borderLeftColor: Colors.accionBorder,
    paddingLeft: 14,
  },
  audioWrap: {
    marginTop: 4,
  },

  // RAG sources
  ragTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  ragTag: {
    backgroundColor: Colors.void,
    borderWidth: 1,
    borderColor: Colors.sistemaBorder,
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  ragTagText: {
    fontFamily: Fonts.displayBold,
    fontSize: 9,
    color: Colors.sistema,
    opacity: 0.7,
    letterSpacing: 0.1,
    textTransform: 'uppercase',
  },
  homeBtn: {
    alignSelf: 'center',
    paddingVertical: 10,
  },
  homeBtnText: {
    fontFamily: Fonts.body,
    fontSize: 11,
    color: Colors.texto,
    opacity: 0.4,
    letterSpacing: 1,
  },
})
