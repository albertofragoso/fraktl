# Botanical Cyberpunk Frontend Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Fraktl's pure Cyberpunk aesthetic with a Botanical Cyberpunk hybrid across all four main screens, including a new design token system, Playfair Display typography, floating pill navigation, and redesigned AuthScreen / ScanOverlay / ResultScreen / HistoryScreen.

**Architecture:** New token system in `constants/theme.ts` is the single source of truth consumed by all screens. Pure utility function `groupScansByDate` is the only new business logic. All UI components use React Native's built-in `Animated` API — no new animation library is added. `FloatingTabBar` is a self-contained component rendered by the screens that need it, not injected by the layout.

**Tech Stack:** Expo 54, React Native 0.81.5, expo-router, `Animated` API (built-in), `@expo-google-fonts/playfair-display` (new install), `@testing-library/react-native`, jest-expo.

**Branch:** `feat/botanical-cyberpunk-redesign`

---

## File Map

| Action | File | Responsibility |
|---|---|---|
| Modify | `app/constants/theme.ts` | New color tokens + Playfair font references |
| Modify | `app/package.json` | Add `@expo-google-fonts/playfair-display` |
| Create | `app/utils/groupScansByDate.ts` | Pure date-grouping function for history SectionList |
| Create | `app/__tests__/groupScansByDate.test.ts` | Unit tests for groupScansByDate |
| Create | `app/components/FloatingTabBar.tsx` | Floating pill nav + elevated orange FAB |
| Create | `app/__tests__/FloatingTabBar.test.tsx` | Render + navigation tests |
| Modify | `app/components/ScanOverlay.tsx` | Botanical Circle with scanning/detected state machine |
| Create | `app/__tests__/ScanOverlay.test.tsx` | State machine render tests |
| Modify | `app/app/(auth)/index.tsx` | Immersive hero AuthScreen with Animated stagger |
| Modify | `app/app/(app)/result.tsx` | Paginated snap chapters + spine indicator |
| Create | `app/__tests__/ResultScreen.test.tsx` | Smoke tests per chapter |
| Modify | `app/app/(app)/history.tsx` | SectionList cuaderno de campo |
| Modify | `app/app/(app)/index.tsx` | Token update + FloatingTabBar |
| Modify | `app/app/(app)/_layout.tsx` | Token update (backgroundColor) |

---

## Task 1: Design Token System + Playfair Display

**Files:**
- Modify: `app/package.json`
- Modify: `app/constants/theme.ts`

- [ ] **Step 1: Install Playfair Display**

```bash
cd app && npm install @expo-google-fonts/playfair-display
```

Expected: package added to `node_modules`, `package.json` updated.

- [ ] **Step 2: Verify available font exports**

```bash
cd app && node -e "console.log(Object.keys(require('@expo-google-fonts/playfair-display')).filter(k => k.startsWith('Playfair')))"
```

Expected output includes: `PlayfairDisplay_400Regular`, `PlayfairDisplay_400Regular_Italic`, `PlayfairDisplay_700Bold`. Note the exact italic key name — it may be `PlayfairDisplay_400Regular_Italic` or `PlayfairDisplay_Italic_400Regular`. Use whatever the output shows.

- [ ] **Step 3: Replace `app/constants/theme.ts`**

```ts
export const Colors = {
  void: '#08100a',
  surface: '#0f2018',
  texto: '#f5ead0',
  sistema: '#00ff88',
  accion: '#ff6b00',
  suave: '#ffaa44',
  sistemaDim: 'rgba(0,255,136,0.12)',
  sistemaBorder: 'rgba(0,255,136,0.2)',
  accionDim: 'rgba(255,107,0,0.12)',
  accionBorder: 'rgba(255,107,0,0.35)',
}

export const Fonts = {
  display: 'Syne_800ExtraBold',
  displayBold: 'Syne_700Bold',
  serif: 'PlayfairDisplay_400Regular',
  serifItalic: 'PlayfairDisplay_400Regular_Italic',
  serifBold: 'PlayfairDisplay_700Bold',
  body: 'SpaceGrotesk_400Regular',
  bodyLight: 'SpaceGrotesk_300Light',
}

export const FontList = {
  Syne_800ExtraBold: require('@expo-google-fonts/syne').Syne_800ExtraBold,
  Syne_700Bold: require('@expo-google-fonts/syne').Syne_700Bold,
  PlayfairDisplay_400Regular: require('@expo-google-fonts/playfair-display').PlayfairDisplay_400Regular,
  PlayfairDisplay_400Regular_Italic: require('@expo-google-fonts/playfair-display').PlayfairDisplay_400Regular_Italic,
  PlayfairDisplay_700Bold: require('@expo-google-fonts/playfair-display').PlayfairDisplay_700Bold,
  SpaceGrotesk_400Regular: require('@expo-google-fonts/space-grotesk').SpaceGrotesk_400Regular,
  SpaceGrotesk_300Light: require('@expo-google-fonts/space-grotesk').SpaceGrotesk_300Light,
}
```

