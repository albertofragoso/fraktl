import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import {
  View,
  Text,
  Dimensions,
  StyleSheet,
  Pressable,
  Image,
  ActivityIndicator,
  TouchableWithoutFeedback,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
  useDerivedValue,
  useAnimatedStyle,
  useAnimatedReaction,
  interpolate,
  clamp,
  runOnJS,
  withTiming,
  withRepeat,
  withSequence,
  cancelAnimation,
  useReducedMotion,
  SharedValue,
} from 'react-native-reanimated'
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
  // rag_sources not persisted in scans table yet (no DB column) — treated as optional
  rag_sources?: string[]
}

type Chapter =
  | { type: 'scan-lock'; scanData: ScanData }
  | { type: 'metrics'; scanData: ScanData }
  | { type: 'narrative'; narrative: string; audioUrl: string | null }
  | { type: 'rag'; sources: string[] }

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

export function normalizeFibonacciAlignment(raw: string): 'alta' | 'media' | 'baja' {
  const normalized = raw.toLowerCase().trim()
  if (['alta', 'high', 'alto', 'muy alta'].includes(normalized)) return 'alta'
  if (['baja', 'low', 'bajo', 'muy baja'].includes(normalized)) return 'baja'
  return 'media'
}

const FIB_WIDTHS: Record<'alta' | 'media' | 'baja', number> = {
  alta: 0.85,
  media: 0.5,
  baja: 0.2,
}

// ---------------------------------------------------------------------------
// Spine constants
// ---------------------------------------------------------------------------

const SPINE_DOT_HEIGHT = 6
const SPINE_DOT_GAP = 10
const SPINE_STEP = SPINE_DOT_HEIGHT + SPINE_DOT_GAP // 16px per chapter

// ---------------------------------------------------------------------------
// ChapterWrapper — exit fade + scale + entry scale
// ---------------------------------------------------------------------------

function ChapterWrapper({
  index,
  scrollY,
  screenH,
  isReducedMotion,
  children,
}: {
  index: number
  scrollY: SharedValue<number>
  screenH: number
  isReducedMotion: boolean
  children: React.ReactNode
}) {
  const animatedStyle = useAnimatedStyle(() => {
    if (isReducedMotion) return {}

    const exitProgress = clamp((scrollY.value - screenH * index) / screenH, 0, 1)
    const entryProgress = clamp(
      (scrollY.value - screenH * (index - 1)) / screenH,
      0,
      1
    )

    const opacity = interpolate(exitProgress, [0, 0.3, 1], [1, 1, 0.3])
    const exitScale = interpolate(exitProgress, [0, 0.3, 1], [1, 1, 0.96])
    const entryScale =
      index > 0 ? interpolate(entryProgress, [0, 1], [0.94, 1.0]) : 1
    const scale = Math.min(exitScale, entryScale)

    return { opacity, transform: [{ scale }] }
  })

  return (
    <Animated.View style={[{ flex: 1 }, animatedStyle]}>
      {children}
    </Animated.View>
  )
}

// ---------------------------------------------------------------------------
// Ch2 — Metrics Chapter (animated)
// ---------------------------------------------------------------------------

