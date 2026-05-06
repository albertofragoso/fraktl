import { View, Text, StyleSheet } from 'react-native'
import { Colors, Fonts } from '../../constants/theme'

// Placeholder — replaced in T15 (HomeScreen)
export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.logo}>FRAKTL</Text>
      <Text style={styles.label}>// HOME SCREEN</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.void,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    fontFamily: Fonts.display,
    fontSize: 32,
    color: Colors.neon,
    letterSpacing: 4,
  },
  label: {
    fontFamily: Fonts.body,
    fontSize: 11,
    color: Colors.neon,
    opacity: 0.4,
    marginTop: 8,
    letterSpacing: 2,
  },
})