> Note: The italic key in `Fonts.serifItalic` and `FontList` must match the exact string from Step 2. Adjust if the verified name differs.

- [ ] **Step 4: Run existing tests to confirm no regressions**

```bash
cd app && npx jest --passWithNoTests
```

Expected: all existing tests pass. The `__mocks__/expoFontsMock.js` Proxy handles the new font package automatically.

- [ ] **Step 5: Commit**

```bash
git add app/constants/theme.ts app/package.json app/package-lock.json
git commit -m "feat: botanical cyberpunk design token system + Playfair Display"
```

---

## Task 2: `groupScansByDate` Utility (TDD)

**Files:**
- Create: `app/utils/groupScansByDate.ts`
- Create: `app/__tests__/groupScansByDate.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `app/__tests__/groupScansByDate.test.ts`:

```ts
import { groupScansByDate, ScanItem } from '../utils/groupScansByDate'

function makeScan(id: string, scanned_at: string): ScanItem {
  return {
    id,
    species: 'Quercus robur',
    symmetry_index: 0.89,
    fibonacci_alignment: '1.61',
    narrative: 'test narrative',
    image_url: '',
    audio_url: '',
    scanned_at,
  }
}

function isoToday(): string {
  return new Date().toISOString()
}

function isoYesterday(): string {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return d.toISOString()
}

function isoOlder(daysAgo: number): string {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  return d.toISOString()
}

describe('groupScansByDate', () => {
  it('returns empty array for empty input', () => {
    expect(groupScansByDate([])).toEqual([])
  })

  it('labels today scans as "Hoy"', () => {
    const result = groupScansByDate([makeScan('1', isoToday())])
    expect(result[0].title).toBe('Hoy')
    expect(result[0].data).toHaveLength(1)
  })

  it('labels yesterday scans as "Ayer"', () => {
    const result = groupScansByDate([makeScan('1', isoYesterday())])
    expect(result[0].title).toBe('Ayer')
  })

  it('formats scans older than yesterday as "DD MMM" (not Hoy or Ayer)', () => {
    const result = groupScansByDate([makeScan('1', isoOlder(5))])
    expect(result[0].title).not.toBe('Hoy')
    expect(result[0].title).not.toBe('Ayer')
    expect(result[0].title).toMatch(/\d/)
  })

  it('groups multiple scans from the same day into one section', () => {
    const today = isoToday()
    const result = groupScansByDate([makeScan('1', today), makeScan('2', today)])
    expect(result).toHaveLength(1)
    expect(result[0].data).toHaveLength(2)
  })

  it('creates separate sections for different days', () => {
    const scans = [
      makeScan('1', isoToday()),
      makeScan('2', isoYesterday()),
      makeScan('3', isoOlder(5)),
    ]
    const result = groupScansByDate(scans)
    expect(result).toHaveLength(3)
  })

  it('preserves scan data inside sections', () => {
    const scan = makeScan('abc', isoToday())
    const result = groupScansByDate([scan])
    expect(result[0].data[0].id).toBe('abc')
  })
})
```

- [ ] **Step 2: Run to confirm failure**

```bash
cd app && npx jest __tests__/groupScansByDate.test.ts
```

Expected: FAIL — `Cannot find module '../utils/groupScansByDate'`

- [ ] **Step 3: Create `app/utils/groupScansByDate.ts`**

```ts
export interface ScanItem {
  id: string
  species: string
  symmetry_index: number
  fibonacci_alignment: string
  narrative: string
  image_url: string
  audio_url: string
  scanned_at: string
  location?: string
}

export interface ScanSection {
  title: string
  data: ScanItem[]
}

export function groupScansByDate(scans: ScanItem[]): ScanSection[] {
  if (scans.length === 0) return []

  const now = new Date()
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterdayMidnight = new Date(todayMidnight)
  yesterdayMidnight.setDate(yesterdayMidnight.getDate() - 1)

  const map = new Map<string, ScanItem[]>()

  for (const scan of scans) {
    const d = new Date(scan.scanned_at)
    const scanMidnight = new Date(d.getFullYear(), d.getMonth(), d.getDate())

    let title: string
    if (scanMidnight.getTime() === todayMidnight.getTime()) {
      title = 'Hoy'
    } else if (scanMidnight.getTime() === yesterdayMidnight.getTime()) {
      title = 'Ayer'
    } else {
      title = d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })
    }

    const existing = map.get(title) ?? []
    map.set(title, [...existing, scan])
  }

  return Array.from(map.entries()).map(([title, data]) => ({ title, data }))
}
```

- [ ] **Step 4: Run tests to confirm pass**

```bash
cd app && npx jest __tests__/groupScansByDate.test.ts
```

Expected: 7 tests passing.

- [ ] **Step 5: Commit**

```bash
git add app/utils/groupScansByDate.ts app/__tests__/groupScansByDate.test.ts
git commit -m "feat: groupScansByDate utility with full test coverage"
```

---

## Task 3: FloatingTabBar Component (TDD)

**Files:**
- Create: `app/components/FloatingTabBar.tsx`
- Create: `app/__tests__/FloatingTabBar.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `app/__tests__/FloatingTabBar.test.tsx`:

