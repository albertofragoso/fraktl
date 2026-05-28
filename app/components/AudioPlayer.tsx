import { useState, useEffect, useRef } from 'react'
import { View, Text, Pressable, StyleSheet, Animated } from 'react-native'
import { Audio, AVPlaybackStatus } from 'expo-av'
import { Colors, Fonts } from '../constants/theme'

interface Props { url: string | null | undefined }

export function AudioPlayer({ url }: Props) {
  const [sound, setSound] = useState<Audio.Sound | null>(null)
  const [playing, setPlaying] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState(!url || url === 'null')
  const pulseAnim = useRef(new Animated.Value(1)).current
  const loopRef = useRef<Animated.CompositeAnimation | null>(null)

  useEffect(() => {
    if (!url || url === 'null') return
    let s: Audio.Sound | null = null

    Audio.Sound.createAsync(
      { uri: url },
      {},
      (status: AVPlaybackStatus) => {
        if (status.isLoaded) {
          setLoaded(true)
          if (status.didJustFinish) {
            setPlaying(false)
            stopPulse()
          }
        }
      }
    )
      .then(({ sound }) => {
        s = sound
        setSound(sound)
      })
      .catch(() => setError(true))

    return () => {
      s?.unloadAsync()
    }
  }, [url])

  function startPulse() {
    loopRef.current = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.3, duration: 500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      ])
    )
    loopRef.current.start()
  }

  function stopPulse() {
    loopRef.current?.stop()
    pulseAnim.setValue(1)
  }

  async function toggle() {
    if (!sound || !loaded) return
    if (playing) {
      await sound.pauseAsync()
      setPlaying(false)
      stopPulse()
    } else {
      await sound.playAsync()
      setPlaying(true)
      startPulse()
    }
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>// AUDIO NO DISPONIBLE</Text>
      </View>
    )
  }

  return (
    <Pressable
      style={({ pressed }) => [styles.container, pressed && styles.containerPressed]}
      onPress={toggle}
      disabled={!loaded}
      accessibilityRole="button"
      accessibilityLabel={playing ? 'Pausar audio' : 'Reproducir audio'}
    >
      {/* Waveform bars */}
      <View style={styles.waveform}>
        {[0.4, 0.7, 1, 0.8, 0.5, 0.9, 0.6, 1, 0.7, 0.4].map((h, i) => (
          <Animated.View
            key={i}
            style={[
              styles.bar,
              {
                height: 20 * h,
                opacity: playing
                  ? pulseAnim.interpolate({
                      inputRange: [1, 1.3],
                      outputRange: [0.4 + h * 0.4, 0.6 + h * 0.4],
                    })
                  : 0.25,
              },
            ]}
          />
        ))}
      </View>

      {/* Icon + label */}
      <View style={styles.labelGroup}>
        <Text style={styles.icon}>{!loaded ? '·' : playing ? '⏸' : '▶'}</Text>
        <Text style={styles.label}>
          {!loaded ? 'CARGANDO...' : playing ? 'PAUSAR' : 'ESCUCHAR INTERPRETACIÓN'}
        </Text>
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderColor: Colors.accionBorder,
    backgroundColor: Colors.accionDim,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  containerPressed: {
    backgroundColor: 'rgba(0,229,229,0.12)',
  },
  waveform: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    height: 24,
  },
  bar: {
    width: 3,
    backgroundColor: Colors.suave,
    borderRadius: 2,
  },
  labelGroup: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  icon: {
    fontSize: 16,
    color: Colors.suave,
  },
  label: {
    fontFamily: Fonts.body,
    fontSize: 10,
    color: Colors.suave,
    letterSpacing: 2,
  },
  errorContainer: {
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.sistemaBorder,
    alignItems: 'center',
  },
  errorText: {
    fontFamily: Fonts.body,
    fontSize: 10,
    color: Colors.sistema,
    opacity: 0.3,
    letterSpacing: 2,
  },
})
