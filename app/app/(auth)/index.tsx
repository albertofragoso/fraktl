import { useEffect, useState } from 'react'
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native'
import { Video, ResizeMode } from 'expo-av'
import { LinearGradient } from 'expo-linear-gradient'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withRepeat,
  withDelay,
  withSequence,
  Easing,
  cancelAnimation,
  useReducedMotion,
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import * as WebBrowser from 'expo-web-browser'
import * as AuthSession from 'expo-auth-session'
import { supabase } from '../../lib/supabase'
import { Colors, Fonts } from '../../constants/theme'

WebBrowser.maybeCompleteAuthSession()
const redirectUri = AuthSession.makeRedirectUri({ scheme: 'fraktl' })

// Download a dark forest video from Pexels/Coverr and place at: assets/auth-bg.mp4
// Recommended search: "dark forest" "tree canopy night"
const VIDEO_SOURCE = require('../../assets/auth-bg.mp4')

function SonarRing({ delay }: { delay: number }) {
  const scale = useSharedValue(1)
  const opacity = useSharedValue(0)
  const reducedMotion = useReducedMotion()

  useEffect(() => {
    if (reducedMotion) return

    scale.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 0 }),
          withTiming(5, { duration: 3000, easing: Easing.out(Easing.quad) }),
        ),
        -1,
        false,
      ),
    )
    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(0.7, { duration: 0 }),
          withTiming(0, { duration: 3000 }),
        ),
        -1,
        false,
      ),
    )

    return () => {
      cancelAnimation(scale)
      cancelAnimation(opacity)
    }
  }, [reducedMotion])

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }))

  return <Animated.View style={[styles.ring, ringStyle]} />
}