```tsx
import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import { FloatingTabBar } from '../components/FloatingTabBar'

const mockPush = jest.fn()
let mockPathname = '/'

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => mockPathname,
}))

beforeEach(() => {
  mockPush.mockClear()
  mockPathname = '/'
})

describe('FloatingTabBar', () => {
  it('renders home tab, FAB, and history tab', () => {
    const { getByLabelText } = render(<FloatingTabBar />)
    expect(getByLabelText('Inicio')).toBeTruthy()
    expect(getByLabelText('Escanear árbol')).toBeTruthy()
    expect(getByLabelText('Historial')).toBeTruthy()
  })

  it('pressing home tab navigates to /(app)', () => {
    const { getByLabelText } = render(<FloatingTabBar />)
    fireEvent.press(getByLabelText('Inicio'))
    expect(mockPush).toHaveBeenCalledWith('/(app)')
  })

  it('pressing FAB navigates to /(app)/scan', () => {
    const { getByLabelText } = render(<FloatingTabBar />)
    fireEvent.press(getByLabelText('Escanear árbol'))
    expect(mockPush).toHaveBeenCalledWith('/(app)/scan')
  })

  it('pressing history tab navigates to /(app)/history', () => {
    const { getByLabelText } = render(<FloatingTabBar />)
    fireEvent.press(getByLabelText('Historial'))
    expect(mockPush).toHaveBeenCalledWith('/(app)/history')
  })

  it('FAB renders with testID fab-button', () => {
    const { getByTestId } = render(<FloatingTabBar />)
    expect(getByTestId('fab-button')).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run to confirm failure**

```bash
cd app && npx jest __tests__/FloatingTabBar.test.tsx
```

Expected: FAIL — `Cannot find module '../components/FloatingTabBar'`

- [ ] **Step 3: Create `app/components/FloatingTabBar.tsx`**

```tsx
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
```

- [ ] **Step 4: Run tests to confirm pass**

```bash
cd app && npx jest __tests__/FloatingTabBar.test.tsx
```

Expected: 5 tests passing.

- [ ] **Step 5: Commit**

```bash
git add app/components/FloatingTabBar.tsx app/__tests__/FloatingTabBar.test.tsx
git commit -m "feat: FloatingTabBar — floating pill nav with elevated orange FAB"
```

---

## Task 4: BotanicalScanOverlay (TDD)

**Files:**
- Modify: `app/components/ScanOverlay.tsx`
- Create: `app/__tests__/ScanOverlay.test.tsx`
- Modify: `app/app/(app)/scan.tsx` (pass `state` prop)

- [ ] **Step 1: Write the failing tests**

Create `app/__tests__/ScanOverlay.test.tsx`:

```tsx
import React from 'react'
import { render } from '@testing-library/react-native'
import { ScanOverlay } from '../components/ScanOverlay'

