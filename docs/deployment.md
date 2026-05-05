# Fraktl — Deployment Guide

> Related: [Architecture](./architecture.md) | [API Reference](./api-reference.md)

---

## Backend — Railway (Docker)

### Prerequisites

- Railway account + project created
- Supabase project set up (see root CLAUDE.md)
- OpenAI API key

### First deploy

```bash
# Install Railway CLI
npm install -g @railway/cli
railway login

# From backend/
railway init       # link to Railway project
railway up         # build Docker image and deploy
```

### Environment variables

Set these in Railway dashboard → Variables:

```
OPENAI_API_KEY=sk-...
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_SERVICE_KEY=eyJ...
SUPABASE_JWT_SECRET=your-jwt-secret
```

### Persistent volume (ChromaDB)

In Railway dashboard → Service → Volumes:
- Mount path: `/app/chroma_db`
- Size: 1GB (sufficient for initial corpus)

Or via `railway.toml` (already configured):
```toml
[[deploy.volumeMounts]]
  mountPath = "/app/chroma_db"
  name = "chroma-volume"
```

**First deploy cold start:** ~60s extra for RAG seed (Wikipedia fetch + ChromaDB indexing). Subsequent deploys reuse the volume — instant startup.

### Dockerfile notes

```dockerfile
# libgl1 and libglib2 required for OpenCV
RUN apt-get install -y libgl1-mesa-glx libglib2.0-0
```

Without these, `import cv2` fails at runtime.

### Health check

Railway uses `GET /health` to verify the service is up (`healthcheckPath = "/health"`). Returns `{"status": "ok"}` when ready.

### Redeploying

```bash
railway up
```

Or push to the linked git branch — Railway auto-deploys on push if configured.

---

## Frontend — Expo

### Development

```bash
cd app/
npx expo start
```

Open on:
- iOS simulator: press `i`
- Android emulator: press `a`
- Physical device: scan QR code with Expo Go

### Environment

`app/.env.local` for local dev:
```
EXPO_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
EXPO_PUBLIC_API_URL=http://localhost:8000
```

For production build, set `EXPO_PUBLIC_API_URL` to the Railway service URL.

### Production build (EAS)

```bash
npm install -g eas-cli
eas login

# Configure (first time)
eas build:configure

# Build for iOS
eas build --platform ios

# Build for Android
eas build --platform android
```

**EAS requires:** Apple Developer account (iOS) or Google Play account (Android).

### Expo Go vs standalone

- **Development:** Expo Go app (no certificates needed)
- **Production:** Standalone build via EAS (required for App Store / Google Play)

---

## Supabase Setup Checklist

- [ ] Create project at supabase.com
- [ ] Run schema SQL (from `docs/architecture.md` — Database Schema section)
- [ ] Create Storage buckets: `scans` (public) and `audio` (public)
- [ ] Enable Google OAuth: Authentication → Providers → Google
  - Add Google Cloud Console OAuth 2.0 Client ID + Secret
  - Callback URL: `https://<project>.supabase.co/auth/v1/callback`
- [ ] Copy `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `SUPABASE_JWT_SECRET`, `SUPABASE_ANON_KEY` to `.env` files

---

## Local Development (Full Stack)

```bash
# Terminal 1 — Backend
cd backend
uvicorn app.main:app --reload --port 8000

# Terminal 2 — App
cd app
EXPO_PUBLIC_API_URL=http://localhost:8000 npx expo start
```

On iOS simulator, `localhost` resolves correctly. On physical device, use your machine's local IP (e.g., `http://192.168.1.x:8000`).

---

## Monitoring

- Railway dashboard: logs, metrics, volume usage
- Supabase dashboard: auth users, database rows, storage usage
- OpenAI platform: API usage, costs per model

**Cost estimate (MVP scale, ~100 scans/day):**

| Service | Usage | Est. cost/month |
|---|---|---|
| GPT-4o Vision | 200 calls/day (2 per scan) | ~$18 |
| OpenAI TTS | 100 calls/day | ~$4 |
| Railway | 1 service + 1GB volume | ~$5 |
| Supabase | Free tier | $0 |
| **Total** | | **~$27/month** |
