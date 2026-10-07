# Deploying the Codex beta

## Recommended: Vercel (simplest for this Vite SPA)

1. Sign up at vercel.com (free tier) and import this repo/folder.
   - If the code isn't in git yet: `git init && git add -A && git commit -m "beta"` then push to a GitHub repo and import that in Vercel.
2. Build settings (auto-detected for Vite, verify):
   - Build command: `npm run build`
   - Output directory: `dist`
3. The included `vercel.json` handles SPA rewrites (all routes → `index.html`) and PWA headers. No extra config needed.
4. Environment variables (Vercel dashboard → Project → Settings → Environment Variables):
   - `VITE_SUPABASE_URL` = your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY` = your Supabase publishable/anon key
   - Never commit `.env` — it's gitignored.
5. Deploy. You'll get a `*.vercel.app` URL instantly; add your custom domain later in Vercel → Settings → Domains.

## Alternative: Fly.io

Needs a Dockerfile serving `dist/` via nginx with an SPA fallback (`try_files $uri /index.html`). ~15 min of setup — ask and it gets added. Useful if you ever want the API and frontend on one host (v2, backend engine port).

## Post-deploy checklist

- [ ] Sign up with a test email → confirm login works
- [ ] Complete onboarding with a test birth profile → "Is this your chart?" shows sane placements
- [ ] Home screen renders today's reading
- [ ] Pattern Log entry saves and reloads
- [ ] Add to Home Screen on iOS/Android → app opens standalone
- [ ] Supabase dashboard → Authentication → Users shows the test user; Table Editor → profiles/pattern_logs rows respect RLS

## Notes

- Google OAuth is stubbed for beta (email/password works now). Enabling it later requires a Google Cloud OAuth client + the Supabase redirect URL allowlist — ~20 min when you want it.
- Stripe wiring is v2 of this doc (account lands ~2 weeks out as of 2026-10-06).
- The daily web-push job is v1.5; VAPID plumbing exists, no scheduler yet.
