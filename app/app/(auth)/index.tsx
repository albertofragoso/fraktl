import { useEffect, useRef, useState } from 'react'
import {
  View, Text, Pressable, StyleSheet, Animated, Easing, ActivityIndicator,
} from 'react-native'
import * as WebBrowser from 'expo-web-browser'
import * as AuthSession from 'expo-auth-session'
import { supabase } from '../../lib/supabase'
import { Colors, Fonts } from '../../constants/theme'

WebBrowser.maybeCompleteAuthSession()
const redirectUri = AuthSession.makeRedirectUri({ scheme: 'fraktl' })

export default function AuthScreen() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const logoOpacity = useRef(new Animated.Value(0)).current
  const logoY      = useRef(new Animated.Value(-28)).current
  const tagOpacity = useRef(new Animated.Value(0)).current
  const tagY       = useRef(new Animated.Value(10)).current
  const ctaOpacity = useRef(new Animated.Value(0)).current
  const ctaY       = useRef(new Animated.Value(24)).current
  const termsOpacity = useRef(new Animated.Value(0)).current
  const glowOpacity  = useRef(new Animated.Value(0)).current

  useEffect(() => {
    const easeOut = Easing.out(Easing.cubic)
    const easeQuad = Easing.out(Easing.quad)

    Animated.timing(logoOpacity, { toValue: 1, duration: 600, delay: 400, easing: easeOut, useNativeDriver: true }).start()
    Animated.timing(logoY,      { toValue: 0, duration: 600, delay: 400, easing: easeOut, useNativeDriver: true }).start()

    Animated.timing(tagOpacity, { toValue: 1, duration: 500, delay: 700, easing: easeQuad, useNativeDriver: true }).start()
    Animated.timing(tagY,       { toValue: 0, duration: 500, delay: 700, easing: easeQuad, useNativeDriver: true }).start()

    Animated.timing(ctaOpacity, { toValue: 1, duration: 400, delay: 1000, useNativeDriver: true }).start()
    Animated.timing(ctaY,       { toValue: 0, duration: 400, delay: 1000, easing: Easing.out(Easing.back(1.2)), useNativeDriver: true }).start()

    Animated.timing(termsOpacity, { toValue: 0.4, duration: 300, delay: 1150, useNativeDriver: true }).start()

    const glow = Animated.loop(
      Animated.sequence([
        Animated.timing(glowOpacity, { toValue: 0.7, duration: 2200, delay: 1200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(glowOpacity, { toValue: 0.2, duration: 2200,             easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    )
    glow.start()
    return () => glow.stop()
  }, [])

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
    } catch (e: any) {
      setError('No se pudo conectar. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={styles.container}>
      {/* Hero background — gradient placeholder (swap for ImageBackground + auth-hero.webp when asset is ready) */}
      <View style={styles.heroBg} />
      <View style={styles.heroOverlay} />

      {/* Glow orb behind logo */}
      <Animated.View style={[styles.glow, { opacity: glowOpacity }]} />

      <View style={styles.content}>
        {/* Logo + tagline section */}
        <View style={styles.logoSection}>
          <Animated.View style={{ opacity: logoOpacity, transform: [{ translateY: logoY }] }}>
            <Text style={styles.logo}>fraktl</Text>
          </Animated.View>

          <Animated.View style={{ opacity: tagOpacity, transform: [{ translateY: tagY }] }}>
            <Text style={styles.tagline}>
              {'Cada árbol es un texto.\nAprende a leerlos.'}
            </Text>
          </Animated.View>
        </View>

        {/* CTA section */}
        <View style={styles.ctaSection}>
          {error != null && <Text style={styles.errorText}>{error}</Text>}

          <Animated.View style={{ opacity: ctaOpacity, transform: [{ translateY: ctaY }] }}>
            <Pressable
              style={({ pressed }) => [styles.googleBtn, pressed && styles.googleBtnPressed]}
              onPress={handleGoogleSignIn}
              disabled={loading}
              accessibilityRole="button"
              accessibilityLabel="Continuar con Google"
            >
              {loading
                ? <ActivityIndicator color={Colors.void} size="small" />
                : <Text style={styles.googleBtnText}>Continuar con Google</Text>
              }
            </Pressable>
          </Animated.View>

          <Animated.Text style={[styles.terms, { opacity: termsOpacity }]}>
            Al continuar aceptas los Términos de Uso
          </Animated.Text>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.void,
  },
  heroBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0f2018',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(8,16,10,0.55)',
  },
  glow: {
    position: 'absolute',
    top: '22%',
    alignSelf: 'center',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: Colors.sistema,
    opacity: 0,
  },
  content: {
    flex: 1,
    paddingHorizontal: 32,
    justifyContent: 'space-between',
    paddingTop: 100,
    paddingBottom: 52,
  },
  logoSection: {
    gap: 20,
  },
  logo: {
    fontFamily: Fonts.display,
    fontSize: 42,
    color: Colors.sistema,
    letterSpacing: 2,
  },
  tagline: {
    fontFamily: Fonts.serifItalic,
    fontSize: 18,
    color: Colors.texto,
    lineHeight: 28,
    opacity: 0.85,
  },
  ctaSection: {
    gap: 12,
  },
  errorText: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: '#ff5555',
    textAlign: 'center',
  },
  googleBtn: {
    backgroundColor: Colors.texto,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  googleBtnPressed: {
    backgroundColor: 'rgba(245,234,208,0.85)',
  },
  googleBtnText: {
    fontFamily: Fonts.displayBold,
    fontSize: 14,
    color: Colors.void,
    letterSpacing: 0.3,
  },
  terms: {
    fontFamily: Fonts.bodyLight,
    fontSize: 10,
    color: Colors.texto,
    textAlign: 'center',
  },
})