function Ch2Metrics({
  scanData,
  screenH,
  scrollY,
}: {
  scanData: ScanData
  screenH: number
  scrollY: ReturnType<typeof useSharedValue<number>>
}) {
  // --- Derived progress (0→1 as Ch2 scrolls into view) ---
  const ch2Progress = useDerivedValue(() =>
    clamp((scrollY.value - screenH) / (screenH * 0.6), 0, 1),
    [screenH]
  )

  // --- NaN-safe symmetry number ---
  const symmetryNum = useMemo(() => {
    const parsed = parseFloat(String(scanData?.symmetry_index ?? '0'))
    return isNaN(parsed) ? 0 : Math.min(Math.max(parsed, 0), 1)
  }, [scanData])

  // --- Animated symmetry display value ---
  const displayedSymmetry = useDerivedValue(() =>
    interpolate(ch2Progress.value, [0, 1], [0, symmetryNum]),
    [symmetryNum]
  )

  // Use runOnJS to push display value to RN state
  // Init to '0.00' — useAnimatedReaction drives from 0 on mount, avoids one-frame flash
  const [symmetryDisplay, setSymmetryDisplay] = useState('0.00')
  useAnimatedReaction(
    () => displayedSymmetry.value,
    (val) => runOnJS(setSymmetryDisplay)(val.toFixed(2)),
    [displayedSymmetry]
  )

  // --- Fibonacci bar ---
  const fibNorm = useMemo(
    () => normalizeFibonacciAlignment(scanData?.fibonacci_alignment ?? 'media'),
    [scanData]
  )
  const fibFill = useDerivedValue(() =>
    interpolate(ch2Progress.value, [0, 1], [0, FIB_WIDTHS[fibNorm]]),
    [fibNorm]
  )
  const fibBarStyle = useAnimatedStyle(() => ({
    width: `${fibFill.value * 100}%`,
  }))

  // --- Confidence bar ---
  const confFill = useDerivedValue(() =>
    interpolate(ch2Progress.value, [0, 1], [0, scanData?.confidence ?? 0]),
    [scanData?.confidence]
  )
  const confBarStyle = useAnimatedStyle(() => ({
    width: `${confFill.value * 100}%`,
  }))

  return (
    <View
      style={[styles.chapter, styles.chapterMetrics, { height: screenH }]}
      testID="ch2-metrics"
    >
      {/* Chapter label */}
      <Text style={styles.chapterLabel}>ANÁLISIS ESTRUCTURAL</Text>

      {/* Top section: ring + bar stats */}
      <View style={styles.metricsTop}>
        {/* Symmetry ring */}
        <View style={styles.symRingOuter} testID="symmetry-ring">
          <View style={styles.symRingInner}>
            <Text style={styles.symValue}>{symmetryDisplay}</Text>
            <Text style={styles.symLabel}>SIMETRÍA</Text>
          </View>
        </View>

        {/* Bar stats */}
        <View style={styles.barStats}>
          {/* Fibonacci bar */}
          <View style={styles.barRow}>
            <Text style={styles.barLabel}>Fibonacci</Text>
            <Text style={styles.barTag}>{fibNorm}</Text>
          </View>
          <View style={styles.barTrack} testID="fibonacci-bar-track">
            <Animated.View style={[styles.barFillSistema, fibBarStyle]} />
          </View>

          {/* Confidence bar */}
          <View style={[styles.barRow, { marginTop: 16 }]}>
            <Text style={styles.barLabel}>Confianza</Text>
            <Text style={styles.barTag}>
              {Math.round((scanData?.confidence ?? 0) * 100)}%
            </Text>
          </View>
          <View style={styles.barTrack} testID="confidence-bar-track">
            <Animated.View style={[styles.barFillAccion, confBarStyle]} />
          </View>
        </View>
      </View>

      {/* Trait list */}
      <View style={styles.traitList}>
        <TraitRow label="Edad estimada" value={scanData?.age_estimate ?? '—'} />
        <TraitRow label="Corteza" value={scanData?.bark_type ?? '—'} />
        <TraitRow label="Ramificación" value={scanData?.branching_pattern ?? '—'} />
      </View>

      <Text style={styles.swipeHint}>↓ desliza</Text>
      <FloatingTabBar />
    </View>
  )
}

function TraitRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.traitRow}>
      <Text style={styles.traitLabel}>{label}</Text>
      <Text style={styles.traitValue}>{value}</Text>
    </View>
  )
}

// ---------------------------------------------------------------------------
// Ch3 — Narrative chapter with typewriter reveal
// ---------------------------------------------------------------------------

