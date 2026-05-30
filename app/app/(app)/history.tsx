import { useEffect, useState } from 'react'
import {
  View, Text, SectionList, Image, Pressable, StyleSheet, ActivityIndicator,
} from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '../../lib/supabase'
import { API_URL } from '../../constants/api'
import { Colors, Fonts } from '../../constants/theme'
import { groupScansByDate, ScanItem, ScanSection } from '../../utils/groupScansByDate'
import { FloatingTabBar } from '../../components/FloatingTabBar'
import { DEV_SCANS } from '../../dev/fixtures'

export default function HistoryScreen() {
  const router = useRouter()
  const [sections, setSections] = useState<ScanSection[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    if (__DEV__) {
      setSections(groupScansByDate(DEV_SCANS))
      setLoading(false)
      return
    }
    try {
      setError(false)
      setLoading(true)
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`${API_URL}/history`, {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      })
      if (!res.ok) throw new Error('fetch failed')
      const scans: ScanItem[] = await res.json()
      setSections(groupScansByDate(scans))
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  const totalScans = sections.reduce((acc, s) => acc + s.data.length, 0)

  return (
    <View style={styles.container}>
      <View style={styles.topbar}>
        <Text style={styles.title}>Cuaderno</Text>
        {totalScans > 0 && (
          <Text style={styles.count}>{totalScans} lecturas</Text>
        )}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.sistema} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>Error de conexión</Text>
          <Pressable onPress={load} style={({ pressed }) => [styles.retryBtn, pressed && { opacity: 0.65 }]}>
            <Text style={styles.retryText}>Reintentar</Text>
          </Pressable>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          renderSectionHeader={({ section }) => (
            <View style={styles.dateHeader}>
              <Text style={styles.dateHeaderText}>{section.title}</Text>
            </View>
          )}
          renderItem={({ item }) => (
            <HistoryEntry item={item} onPress={() =>
              router.push({
                pathname: '/(app)/result',
                params: { scan_id: item.id },
              })
            } />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={<EmptyState onScan={() => router.push('/(app)/scan')} />}
          stickySectionHeadersEnabled={false}
        />
      )}

      <FloatingTabBar />
    </View>
  )
}

function HistoryEntry({ item, onPress }: { item: ScanItem; onPress: () => void }) {
  const symmetry = item.symmetry_index ? Number(item.symmetry_index).toFixed(2) : null
  const fibonacci = item.fibonacci_alignment ?? null

  return (
    <Pressable
      style={({ pressed }) => [styles.entry, pressed && styles.entryPressed]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Ver análisis de ${item.species}`}
    >
      {item.image_url ? (
        <Image source={{ uri: item.image_url }} style={styles.thumb} />
      ) : (
        <View style={[styles.thumb, styles.thumbPlaceholder]} />
      )}

      <View style={styles.entryBody}>
        <Text style={styles.entrySpecies} numberOfLines={1}>{item.species}</Text>
        {item.location ? (
          <Text style={styles.entryLocation} numberOfLines={1}>📍 {item.location}</Text>
        ) : null}
        <View style={styles.chips}>
          {symmetry ? <Chip label={`${symmetry} sim`} color="sistema" /> : null}
          {fibonacci ? <Chip label={`φ ${fibonacci}`} color="accion" /> : null}
        </View>
      </View>

      <Pressable
        style={({ pressed }) => [styles.playBtn, pressed && { opacity: 0.65 }]}
        onPress={onPress}
        accessibilityLabel={`Reproducir ${item.species}`}
      >
        <Text style={styles.playIcon}>▶</Text>
      </Pressable>
    </Pressable>
  )
}

function Chip({ label, color }: { label: string; color: 'sistema' | 'accion' }) {
  const c = color === 'sistema' ? Colors.sistema : Colors.accion
  return (
    <View style={[styles.chip, { borderColor: c + '33' }]}>
      <Text style={[styles.chipText, { color: c + 'aa' }]}>{label}</Text>
    </View>
  )
}

function EmptyState({ onScan }: { onScan: () => void }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyTitle}>Aún no has escaneado ningún árbol</Text>
      <Text style={styles.emptyDesc}>Tu cuaderno de campo está vacío.</Text>
      <Pressable
        style={({ pressed }) => [styles.emptyScanBtn, pressed && { opacity: 0.75 }]}
        onPress={onScan}
      >
        <Text style={styles.emptyScanText}>Escanear ahora</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.void },
  topbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surface,
  },
  title: {
    fontFamily: Fonts.serifBold,
    fontSize: 22,
    color: Colors.texto,
  },
  count: {
    fontFamily: Fonts.displayBold,
    fontSize: 9,
    color: Colors.sistema,
    letterSpacing: 0.15,
    textTransform: 'uppercase',
  },
  listContent: { paddingBottom: 120 },

  // Date headers
  dateHeader: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surface,
  },
  dateHeaderText: {
    fontFamily: Fonts.displayBold,
    fontSize: 8,
    color: Colors.sistema,
    letterSpacing: 0.2,
    textTransform: 'uppercase',
    opacity: 0.7,
  },

  // Entry row
  entry: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surface,
  },
  entryPressed: { backgroundColor: Colors.sistemaDim },
  thumb: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: Colors.surface,
    flexShrink: 0,
  },
  thumbPlaceholder: { backgroundColor: Colors.surface },
  entryBody: { flex: 1, gap: 3 },
  entrySpecies: {
    fontFamily: Fonts.serif,
    fontSize: 14,
    color: Colors.texto,
  },
  entryLocation: {
    fontFamily: Fonts.bodyLight,
    fontSize: 10,
    color: Colors.texto,
    opacity: 0.45,
  },
  chips: { flexDirection: 'row', gap: 5, marginTop: 2 },
  chip: {
    borderWidth: 1,
    borderRadius: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  chipText: {
    fontFamily: Fonts.displayBold,
    fontSize: 8,
    letterSpacing: 0.05,
  },
  playBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.accionDim,
    borderWidth: 1,
    borderColor: Colors.accionBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playIcon: { fontSize: 9, color: Colors.accion },

  // States
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  errorText: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.texto,
    opacity: 0.4,
  },
  retryBtn: {
    borderWidth: 1,
    borderColor: Colors.sistemaBorder,
    borderRadius: 6,
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  retryText: {
    fontFamily: Fonts.displayBold,
    fontSize: 11,
    color: Colors.sistema,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },

  // Empty state
  empty: { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyTitle: {
    fontFamily: Fonts.serif,
    fontSize: 16,
    color: Colors.texto,
    opacity: 0.6,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  emptyDesc: {
    fontFamily: Fonts.bodyLight,
    fontSize: 12,
    color: Colors.texto,
    opacity: 0.3,
    textAlign: 'center',
  },
  emptyScanBtn: {
    borderWidth: 1,
    borderColor: Colors.accionBorder,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 28,
    marginTop: 8,
    backgroundColor: Colors.accionDim,
  },
  emptyScanText: {
    fontFamily: Fonts.displayBold,
    fontSize: 12,
    color: Colors.accion,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
})
