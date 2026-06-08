# Quiniela (Prediction Game) — Implementation Plan

## Goal
Add an **optional, authenticated prediction game** on top of the existing World Cup 2026 site. The public site stays exactly as it is; a new **Quiniela** section lets registered users predict match scores, earn points, and compete on a **per-domain (group) leaderboard**.

## Guiding principles
- **Public site unchanged** — it stays static, fast, and free. The quiniela is *additive* and auth-gated.
- **Still $0** — Supabase free tier + the existing Vercel + GitHub Actions setup.
- **Security-first** — use **Supabase Auth** (never store raw passwords) and **Row Level Security (RLS)** on every table.
- **No real money** — bragging rights only (see Legal).

## Anonymous vs logged-in — VERY IMPORTANT ✅
- A visitor who is **not logged in sees the site EXACTLY as it is today** — same pages, same behavior, **zero new UI** on the existing Hoy / Calendario / Selecciones / Grupos / Eliminatorias pages.
- Predictions live on their **own page** (`/quiniela`), so nothing is added to the current schedule cards.
- All quiniela routes are **auth-gated**: not logged in → redirected to login. Prediction inputs never appear on the public pages.
- **Entry point (decided):** a **discreet "Iniciar sesión" link** in the header — the only addition for anonymous users. Everything else on the public pages is unchanged. Once logged in, it becomes the gateway to `/quiniela` (predictions + leaderboard).

## Predictions flow (date picker) ✅
The page you described, for logged-in users only:
1. A **date picker** (defaults to the next day with games; limited to Jun 11 – Jul 19, 2026).
2. Shows **that day's matches** — reusing the existing match-card look — each with two small score inputs (home / away).
3. One **“Guardar pronósticos”** button saves all that day's picks at once.
4. Each match shows its state:
   - **Open** — editable, with a "closes at HH:MM" note
   - **Locked** — read-only (within 5 min of kickoff)
   - **Finished** — your pick + the real result + points earned (✓ 3 / ✓ 1 / 0)
5. Respects the existing **Mexico ↔ local timezone** toggle and **ES/EN** switch.

---

## Scoring rules
| Outcome | Points |
|---|---|
| Exact score (e.g. predicted 2–1, final 2–1) | **3** |
| Correct result only (W / D / L) | **1** |
| Wrong | 0 |

- Points are **computed live by a SQL view** from predictions + final results — no batch job to maintain, always correct.
- **Open question:** knockout games (extra time / penalties). Recommended default: score against the **90-minute (regulation) result**, since that's what users predict.