function Ch3Narrative({
  narrative,
  audioUrl,
  screenH,
  scrollY,
}: {
  narrative: string
  audioUrl: string | null
  screenH: number
  scrollY: ReturnType<typeof useSharedValue<number>>
}) {
  const [typedText, setTypedText] = useState('')
  const [typingComplete, setTypingComplete] = useState(false)
  const audioOpacity = useSharedValue(0)
  const cursorOpacity = useSharedValue(1)
  const ch3HasTriggered = useRef(false)
  const completedRef = useRef(false)
  const typewriterInterval = useRef<ReturnType<typeof setInterval> | null>(null)

  const onTypingComplete = useCallback(() => {
    completedRef.current = true
    setTypingComplete(true)
    audioOpacity.value = withTiming(1, { duration: 300 })
  }, [audioOpacity])

  const ch3Progress = useDerivedValue(
    () => clamp((scrollY.value - screenH * 2) / (screenH * 0.6), 0, 1),
    [screenH]
  )

  function startTypewriter() {
    if (ch3HasTriggered.current) return
    ch3HasTriggered.current = true

    // Cursor blink
    cursorOpacity.value = withRepeat(
      withSequence(
        withTiming(0, { duration: 400 }),
        withTiming(1, { duration: 400 })
      ),
      -1,
      false
    )

    let i = 0
    typewriterInterval.current = setInterval(() => {
      i++
      setTypedText(narrative.slice(0, i))
      if (i >= narrative.length) {
        clearInterval(typewriterInterval.current!)
        typewriterInterval.current = null
        onTypingComplete()
        cancelAnimation(cursorOpacity)
        cursorOpacity.value = withTiming(0, { duration: 200 })
      }
    }, 22)
  }

  function skipTypewriter() {
    if (completedRef.current) return  // synchronous ref, never stale
    if (typewriterInterval.current) {
      clearInterval(typewriterInterval.current)
      typewriterInterval.current = null
    }
    setTypedText(narrative)
    onTypingComplete()
    cancelAnimation(cursorOpacity)
    cursorOpacity.value = withTiming(0, { duration: 200 })
  }

  useAnimatedReaction(
    () => ch3Progress.value > 0.8,
    (isReady, wasReady) => {
      if (isReady && !wasReady && !ch3HasTriggered.current) {
        runOnJS(startTypewriter)()
      }
    }
  )

  useEffect(() => {
    return () => {
      if (typewriterInterval.current) clearInterval(typewriterInterval.current)
    }
  }, [])

  const cursorStyle = useAnimatedStyle(() => ({
    opacity: cursorOpacity.value,
  }))

  const audioPlayerStyle = useAnimatedStyle(() => ({
    opacity: audioOpacity.value,
  }))

  return (
    <TouchableWithoutFeedback onPress={skipTypewriter} testID="ch3-tap-area">
      <View
        style={[styles.chapter, styles.chapterNarrative, { height: screenH }]}
        testID="ch3-narrative"
      >
        <Text style={styles.chapterLabel}>INTERPRETACIÓN</Text>

        <View style={styles.narrativeBlock}>
          <Text style={styles.narrativeText}>
            {typedText}
            <Animated.Text style={[styles.cursor, cursorStyle]}>|</Animated.Text>
          </Text>
        </View>

        {audioUrl && (
          <Animated.View
            style={[styles.audioWrap, audioPlayerStyle]}
            testID="ch3-audio-wrap"
          >
            <AudioPlayer url={audioUrl} />
          </Animated.View>
        )}

        <FloatingTabBar />
      </View>
    </TouchableWithoutFeedback>
  )
}

// ---------------------------------------------------------------------------
// Root screen
// ---------------------------------------------------------------------------

