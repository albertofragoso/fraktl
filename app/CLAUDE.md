# Frontend (Expo) — CLAUDE.md

> For project-wide context (stack, data flow, architecture decisions) see the root `../CLAUDE.md`.

---

## Setup

```bash
cd app/
npm install
npx expo start          # starts Metro bundler
npx expo start --ios    # open in iOS simulator
npx expo start --android
```

**Required env file:** `app/.env.local` (see root CLAUDE.md for vars)

---

## Project Layout

```
app/
├── app/                        # expo-router file-based routing
│   ├── _layout.tsx             # Root layout: auth guard (Supabase session)
│   ├── (auth)/
│   │   └── index.tsx           # AuthScreen — Google OAuth
│   └── (app)/
│       ├── _layout.tsx         # Stack navigator for app screens
│       ├── index.tsx           # HomeScreen
│       ├── scan.tsx            # ScanScreen — auto-capture camera
│       ├── result.tsx          # ResultScreen — narrative + audio
│       └── history.tsx         # HistoryScreen — past scans list
├── components/
│   ├── ScanOverlay.tsx         # Camera viewfinder guide + hint text
│   └── AudioPlayer.tsx         # play/pause player for TTS audio
├── hooks/
│   └── useFrameDetection.ts    # 1s polling loop → /scan/detect → onValidFrame
├── lib/
│   └── supabase.ts             # Supabase client (SecureStore adapter)
├── constants/
│   └── api.ts                  # API_URL from EXPO_PUBLIC_API_URL
└── __tests__/                  # Jest unit tests
```

---

## Navigation

Uses **expo-router** (file-based). Two route groups:
- `(auth)` — unauthenticated routes (AuthScreen)
- `(app)` — protected routes, redirect to `(auth)` if no Supabase session

To add a new screen: create `app/(app)/my-screen.tsx` and navigate with `router.push('/(app)/my-screen')`.

---

## Auth Pattern

```typescript
// Get session token for API calls
const { data: { session } } = await supabase.auth.getSession()
const token = session?.access_token

// Pass to backend
fetch(`${API_URL}/endpoint`, {
  headers: { Authorization: `Bearer ${token}` }
})
```

Supabase handles token refresh automatically via `autoRefreshToken: true` in `lib/supabase.ts`.

---

## Adding a New Screen

1. Create `app/(app)/screen-name.tsx`
2. **Invoke `frontend-design` skill before writing any UI** — all screens use this skill for production-grade design
3. Use `useRouter()` for navigation, `useLocalSearchParams()` to receive data
4. Add API call using pattern above
5. Write Jest test in `__tests__/`

---

## Testing

```bash
npx jest                     # run all tests
npx jest --watch             # watch mode
npx jest __tests__/MyHook.test.ts
```

Pattern for hooks:
```typescript
import { renderHook, act } from '@testing-library/react-native'
jest.useFakeTimers()
global.fetch = jest.fn()
```

---

## Key Constraints

- **All screens require `frontend-design` skill** before implementation — never write a screen without it.
- `useFrameDetection` polls every 1s — ensure `stopDetection()` is called on unmount to avoid memory leaks.
- Camera permission must be requested before mounting `CameraView` — see `ScanScreen` pattern.
- Images sent to `/scan/detect` are low quality (`quality: 0.3`) to minimize bandwidth; full quality is not needed for heuristic detection.
- Audio files are served from Supabase Storage URLs — `expo-av` loads them by URL, no local caching.
