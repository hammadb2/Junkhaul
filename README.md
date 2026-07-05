# Junk Haul Calgary

Same-day junk removal platform for Calgary — instant photo-based quoting, online
booking with a $50 deposit, SMS lifecycle automation, an operator dispatch dashboard
with route optimisation, and AI voice agents for phone bookings.

**Stack:** Next.js 15 (App Router, JavaScript) · Supabase (Postgres + pg_cron + Edge
Functions) · Stripe (CAD deposits) · Quo (SMS) · Groq Llama-4 Scout (photo/description
AI) · OpenStreetMap (Nominatim geocoding + OSRM routing + Leaflet maps) · Vapi (voice).

Business rules: operates **Thursdays & Sundays**, all times **America/Edmonton**,
$50 deposit, prices $99 / $160 / $240 / $380, add-ons same-day +$50 / stairs +$25 per
flight / freon +$40.

---

## 1. Local setup

```bash
npm install
cp .env.example .env.local   # fill in real values (see section 2)
npm run dev                  # http://localhost:3000
```

Key routes:
- `/` — landing
- `/book` — 5-step booking flow (photo → load → schedule → details → pay)
- `/waitlist` — waitlist signup
- `/pay/[id]` — deposit payment link (used by phone/voice bookings)
- `/admin` — operator dispatch dashboard (password protected; login at `/admin/login`)

## 2. Environment variables

See `.env.example` for the full list. Every secret goes in `.env.local` (gitignored) —
**never commit real keys**. Use Stripe **test** keys (`sk_test_`/`pk_test_`) for dev.

## 3. Supabase setup

1. Create a project, then run the migrations (SQL editor or CLI):
   - `supabase/migrations/0001_init.sql` — tables, RLS, triggers, helper functions
   - `supabase/migrations/0002_storage.sql` — public `booking-photos` bucket
2. Deploy the Edge Functions:
   ```bash
   supabase functions deploy generate-slots morning-reminders day-summary \
     review-requests no-show-check risk-reminders
   ```
   Set their secrets (function env): `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
   `QUO_API_KEY`, `QUO_PHONE_NUMBER`, `QUO_USER_ID`, `HAMMAD_PHONE`,
   `GOOGLE_BUSINESS_REVIEW_LINK`, `SITE_URL`.
3. Schedule the crons: open `supabase/cron.sql`, replace `{SUPABASE_URL}` and
   `{SUPABASE_ANON_KEY}` (or a function secret), and run it. All jobs are scheduled in
   **UTC** but each function guards on Calgary-local time, so they're DST-safe.

Cron schedule (Calgary intent → guarded in-function):
| Job | When (Calgary) |
| --- | --- |
| generate-slots | Mondays 5 AM (creates 8 weeks of Thu/Sun slots) |
| morning-reminders | Daily 7 AM (texts customers with a job today) |
| day-summary | Thu/Sun 6 AM (texts operator the day's route) |
| review-requests | Every 30 min (review link ~1h after completion) |
| no-show-check | Every 30 min, 7 AM–5 PM (late-job alerts) |
| risk-reminders | Daily 8 PM (extra nudge to high-risk jobs tomorrow) |

## 4. Stripe

- Add the webhook endpoint `https://<domain>/api/stripe-webhook` for events
  `payment_intent.succeeded` and `payment_intent.payment_failed`; put the signing
  secret in `STRIPE_WEBHOOK_SECRET`.
- Deposits are $50 CAD PaymentIntents. On success the webhook confirms the booking,
  reserves the slot, and fires the confirmation/operator SMS.

## 5. Quo (SMS)

- Outbound texts use the Quo REST API (`lib/sms.js`).
- Point Quo's inbound webhook at `https://<domain>/api/sms-webhook`. It logs messages
  and handles `YES` (load upgrade / waitlist claim), `STOP`, and `HELP`, forwarding
  anything else to the operator.

## 6. Vapi (voice agents)

Everything for Vapi lives in `docs/vapi/`:
- `knowledge-base.txt` — upload to the Vapi Knowledge Base, attach to both agents.
- `booking-agent-prompt.md` (Jordan) and `cs-agent-prompt.md` (Casey) — system prompts.
- `tools.json` — the 7 function tools. Set each tool's (or the assistant's) server URL
  to `https://<domain>/api/vapi` with header `x-vapi-secret: <VAPI_SERVER_SECRET>`.

The single `/api/vapi` route handles tool calls and logs `end-of-call-report`s into the
`phone_calls` table.

## 7. Deploy (Vercel)

1. Import the repo, add all env vars from `.env.local`.
2. Set `NEXT_PUBLIC_SITE_URL` to the production domain (`https://junkhaul.ca`).
3. After deploy, update the Stripe webhook, Quo inbound webhook, and Vapi server URLs to
   the production domain.

## 8. Admin

`/admin` is protected by `ADMIN_PASSWORD` (hashed into an httpOnly cookie via
`middleware.js`). The dashboard shows upcoming jobs by day, flags/risk, photos, route
optimisation (OSRM nearest-neighbour from the NE depot), and complete/cancel/reschedule
actions.

## Scripts

```bash
npm run dev      # dev server
npm run build    # production build
npm run start    # serve production build
npm run lint     # eslint
```