export default function ResultScreen() {
  const router = useRouter()
  const { bottom } = useSafeAreaInsets()
  const [scanData, setScanData] = useState<ScanData | null>(null)
  const [loading, setLoading] = useState(true)
  const screenH = useRef(Dimensions?.get?.('window')?.height ?? 844).current
  const isReducedMotion = useReducedMotion()
  const tabBarPadding = 60 + bottom  // FloatingTabBar pill (~52px) + margin + safe area

  const { scan_id } = useLocalSearchParams<{ scan_id: string }>()

  // Shared value for scroll-driven animations
  const scrollY = useSharedValue(0)
  const scrollHandler = useAnimatedScrollHandler((e) => {
    scrollY.value = e.contentOffset.y
  })

  // --- Animation 3: Spine indicator fluid slide ---
  const spineY = useDerivedValue(
    () =>
      interpolate(
        scrollY.value / screenH,
        [0, 1, 2, 3],
        [0, SPINE_STEP, SPINE_STEP * 2, SPINE_STEP * 3]
      ),
    [screenH]
  )
  const spineStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: spineY.value }],
  }))

  // --- Animation 4: Background color lerp (void ↔ surface sawtooth) ---
  const bgSurfaceOpacity = useDerivedValue(() => {
    if (isReducedMotion) return 0
    const pos = scrollY.value / screenH
    const mod = pos % 2
    return clamp(mod <= 1 ? mod : 2 - mod, 0, 1)
  }, [screenH])

  const bgSurfaceStyle = useAnimatedStyle(() => ({
    opacity: bgSurfaceOpacity.value,
  }))

  // --- Animation 1: Photo parallax (Ch1 image only, bounded to ring) ---
  const PARALLAX_MAX = 40  // pixels, bounded by ring overflow

  const photoParallaxY = useDerivedValue(() => {
    if (isReducedMotion) return 0
    return interpolate(
      clamp(scrollY.value / screenH, 0, 1),
      [0, 1],
      [0, -PARALLAX_MAX]
    )
  }, [screenH])

  const photoParallaxStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: photoParallaxY.value }],
  }))

  useEffect(() => {
    if (!scan_id) {
      setLoading(false)
      return
    }
    // Dev bypass: resolve dev-* IDs from local fixtures without hitting the API
    if (__DEV__ && String(scan_id).startsWith('dev-')) {
      import('../../dev/fixtures').then(({ DEV_SCANS }) => {
        const found = DEV_SCANS.find((s) => s.id === scan_id)
        if (found) {
          setScanData({
            id: found.id,
            species: found.species,
            symmetry_index: found.symmetry_index,
            fibonacci_alignment: found.fibonacci_alignment,
            narrative: found.narrative,
            audio_url: found.audio_url || null,
            image_url: found.image_url || null,
            age_estimate: (found as any).age_estimate ?? '~80 años',
            bark_type: (found as any).bark_type ?? 'rugosa',
            branching_pattern: (found as any).branching_pattern ?? 'alterna',
            confidence: (found as any).confidence ?? 0.88,
            scanned_at: found.scanned_at,
            rag_sources: (found as any).rag_sources,
          })
        }
        setLoading(false)
      })
      return
    }
    async function fetchScan() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()
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
        <ActivityIndicator
          testID="activity-indicator"
          size="large"
          color={Colors.sistema}
        />
      </View>
    )
  }

  if (!scanData) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>No se pudo cargar el escaneo.</Text>
        <Pressable
          onPress={() => router.back()}
          style={styles.backLink}
        >
          <Text style={styles.backLinkText}>Volver</Text>
        </Pressable>
      </View>
    )
  }

  const ragList: string[] = scanData?.rag_sources ?? []

  const chapters: Chapter[] = [
    { type: 'scan-lock', scanData },
    { type: 'metrics', scanData },
    {
      type: 'narrative',
      narrative: scanData.narrative ?? '',
      audioUrl: scanData.audio_url ?? null,
    },
    { type: 'rag', sources: ragList },
  ]

  return (
    <View style={[styles.root, { backgroundColor: Colors.void }]}>
      {/* Animation 4: surface overlay fades in/out between chapters */}
      <Animated.View
        style={[StyleSheet.absoluteFill, { backgroundColor: Colors.surface }, bgSurfaceStyle]}
        pointerEvents="none"
      />

      <Animated.FlatList
        testID="result-flatlist"
        data={chapters}
        keyExtractor={(_, i) => String(i)}
        renderItem={({ item, index }) => (
          <ChapterWrapper
            index={index}
            scrollY={scrollY}
            screenH={screenH}
            isReducedMotion={isReducedMotion}
          >
            {renderChapter(
              item,
              router,
              screenH,
              scrollY,
              index,
              photoParallaxStyle
            )}
          </ChapterWrapper>
        )}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={scrollHandler}
        contentContainerStyle={{ paddingBottom: tabBarPadding }}
        getItemLayout={(_, index) => ({
          length: screenH,
          offset: screenH * index,
          index,
        })}
      />

      {/* Animation 3: Spine indicator — fluid animated dot */}
      <View style={styles.spine} pointerEvents="none">
        {[0, 1, 2, 3].map((i) => (
          <View key={i} style={styles.spineDot} />
        ))}
        <Animated.View style={[styles.spineDotActive, styles.spineAbsolute, spineStyle]} />
      </View>
    </View>
  )
}

