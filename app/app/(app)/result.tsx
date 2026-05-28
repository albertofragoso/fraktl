import { useState, useRef } from 'react'
import { View, Text, FlatList, Dimensions, StyleSheet, Pressable } from 'react-native'
import type { NativeSyntheticEvent, NativeScrollEvent } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { AudioPlayer } from '../../components/AudioPlayer'
import { Colors, Fonts } from '../../constants/theme'

type Chapter =
  | { type: 'scan-lock'; species: string }
  | { type: 'metrics'; symmetry: string; fibonacci: string }
  | { type: 'narrative'; narrative: string; audioUrl: string | null }
  | { type: 'rag'; sources: string[] }

export default function ResultScreen() {
  const router = useRouter()
  const [activeChapter, setActiveChapter] = useState(0)
  const screenH = useRef(Dimensions?.get?.('window')?.height ?? 844).current

  const { species, symmetry_index, fibonacci_alignment, narrative, audio_url, rag_sources } =
    useLocalSearchParams<{
      species: string
      symmetry_index: string
      fibonacci_alignment: string
      narrative: string
      audio_url: string
      rag_sources?: string
    }>()

  const hasAudio = audio_url != null && audio_url !== 'null' && audio_url.length > 0
  const ragList = rag_sources
    ? rag_sources.split(',').map((s) => s.trim()).filter(Boolean)
    : []

  const chapters: Chapter[] = [
    {
      type: 'scan-lock',
      species: species ?? 'Especie desconocida',
    },
    {
      type: 'metrics',
      symmetry: symmetry_index ? Number(symmetry_index).toFixed(2) : '—',
      fibonacci: fibonacci_alignment ?? '—',
    },
    {
      type: 'narrative',
      narrative: narrative ?? '',
      audioUrl: hasAudio ? audio_url : null,
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
): JSX.Element {
  const chapterStyle = { height: screenH }

  switch (chapter.type) {
    case 'scan-lock':
      return (
        <View style={[styles.chapter, styles.chapterScanLock, chapterStyle]}>
          <View style={styles.scanRingOuter}>
            <View style={styles.scanRingMiddle}>
              <View style={styles.scanRingInner} />
            </View>
          </View>
          <Text style={styles.speciesName}>{chapter.species}</Text>
          <Text style={styles.swipeHint}>↓ desliza</Text>
        </View>
      )

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
          <Pressable
            style={({ pressed }) => [styles.newScanBtn, pressed && { opacity: 0.75 }]}
            onPress={() => router.replace('/(app)/scan')}
            accessibilityRole="button"
          >
            <Text style={styles.newScanText}>Nuevo escaneo</Text>
          </Pressable>
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
        </View>
      )
  }
}

const RING = { outer: 160, middle: 120, inner: 80 }

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.void },

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
    paddingBottom: 48,
    justifyContent: 'center',
    gap: 24,
  },
  chapterScanLock: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000',
  },
  chapterLabel: {
    fontFamily: Fonts.displayBold,
    fontSize: 9,
    color: Colors.sistema,
    letterSpacing: 0.2,
    opacity: 0.7,
    textTransform: 'uppercase',
  },

  // Scan lock rings
  scanRingOuter: {
    width: RING.outer,
    height: RING.outer,
    borderRadius: RING.outer / 2,
    borderWidth: 1,
    borderColor: 'rgba(0,255,136,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  scanRingMiddle: {
    width: RING.middle,
    height: RING.middle,
    borderRadius: RING.middle / 2,
    borderWidth: 1,
    borderColor: 'rgba(0,255,136,0.45)',
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
  },
  speciesName: {
    fontFamily: Fonts.serifItalic,
    fontSize: 28,
    color: Colors.sistema,
    textAlign: 'center',
    lineHeight: 36,
  },
  swipeHint: {
    fontFamily: Fonts.bodyLight,
    fontSize: 11,
    color: Colors.texto,
    opacity: 0.3,
    textAlign: 'center',
    marginTop: 8,
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
  newScanBtn: {
    borderWidth: 1,
    borderColor: Colors.sistemaBorder,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  newScanText: {
    fontFamily: Fonts.displayBold,
    fontSize: 12,
    color: Colors.sistema,
    letterSpacing: 2,
    textTransform: 'uppercase',
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
