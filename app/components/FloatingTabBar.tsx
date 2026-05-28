import { View, Text, Pressable, StyleSheet } from 'react-native'
import { useRouter, usePathname } from 'expo-router'
import { Colors, Fonts } from '../constants/theme'

export function FloatingTabBar() {
  const router = useRouter()
  const pathname = usePathname()

  const isHome = !pathname.includes('history')
  const isHistory = pathname.includes('history')

  return (
    <View style={styles.wrapper}>
      <View style={styles.pill}>
        <Pressable
          style={styles.tab}
          onPress={() => router.push('/(app)')}
          accessibilityRole="button"
          accessibilityLabel="Inicio"
        >
          <View style={[styles.indicator, isHome && styles.indicatorActive]} />
          <Text style={[styles.tabLabel, isHome && styles.tabLabelActive]}>Inicio</Text>
        </Pressable>

        <Pressable
          testID="fab-button"
          style={styles.fabWrap}
          onPress={() => router.push('/(app)/scan')}
          accessibilityRole="button"
          accessibilityLabel="Escanear árbol"
        >
          <View style={styles.fab}>
            <View style={styles.fabRing} />
          </View>
        </Pressable>

        <Pressable
          style={styles.tab}
          onPress={() => router.push('/(app)/history')}
          accessibilityRole="button"
          accessibilityLabel="Historial"
        >
          <View style={[styles.indicator, isHistory && styles.indicatorActive]} />
          <Text style={[styles.tabLabel, isHistory && styles.tabLabelActive]}>Historial</Text>
        </Pressable>
      </View>
    </View>
  )
}

const FAB_SIZE = 52

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingBottom: 28,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 40,
    paddingHorizontal: 28,
    paddingVertical: 12,
    gap: 28,
    borderWidth: 1,
    borderColor: Colors.sistemaBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 10,
  },
  tab: {
    alignItems: 'center',
    gap: 4,
    minWidth: 48,
  },
  indicator: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.sistemaBorder,
  },
  indicatorActive: {
    backgroundColor: Colors.sistema,
  },
  tabLabel: {
    fontFamily: Fonts.displayBold,
    fontSize: 9,
    color: Colors.sistema,
    opacity: 0.4,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  tabLabelActive: {
    opacity: 1,
  },
  fabWrap: {
    marginTop: -FAB_SIZE / 2,
  },
  fab: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    backgroundColor: Colors.accion,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.accion,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.55,
    shadowRadius: 12,
    elevation: 14,
  },
  fabRing: {
    width: FAB_SIZE * 0.5,
    height: FAB_SIZE * 0.5,
    borderRadius: FAB_SIZE / 4,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.7)',
  },
})