describe('ScanOverlay', () => {
  it('renders hint text', () => {
    const { getByTestId } = render(<ScanOverlay hint="Apunta al tronco" state="scanning" />)
    expect(getByTestId('hint-text').props.children).toBe('Apunta al tronco')
  })

  it('renders data overlays element in scanning state', () => {
    const { getByTestId } = render(<ScanOverlay hint="hint" state="scanning" />)
    expect(getByTestId('data-overlays')).toBeTruthy()
  })

  it('renders data overlays element in detected state', () => {
    const { getByTestId } = render(<ScanOverlay hint="hint" state="detected" />)
    expect(getByTestId('data-overlays')).toBeTruthy()
  })

  it('shows ÁRBOL DETECTADO status text in detected state', () => {
    const { getByText } = render(<ScanOverlay hint="hint" state="detected" />)
    expect(getByText('ÁRBOL DETECTADO')).toBeTruthy()
  })

  it('shows ESCANEANDO status text in scanning state', () => {
    const { getByText } = render(<ScanOverlay hint="hint" state="scanning" />)
    expect(getByText('ESCANEANDO')).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run to confirm failure**

```bash
cd app && npx jest __tests__/ScanOverlay.test.tsx
```

Expected: FAIL — `ScanOverlay` does not accept `state` prop, and `hint-text` / `data-overlays` testIDs are missing.

- [ ] **Step 3: Replace `app/components/ScanOverlay.tsx`**

```tsx
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
    pointerEvents: 'none',
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
```

- [ ] **Step 4: Update `app/app/(app)/scan.tsx` — pass `state` prop to ScanOverlay**

Find the line that renders `<ScanOverlay hint={hint} />` and replace with:

```tsx
<ScanOverlay hint={hint} state={loading ? 'detected' : 'scanning'} />
```

- [ ] **Step 5: Run tests to confirm pass**

```bash
cd app && npx jest __tests__/ScanOverlay.test.tsx
```

Expected: 5 tests passing.

- [ ] **Step 6: Run all tests**

```bash
cd app && npx jest
```

Expected: all tests pass.

- [ ] **Step 7: Commit**

```bash
git add app/components/ScanOverlay.tsx app/__tests__/ScanOverlay.test.tsx app/app/\(app\)/scan.tsx
git commit -m "feat: BotanicalScanOverlay — concentric rings with scanning/detected state machine"
```

---

## Task 5: AuthScreen — Immersive Hero

**Files:**
- Modify: `app/app/(auth)/index.tsx`

No new test. The existing OAuth logic is preserved unchanged; only the visual layer changes.

- [ ] **Step 1: Replace `app/app/(auth)/index.tsx`**

```tsx
import { useEffect, useRef, useState } from 'react'
import {
  View, Text, Pressable, StyleSheet, Animated, Easing, ActivityIndicator,
} from 'react-native'
import * as WebBrowser from 'expo-web-browser'
import * as AuthSession from 'expo-auth-session'
import { supabase } from '../../lib/supabase'
import { Colors, Fonts } from '../../constants/theme'

WebBrowser.maybeCompleteAuthSession()
const redirectUri = AuthSession.makeRedirectUri({ scheme: 'fraktl' })

export default function AuthScreen() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const logoOpacity = useRef(new Animated.Value(0)).current
  const logoY      = useRef(new Animated.Value(-28)).current
  const tagOpacity = useRef(new Animated.Value(0)).current
  const tagY       = useRef(new Animated.Value(10)).current
  const ctaOpacity = useRef(new Animated.Value(0)).current
  const ctaY       = useRef(new Animated.Value(24)).current
  const termsOpacity = useRef(new Animated.Value(0)).current
  const glowOpacity  = useRef(new Animated.Value(0)).current

  useEffect(() => {
    const easeOut = Easing.out(Easing.cubic)
    const easeQuad = Easing.out(Easing.quad)

    Animated.timing(logoOpacity, { toValue: 1, duration: 600, delay: 400, easing: easeOut, useNativeDriver: true }).start()
    Animated.timing(logoY,      { toValue: 0, duration: 600, delay: 400, easing: easeOut, useNativeDriver: true }).start()

    Animated.timing(tagOpacity, { toValue: 1, duration: 500, delay: 700, easing: easeQuad, useNativeDriver: true }).start()
    Animated.timing(tagY,       { toValue: 0, duration: 500, delay: 700, easing: easeQuad, useNativeDriver: true }).start()

    Animated.timing(ctaOpacity, { toValue: 1, duration: 400, delay: 1000, useNativeDriver: true }).start()
    Animated.timing(ctaY,       { toValue: 0, duration: 400, delay: 1000, easing: Easing.out(Easing.back(1.2)), useNativeDriver: true }).start()

    Animated.timing(termsOpacity, { toValue: 0.4, duration: 300, delay: 1150, useNativeDriver: true }).start()

    const glow = Animated.loop(
      Animated.sequence([
        Animated.timing(glowOpacity, { toValue: 0.7, duration: 2200, delay: 1200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(glowOpacity, { toValue: 0.2, duration: 2200,             easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    )
    glow.start()
    return () => glow.stop()
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
    } catch {
      setError('No se pudo conectar. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={styles.container}>
      {/* Hero background — gradient placeholder (swap for ImageBackground + auth-hero.webp when asset is ready) */}
      <View style={styles.heroBg} />
      <View style={styles.heroOverlay} />

      {/* Glow orb behind logo */}
      <Animated.View style={[styles.glow, { opacity: glowOpacity }]} />

      <View style={styles.content}>
        {/* Logo + tagline section */}
        <View style={styles.logoSection}>
          <Animated.View style={{ opacity: logoOpacity, transform: [{ translateY: logoY }] }}>
            <Text style={styles.logo}>fraktl</Text>
          </Animated.View>

          <Animated.View style={{ opacity: tagOpacity, transform: [{ translateY: tagY }] }}>
            <Text style={styles.tagline}>
              {'Cada árbol es un texto.\nAprende a leerlos.'}
            </Text>
          </Animated.View>
        </View>

        {/* CTA section */}
        <View style={styles.ctaSection}>
          {error != null && <Text style={styles.errorText}>{error}</Text>}

          <Animated.View style={{ opacity: ctaOpacity, transform: [{ translateY: ctaY }] }}>
            <Pressable
              style={({ pressed }) => [styles.googleBtn, pressed && styles.googleBtnPressed]}
              onPress={handleGoogleSignIn}
              disabled={loading}
              accessibilityRole="button"
              accessibilityLabel="Continuar con Google"
            >
              {loading
                ? <ActivityIndicator color={Colors.void} size="small" />
                : <Text style={styles.googleBtnText}>Continuar con Google</Text>
              }
            </Pressable>
          </Animated.View>

          <Animated.Text style={[styles.terms, { opacity: termsOpacity }]}>
            Al continuar aceptas los Términos de Uso
          </Animated.Text>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.void,
  },
  heroBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0f2018',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(8,16,10,0.55)',
  },
  glow: {
    position: 'absolute',
    top: '22%',
    alignSelf: 'center',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: Colors.sistema,
    opacity: 0,
  },
  content: {
    flex: 1,
    paddingHorizontal: 32,
    justifyContent: 'space-between',
    paddingTop: 100,
    paddingBottom: 52,
  },
  logoSection: {
    gap: 20,
  },
  logo: {
    fontFamily: Fonts.display,
    fontSize: 42,
    color: Colors.sistema,
    letterSpacing: 2,
  },
  tagline: {
    fontFamily: Fonts.serifItalic,
    fontSize: 18,
    color: Colors.texto,
    lineHeight: 28,
    opacity: 0.85,
  },
  ctaSection: {
    gap: 12,
  },
  errorText: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: '#ff5555',
    textAlign: 'center',
  },
  googleBtn: {
    backgroundColor: Colors.texto,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  googleBtnPressed: {
    backgroundColor: 'rgba(245,234,208,0.85)',
  },
  googleBtnText: {
    fontFamily: Fonts.displayBold,
    fontSize: 14,
    color: Colors.void,
    letterSpacing: 0.3,
  },
  terms: {
    fontFamily: Fonts.bodyLight,
    fontSize: 10,
    color: Colors.texto,
    textAlign: 'center',
  },
})
```

- [ ] **Step 2: Run all tests**

```bash
cd app && npx jest
```

Expected: all tests pass (AuthScreen has no unit tests; existing auth guard tests unaffected).

- [ ] **Step 3: Commit**

```bash
git add app/app/\(auth\)/index.tsx
git commit -m "feat: AuthScreen — immersive hero with Animated stagger sequence"
```

---

## Task 6: ResultScreen — Paginated Snap Chapters

**Files:**
- Modify: `app/app/(app)/result.tsx`
- Create: `app/__tests__/ResultScreen.test.tsx`

- [ ] **Step 1: Write smoke tests**

Create `app/__tests__/ResultScreen.test.tsx`:

```tsx
import React from 'react'
import { render } from '@testing-library/react-native'
import ResultScreen from '../app/(app)/result'

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({
    species: 'Quercus robur',
    symmetry_index: '0.89',
    fibonacci_alignment: '1.61',
    narrative: 'El roble codifica las memorias del suelo.',
    audio_url: null,
    rag_sources: 'Semiosis Botánica,Morfología Fractal',
  }),
  useRouter: () => ({ replace: jest.fn() }),
}))

jest.mock('../components/AudioPlayer', () => ({
  AudioPlayer: () => null,
}))

jest.mock('react-native/Libraries/Utilities/Dimensions', () => ({
  get: () => ({ width: 390, height: 844 }),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
}))

describe('ResultScreen', () => {
  it('renders without crashing', () => {
    expect(() => render(<ResultScreen />)).not.toThrow()
  })

  it('displays species name', () => {
    const { getByText } = render(<ResultScreen />)
    expect(getByText('Quercus robur')).toBeTruthy()
  })

  it('displays symmetry metric', () => {
    const { getByText } = render(<ResultScreen />)
    expect(getByText('0.89')).toBeTruthy()
  })

  it('displays narrative text', () => {
    const { getByText } = render(<ResultScreen />)
    expect(getByText('El roble codifica las memorias del suelo.')).toBeTruthy()
  })

  it('displays RAG source tags', () => {
    const { getByText } = render(<ResultScreen />)
    expect(getByText('Semiosis Botánica')).toBeTruthy()
    expect(getByText('Morfología Fractal')).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run to confirm failure**

```bash
cd app && npx jest __tests__/ResultScreen.test.tsx
```

Expected: FAIL — current result.tsx doesn't have RAG sources chapter or the correct structure.

- [ ] **Step 3: Replace `app/app/(app)/result.tsx`**

```tsx
import { useState } from 'react'
import { View, Text, FlatList, Dimensions, StyleSheet, Pressable } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { AudioPlayer } from '../../components/AudioPlayer'
import { Colors, Fonts } from '../../constants/theme'

const SCREEN_H = Dimensions.get('window').height

type Chapter =
  | { type: 'scan-lock'; species: string }
  | { type: 'metrics'; symmetry: string; fibonacci: string }
  | { type: 'narrative'; narrative: string; audioUrl: string | null }
  | { type: 'rag'; sources: string[] }

export default function ResultScreen() {
  const router = useRouter()
  const [activeChapter, setActiveChapter] = useState(0)

  const { species, symmetry_index, fibonacci_alignment, narrative, audio_url, rag_sources } =
    useLocalSearchParams<{
      species: string
      symmetry_index: string
      fibonacci_alignment: string
      narrative: string
      audio_url: string
      rag_sources?: string
    }>()

  const hasAudio = audio_url != null && audio_url !== 'null' && audio_url.length > 0
  const ragList = rag_sources
    ? rag_sources.split(',').map((s) => s.trim()).filter(Boolean)
    : []

  const chapters: Chapter[] = [
    {
      type: 'scan-lock',
      species: species ?? 'Especie desconocida',
    },
    {
      type: 'metrics',
      symmetry: symmetry_index ? Number(symmetry_index).toFixed(2) : '—',
      fibonacci: fibonacci_alignment ?? '—',
    },
    {
      type: 'narrative',
      narrative: narrative ?? '',
      audioUrl: hasAudio ? audio_url : null,
    },
    ...(ragList.length > 0 ? [{ type: 'rag' as const, sources: ragList }] : []),
  ]

  function handleScroll(e: any) {
    const index = Math.round(e.nativeEvent.contentOffset.y / SCREEN_H)
    if (index !== activeChapter) setActiveChapter(index)
  }

  return (
    <View style={styles.root}>
      <FlatList
        data={chapters}
        keyExtractor={(_, i) => String(i)}
        renderItem={({ item }) => renderChapter(item, router)}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={handleScroll}
        getItemLayout={(_, index) => ({
          length: SCREEN_H,
          offset: SCREEN_H * index,
          index,
        })}
      />

      {/* Spine indicator */}
      <View style={styles.spine} pointerEvents="none">
        {chapters.map((_, i) => (
          <View
            key={i}
            style={[styles.spineDot, activeChapter === i && styles.spineDotActive]}
          />
        ))}
      </View>
    </View>
  )
}

function renderChapter(chapter: Chapter, router: ReturnType<typeof useRouter>): JSX.Element {
  switch (chapter.type) {
    case 'scan-lock':
      return (
        <View style={[styles.chapter, styles.chapterScanLock]}>
          <View style={styles.scanRingOuter}>
            <View style={styles.scanRingMiddle}>
              <View style={styles.scanRingInner} />
            </View>
          </View>
          <Text style={styles.speciesName}>{chapter.species}</Text>
          <Text style={styles.swipeHint}>↓ desliza</Text>
        </View>
      )

    case 'metrics':
      return (
        <View style={[styles.chapter, { backgroundColor: Colors.surface }]}>
          <Text style={styles.chapterLabel}>Análisis estructural</Text>
          <View style={styles.metricsGrid}>
            <View style={[styles.metricCell, { borderColor: Colors.sistemaBorder }]}>
              <Text style={[styles.metricValue, { color: Colors.sistema }]}>{chapter.symmetry}</Text>
              <Text style={styles.metricKey}>Índice de simetría</Text>
            </View>
            <View style={[styles.metricCell, { borderColor: Colors.accionBorder }]}>
              <Text style={[styles.metricValue, { color: Colors.accion }]}>{chapter.fibonacci}</Text>
              <Text style={styles.metricKey}>Proporción Fibonacci</Text>
            </View>
          </View>
          <Text style={styles.swipeHint}>↓ desliza</Text>
        </View>
      )

    case 'narrative':
      return (
        <View style={[styles.chapter]}>
          <Text style={styles.chapterLabel}>Interpretación biosemiótica</Text>
          <Text style={styles.narrativeText}>{chapter.narrative}</Text>
          {chapter.audioUrl && (
            <View style={styles.audioWrap}>
              <AudioPlayer url={chapter.audioUrl} />
            </View>
          )}
          <Pressable
            style={({ pressed }) => [styles.newScanBtn, pressed && { opacity: 0.75 }]}
            onPress={() => router.replace('/(app)/scan')}
            accessibilityRole="button"
          >
            <Text style={styles.newScanText}>Nuevo escaneo</Text>
          </Pressable>
        </View>
      )

    case 'rag':
      return (
        <View style={[styles.chapter, { backgroundColor: Colors.surface }]}>
          <Text style={styles.chapterLabel}>Fuentes del corpus</Text>
          <View style={styles.ragTags}>
            {chapter.sources.map((src) => (
              <View key={src} style={styles.ragTag}>
                <Text style={styles.ragTagText}>{src}</Text>
              </View>
            ))}
          </View>
          <Pressable
            style={({ pressed }) => [styles.homeBtn, pressed && { opacity: 0.6 }]}
            onPress={() => router.replace('/(app)')}
            accessibilityRole="button"
          >
            <Text style={styles.homeBtnText}>← Inicio</Text>
          </Pressable>
        </View>
      )
  }
}

const RING = { outer: 160, middle: 120, inner: 80 }

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.void },

  // Spine
  spine: {
    position: 'absolute',
    right: 14,
    top: '50%',
    transform: [{ translateY: -30 }],
    gap: 6,
    alignItems: 'center',
  },
  spineDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(0,255,136,0.2)',
  },
  spineDotActive: {
    width: 4,
    height: 12,
    borderRadius: 2,
    backgroundColor: Colors.accion,
  },

  // Chapters share full-screen height
  chapter: {
    height: SCREEN_H,
    backgroundColor: Colors.void,
    paddingHorizontal: 28,
    paddingTop: 80,
    paddingBottom: 48,
    justifyContent: 'center',
    gap: 24,
  },
  chapterScanLock: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000',
  },
  chapterLabel: {
    fontFamily: Fonts.displayBold,
    fontSize: 9,
    color: Colors.sistema,
    letterSpacing: 0.2,
    opacity: 0.7,
    textTransform: 'uppercase',
  },

  // Scan lock rings
  scanRingOuter: {
    width: RING.outer,
    height: RING.outer,
    borderRadius: RING.outer / 2,
    borderWidth: 1,
    borderColor: 'rgba(0,255,136,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  scanRingMiddle: {
    width: RING.middle,
    height: RING.middle,
    borderRadius: RING.middle / 2,
    borderWidth: 1,
    borderColor: 'rgba(0,255,136,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanRingInner: {
    width: RING.inner,
    height: RING.inner,
    borderRadius: RING.inner / 2,
    borderWidth: 1.5,
    borderColor: Colors.sistema,
    backgroundColor: 'rgba(0,255,136,0.06)',
  },
  speciesName: {
    fontFamily: Fonts.serifItalic,
    fontSize: 28,
    color: Colors.sistema,
    textAlign: 'center',
    lineHeight: 36,
  },
  swipeHint: {
    fontFamily: Fonts.bodyLight,
    fontSize: 11,
    color: Colors.texto,
    opacity: 0.3,
    textAlign: 'center',
    marginTop: 8,
  },

  // Metrics grid
  metricsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  metricCell: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    backgroundColor: Colors.void,
    gap: 6,
  },
  metricValue: {
    fontFamily: Fonts.display,
    fontSize: 28,
    letterSpacing: 0,
  },
  metricKey: {
    fontFamily: Fonts.bodyLight,
    fontSize: 10,
    color: Colors.texto,
    opacity: 0.5,
  },

  // Narrative
  narrativeText: {
    fontFamily: Fonts.serifItalic,
    fontSize: 16,
    color: Colors.texto,
    lineHeight: 28,
    opacity: 0.9,
    borderLeftWidth: 2,
    borderLeftColor: Colors.accionBorder,
    paddingLeft: 14,
  },
  audioWrap: {
    marginTop: 4,
  },
  newScanBtn: {
    borderWidth: 1,
    borderColor: Colors.sistemaBorder,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  newScanText: {
    fontFamily: Fonts.displayBold,
    fontSize: 12,
    color: Colors.sistema,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },

  // RAG sources
  ragTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  ragTag: {
    backgroundColor: Colors.void,
    borderWidth: 1,
    borderColor: Colors.sistemaBorder,
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  ragTagText: {
    fontFamily: Fonts.displayBold,
    fontSize: 9,
    color: Colors.sistema,
    opacity: 0.7,
    letterSpacing: 0.1,
    textTransform: 'uppercase',
  },
  homeBtn: {
    alignSelf: 'center',
    paddingVertical: 10,
  },
  homeBtnText: {
    fontFamily: Fonts.body,
    fontSize: 11,
    color: Colors.texto,
    opacity: 0.4,
    letterSpacing: 1,
  },
})
```

- [ ] **Step 4: Run tests to confirm pass**

```bash
cd app && npx jest __tests__/ResultScreen.test.tsx
```

Expected: 5 tests passing.

- [ ] **Step 5: Run all tests**

```bash
cd app && npx jest
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add app/app/\(app\)/result.tsx app/__tests__/ResultScreen.test.tsx
git commit -m "feat: ResultScreen — paginated snap chapters with RAG sources + spine indicator"
```

---

## Task 7: HistoryScreen — Cuaderno de Campo

**Files:**
- Modify: `app/app/(app)/history.tsx`

Uses `ScanItem` and `groupScansByDate` from Task 2. Uses `FloatingTabBar` from Task 3.

- [ ] **Step 1: Replace `app/app/(app)/history.tsx`**

```tsx
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