export default function AuthScreen() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const insets = useSafeAreaInsets()
  const reducedMotion = useReducedMotion()

  // Entry values
  const logoOpacity = useSharedValue(0)
  const logoY = useSharedValue(-28)
  const tagOpacity = useSharedValue(0)
  const tagY = useSharedValue(10)
  const ctaOpacity = useSharedValue(0)
  const ctaY = useSharedValue(24)
  const termsOpacity = useSharedValue(0)

  // Scan line perpetual
  const scanProgress = useSharedValue(0)

  // Press spring
  const pressScale = useSharedValue(1)

  useEffect(() => {
    const easeOut = Easing.out(Easing.cubic)
    const easeQuad = Easing.out(Easing.quad)
    const delay = reducedMotion ? 0 : 1

    logoOpacity.value = withDelay(400 * delay, withTiming(1, { duration: 600, easing: easeOut }))
    logoY.value = withDelay(400 * delay, withTiming(0, { duration: 600, easing: easeOut }))
    tagOpacity.value = withDelay(700 * delay, withTiming(1, { duration: 500, easing: easeQuad }))
    tagY.value = withDelay(700 * delay, withTiming(0, { duration: 500, easing: easeQuad }))
    ctaOpacity.value = withDelay(1000 * delay, withTiming(1, { duration: 400 }))
    ctaY.value = withDelay(1000 * delay, withSpring(0, { damping: 18, stiffness: 120 }))
    termsOpacity.value = withDelay(1150 * delay, withTiming(0.28, { duration: 300 }))

    if (!reducedMotion) {
      scanProgress.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 1250, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration: 1250, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
      )
    }

    return () => {
      cancelAnimation(scanProgress)
    }
  }, [reducedMotion])

  // Animated styles
  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ translateY: logoY.value }],
  }))

  const tagStyle = useAnimatedStyle(() => ({
    opacity: tagOpacity.value,
    transform: [{ translateY: tagY.value }],
  }))

  const ctaStyle = useAnimatedStyle(() => ({
    opacity: ctaOpacity.value,
    transform: [{ translateY: ctaY.value }],
  }))

  const termsStyle = useAnimatedStyle(() => ({
    opacity: termsOpacity.value,
  }))

  const scanLineStyle = useAnimatedStyle(() => ({
    opacity: 0.5 + scanProgress.value * 0.5,
    transform: [{ scaleX: 0.3 + scanProgress.value * 0.7 }],
  }))

  const scanBgStyle = useAnimatedStyle(() => ({
    opacity: 0.6 + scanProgress.value * 0.4,
  }))

  const pressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressScale.value }],
  }))

  async function handleGoogleSignIn() {
    setLoading(true)
    setError(null)
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: redirectUri, skipBrowserRedirect: true },
      })
      if (error) throw error
      if (!data.url) throw new Error('No auth URL')

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUri)

      if (result.type === 'success' && result.url) {
        const hash = result.url.split('#')[1] ?? ''
        const params = new URLSearchParams(hash)
        const accessToken = params.get('access_token')
        const refreshToken = params.get('refresh_token')
        if (accessToken) {
          await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken ?? '',
          })
        }
      }
    } catch {
      setError('No se pudo conectar. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={styles.container}>
      {/* Background video — replace assets/auth-bg.mp4 with a dark forest clip from Pexels/Coverr */}
      <Video
        source={VIDEO_SOURCE}
        style={StyleSheet.absoluteFillObject}
        resizeMode={ResizeMode.COVER}
        isLooping
        isMuted
        shouldPlay
        onError={() => {}}
      />

      {/* Gradient overlay — top boosted to 0.50 for text legibility over bright video frames */}
      <LinearGradient
        colors={['rgba(8,16,10,0.50)', 'rgba(8,16,10,0.68)', '#08100a']}
        locations={[0, 0.55, 1]}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Sonar rings — pointer-events none */}
      <View style={styles.ringsWrapper} pointerEvents="none">
        <SonarRing delay={0} />
        <SonarRing delay={1000} />
        <SonarRing delay={2000} />
        <View style={styles.ringDot} />
      </View>

      <View style={[styles.content, { paddingTop: insets.top + 20 }]}>

        {/* Logo + tagline */}
        <View style={styles.logoSection}>
          <Animated.View style={logoStyle}>
            <Text style={styles.logo}>fraktl</Text>
          </Animated.View>
          <Animated.View style={tagStyle}>
            <Text style={styles.tagline}>
              {'Cada árbol es un texto.\nAprende a leerlos.'}
            </Text>
          </Animated.View>
        </View>

        {/* CTA */}
        <Animated.View style={[styles.ctaSection, ctaStyle]}>
          {error != null && <Text style={styles.errorText}>{error}</Text>}

          <Animated.View style={pressStyle}>
            <Pressable
              onPressIn={() => {
                pressScale.value = withSpring(0.97, { damping: 20, stiffness: 200 })
              }}
              onPressOut={() => {
                pressScale.value = withSpring(1, { damping: 20, stiffness: 200 })
              }}
              onPress={handleGoogleSignIn}
              disabled={loading}
              accessibilityRole="button"
              accessibilityLabel="Continuar con Google"
            >
              {/* Scan burst container */}
              <View style={styles.scanBtn}>
                <Animated.View style={[styles.scanLine, scanLineStyle]}>
                  <LinearGradient
                    colors={['transparent', Colors.accion, Colors.suave, Colors.accion, 'transparent']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={StyleSheet.absoluteFillObject}
                  />
                </Animated.View>
                <Animated.View style={[styles.scanBg, scanBgStyle]}>
                  <LinearGradient
                    colors={['rgba(255,107,0,0.10)', 'rgba(255,107,0,0.04)']}
                    style={StyleSheet.absoluteFillObject}
                  />
                </Animated.View>
                <View style={styles.scanLineBottom} />
                {loading
                  ? <ActivityIndicator color={Colors.accion} size="small" style={styles.loader} />
                  : <Text style={styles.scanBtnText}>Continuar con Google</Text>
                }
              </View>
            </Pressable>
          </Animated.View>

          <Animated.Text style={[styles.terms, termsStyle]}>
            Al continuar aceptas los Términos de Uso
          </Animated.Text>
        </Animated.View>

      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.void,
  },
  ringsWrapper: {
    position: 'absolute',
    top: '25%',
    left: '50%',
    width: 0,
    height: 0,
  },
  ring: {
    position: 'absolute',
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: 'rgba(0,255,136,0.6)',
    marginLeft: -26,
    marginTop: -26,
  },
  ringDot: {
    position: 'absolute',
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: Colors.sistema,
    marginLeft: -2.5,
    marginTop: -2.5,
    shadowColor: Colors.sistema,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 6,
    shadowOpacity: 1,
    elevation: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 32,
    paddingBottom: 44,
    justifyContent: 'space-between',
  },
  logoSection: {
    gap: 12,
  },
  logo: {
    fontFamily: Fonts.brand,
    fontSize: 46,
    color: Colors.sistema,
    letterSpacing: 3,
    lineHeight: 52,
    textShadowColor: 'rgba(8,16,10,0.75)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  tagline: {
    fontFamily: Fonts.serifItalic,
    fontSize: 13,
    color: Colors.texto,
    opacity: 0.85,
    lineHeight: 21,
    textShadowColor: 'rgba(8,16,10,0.95)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  ctaSection: {
    gap: 10,
  },
  errorText: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: '#ff5555',
    textAlign: 'center',
  },
  scanBtn: {
    overflow: 'hidden',
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  scanLine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    overflow: 'hidden',
  },
  scanBg: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  scanLineBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255,107,0,0.30)',
  },
  scanBtnText: {
    fontFamily: Fonts.brand,
    fontSize: 13,
    letterSpacing: 3.5,
    color: Colors.accion,
  },
  loader: {
    paddingVertical: 2,
  },
  terms: {
    fontFamily: Fonts.bodyLight,
    fontSize: 8,
    color: Colors.texto,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
})
