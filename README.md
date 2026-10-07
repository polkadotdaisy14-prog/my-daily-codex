# My Daily Codex — multi-user beta web app

A mobile-first PWA where each user enters their birth data once and gets their
own Daily Codex every day: transits, multi-system convergence, the emergent
phenomenon, and a field observation — with a free/paid tier line.

All five systems (astrology, Human Design incl. 88° solar-arc Design-side,
Gene Keys, Pythagorean numerology, Ladini Destiny Matrix) compute **client-side**
in v1 via `src/lib/engine/` (validated: 17/17 vitest tests, including a
Swiss-Ephemeris-verified natal chart). The backend is managed Supabase
(auth + Postgres); no custom server.

## Quick start

```bash
npm install
npm run dev      # local dev server
npm test         # vitest (engine tests)
npm run build    # tsc strict + vite build (must pass)
```

## Environment

Copy `.env.example` to `.env` and fill in what you have:

| Variable | Required | Purpose |
|---|---|---|
| `VITE_SUPABASE_URL` | yes, for hosted beta | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | yes, for hosted beta | Supabase anon key |
| `VITE_VAPID_PUBLIC_KEY` | no | Web-push VAPID public key (enables the push toggle) |

**Local beta mode:** when the Supabase vars are missing, the app skips login
entirely (dev banner: "Local beta mode — no Supabase configured") and persists
the profile + Pattern Log in `localStorage`. Everything works end-to-end with
no backend.

## Applying the database migration

1. Open the Supabase dashboard → SQL Editor.
2. Paste `supabase/migrations/0001_init.sql` and run it.
3. Tables: `profiles` (one row per user, RLS: own profile only) and
   `pattern_logs` (one row per user per date, RLS: own logs only),
   plus `updated_at` triggers.

## Nominatim usage policy (geocoding)

Birth-place search uses OpenStreetMap Nominatim (`src/lib/engine/geo.ts`):

- Max **1 request/second** — enforced by a client-side throttle.
- Results are **cached in localStorage** per query; repeat searches never hit the network.
- Browsers can't set a custom `User-Agent`, so the app is identified by the page
  `Referer`/`Origin`; queries are debounced (~300ms) to keep volume minimal.
- If Nominatim rate-limits us, the onboarding place step shows a clear
  "try again in a moment" message instead of failing silently.

See <https://operations.osmfoundation.org/policies/nominatim/> for the full policy.

## Tiers (beta stubs)

- **Free:** what's happening + what to watch — full transit info, PRIMARY and
  secondary convergences with the emergent phenomenon, where to notice it, one
  concrete manifestation, the field observation prompt, and the Pattern Log.
- **Paid ($3.99/mo):** the full explained version — "Why this is primary",
  REINFORCES & COMPLICATES, the evidence chain, Technical section, secondary
  deep-dives, full log history.

The paywall is tier-gated on `profile.tier` today. Stripe subscriptions and the
customer portal are **v2** — they get wired when the Stripe account lands
(~2 weeks out). In beta, Account → "Preview paid (beta)" flips the tier locally
so the unlocked stubs can be reviewed.

## Push notifications — v1.5

`src/lib/push.ts` handles VAPID subscribe/unsubscribe and stores the
subscription on `profiles.push_subscription`. The **daily "your Codex is ready"
push job** (morning, user timezone) is v1.5 — not built yet. The Account screen
exposes the toggle now so subscriptions can be collected ahead of it.

## Project map

```
src/lib/engine/      validated chart engine (ephemeris, angles, geo, charts, symbolic)
src/lib/reading/     daily reading pipeline (theme tagging → convergence → phenomenon)
src/lib/supabase.ts  client bootstrap + isConfigured() (local-beta fallback)
src/lib/profile.ts   profile load/save (Supabase or localStorage)
src/lib/log.ts       Pattern Log CRUD (Supabase or localStorage)
src/lib/push.ts      VAPID push helpers (v1.5 job noted above)
src/auth/            AuthContext (email/password + Google OAuth), local-mode bypass
src/pages/           Login, Onboarding, Home, Reading, Charts, Log, Account
src/components/      BottomNav, Fab, PaywallGate, InstallPrompt
supabase/migrations/ 0001_init.sql — profiles + pattern_logs + RLS
public/              manifest.webmanifest, sw.js (app-shell cache-first), icon.svg
legal/               privacy policy + terms DRAFTS (reviewed in-house before charging)
```

## Methodology notes (enforced in code)

- Astronomical fact / system interpretation / psychological reading /
  speculative synthesis stay separate; symbolic systems are never presented as
  proven causal mechanisms.
- Convergence = a theme family tagged by **≥2 distinct systems** (Gene Keys
  enriches convergent gates; it never tags). Natal houses are the landing,
  never a tag.
- Unknown birth time → angles/houses are null; the UI renders explicit
  missing-data states, never invented placements.
- Field observations invite noticing the emergent phenomenon in plain language;
  they never ask the user to confirm a transit.
