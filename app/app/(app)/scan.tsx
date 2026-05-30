import { useEffect, useRef, useState, useCallback } from 'react'
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  Alert,
  Pressable,
} from 'react-native'
import { CameraView, useCameraPermissions } from 'expo-camera'
import { useRouter } from 'expo-router'
import { supabase } from '../../lib/supabase'
import { useFrameDetection } from '../../hooks/useFrameDetection'
import { ScanOverlay } from '../../components/ScanOverlay'
import { API_URL } from '../../constants/api'
import { Colors, Fonts } from '../../constants/theme'

export default function ScanScreen() {
  const router = useRouter()
  const [permission, requestPermission] = useCameraPermissions()
  const [loading, setLoading] = useState(false)
  const cameraRef = useRef<CameraView>(null)

  const captureFrame = useCallback(async (): Promise<string | null> => {
    if (!cameraRef.current) return null
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.3,
        base64: false,
      })
      return photo?.uri ?? null
    } catch {
      return null
    }
  }, [])

  async function handleValidFrame(uri: string) {
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const formData = new FormData()
      formData.append('image', { uri, type: 'image/jpeg', name: 'tree.jpg' } as any)

      const res = await fetch(`${API_URL}/scan`, {
        method: 'POST',
        body: formData,
        headers: { Authorization: `Bearer ${session?.access_token}` },
      })

      if (!res.ok) throw new Error('scan failed')
      const result = await res.json()
      router.push({ pathname: '/(app)/result', params: { scan_id: result.scan_id } })
    } catch {
      Alert.alert('Error', 'No se pudo analizar el árbol. Intenta de nuevo.')
      setLoading(false)
    }
  }

  const { hint, startDetection, stopDetection } = useFrameDetection({
    onValidFrame: handleValidFrame,
  })

  useEffect(() => {
    if (!permission?.granted) requestPermission()
  }, [])

  useEffect(() => {
    if (permission?.granted && !loading) {
      startDetection(captureFrame)
    }
    return () => stopDetection()
  }, [permission?.granted, loading])

  if (!permission) return null

  if (!permission.granted) {
    return (
      <View style={styles.permissionScreen}>
        <Text style={styles.permissionTitle}>Acceso a cámara</Text>
        <Text style={styles.permissionDesc}>
          Fraktl necesita la cámara para escanear el árbol.
        </Text>
        <Pressable
          style={({ pressed }) => [styles.permissionBtn, pressed && styles.permissionBtnPressed]}
          onPress={requestPermission}
        >
          <Text style={styles.permissionBtnText}>CONCEDER PERMISO</Text>
        </Pressable>
        <Pressable onPress={() => router.back()} style={styles.backLink}>
          <Text style={styles.backLinkText}>← Volver</Text>
        </Pressable>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" />

      {loading ? (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={Colors.sistema} />
          <Text style={styles.loadingTitle}>ANALIZANDO</Text>
          <Text style={styles.loadingDesc}>Consultando el árbol...</Text>
        </View>
      ) : (
        <ScanOverlay hint={hint} state={loading ? 'detected' : 'scanning'} />
      )}

      {/* Back button */}
      {!loading && (
        <Pressable
          style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}
          onPress={() => { stopDetection(); router.back() }}
          accessibilityLabel="Volver"
        >
          <Text style={styles.backBtnText}>✕</Text>
        </Pressable>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },

  // Permission screen
  permissionScreen: {
    flex: 1,
    backgroundColor: Colors.void,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    gap: 16,
  },
  permissionTitle: {
    fontFamily: Fonts.serifBold,
    fontSize: 22,
    color: Colors.texto,
    letterSpacing: 0,
    marginBottom: 4,
    textAlign: 'center',
  },
  permissionDesc: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: Colors.texto,
    opacity: 0.5,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 8,
  },
  permissionBtn: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderWidth: 1,
    borderColor: Colors.sistema,
    backgroundColor: Colors.sistemaDim,
  },
  permissionBtnPressed: {
    backgroundColor: 'rgba(0,255,136,0.18)',
  },
  permissionBtnText: {
    fontFamily: Fonts.display,
    fontSize: 12,
    color: Colors.sistema,
    letterSpacing: 3,
  },
  backLink: {
    marginTop: 8,
  },
  backLinkText: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.sistema,
    opacity: 0.4,
  },

  // Loading overlay
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(1,8,8,0.88)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingTitle: {
    fontFamily: Fonts.display,
    fontSize: 16,
    color: Colors.sistema,
    letterSpacing: 4,
    marginTop: 8,
  },
  loadingDesc: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.sistema,
    opacity: 0.45,
    letterSpacing: 1,
  },

  // Back button
  backBtn: {
    position: 'absolute',
    top: 56,
    right: 24,
    width: 36,
    height: 36,
    borderWidth: 1,
    borderColor: Colors.sistemaBorder,
    backgroundColor: 'rgba(1,8,8,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnText: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Colors.sistema,
    opacity: 0.7,
  },
})