// ---------------------------------------------------------------------------
// Chapter renderer
// ---------------------------------------------------------------------------

function renderChapter(
  chapter: Chapter,
  router: ReturnType<typeof useRouter>,
  screenH: number,
  scrollY: ReturnType<typeof useSharedValue<number>>,
  _index: number,
  photoParallaxStyle?: ReturnType<typeof useAnimatedStyle>
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
        <View
          style={[styles.chapter, styles.chapterScanLock, chapterStyle]}
        >
          {/* Confidence badge */}
          <View style={styles.confidenceBadge}>
            <Text style={styles.confidenceText}>{confidencePct}%</Text>
          </View>

          {/* Ring structure */}
          <View style={styles.scanRingOuter}>
            <View style={styles.scanRingMiddle}>
              {/* Animation 1: only the image shifts; ring border stays fixed */}
              <View style={styles.scanRingInner}>
                {scanData.image_url ? (
                  <Animated.View style={[StyleSheet.absoluteFill, photoParallaxStyle]}>
                    <Image
                      source={{ uri: scanData.image_url }}
                      style={StyleSheet.absoluteFill}
                      resizeMode="cover"
                      testID="tree-image"
                    />
                  </Animated.View>
                ) : (
                  <Text style={styles.fallbackEmoji}>🌳</Text>
                )}
              </View>
            </View>
          </View>

          {/* Species name */}
          <Text style={styles.speciesName}>
            {scanData.species ?? 'Especie desconocida'}
          </Text>

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
        <Ch2Metrics
          key="ch2-metrics"
          scanData={chapter.scanData}
          screenH={screenH}
          scrollY={scrollY}
        />
      )

    case 'narrative':
      return (
        <Ch3Narrative
          key="ch3-narrative"
          narrative={chapter.narrative}
          audioUrl={chapter.audioUrl}
          screenH={screenH}
          scrollY={scrollY}
        />
      )

    case 'rag':
      return (
        <View
          testID="ch4-rag"
          style={[
            styles.chapter,
            { backgroundColor: Colors.surface },
            chapterStyle,
          ]}
        >
          <Text style={styles.chapterLabel}>FUENTES DEL CORPUS</Text>
          {chapter.sources.length > 0 ? (
            <View style={styles.ragList} testID="ch4-rag-list">
              {chapter.sources.map((src, i) => (
                <View key={`${i}-${src}`} style={styles.ragRow}>
                  <Text style={styles.ragNum}>{String(i + 1).padStart(2, '0')}</Text>
                  <Text style={styles.ragSrc}>{src}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.emptyRag} testID="ch4-empty-state">
              No hay fuentes disponibles
            </Text>
          )}
          <FloatingTabBar />
        </View>
      )
  }
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const RING = { outer: 200, middle: 156, inner: 112 }
const SYM_RING = { outer: 100, inner: 80 }

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
    right: 16,
    top: '50%',
    marginTop: -(SPINE_STEP * 1.5),
    gap: SPINE_DOT_GAP,
    alignItems: 'center',
  },
  spineDot: {
    width: 6,
    height: SPINE_DOT_HEIGHT,
    borderRadius: 3,
    backgroundColor: 'rgba(245,234,208,0.2)',
  },
  spineDotActive: {
    width: 6,
    height: SPINE_DOT_HEIGHT,
    borderRadius: 3,
    backgroundColor: Colors.sistema,
  },
  spineAbsolute: {
    position: 'absolute',
    top: 0,
    right: 0,
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
  chapterMetrics: {
    backgroundColor: Colors.surface,
    gap: 24,
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

  // Trait badges row (Ch1)
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

  // Ch2 — metrics top section (ring + bars side-by-side)
  metricsTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },

  // Symmetry ring
  symRingOuter: {
    width: SYM_RING.outer,
    height: SYM_RING.outer,
    borderRadius: SYM_RING.outer / 2,
    borderWidth: 1,
    borderColor: Colors.sistemaBorder,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  symRingInner: {
    width: SYM_RING.inner,
    height: SYM_RING.inner,
    borderRadius: SYM_RING.inner / 2,
    borderWidth: 1.5,
    borderColor: Colors.sistema,
    backgroundColor: 'rgba(0,255,136,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  symValue: {
    fontFamily: Fonts.display,
    fontSize: 18,
    color: Colors.sistema,
    letterSpacing: 0,
  },
  symLabel: {
    fontFamily: Fonts.displayBold,
    fontSize: 7,
    color: Colors.sistema,
    opacity: 0.6,
    letterSpacing: 0.4,
  },

  // Bar stats (right side)
  barStats: {
    flex: 1,
  },
  barRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 6,
  },
  barLabel: {
    fontFamily: Fonts.bodyLight,
    fontSize: 11,
    color: Colors.texto,
    opacity: 0.6,
  },
  barTag: {
    fontFamily: Fonts.displayBold,
    fontSize: 9,
    color: Colors.sistema,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  barTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(245,234,208,0.08)',
    overflow: 'hidden',
  },
  barFillSistema: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: Colors.sistema,
  },
  barFillAccion: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: Colors.accion,
  },

  // Trait list (Ch2 bottom rows)
  traitList: {
    gap: 0,
    borderTopWidth: 1,
    borderTopColor: Colors.sistemaBorder,
    paddingTop: 16,
  },
  traitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(245,234,208,0.06)',
  },
  traitLabel: {
    fontFamily: Fonts.bodyLight,
    fontSize: 12,
    color: Colors.texto,
    opacity: 0.5,
  },
  traitValue: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.texto,
    opacity: 0.9,
  },

  // Ch3 — Narrative
  chapterNarrative: {
    justifyContent: 'flex-start',
    paddingTop: 80,
  },
  narrativeBlock: {
    borderLeftWidth: 2,
    borderLeftColor: Colors.accionBorder,
    paddingLeft: 14,
    flex: 1,
  },
  narrativeText: {
    fontFamily: Fonts.serif,
    fontSize: 16,
    color: Colors.texto,
    lineHeight: 28,
    opacity: 0.9,
  },
  cursor: {
    fontFamily: Fonts.serif,
    fontSize: 16,
    color: Colors.sistema,
    lineHeight: 28,
  },
  audioWrap: {
    marginTop: 4,
  },

  // RAG sources — Ch4 numbered list
  ragList: {
    flex: 1,
    gap: 12,
    marginTop: 16,
  },
  ragRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  ragNum: {
    fontFamily: Fonts.display,
    fontSize: 11,
    color: Colors.sistema,
    opacity: 0.5,
    minWidth: 24,
  },
  ragSrc: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: Colors.texto,
    opacity: 0.8,
    flex: 1,
    lineHeight: 18,
  },
  emptyRag: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: Colors.texto,
    opacity: 0.4,
    fontStyle: 'italic',
    marginTop: 16,
  },
})
