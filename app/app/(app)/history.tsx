import { useEffect, useState } from 'react'
import {
  View,
  Text,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '../../lib/supabase'
import { API_URL } from '../../constants/api'
import { Colors, Fonts } from '../../constants/theme'

interface ScanItem {
  id: string
  species: string
  symmetry_index: number
  fibonacci_alignment: string
  narrative: string
  image_url: string
  audio_url: string
  scanned_at: string
}

export default function HistoryScreen() {
  const router = useRouter()
  const [scans, setScans] = useState<ScanItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    try {
      setError(false)
      setLoading(true)
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`${API_URL}/history`, {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      })
      if (!res.ok) throw new Error('fetch failed')
      setScans(await res.json())
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('es-MX', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  }

  function renderItem({ item, index }: { item: ScanItem; index: number }) {
    return (
      <Pressable
        style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}
        onPress={() =>
          router.push({
            pathname: '/(app)/result',
            params: {
              species: item.species,
              symmetry_index: String(item.symmetry_index),
              fibonacci_alignment: item.fibonacci_alignment,
              narrative: item.narrative,
              audio_url: item.audio_url,
            },
          })
        }
        accessibilityRole="button"
        accessibilityLabel={`Ver análisis de ${item.species}`}
      >
        {/* Index badge */}
        <View style={styles.indexBadge}>
          <Text style={styles.indexText}>{String(index + 1).padStart(2, '0')}</Text>
        </View>

        {/* Thumbnail */}
        {item.image_url ? (
          <Image source={{ uri: item.image_url }} style={styles.thumbnail} />
        ) : (
          <View style={[styles.thumbnail, styles.thumbnailPlaceholder]}>
            <Text style={styles.thumbnailPlaceholderText}>//</Text>
          </View>
        )}

        {/* Info */}
        <View style={styles.info}>
          <Text style={styles.species} numberOfLines={1}>{item.species}</Text>
          <Text style={styles.date}>{formatDate(item.scanned_at)}</Text>
          <Text style={styles.symmetry}>
            SIM {Number(item.symmetry_index).toFixed(2)}
          </Text>
        </View>

        {/* Arrow */}
        <Text style={styles.arrow}>→</Text>
      </Pressable>
    )
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTag}>// REGISTRO BIOSEMIÓTICO</Text>
          <Text style={styles.headerTitle}>HISTORIAL</Text>
        </View>
        <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.5 }]}>
          <Text style={styles.backBtnText}>← VOLVER</Text>
        </Pressable>
      </View>

      <View style={styles.headerLine} />

      {/* Content */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.neon} />
          <Text style={styles.centerText}>CARGANDO...</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>// ERROR DE CONEXIÓN</Text>
          <Pressable onPress={load} style={styles.retryBtn}>
            <Text style={styles.retryText}>REINTENTAR</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={scans}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            scans.length > 0 ? (
              <Text style={styles.countLabel}>
                {scans.length} {scans.length === 1 ? 'ESCANEO' : 'ESCANEOS'}
              </Text>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.emptyBlock}>
              <Text style={styles.emptyTitle}>SIN REGISTROS</Text>
              <Text style={styles.emptyDesc}>
                Escanea tu primer árbol para comenzar el registro.
              </Text>
              <Pressable
                style={({ pressed }) => [styles.scanBtn, pressed && styles.scanBtnPressed]}
                onPress={() => router.replace('/(app)/scan')}
              >
                <Text style={styles.scanBtnText}>INICIAR ESCANEO</Text>
              </Pressable>
            </View>
          }
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.void,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 14,
  },
  headerTag: {
    fontFamily: Fonts.body,
    fontSize: 8,
    color: Colors.neon,
    opacity: 0.35,
    letterSpacing: 2,
    marginBottom: 4,
  },
  headerTitle: {
    fontFamily: Fonts.display,
    fontSize: 22,
    color: Colors.neon,
    letterSpacing: 4,
  },
  backBtn: {
    paddingBottom: 4,
  },
  backBtnText: {
    fontFamily: Fonts.body,
    fontSize: 9,
    color: Colors.neon,
    opacity: 0.4,
    letterSpacing: 2,
  },
  headerLine: {
    height: 1,
    backgroundColor: Colors.borderNeon,
    marginHorizontal: 24,
  },

  // List
  list: {
    padding: 24,
    paddingBottom: 48,
    gap: 10,
  },
  countLabel: {
    fontFamily: Fonts.body,
    fontSize: 8,
    color: Colors.neon,
    opacity: 0.3,
    letterSpacing: 3,
    marginBottom: 12,
  },

  // Item
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.borderNeon,
    backgroundColor: Colors.ghost,
    padding: 12,
  },
  itemPressed: {
    backgroundColor: 'rgba(0,255,136,0.14)',
  },
  indexBadge: {
    width: 28,
    alignItems: 'center',
  },
  indexText: {
    fontFamily: Fonts.body,
    fontSize: 9,
    color: Colors.neon,
    opacity: 0.3,
    letterSpacing: 1,
  },
  thumbnail: {
    width: 56,
    height: 56,
    backgroundColor: Colors.cell,
  },
  thumbnailPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbnailPlaceholderText: {
    fontFamily: Fonts.body,
    fontSize: 10,
    color: Colors.neon,
    opacity: 0.2,
  },
  info: {
    flex: 1,
    gap: 3,
  },
  species: {
    fontFamily: Fonts.display,
    fontSize: 14,
    color: Colors.white,
    letterSpacing: 0,
  },
  date: {
    fontFamily: Fonts.body,
    fontSize: 10,
    color: Colors.neon,
    opacity: 0.4,
    letterSpacing: 0.5,
  },
  symmetry: {
    fontFamily: Fonts.body,
    fontSize: 9,
    color: Colors.cyan,
    opacity: 0.6,
    letterSpacing: 1,
  },
  arrow: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Colors.neon,
    opacity: 0.4,
  },

  // States
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  centerText: {
    fontFamily: Fonts.body,
    fontSize: 9,
    color: Colors.neon,
    opacity: 0.3,
    letterSpacing: 3,
  },
  errorText: {
    fontFamily: Fonts.body,
    fontSize: 10,
    color: Colors.neon,
    opacity: 0.35,
    letterSpacing: 2,
  },
  retryBtn: {
    marginTop: 4,
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderWidth: 1,
    borderColor: Colors.borderNeon,
  },
  retryText: {
    fontFamily: Fonts.body,
    fontSize: 10,
    color: Colors.neon,
    letterSpacing: 3,
  },

  // Empty
  emptyBlock: {
    alignItems: 'center',
    paddingTop: 64,
    gap: 12,
  },
  emptyTitle: {
    fontFamily: Fonts.display,
    fontSize: 16,
    color: Colors.neon,
    letterSpacing: 4,
    opacity: 0.4,
  },
  emptyDesc: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.white,
    opacity: 0.3,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 32,
    marginBottom: 8,
  },
  scanBtn: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderWidth: 1,
    borderColor: Colors.neon,
    backgroundColor: Colors.ghost,
  },
  scanBtnPressed: {
    backgroundColor: 'rgba(0,255,136,0.18)',
  },
  scanBtnText: {
    fontFamily: Fonts.display,
    fontSize: 12,
    color: Colors.neon,
    letterSpacing: 4,
  },
})
