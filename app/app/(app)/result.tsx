import { View, Text, StyleSheet } from 'react-native'
import { Colors, Fonts } from '../../constants/theme'

// Placeholder — replaced in T18 (ResultScreen)
export default function ResultScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>// RESULT SCREEN</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.void, alignItems: 'center', justifyContent: 'center' },
  label: { fontFamily: Fonts.body, fontSize: 11, color: Colors.neon, opacity: 0.4, letterSpacing: 2 },
})
