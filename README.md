# CalAI — Smart Calendar PWA

A calendar that thinks with you. Built mobile-first as a PWA, deployable to Netlify in minutes.

## Stack
- Vanilla JS + CSS (no framework — fast, lightweight, no build step)
- Anthropic Claude API for AI assistant
- Service Worker for offline support
- Netlify for hosting

## Deploy in 3 steps

1. **Clone / unzip** this folder
2. **Deploy to Netlify** — drag the folder into netlify.com/drop
3. **Add API key** — set `ANTHROPIC_API_KEY` as a Netlify environment variable

> Note: The API key is currently handled by Claude.ai's built-in proxy in dev mode. For production, route calls through a Netlify serverless function (see roadmap below).

## Project structure

```
calai/
├── index.html          # App shell
├── manifest.json       # PWA manifest
├── sw.js               # Service worker
├── netlify.toml        # Routing + headers
├── css/
│   └── app.css         # All styles
├── js/
│   ├── calendar.js     # Calendar views + event data
│   ├── ai.js           # Claude API + sheet UI
│   └── app.js          # Init + event listeners
└── icons/
    ├── icon-192.png
    └── icon-512.png
```

## Roadmap

### Phase 1 — MVP (current)
- [x] Mobile-first week + month views
- [x] AI assistant dock (always visible)
- [x] Quick prompt chips
- [x] Swipe navigation
- [x] Dark mode
- [x] PWA installable
- [x] Offline support

### Phase 2 — Real data
- [ ] Google Calendar OAuth integration
- [ ] Read/write real events
- [ ] Multiple calendar support (work, personal, Extivity, KDP)

### Phase 3 — Intelligence
- [ ] Goal-aware scheduling (knows your projects and priorities)
- [ ] Proactive nudges ("Turkey in 34 days, no prep blocked")
- [ ] Time blocking mode — describe your week, AI drafts it
- [ ] Conflict detection

### Phase 4 — SaaS
- [ ] Auth (Supabase)
- [ ] Freemium billing (Stripe) — Free: 10 AI msgs/mo, Pro: £8/mo
- [ ] Onboarding flow (connect calendar, set goals)
- [ ] Usage analytics

### Phase 5 — Native
- [ ] Port to React Native (iOS + Android app store)

## Naming ideas (TBD)
- Tempo
- Orbit
- Kron
- Sage
- Dayo