## Prediction window  ✅ (decided)
- **Opens:** as soon as the fixture exists (predict anytime ahead).
- **Closes:** **kickoff − 5 minutes** (shown in Mexico time / the user's chosen zone).
- **Enforced server-side** via an RLS policy that checks the match kickoff time — the client cannot bypass it.
- Users can **edit** their prediction freely until it locks.
- After lock, a user can see **others'** predictions (not before — anti-copying).

---

## Architecture

```
                         ┌─────────────────────────────┐
   football-data.org ──► │  GitHub Action (existing)    │
   (scores/fixtures)     │  + new step: upsert matches  │
                         │    & results into Supabase   │
                         └───────────────┬─────────────┘
                                         ▼
        ┌──────────────────────────────────────────────────┐
        │                  SUPABASE (free)                   │
        │  Postgres  ·  Auth  ·  auto REST API  ·  RLS       │
        │  tables: domains, profiles, matches, predictions  │
        │  view: leaderboard (computes points)              │
        └───────────────┬───────────────────────────────────┘
                        ▼  (anon key + RLS, client-side)
        ┌──────────────────────────────────────────────────┐
        │  Next.js app on Vercel (same project)             │
        │  Public pages = unchanged (static JSON)           │
        │  NEW /quiniela routes (auth-gated, dynamic):      │
        │   • Login / Register                              │
        │   • Mis predicciones (make/edit picks)            │
        │   • Tabla de posiciones (leaderboard by domain)   │
        └──────────────────────────────────────────────────┘
```

- **Supabase is the backend** — Postgres database, built-in Auth, auto-generated APIs, Realtime, and RLS. No custom server to write or host.
- The frontend talks to Supabase directly with the **anon (public) key**; **RLS** is what keeps data safe.
- The **service-role key** (used only by the GitHub Action to upsert match results) stays a secret — never in the frontend.
- Public schedule pages keep reading the static JSON (zero change). Matches are *also* synced into Supabase so the quiniela can enforce deadlines and compute scores.

---

## Data model (Supabase / Postgres)

```sql
-- Groups / leagues. "domain" = sympat, compasCR, compas, medicos, ...
create table domains (
  id          uuid primary key default gen_random_uuid(),
  slug        text unique not null,         -- "sympat"
  name        text not null,                -- "Simpat"
  join_code   text,                         -- optional, to gate joining
  created_at  timestamptz default now()
);

-- One row per user, linked to Supabase Auth.
create table profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  username     text not null,
  display_name text,
  domain_id    uuid references domains(id),
  is_admin     boolean default false,
  created_at   timestamptz default now(),
  unique (domain_id, username)              -- username unique within a domain
);

-- Matches mirrored from the public schedule (synced by the Action).
create table matches (
  id         text primary key,              -- "WC-537327"
  stage      text, "group" text, matchday int,
  datetime   timestamptz not null,
  home_code  text, away_code text,
  home_score int, away_score int,
  status     text                           -- scheduled | live | finished
);

-- One prediction per user per match.
create table predictions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references profiles(id) on delete cascade,
  match_id   text references matches(id),
  pred_home  int not null,
  pred_away  int not null,
  updated_at timestamptz default now(),
  unique (user_id, match_id)
);

-- Leaderboard: points computed live (no stored points).
create view leaderboard as
select pr.id as user_id, pr.username, pr.display_name, pr.domain_id,
  coalesce(sum(case
    when m.status = 'finished'
         and p.pred_home = m.home_score and p.pred_away = m.away_score then 3
    when m.status = 'finished'
         and sign(p.pred_home - p.pred_away) = sign(m.home_score - m.away_score) then 1
    else 0 end), 0) as points,
  count(*) filter (where m.status = 'finished'
         and p.pred_home = m.home_score and p.pred_away = m.away_score) as exact_hits
from profiles pr
left join predictions p on p.user_id = pr.id
left join matches m on m.id = p.match_id
group by pr.id;
```

**Tie-breaker:** points, then `exact_hits`, then earliest join.

---

## Security (Row Level Security) — sketch
- `predictions`: a user can only read/write **their own** rows.
- **Deadline enforced in the policy** (cannot be faked client-side):

```sql
create policy "write own prediction before lock"
on predictions for insert with check (
  auth.uid() = user_id
  and exists (
    select 1 from matches m
    where m.id = match_id
      and now() < m.datetime - interval '5 minutes'   -- locks 5 min before kickoff
  )
);
-- (an equivalent "update" policy)
```

- Others' predictions are only visible **after a match locks** (anti-copying).
- `leaderboard` is readable within your domain (or globally — your call).
- `matches` is read-only to users; only the service role writes results.
- Passwords are handled entirely by **Supabase Auth** (bcrypt-hashed) — we never see or store them.

---

## Auth & domain model  ✅ (decided)
- **Login by domain + username + password**, no email. Supabase Auth maps each user to a synthetic email like `username@<domain-slug>.quiniela` behind the scenes (only username/domain are shown).
  - Trade-off accepted: **no self-service password reset** — an **admin resets** passwords. Fine for office-pool scale.
- **Domains are admin-curated**: you create them (sympat, compasCR, compas, medicos…); users **pick from a list** at signup. No duplicate/typo groups.
- **One domain per user** (an admin can move someone). Multi-domain membership is a possible future extension.

---

## Build phases
- **Phase A — Supabase setup:** create project, tables, view, RLS policies, seed initial domains.
- **Phase B — Match sync:** extend the GitHub Action to upsert matches + results into Supabase (service-role secret).
- **Phase C — Auth:** register/login (domain + username + password), profile creation, session handling.
- **Phase D — Predictions UI:** the **date-picker page** — pick a date → that day's games with score inputs → one submit button. Open/locked/finished states, edit until lock, Mexico-time + ES/EN. Anonymous users hitting `/quiniela` are redirected to login; the public pages are untouched.
- **Phase E — Leaderboard:** per-domain standings (and optional global), with tie-breakers; optional Realtime live updates.
- **Phase F — Domain & admin:** admin screen to manage domains, reset passwords, etc.
- **Phase G — Hardening & ship:** RLS audit, rate limits, edge cases (late joiners, abandoned/postponed matches), deploy.

---

## Free-tier notes (Supabase)
- Free: 500 MB database, 5 GB bandwidth/mo, 50k monthly active auth users — far beyond an office pool.
- ⚠️ Free projects **pause after ~7 days of no activity** — irrelevant during the tournament (daily use); it just sleeps afterward and wakes on demand.
- Total stack remains **$0**.

## Legal / compliance ⚠️ (important)
- A prediction pool **for fun / bragging rights** (no entry fee, no payouts) is generally fine.
- **The moment real money is involved** (entry fees, cash prizes), it can legally become **gambling/betting**, which is regulated and varies by country — that's a different, serious conversation.
- **Strong recommendation:** keep it **money-free**. Add a short "for entertainment only" note. We also keep the FIFA-trademark and no-personal-data posture from the main site (though we now store usernames, so a tiny privacy note is warranted).

## Decisions ✅
- **No real money** — for fun / bragging rights only.
- **Domains: admin-curated** — you create them; users pick from a list.
- **Window: open anytime until kickoff − 5 min.**
- **Login: domain + username + password** (no email; admin resets passwords).

## Still open (smaller calls, can decide during build)
1. **Knockouts:** score on the 90-minute result, or on the final incl. extra time/penalties? *(Recommended: 90-minute result.)*
2. **Leaderboard scope:** per-domain only, or also a global board across all domains? *(Per-domain is the core ask; global is easy to add.)*
3. **Tie-breakers:** points → exact hits → ? (e.g., a predicted "champion" bonus).

## Future ideas (not now)
- Predict-the-champion / golden-boot bonus, streak badges, per-matchday MVP.
- Realtime leaderboard that updates as goals land.
- Shareable result cards, push notifications when your pick locks.
