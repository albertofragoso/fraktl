# Issue 06 — Botanical Cyberpunk Frontend Redesign

**Type:** AFK

---

## Problem Statement

The current Fraktl UI uses a pure Cyberpunk aesthetic (neon green on void black, terminal-style typography, corner brackets, hacker copy). This aesthetic works technically but clashes with the app's core identity: it is a *botanical* and *biosemiotic* experience about trees. Users who scan a 247-year-old oak and receive a lyrical narrative about "the memories encoded in bark" see that narrative rendered in a monospace-adjacent font on a screen that looks like a debugging terminal. The emotional register of the visual design contradicts the emotional register of the product.

## Solution

Evolve the visual system to a **Botanical Cyberpunk hybrid**: keep the dark void backgrounds, neon data system, and tech-forward data overlays, but introduce organic typography (Playfair Display serif for species names and narrative), a warmer accent color (orange #ff6b00 alongside the existing green), and layouts that treat each tree scan as a ritual — immersive, chapter-based, journaled.

All four main screens are redesigned. Navigation gains a floating pill tab bar with an elevated orange FAB. The design token system is replaced entirely.

## User Stories

1. As a user opening Fraktl for the first time, I want to see a full-screen botanical hero image with an animated logo reveal, so that the app communicates its identity before I even log in.
2. As a user on the AuthScreen, I want the "Continuar con Google" button to appear after the logo and tagline have animated in, so that the entry sequence feels intentional and premium.
3. As a user, I want the app's color system to feel like a dark forest at night — deep organic greens with neon biological readings — rather than a generic hacker aesthetic, so that the visual experience matches the biosemiotic content.
4. As a user, I want species names rendered in a serif italic typeface, so that they feel like entries in a field naturalist's notebook rather than computer output.
5. As a user pointing my camera at a tree, I want the viewfinder to be a circular organic frame (like a botanist's lens), so that the scanning metaphor aligns with observation rather than surveillance.
6. As a user actively scanning, I want the viewfinder to show only the botanical circle while searching, so that the UI doesn't compete with the camera feed.
7. As a user whose tree has been detected by the camera, I want technical data overlays (ISO, focus, lux) to appear alongside the circle, so that I get a sense of analysis in progress without overwhelming the waiting state.
8. As a user who receives a scan result, I want to experience the result as three sequential full-screen chapters — species identification, structural metrics, and biosemiotic narrative — so that the information is revealed progressively rather than dumped at once.
9. As a user on the Scan Lock chapter, I want to see the species name in Playfair Display italic with neon green, centered on a dark background, so that the identification moment feels cinematic.
10. As a user on the Metrics chapter, I want to see a 2×2 grid of structural data (symmetry index and estimated rings in green; Fibonacci ratio and height in orange), so that I can distinguish botanical measurements from mathematical patterns.
11. As a user on the Narrative chapter, I want the biosemiotic interpretation in a Playfair Display blockquote with an orange audio waveform bar below it, so that reading and listening are presented as a unified act.
12. As a user on the Narrative chapter, I want a chapter indicator (vertical spine dots on the right edge) showing my position across chapters, so that I can orient myself without visual clutter.
13. As a user who finishes reading the narrative, I want to swipe to a RAG sources chapter that lists the botanical corpus tags that informed the interpretation, so that I can understand the epistemic grounding of what I read.
14. As a user navigating the app, I want a floating pill tab bar at the bottom of the screen with a raised orange FAB in the center, so that I can always start a new scan without leaving the current screen.
15. As a user browsing my scan history, I want entries grouped by date with clear date headers, so that I experience my scans as a chronological field journal.
16. As a user viewing a history entry, I want to see a thumbnail, the species name in Playfair Display, a location pin, botanical metric chips, and an orange play button, so that I can quickly recall the context of each scan without tapping into it.
17. As a user with no scan history, I want an empty state that communicates I haven't started my botanical record yet, so that the absence of data feels intentional rather than broken.
18. As a user with many scans, I want the history list to remain performant and scannable with 50+ entries, so that the cuaderno de campo metaphor doesn't become a burden.
19. As a user with motion sensitivity, I want entry animations to be skipped if reduce-motion is enabled, so that I can use the app comfortably.

## Implementation Decisions

### Design Token System

Replace the current `Colors` and `Fonts` exports in `constants/theme.ts` with a new token set:

- `void` — `#08100a` — primary background
- `surface` — `#0f2018` — cards, panels, overlays
- `texto` — `#f5ead0` — primary text (warm cream, replaces cold `#e0ffe8`)
- `sistema` — `#00ff88` — neon green for system data, labels, active states
- `accion` — `#ff6b00` — orange for CTAs, audio controls, FAB, Fibonacci data
- `suave` — `#ffaa44` — warm amber for narrative section labels

Typography adds **Playfair Display** (400 regular, 400 italic, 700 bold) alongside the existing Syne and Space Grotesk. Font roles:

- `Syne` — system labels, nav items, uppercase data tags
- `Playfair Display` — species names, hero taglines, narrative blockquotes (always at contrast-critical sizes)
- `Space Grotesk` — body text, metadata, secondary descriptions

Install `@expo-google-fonts/playfair-display`. Load all three weights in the root `_layout.tsx` via `useFonts`.

### FloatingTabBar Component

A new standalone component encapsulating the floating navigation pill. It is rendered by the screens that host it (HomeScreen, HistoryScreen) — not injected by the layout.

Three elements:
1. Left tab — Home icon, navigates to `/(app)/`
2. Center FAB — orange circle, elevated (larger, `shadowOffset` / `elevation`), navigates to `/(app)/scan`
3. Right tab — History icon, navigates to `/(app)/history`

Active tab is derived from `usePathname()` — no prop drilling. The component knows its own active state.

### BotanicalScanOverlay (replaces ScanOverlay)

The component gains a `state` prop: `'scanning' | 'detected'`.

**Scanning state**: Three concentric circles (radii ~140, ~105, ~65px; opacity 0.22, 0.33, 0.55; border 1px solid `sistema`). A crosshair (horizontal + vertical 1px lines) at center. Hint text in Playfair italic below.

**Detected state**: Same circles + crosshair, plus four data overlay labels positioned at cardinal edges: `ISO / AUTO` (top-left), `FOCO / ████` (left), `LUX / 847` (top-right), `MODO / BOT` (right). Labels use Syne 7px `sistema` color. The transition from scanning → detected can be a simple opacity fade on the overlays.

The existing `hint` prop is retained for the scanning state text.

The `ScanScreen` passes state based on its internal detection status: `'scanning'` while `useFrameDetection` is polling, `'detected'` briefly when a valid frame is found (before navigation to result).

### ResultScreen — Paginated Chapter Architecture

Replace the current `ScrollView` with a `FlatList` configured with `pagingEnabled`, `horizontal` false (vertical paging), `showsVerticalScrollIndicator` false, and `scrollEventThrottle` for spine updates.

Four chapter data objects are constructed from `useLocalSearchParams` and passed as the FlatList `data`. Each chapter renders a full-screen `View` (height = window height).

Chapter shapes:
- **ScanLock**: species name (Playfair italic, `sistema`), scan ring (concentric circles, same as overlay but static), confidence if available
- **Metrics**: 2×2 grid — symmetry index + estimated rings (border `sistema`) / fibonacci ratio + height (border `accion`)
- **Narrative**: blockquote (Playfair italic, `texto` 80% opacity, left border `accion`), audio waveform bar with play button
- **RAG Sources**: corpus tag chips from a `rag_sources` param (comma-separated string, split on render), fallback empty state if param absent

Spine indicator: a `View` with one dot per chapter, positioned `absolute right:12`. Active dot is `accion`, taller (12px), border-radius 2. Inactive dots are `sistema` at 20% opacity, 4×4px circles. Updated via `onScroll` → `contentOffset.y / windowHeight` → `Math.round` → active index.

The `audio_url` null-safe pattern from `AudioPlayer` (already in the codebase) is preserved unchanged.

### HistoryScreen — SectionList with Date Grouping

Replace `FlatList` with `SectionList`. A pure utility function `groupScansByDate(scans: ScanItem[]): Section[]` transforms the flat array into sections keyed by formatted date strings. This function is the primary unit of isolated testability.

Date grouping logic:
- "Hoy" if `scanned_at` is today (compare by calendar date, not 24h window)
- "Ayer" if yesterday
- `"DD MMM"` (e.g. "23 May") for anything older — using `toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })`

Each entry row: 44×44 `Image` (or placeholder `View` if `image_url` null) + species in Playfair Display 13px + location pin emoji + location string (if available — `location` field may be absent, render nothing if so) + chip row + orange play button that invokes `router.push` to result screen.

Chips: symmetry as `X.XX sim` (green chip), fibonacci as `φ X.XX` (orange chip), estimated rings as `NNN a` (green chip). Chips only render if the underlying value is non-null.

The play button triggers navigation to `/(app)/result` with the same params as the existing item press — no behavior change, just a distinct tappable affordance.

### AuthScreen Animation Sequence

The existing OAuth logic (`handleGoogleSignIn`, WebBrowser session, Supabase `setSession`) is unchanged. Only the visual layer changes.

Replace `FraktlSigil` and the terminal-style layout with:

- Full-screen `ImageBackground` using a bundled botanical hero image (`assets/auth-hero.webp`)
- Dark overlay `View` (rgba 0,0,0,0.35) for legibility
- Logo text ("fraktl") + tagline in Playfair italic + Google CTA button + terms text

Animation sequence using `Animated` API (not Reanimated — not installed):

```
T=0:    [background visible, all content opacity=0]
T=400:  logo: opacity 0→1, translateY -28→0, 600ms, Easing.out(cubic)
T=700:  tagline: opacity 0→1, translateY 10→0, 500ms, Easing.out(quad)
T=1000: CTA: opacity 0→1, translateY 24→0, 400ms timing + spring (damping 18, stiffness 120)
T=1150: terms: opacity 0→0.4, 300ms
T=1200: logo glow: infinite loop 0.2↔0.7 opacity, 2200ms sin easing each direction
```

Cleanup: all `Animated.loop` refs are stopped in `useEffect` return.

If `AccessibilityInfo.isReduceMotionEnabled()` resolves true, all `duration` values are set to 0 and delays to 0 — content renders at final state immediately.

The hero image (`auth-hero.webp`) is a dark botanical photo (bark close-up or canopy bokeh). For the initial implementation, use a placeholder gradient `View` if the asset is not yet available — the code must not crash on a missing asset.

### Navigation Architecture

The `(app)/_layout.tsx` remains a `Stack` navigator. `FloatingTabBar` is not injected by the layout — it is rendered at the bottom of the screens where it belongs (HomeScreen, HistoryScreen). This avoids any expo-router layout restructuring.

ScanScreen and ResultScreen render without the FloatingTabBar — they are full-screen experiences.

## Testing Decisions

**What makes a good test here:** test observable output (rendered elements, navigation calls, grouped data shape) — not internal Animated values, not implementation details of how the animation sequence is structured.

**Modules to test:**

1. `groupScansByDate` utility — pure function, zero dependencies. Input: array of `ScanItem` with `scanned_at` ISO strings. Output: `Section[]` with `title` and `data`. Test cases: today, yesterday, older entries, mixed order, empty array. This is the highest-value isolated test in the redesign.

2. `FloatingTabBar` — render test. Verify active tab indicator appears on the correct item given a mocked `usePathname()` return value. Verify FAB renders with orange background.

3. `BotanicalScanOverlay` — render test. Given `state='scanning'`: data overlays not present. Given `state='detected'`: data overlays present. Verify `hint` text renders.

4. `ResultScreen` chapters — one smoke test per chapter: given the correct params, the chapter renders without crashing and displays the species name / metrics / narrative text / RAG tags respectively.

**Prior art:** `__tests__/AudioPlayer.test.tsx` and `__tests__/useFrameDetection.test.ts` show the project's testing patterns (React Native Testing Library + jest fake timers + `jest.fn()` for fetch/navigation). New tests should follow the same import and mock structure.

**Not tested:** AuthScreen animation timing (internal Animated state), exact pixel positions of UI elements, visual appearance of colors/fonts.

## Out of Scope

- **HomeScreen** (`app/(app)/index.tsx`) — design not decided in this session. Token updates (replacing old Colors references) should be applied mechanically, but the layout and interaction model are not redesigned here.
- Backend changes of any kind.
- Lottie animations — deferred to v2.
- `expo-linear-gradient` — not installed; gradients achieved via `backgroundColor` layering.
- `react-native-reanimated` — not installed; all animations use the existing `Animated` API.
- Custom hero photo production — `auth-hero.webp` is out of scope; placeholder gradient is acceptable for the initial implementation.
- Onboarding / splash screen.
- Error state redesign (global error UI).
- Dark/light mode toggle.

## Further Notes

- The `accion` token name avoids the ó accent to keep identifier-safe across all JS/TS contexts.
- Playfair Display should only be used at sizes ≥ 12px — below that, the serifs become illegible on OLED screens at the target void background.
- The ScanOverlay state transition (scanning → detected) is intentionally abrupt (no cross-fade) to communicate a definitive detection event rather than a gradual process.
- The ResultScreen chapter snap is vertical (not horizontal) — this matches the natural thumb-swipe gesture and keeps the chapter metaphor as "turning a page down" rather than "swiping through cards."
- RAG sources chapter renders only if `rag_sources` param is a non-empty string — the chapter is silently omitted otherwise, keeping the chapter count at 3.
