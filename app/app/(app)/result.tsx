import { useEffect, useRef } from 'react'
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Animated,
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { AudioPlayer } from '../../components/AudioPlayer'
import { Colors, Fonts } from '../../constants/theme'

export default function ResultScreen() {
  const router = useRouter()
  const fadeIn = useRef(new Animated.Value(0)).current
  const slideUp = useRef(new Animated.Value(24)).current

  const { species, symmetry_index, fibonacci_alignment, narrative, audio_url } =
    useLocalSearchParams<{
      species: string
      symmetry_index: string
      fibonacci_alignment: string
      narrative: string
      audio_url: string
    }>()

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideUp, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start()
  }, [])

  const symmetry = symmetry_index ? Number(symmetry_index).toFixed(2) : '—'
  const fibonacci = fibonacci_alignment ?? '—'
  const hasAudio = audio_url != null && audio_url !== 'null' && audio_url.length > 0

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Animated.View style={{ opacity: fadeIn, transform: [{ translateY: slideUp }] }}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTag}>// ANÁLISIS COMPLETADO</Text>
        </View>

        {/* Species title */}
        <View style={styles.speciesBlock}>
          <Text style={styles.speciesLabel}>ESPECIE IDENTIFICADA</Text>
          <Text style={styles.speciesName}>{species ?? 'Desconocida'}</Text>
          <View style={styles.speciesDivider} />
        </View>

        {/* Biosemiotic metrics */}
        <View style={styles.metricsRow}>
          <View style={styles.metricCell}>
            <Text style={styles.metricValue}>{symmetry}</Text>
            <Text style={styles.metricLabel}>SIMETRÍA</Text>
          </View>
          <View style={styles.metricSep} />
          <View style={styles.metricCell}>
            <Text style={styles.metricValue}>{fibonacci}</Text>
            <Text style={styles.metricLabel}>FIBONACCI</Text>
          </View>
        </View>

        {/* Narrative */}
        {narrative ? (
          <View style={styles.narrativeBlock}>
            <Text style={styles.narrativeTag}>// INTERPRETACIÓN BIOSEMIÓTICA</Text>
            <Text style={styles.narrativeText}>{narrative}</Text>
          </View>
        ) : null}

        {/* Audio player */}
        {hasAudio ? (
          <View style={styles.audioBlock}>
            <AudioPlayer url={audio_url} />
          </View>
        ) : null}

        {/* Actions */}
        <View style={styles.actions}>
          <Pressable
            style={({ pressed }) => [styles.newScanBtn, pressed && styles.newScanBtnPressed]}
            onPress={() => router.replace('/(app)/scan')}
            accessibilityRole="button"
            accessibilityLabel="Nuevo escaneo"
          >
            <Text style={styles.newScanText}>NUEVO ESCANEO</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.homeBtn, pressed && { opacity: 0.6 }]}
            onPress={() => router.replace('/(app)')}
            accessibilityRole="button"
          >
            <Text style={styles.homeBtnText}>← INICIO</Text>
          </Pressable>
        </View>
      </Animated.View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: Colors.void,
  },
  content: {
    padding: 24,
    paddingTop: 60,
    paddingBottom: 48,
    gap: 28,
  },

  header: {
    marginBottom: 4,
  },
  headerTag: {
    fontFamily: Fonts.body,
    fontSize: 9,
    color: Colors.neon,
    opacity: 0.4,
    letterSpacing: 2,
  },

  // Species
  speciesBlock: {
    gap: 6,
  },
  speciesLabel: {
    fontFamily: Fonts.body,
    fontSize: 8,
    color: Colors.neon,
    opacity: 0.35,
    letterSpacing: 3,
  },
  speciesName: {
    fontFamily: Fonts.display,
    fontSize: 30,
    color: Colors.white,
    letterSpacing: 0,
    lineHeight: 36,
  },
  speciesDivider: {
    height: 1,
    backgroundColor: Colors.borderNeon,
    marginTop: 10,
  },

  // Metrics
  metricsRow: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: Colors.borderNeon,
    backgroundColor: Colors.ghost,
  },
  metricCell: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
    gap: 4,
  },
  metricSep: {
    width: 1,
    backgroundColor: Colors.borderNeon,
  },
  metricValue: {
    fontFamily: Fonts.display,
    fontSize: 24,
    color: Colors.neon,
    letterSpacing: 1,
  },
  metricLabel: {
    fontFamily: Fonts.body,
    fontSize: 8,
    color: Colors.neon,
    opacity: 0.4,
    letterSpacing: 3,
  },

  // Narrative
  narrativeBlock: {
    gap: 10,
  },
  narrativeTag: {
    fontFamily: Fonts.body,
    fontSize: 9,
    color: Colors.cyan,
    opacity: 0.5,
    letterSpacing: 2,
  },
  narrativeText: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Colors.white,
    opacity: 0.75,
    lineHeight: 24,
    letterSpacing: 0.3,
  },

  // Audio
  audioBlock: {
    // wrapper gives spacing context
  },

  // Actions
  actions: {
    gap: 12,
    marginTop: 8,
  },
  newScanBtn: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: Colors.neon,
    backgroundColor: Colors.ghost,
  },
  newScanBtnPressed: {
    backgroundColor: 'rgba(0,255,136,0.18)',
  },
  newScanText: {
    fontFamily: Fonts.display,
    fontSize: 13,
    color: Colors.neon,
    letterSpacing: 4,
  },
  homeBtn: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  homeBtnText: {
    fontFamily: Fonts.body,
    fontSize: 10,
    color: Colors.neon,
    opacity: 0.35,
    letterSpacing: 2,
  },
})
