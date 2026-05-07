import { useEffect, useRef } from 'react'
import { View, Text, StyleSheet, Animated } from 'react-native'
import { Colors, Fonts } from '../constants/theme'

const FRAME_W = 260
const FRAME_H = 380
const CORNER = 24
const THICKNESS = 2

interface Props { hint: string }

export function ScanOverlay({ hint }: Props) {
  const scanLine = useRef(new Animated.Value(0)).current
  const hintOpacity = useRef(new Animated.Value(1)).current

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scanLine, { toValue: 1, duration: 2400, useNativeDriver: true }),
        Animated.timing(scanLine, { toValue: 0, duration: 2400, useNativeDriver: true }),
      ])
    ).start()

    Animated.loop(
      Animated.sequence([
        Animated.timing(hintOpacity, { toValue: 0.3, duration: 1200, useNativeDriver: true }),
        Animated.timing(hintOpacity, { toValue: 1, duration: 1200, useNativeDriver: true }),
      ])
    ).start()
  }, [])

  return (
    <View style={styles.container} pointerEvents="none">
      {/* Dark vignette outside frame */}
      <View style={styles.vignette} />

      {/* Viewfinder frame */}
      <View style={styles.frame}>
        {/* Corner marks */}
        <View style={[styles.cornerH, styles.cornerTL]} />
        <View style={[styles.cornerV, styles.cornerTL]} />
        <View style={[styles.cornerH, styles.cornerTR]} />
        <View style={[styles.cornerV, styles.cornerTR]} />
        <View style={[styles.cornerH, styles.cornerBL]} />
        <View style={[styles.cornerV, styles.cornerBL]} />
        <View style={[styles.cornerH, styles.cornerBR]} />
        <View style={[styles.cornerV, styles.cornerBR]} />

        {/* Scan line */}
        <Animated.View
          style={[
            styles.scanLine,
            {
              transform: [
                {
                  translateY: scanLine.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, FRAME_H - THICKNESS],
                  }),
                },
              ],
            },
          ]}
        />
      </View>

      {/* Hint text */}
      <Animated.View style={[styles.hintWrap, { opacity: hintOpacity }]}>
        <Text style={styles.hintText}>{hint}</Text>
      </Animated.View>

      {/* Label */}
      <View style={styles.labelRow}>
        <View style={styles.labelDot} />
        <Text style={styles.labelText}>ESCANEANDO</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  vignette: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(1,8,8,0.55)',
  },
  frame: {
    width: FRAME_W,
    height: FRAME_H,
    position: 'relative',
    overflow: 'hidden',
  },
  // Horizontal piece of a corner
  cornerH: {
    position: 'absolute',
    width: CORNER,
    height: THICKNESS,
    backgroundColor: Colors.neon,
  },
  // Vertical piece of a corner
  cornerV: {
    position: 'absolute',
    width: THICKNESS,
    height: CORNER,
    backgroundColor: Colors.neon,
  },
  cornerTL: { top: 0, left: 0 },
  cornerTR: { top: 0, right: 0 },
  cornerBL: { bottom: 0, left: 0 },
  cornerBR: { bottom: 0, right: 0 },

  scanLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: THICKNESS,
    backgroundColor: Colors.neon,
    opacity: 0.6,
    shadowColor: Colors.neon,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 6,
  },

  hintWrap: {
    marginTop: 28,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: Colors.borderNeon,
    backgroundColor: 'rgba(1,8,8,0.75)',
  },
  hintText: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.neon,
    letterSpacing: 1,
    textAlign: 'center',
  },

  labelRow: {
    position: 'absolute',
    bottom: 60,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  labelDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.neon,
  },
  labelText: {
    fontFamily: Fonts.body,
    fontSize: 9,
    color: Colors.neon,
    opacity: 0.5,
    letterSpacing: 3,
  },
})
