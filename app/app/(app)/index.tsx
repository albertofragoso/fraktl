import { useEffect, useRef } from 'react'
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Animated,
  ScrollView,
} from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '../../lib/supabase'
import { Colors, Fonts } from '../../constants/theme'
import { FloatingTabBar } from '../../components/FloatingTabBar'

function PulsingDot({ delay = 0 }: { delay?: number }) {
  const scale = useRef(new Animated.Value(1)).current
  const opacity = useRef(new Animated.Value(0.4)).current

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(scale, { toValue: 1.5, duration: 600, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 1, duration: 600, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(scale, { toValue: 1, duration: 600, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0.4, duration: 600, useNativeDriver: true }),
        ]),
      ])
    )
    loop.start()
    return () => loop.stop()
  }, [])

  return (
    <Animated.View style={[styles.dot, { transform: [{ scale }], opacity }]} />
  )
}

export default function HomeScreen() {
  const router = useRouter()
  const scanGlow = useRef(new Animated.Value(0.7)).current
  const lineWidth = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scanGlow, { toValue: 1, duration: 1500, useNativeDriver: true }),
        Animated.timing(scanGlow, { toValue: 0.6, duration: 1500, useNativeDriver: true }),
      ])
    ).start()

    Animated.loop(
      Animated.sequence([
        Animated.timing(lineWidth, { toValue: 1, duration: 2000, useNativeDriver: false }),
        Animated.delay(1000),
        Animated.timing(lineWidth, { toValue: 0, duration: 0, useNativeDriver: false }),
      ])
    ).start()
  }, [])

  async function handleSignOut() {
    await supabase.auth.signOut()
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.logoText}>FRAKTL</Text>
          <Text style={styles.logoSub}>// TREE BIOSEMIOTICS</Text>
        </View>
        <Pressable onPress={handleSignOut} style={({ pressed }) => [styles.signOutBtn, pressed && { opacity: 0.5 }]}>
          <Text style={styles.signOutText}>EXIT</Text>
        </Pressable>
      </View>

      {/* Animated top border */}
      <Animated.View
        style={[
          styles.headerBorder,
          { width: lineWidth.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) },
        ]}
      />

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 100 }]} showsVerticalScrollIndicator={false}>
        {/* Main CTA */}
        <View style={styles.ctaSection}>
          <View style={styles.statusRow}>
            <PulsingDot />
            <PulsingDot delay={400} />
            <PulsingDot delay={800} />
            <Text style={styles.statusText}>SISTEMA ACTIVO</Text>
          </View>

          <Text style={styles.ctaTitle}>Escanea un árbol{'\n'}y escucha su historia</Text>
          <Text style={styles.ctaDesc}>
            GPT-4o Vision · RAG Botánico · Síntesis de voz
          </Text>

          <Pressable
            style={({ pressed }) => [styles.scanBtn, pressed && styles.scanBtnPressed]}
            onPress={() => router.push('/(app)/scan')}
            accessibilityRole="button"
            accessibilityLabel="Iniciar escaneo"
          >
            <Animated.View style={[styles.scanBtnGlow, { opacity: scanGlow }]} />
            <Text style={styles.scanBtnText}>INICIAR ESCANEO</Text>
          </Pressable>
        </View>

        {/* Divider */}
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>//</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* History shortcut */}
        <Pressable
          style={({ pressed }) => [styles.historyCard, pressed && styles.historyCardPressed]}
          onPress={() => router.push('/(app)/history')}
          accessibilityRole="button"
        >
          <View style={styles.historyCardHeader}>
            <Text style={styles.historyCardTitle}>HISTORIAL</Text>
            <Text style={styles.historyCardArrow}>→</Text>
          </View>
          <Text style={styles.historyCardDesc}>
            Ver interpretaciones previas
          </Text>
        </Pressable>

        {/* Corpus info */}
        <View style={styles.infoGrid}>
          {[
            { label: 'ESPECIES', value: '9' },
            { label: 'MODELO', value: 'GPT-4o' },
            { label: 'RAG', value: 'ACTIVO' },
          ].map((item) => (
            <View key={item.label} style={styles.infoCell}>
              <Text style={styles.infoCellValue}>{item.value}</Text>
              <Text style={styles.infoCellLabel}>{item.label}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
      <FloatingTabBar />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.void,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 12,
  },
  logoText: {
    fontFamily: Fonts.display,
    fontSize: 22,
    color: Colors.sistema,
    letterSpacing: 4,
  },
  logoSub: {
    fontFamily: Fonts.body,
    fontSize: 9,
    color: Colors.sistema,
    opacity: 0.4,
    letterSpacing: 2,
    marginTop: 2,
  },
  signOutBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: Colors.sistemaBorder,
    borderRadius: 2,
  },
  signOutText: {
    fontFamily: Fonts.body,
    fontSize: 10,
    color: Colors.sistema,
    opacity: 0.6,
    letterSpacing: 2,
  },
  headerBorder: {
    height: 1,
    backgroundColor: Colors.sistema,
    opacity: 0.2,
    marginHorizontal: 24,
  },
  content: {
    padding: 24,
    paddingBottom: 40,
  },
  // CTA
  ctaSection: {
    marginTop: 32,
    marginBottom: 32,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 20,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: Colors.sistema,
  },
  statusText: {
    fontFamily: Fonts.body,
    fontSize: 9,
    color: Colors.sistema,
    opacity: 0.5,
    letterSpacing: 2,
    marginLeft: 4,
  },
  ctaTitle: {
    fontFamily: Fonts.display,
    fontSize: 28,
    color: Colors.texto,
    letterSpacing: 0,
    lineHeight: 36,
    marginBottom: 8,
  },
  ctaDesc: {
    fontFamily: Fonts.body,
    fontSize: 11,
    color: Colors.sistema,
    opacity: 0.45,
    letterSpacing: 1,
    marginBottom: 32,
  },
  scanBtn: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderWidth: 1,
    borderColor: Colors.sistema,
    backgroundColor: Colors.sistemaDim,
    borderRadius: 2,
    position: 'relative',
    overflow: 'hidden',
  },
  scanBtnPressed: {
    backgroundColor: 'rgba(0,255,136,0.18)',
  },
  scanBtnGlow: {
    position: 'absolute',
    inset: 0,
    backgroundColor: Colors.sistema,
    opacity: 0.05,
  },
  scanBtnText: {
    fontFamily: Fonts.display,
    fontSize: 14,
    color: Colors.sistema,
    letterSpacing: 4,
  },
  // Divider
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.sistemaBorder,
  },
  dividerText: {
    fontFamily: Fonts.body,
    fontSize: 10,
    color: Colors.sistema,
    opacity: 0.3,
  },
  // History card
  historyCard: {
    borderWidth: 1,
    borderColor: Colors.accionBorder,
    backgroundColor: Colors.accionDim,
    borderRadius: 2,
    padding: 16,
    marginBottom: 24,
  },
  historyCardPressed: {
    backgroundColor: Colors.accionDim,
  },
  historyCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  historyCardTitle: {
    fontFamily: Fonts.displayBold,
    fontSize: 11,
    color: Colors.suave,
    letterSpacing: 3,
  },
  historyCardArrow: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Colors.suave,
    opacity: 0.6,
  },
  historyCardDesc: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.texto,
    opacity: 0.4,
    letterSpacing: 0.5,
  },
  // Info grid
  infoGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  infoCell: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.sistemaBorder,
    backgroundColor: Colors.sistemaDim,
    borderRadius: 2,
    padding: 12,
    alignItems: 'center',
  },
  infoCellValue: {
    fontFamily: Fonts.display,
    fontSize: 18,
    color: Colors.sistema,
    letterSpacing: 1,
    marginBottom: 4,
  },
  infoCellLabel: {
    fontFamily: Fonts.body,
    fontSize: 8,
    color: Colors.sistema,
    opacity: 0.4,
    letterSpacing: 2,
  },
})
