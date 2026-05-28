import { useEffect, useRef } from 'react'
import { View, Text, StyleSheet, Animated } from 'react-native'
import { Colors, Fonts } from '../constants/theme'

interface Props {
  hint: string
  state: 'scanning' | 'detected'
}

export function ScanOverlay({ hint, state }: Props) {
  const overlayOpacity = useRef(new Animated.Value(0)).current
  const hintOpacity = useRef(new Animated.Value(1)).current

  useEffect(() => {
    Animated.timing(overlayOpacity, {
      toValue: state === 'detected' ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start()
  }, [state])

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(hintOpacity, { toValue: 0.25, duration: 1200, useNativeDriver: true }),
        Animated.timing(hintOpacity, { toValue: 1, duration: 1200, useNativeDriver: true }),
      ])
    )
    loop.start()
    return () => loop.stop()
  }, [])

  return (
    <View style={styles.container} pointerEvents="none">
      <View style={styles.vignette} />

      {/* Three concentric botanical rings */}
      <View style={styles.ringOuter}>
        <View style={styles.ringMiddle}>
          <View style={styles.ringInner} />
        </View>
        {/* Crosshair */}
        <View style={styles.crossH} />
        <View style={styles.crossV} />
      </View>

      {/* Cyberpunk data overlays — opacity animated via state */}
      <Animated.View
        style={[styles.dataOverlays, { opacity: overlayOpacity }]}
        testID="data-overlays"
      >
        <Text style={[styles.dataLabel, styles.dataTopLeft]}>{'ISO\nAUTO'}</Text>
        <Text style={[styles.dataLabel, styles.dataTopRight]}>{'LUX\n847'}</Text>
        <Text style={[styles.dataLabel, styles.dataLeft]}>{'FOCO\n████'}</Text>
        <Text style={[styles.dataLabel, styles.dataRight]}>{'MODO\nBOT'}</Text>
      </Animated.View>

      {/* Hint text */}
      <Animated.View style={[styles.hintWrap, { opacity: hintOpacity }]}>
        <Text style={styles.hintText} testID="hint-text">{hint}</Text>
      </Animated.View>

      {/* Status label */}
      <View style={styles.statusRow}>
        <View style={[styles.statusDot, state === 'detected' && styles.statusDotDetected]} />
        <Text style={styles.statusText}>
          {state === 'detected' ? 'ÁRBOL DETECTADO' : 'ESCANEANDO'}
        </Text>
      </View>
    </View>
  )
}

const RING_OUTER = 210
const RING_MIDDLE = 160
const RING_INNER = 110

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  vignette: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(8,16,10,0.45)',
  },
  ringOuter: {
    width: RING_OUTER,
    height: RING_OUTER,
    borderRadius: RING_OUTER / 2,
    borderWidth: 1,
    borderColor: 'rgba(0,255,136,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  ringMiddle: {
    width: RING_MIDDLE,
    height: RING_MIDDLE,
    borderRadius: RING_MIDDLE / 2,
    borderWidth: 1,
    borderColor: 'rgba(0,255,136,0.33)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringInner: {
    width: RING_INNER,
    height: RING_INNER,
    borderRadius: RING_INNER / 2,
    borderWidth: 1,
    borderColor: 'rgba(0,255,136,0.55)',
    backgroundColor: 'rgba(0,255,136,0.04)',
  },
  crossH: {
    position: 'absolute',
    width: RING_OUTER,
    height: 1,
    backgroundColor: 'rgba(0,255,136,0.2)',
  },
  crossV: {
    position: 'absolute',
    width: 1,
    height: RING_OUTER,
    backgroundColor: 'rgba(0,255,136,0.2)',
  },
  dataOverlays: {
    ...StyleSheet.absoluteFillObject,
  },
  dataLabel: {
    position: 'absolute',
    fontFamily: 'Syne_700Bold',
    fontSize: 7,
    color: Colors.sistema,
    opacity: 0.7,
    letterSpacing: 0.1,
    textTransform: 'uppercase',
    lineHeight: 11,
  },
  dataTopLeft: { top: '30%', left: '8%' },
  dataTopRight: { top: '30%', right: '8%', textAlign: 'right' },
  dataLeft: { top: '46%', left: '8%' },
  dataRight: { top: '46%', right: '8%', textAlign: 'right' },
  hintWrap: {
    marginTop: 28,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: Colors.sistemaBorder,
    backgroundColor: 'rgba(8,16,10,0.75)',
    borderRadius: 4,
  },
  hintText: {
    fontFamily: Fonts.serifItalic,
    fontSize: 13,
    color: Colors.texto,
    textAlign: 'center',
    opacity: 0.8,
  },
  statusRow: {
    position: 'absolute',
    bottom: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.sistema,
  },
  statusDotDetected: {
    backgroundColor: Colors.accion,
  },
  statusText: {
    fontFamily: Fonts.displayBold,
    fontSize: 9,
    color: Colors.sistema,
    opacity: 0.6,
    letterSpacing: 2,
  },
})