export default function HistoryScreen() {
  const router = useRouter()
  const [sections, setSections] = useState<ScanSection[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
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
          <Pressable onPress={load} style={styles.retryBtn}>
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
                params: {
                  species: item.species,
                  symmetry_index: String(item.symmetry_index),
                  fibonacci_alignment: item.fibonacci_alignment,
                  narrative: item.narrative,
                  audio_url: item.audio_url,
                },
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
        style={styles.playBtn}
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
```

- [ ] **Step 2: Run all tests**

```bash
cd app && npx jest
```

Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add app/app/\(app\)/history.tsx
git commit -m "feat: HistoryScreen — cuaderno de campo with SectionList + FloatingTabBar"
```

---

## Task 8: HomeScreen Token Update + FloatingTabBar

**Files:**
- Modify: `app/app/(app)/index.tsx`
- Modify: `app/app/(app)/_layout.tsx`

This task replaces old `Colors` token references with the new system. The layout and interaction model of HomeScreen are **not redesigned** (out of scope per PRD).

- [ ] **Step 1: Update `app/app/(app)/_layout.tsx`**

```tsx
import { Stack } from 'expo-router'
import { Colors } from '../../constants/theme'

export default function AppLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Colors.void },
        animation: 'fade',
      }}
    />
  )
}
```

No logic change — only `Colors.void` now resolves to `#08100a` instead of `#010808`.

- [ ] **Step 2: Update token references in `app/app/(app)/index.tsx`**

Apply these substitutions throughout `index.tsx`:

| Old | New |
|---|---|
| `Colors.void` | `Colors.void` (unchanged key, new value) |
| `Colors.neon` | `Colors.sistema` |
| `Colors.white` | `Colors.texto` |
| `Colors.cyan` | `Colors.suave` |
| `Colors.ghost` | `Colors.sistemaDim` |
| `Colors.ghostCyan` | `Colors.accionDim` |
| `Colors.borderNeon` | `Colors.sistemaBorder` |
| `Colors.borderCyan` | `Colors.accionBorder` |
| `Colors.cell` | `Colors.surface` |
| `Fonts.display` | `Fonts.display` (unchanged) |
| `Fonts.body` | `Fonts.body` (unchanged) |
| `Fonts.displayBold` | `Fonts.displayBold` (unchanged) |

Also: add `<FloatingTabBar />` as the last child of the root `<View>` in `HomeScreen`, and import it:

```tsx
import { FloatingTabBar } from '../../components/FloatingTabBar'
```

Add `paddingBottom: 100` to `contentContainerStyle` of the `ScrollView` so content doesn't hide under the tab bar.

- [ ] **Step 3: Run all tests**

```bash
cd app && npx jest
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add app/app/\(app\)/index.tsx app/app/\(app\)/_layout.tsx
git commit -m "feat: HomeScreen token update + FloatingTabBar integration"
```

---

## Self-Review

**Spec coverage check:**

| PRD Requirement | Task |
|---|---|
| New design tokens (void, surface, texto, sistema, accion, suave) | Task 1 |
| Playfair Display serif font | Task 1 |
| FloatingTabBar with elevated orange FAB | Task 3 |
| AuthScreen immersive hero + Animated stagger | Task 5 |
| ScanOverlay botanical circle | Task 4 |
| ScanOverlay cyberpunk overlays on detected state | Task 4 |
| ResultScreen snap chapters | Task 6 |
| ResultScreen spine indicator | Task 6 |
| ResultScreen RAG sources chapter | Task 6 |
| HistoryScreen date-grouped SectionList | Task 7 |
| HistoryScreen empty state | Task 7 |
| HomeScreen token update | Task 8 |
| groupScansByDate tested in isolation | Task 2 |
| FloatingTabBar tested | Task 3 |
| BotanicalScanOverlay tested | Task 4 |
| ResultScreen smoke tests per chapter | Task 6 |

**Gaps addressed:** None — all PRD requirements covered.

**Placeholder scan:** No TBDs, no "implement later", all code complete.

**Type consistency:**
- `ScanItem` and `ScanSection` defined in `utils/groupScansByDate.ts` — imported by `history.tsx` ✓
- `Fonts.serifItalic` used in ScanOverlay (Task 4), AuthScreen (Task 5), ResultScreen (Task 6) — defined in Task 1 ✓
- `Colors.accionDim`, `Colors.accionBorder`, `Colors.sistemaBorder`, `Colors.sistemaDim` — all defined in Task 1 ✓
- `Chapter` type used only within `result.tsx` — self-contained ✓
- `FloatingTabBar` imported from `../../components/FloatingTabBar` in history.tsx and index.tsx — created in Task 3 ✓
