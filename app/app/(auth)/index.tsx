import { useEffect, useRef, useState } from 'react'
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Animated,
  ActivityIndicator,
  Platform,
} from 'react-native'
import * as WebBrowser from 'expo-web-browser'
import * as AuthSession from 'expo-auth-session'
import { supabase } from '../../lib/supabase'
import { Colors, Fonts } from '../../constants/theme'

WebBrowser.maybeCompleteAuthSession()

const redirectUri = AuthSession.makeRedirectUri({ scheme: 'fraktl' })

function FraktlSigil() {
  const rotOuter = useRef(new Animated.Value(0)).current
  const rotInner = useRef(new Animated.Value(0)).current
  const pulse = useRef(new Animated.Value(0.6)).current

  useEffect(() => {
    Animated.loop(
      Animated.timing(rotOuter, { toValue: 1, duration: 20000, useNativeDriver: true })
    ).start()
    Animated.loop(
      Animated.timing(rotInner, { toValue: 1, duration: 12000, useNativeDriver: true })
    ).start()
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 2000, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.5, duration: 2000, useNativeDriver: true }),
      ])
    ).start()
  }, [])

  const spinOuter = rotOuter.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] })
  const spinInner = rotInner.interpolate({ inputRange: [0, 1], outputRange: ['360deg', '0deg'] })

  return (
    <View style={styles.sigil}>
      {/* Core glow */}
      <Animated.View style={[styles.sigilGlow, { opacity: pulse }]} />

      {/* Outer ring */}
      <Animated.View
        style={[styles.sigilRingOuter, { transform: [{ rotate: spinOuter }] }]}
      >
        {/* Rotating dot on outer ring */}
        <View style={styles.sigilDotOuter} />
      </Animated.View>

      {/* Inner ring */}
      <Animated.View
        style={[styles.sigilRingInner, { transform: [{ rotate: spinInner }] }]}
      >
        <View style={styles.sigilDotInner} />
      </Animated.View>

      {/* Tree trunk (center vertical) */}
      <View style={styles.trunk} />
      {/* Left branch */}
      <View style={[styles.branch, styles.branchLeft]} />
      {/* Right branch */}
      <View style={[styles.branch, styles.branchRight]} />
      {/* Node dot */}
      <View style={styles.nodeCenter} />
    </View>
  )
}

export default function AuthScreen() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const scanY = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scanY, { toValue: 1, duration: 4000, useNativeDriver: false }),
        Animated.timing(scanY, { toValue: 0, duration: 0, useNativeDriver: false }),
      ])
    ).start()
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
      {/* Subtle scan line */}
      <Animated.View
        style={[
          styles.scanLine,
          {
            top: scanY.interpolate({
              inputRange: [0, 1],
              outputRange: ['0%', '100%'],
            }),
          },
        ]}
      />

      <FraktlSigil />

      <Text style={styles.title}>FRAKTL</Text>
      <Text style={styles.subtitle}>// BIOSEMIOTIC TREE SCANNER</Text>

      {error != null && <Text style={styles.errorText}>{error}</Text>}

      <Pressable
        style={({ pressed }) => [styles.googleBtn, pressed && styles.googleBtnPressed]}
        onPress={handleGoogleSignIn}
        disabled={loading}
        accessibilityRole="button"
        accessibilityLabel="Iniciar sesión con Google"
      >
        {loading ? (
          <ActivityIndicator color={Colors.neon} size="small" />
        ) : (
          <Text style={styles.googleBtnText}>INICIAR CON GOOGLE</Text>
        )}
      </Pressable>

      <Text style={styles.footer}>
        {'SYS_AUTH_PROTOCOL v2.1\nBIOMETRIC_LINK: PENDING\nTREE_DB: 9 SPECIES LOADED'}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.void,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    overflow: 'hidden',
  },
  scanLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: Colors.neon,
    opacity: 0.05,
  },
  // Sigil
  sigil: {
    width: 100,
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  sigilGlow: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.neon,
    opacity: 0.08,
  },
  sigilRingOuter: {
    position: 'absolute',
    width: 92,
    height: 92,
    borderRadius: 46,
    borderWidth: 1,
    borderColor: Colors.neon,
    borderStyle: 'dashed',
    opacity: 0.45,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  sigilDotOuter: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: Colors.neon,
    opacity: 0.8,
    marginTop: -2.5,
  },
  sigilRingInner: {
    position: 'absolute',
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 0.5,
    borderColor: Colors.cyan,
    borderStyle: 'dashed',
    opacity: 0.35,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  sigilDotInner: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.cyan,
    opacity: 0.7,
    marginTop: -2,
  },
  trunk: {
    position: 'absolute',
    width: 1.5,
    height: 44,
    backgroundColor: Colors.neon,
    opacity: 0.9,
    top: 28,
  },
  branch: {
    position: 'absolute',
    width: 24,
    height: 1,
    backgroundColor: Colors.neon,
    opacity: 0.6,
    top: 46,
  },
  branchLeft: {
    right: '50%',
    marginRight: -1,
    transform: [{ rotate: '-30deg' }],
  },
  branchRight: {
    left: '50%',
    marginLeft: -1,
    transform: [{ rotate: '30deg' }],
  },
  nodeCenter: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.neon,
    top: 47,
  },
  // Text
  title: {
    fontFamily: Fonts.display,
    fontSize: 38,
    color: Colors.white,
    letterSpacing: 6,
    marginBottom: 6,
  },
  subtitle: {
    fontFamily: Fonts.body,
    fontSize: 10,
    color: Colors.neon,
    letterSpacing: 2,
    opacity: 0.5,
    marginBottom: 52,
  },
  errorText: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: '#ff5555',
    marginBottom: 16,
    textAlign: 'center',
  },
  // Button
  googleBtn: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderWidth: 1,
    borderColor: Colors.borderNeon,
    backgroundColor: Colors.ghost,
    borderRadius: 2,
    minHeight: 52,
  },
  googleBtnPressed: {
    backgroundColor: 'rgba(0,255,136,0.15)',
    borderColor: Colors.neon,
  },
  googleBtnText: {
    fontFamily: Fonts.displayBold,
    fontSize: 12,
    color: Colors.neon,
    letterSpacing: 3,
  },
  footer: {
    fontFamily: Fonts.body,
    fontSize: 9,
    color: Colors.neon,
    opacity: 0.22,
    letterSpacing: 1,
    textAlign: 'center',
    lineHeight: 16,
    marginTop: 40,
  },
})
