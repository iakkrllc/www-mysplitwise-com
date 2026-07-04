# mysplitwise — Technical Documentation

This is the detailed technical reference for **mysplitwise.com**, a Mysplitwise-style bill-splitting app. It complements the shorter architecture summary in `README.md` — this file goes deeper into data models, request flows, and the reasoning behind key decisions, so future work (by a person or an AI assistant) can extend the app consistently instead of guessing.

## Table of contents

1. [Overview](#overview)
2. [Repository layout](#repository-layout)
3. [Frontend](#frontend)
4. [Backend & API](#backend--api)
5. [Database schema](#database-schema)
6. [Authentication & authorization](#authentication--authorization)
7. [Business logic](#business-logic)
8. [AI features](#ai-features)
9. [Security & observability](#security--observability)
10. [Admin / staff console](#admin--staff-console)
11. [Integrations](#integrations)
12. [Mobile app](#mobile-app)
13. [Deployment & environments](#deployment--environments)
14. [Conventions to follow when extending this app](#conventions-to-follow-when-extending-this-app)

---

## Overview

mysplitwise lets people track shared expenses and settle up with friends, similarly to Mysplitwise. It is a single Next.js codebase serving:

- A marketing/landing page (`/`)
- The signed-in web app (`/app`)
- Email/phone auth pages (`/login`, `/signup`)
- An internal staff/admin console (`/admin`)
- A JSON API (`/api/*`) that is the only thing allowed to touch the database
- A native iOS/Android shell (via Capacitor) that just loads the live website

Everything a real user does — adding an expense, adding a friend, settling up — is stored in **Supabase Postgres** and shared live between the people involved. There is no "local-only" or demo mode: `localStorage` is used only as a fast-loading cache, never as the source of truth.

## Repository layout

```
src/
  app/                    Next.js App Router pages + API routes
    (marketing/app pages) page.tsx, /app, /login, /signup, /admin, /privacy, /terms
    api/                  every server endpoint (see "Backend & API")
  components/
    dialogs/              one file per modal (add expense, settle up, CSV import, ...)
    views/                one file per main app screen (dashboard, account, friends, ...)
    landing/              marketing page sections
    ui/                   shadcn/ui primitives (button, dialog, select, switch, ...)
    app-shell.tsx          mounts every dialog + routes between views
  lib/
    store.tsx             the client app-state Context (see "Frontend")
    ui-store.tsx           modal/command-palette UI state Context
    sync-api.ts            typed wrappers around every /api/* call
    api-client.ts           low-level fetch wrapper that attaches the session bearer token
    auth-store.tsx          Supabase Auth Context (sign up/in, OTP, password/phone change)
    supabase.ts             browser Supabase client (anon key)
    supabase-admin.ts        server-only Supabase client (service-role key)
    require-user.ts          verifies a caller's bearer token → Supabase user
    staff-admin.ts           verifies a caller is active staff → permissions
    permissions.ts            department/permission-key definitions for the admin console
    calculations.ts / split.ts  balance + split math
    types.ts                  all shared TypeScript domain types
    csv-import.ts              CSV template, parser, category-matching for import
    request-meta.ts            IP/geo/User-Agent capture for the security log
    anthropic.ts               server-only Claude client + model constant
supabase/
  expenses-schema.sql      product tables (profiles, groups, expenses, ...)
  admin-schema.sql          staff/permissions/activity_log tables
ios/, android/              Capacitor native shells
capacitor.config.ts         native app config (points at the live site, not a bundled copy)
```

## Frontend

**Framework**: Next.js 15 App Router, React 18, TypeScript throughout. Styling is Tailwind CSS with shadcn/ui components (built on Radix primitives) and `lucide-react` icons; dark mode via `next-themes`. Charts use Recharts. PDF export uses `jspdf` + `jspdf-autotable`, lazy-loaded only when a PDF is actually requested.

**State management** — deliberately no Redux/Zustand/etc. Two React Contexts do the whole job:

- **`StoreProvider`** (`src/lib/store.tsx`) owns the entire product `AppState`: `users`, `groups`, `expenses`, `recurring`, `templates`, `notificationPrefs`, `baseCurrency`, `onboarded`, `notificationsReadAt`. Every screen reads from `useStore()`.
- **`UIProvider`** (`src/lib/ui-store.tsx`) owns transient UI state: which modal is open (a single typed `Modal` union, e.g. `{ kind: "addExpense", groupId, ... }`), and whether the command palette is open.

**The optimistic-update pattern** — every mutating store action follows the same shape:

1. Generate a temporary local id (`uid("e_")`, `uid("g_")`, ...) and update React state immediately, so the UI feels instant.
2. Fire the matching call from `sync-api.ts` (which wraps `apiRequest` from `api-client.ts`, which attaches the current Supabase session's bearer token).
3. On success, reconcile: replace the temp-id record with the server's real row (real id, server-computed fields).
4. On failure, roll the local state back to what it was before, and show a `sonner` toast with the error.

This means the UI never has to show a spinner for a simple add/edit, but never silently diverges from the server either.

**Sync / multiplayer model** — the server is always the source of truth:

- On load, `GET /api/sync/pull` returns everything the signed-in user can see (their own profile, friends, groups they're in, and every expense/recurring bill tied to those). This fully replaces local state (`applyPulled`).
- `localStorage` (keyed per-user, `mysplitwise.state.v1.<userId>`) is written on every state change purely as a **resilience cache** — it lets the UI render instantly on next load and survive a brief network outage, but is never treated as authoritative.
- While the tab is open, the client polls `pullState()` every 30 seconds and also refetches immediately on `window focus` / `visibilitychange`, so if a friend adds a shared expense, it shows up without the user manually refreshing.

**Dialogs** — every modal is a standalone component under `src/components/dialogs/`. All of them are mounted once, unconditionally, in `app-shell.tsx`, and shown/hidden by whether `useUI().modal.kind` matches their own kind. Adding a new dialog means: add one member to the `Modal` union type, build the component, add one `<XyzDialog />` line to `app-shell.tsx`, and open it anywhere with `openModal({ kind: "xyz", ... })`.

**PWA** — installable, offline-capable via `public/manifest.json` + `public/sw.js`.

## Backend & API

Nothing in the browser ever talks to Postgres directly. Every table has **Row Level Security enabled with zero client-facing policies** — the *only* way to read or write product data is through a Next.js API route running with the Supabase **service-role key** (`getSupabaseAdmin()` in `supabase-admin.ts`), after that route has independently verified who's calling.

**Every API route follows the same shape:**

```ts
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);              // or requireCallerStaff(req) for /admin/*
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const admin = getSupabaseAdmin();
    // ...authorize the specific action, then read/write...
    return NextResponse.json({ ...result });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}
```

`requireUser(req)` (`require-user.ts`) reads the `Authorization: Bearer <token>` header the client always attaches (see `api-client.ts`), and validates it against Supabase Auth. `requireCallerStaff(req)` (`staff-admin.ts`) does the same but additionally checks the caller is an active row in `staff_members` and resolves their effective permission set.

### Full API surface

| Route | Purpose |
|---|---|
| `GET /api/sync/pull` | The authoritative full-state fetch: own profile, friends, groups, expenses, recurring bills. Also lazily creates a profile row on first login and materializes any due recurring expenses. |
| `POST /api/sync/claim-invites` | Resolves any placeholder profiles matching the caller's email into their real account (see [Friend-linking-by-email](#friend-linking-by-email)). Called client-side right after login/signup. |
| `POST /api/sync/migrate` | One-time import of a browser's pre-existing local-only state into the shared backend (used both for the original localStorage→Supabase migration and for restoring a JSON backup). |
| `POST/PATCH/DELETE /api/expenses`, `/api/expenses/[id]` | CRUD for expenses. |
| `POST /api/expenses/[id]/comments` | Add a comment to an expense. |
| `POST/PATCH/DELETE /api/groups`, `/api/groups/[id]` | CRUD for groups. |
| `POST/DELETE /api/friends`, `/api/friends/[id]` | Add/remove a friend (add is by email — see below). |
| `PATCH /api/profiles/[id]` | Update editable profile fields — self-only fields (name, avatar, base currency, phone, notification prefs, onboarded) vs. friend-editable fields (payment links; identity fields too if the friend is still an unclaimed placeholder). |
| `POST/PATCH/DELETE /api/recurring`, `/api/recurring/[id]` | CRUD for recurring expenses. |
| `POST /api/recurring/[id]/log-now` | Manually log a recurring bill's next occurrence early. |
| `POST /api/settlements` | Record one or more "Settle Up" payments as special `isSettlement` expenses. |
| `POST /api/account/delete` | Permanently delete the caller's own account (guarded — see [Business logic](#data-wipe--account-deletion-guardrails)). |
| `POST /api/ai/categorize` | Suggest an expense category from its description (Claude). |
| `POST /api/ai/ask` | Natural-language Q&A over the caller's own finance summary (Claude). |
| `POST /api/ai/draft-reminder` | Draft a friendly payment-reminder message (Claude). |
| `POST /api/ai/parse-voice-expense` | Turn free-form spoken/typed text into a structured expense draft (Claude). |
| `POST /api/ai/scan-receipt` | Extract line items/amount/merchant from a photographed receipt (Claude, vision). |
| `GET /api/admin/me` | Resolve the caller's staff record + effective permissions. |
| `GET/POST/PATCH /api/admin/staff`, `/api/admin/staff/[id]` | Manage staff accounts, departments, permission overrides. |
| `GET /api/admin/users` | List registered accounts (permission-gated). |
| `GET /api/admin/activity` | Security/activity log viewer (permission-gated). |
| `GET /api/admin/disputed-settlements` | List settlements flagged as disputed, across all users. |
| `POST /api/log-activity` | Client-callable endpoint to append an entry to the security activity log (e.g. failed-login events, which have no session to authenticate a normal call with). |
| `POST /api/broadcast-update` | Shared-secret-protected: fan a message out to every Telegram subscriber (used for "new feature shipped" announcements). |
| `* /api/telegram-webhook/[secret]` | Inbound Telegram bot webhook (handles `/start` subscribe, etc.). |

## Database schema

All tables live in Supabase Postgres, defined across two SQL files that are meant to be run once each in the Supabase SQL Editor (and appended to, never rewritten, as the schema grows):

**`supabase/expenses-schema.sql`** — product data:

| Table | Purpose |
|---|---|
| `profiles` | One row per account. Key columns: `id` (= `auth.users.id`), `email`, `name`, `avatar_color`, `avatar_url`, `venmo`/`paypal`/`cashapp`, `phone`, `base_currency`, `onboarded`, `notifications_read_at`, `notification_prefs` (jsonb), `is_placeholder` (true until a real signup claims it), `support_id` (generated column, see below). |
| `friendships` | Undirected edges between two `profiles.id`s (`user_a`, `user_b`). |
| `groups` | `name`, `type` (`trip`/`home`/`couple`/`other`), `simplify_debts`, `monthly_budget`. |
| `group_members` | Join table, `group_id` + `user_id`. |
| `expenses` | `description`, `amount`, `currency`, `category`, `date`, `group_id` (nullable), `created_by`, `is_settlement`, `notes`, `receipt_url`, `recurring_id`, `tax`, `tip`, `payment_method`, plus the dispute-trail columns `disputed`, `dispute_reason`, `disputed_by`, `disputed_at`. |
| `expense_shares` | Per-user breakdown of one expense: `paid`, `owed` (invariant: `sum(paid) === amount === sum(owed)` per expense). |
| `line_items` / `line_item_participants` | Itemized-bill support (per-item name/amount + which participants split that specific item). |
| `expense_comments` | Threaded comments on an expense. |
| `recurring_expenses` / `recurring_expense_shares` | Same shape as expenses/expense_shares, plus `frequency`, `start_date`, `next_due`, `active`. |

**`supabase/admin-schema.sql`** — staff/security data:

| Table | Purpose |
|---|---|
| `staff_members` | `user_id`, `name`, `email`, `department`, `status` (`active`/`suspended`). |
| `staff_permission_overrides` | Per-staff-member grants/revokes layered on top of their department's default permission set. |
| `activity_log` | Security/audit trail: `user_id` (nullable — failed logins have no session), `event_type`, `description`, `metadata jsonb` (holds IP, country/city, device/browser/OS — see [Security & observability](#security--observability)). |

Every table has RLS **enabled** with **no policies** — access is only ever through a service-role-authenticated API route, never directly from the browser's anon-key client.

## Authentication & authorization

- **Sign-up/sign-in**: Supabase Auth, either email+password or phone+OTP (`src/components/auth-form.tsx`, `src/lib/auth-store.tsx`). Phone numbers are normalized to `+<digits only>` before use so the same number always maps to one account regardless of how it was typed.
- **Session → API calls**: the browser Supabase client (`supabase.ts`, anon key) holds the session; `api-client.ts`'s `apiRequest()` reads the current session's `access_token` and sends it as `Authorization: Bearer <token>` on every `/api/*` call.
- **Server-side verification**: `requireUser(req)` calls `supabase.auth.getUser(token)` using the **service-role** client to validate that bearer token belongs to a real session — this is the only check a normal user-facing route needs.
- **Staff/admin verification**: `requireCallerStaff(req)` does the same token check, then additionally requires an `active` row in `staff_members`, and resolves effective permissions as `DEPARTMENT_DEFAULTS[department]` with any `staff_permission_overrides` grants/revokes layered on top (see [Admin console](#admin--staff-console)).
- **Password/phone changes**: real Supabase Auth flows, not ad-hoc fields — `supabase.auth.updateUser({ password })` for password changes, and `updateUser({ phone }) → verifyOtp({ type: "phone_change" })` for phone changes (the same OTP trust model already used for phone login), so `profiles.phone` stays as verified as `profiles.email`.
- **Storage (avatars)**: the one exception to "always through a service-role API route" — avatar photo uploads go directly from the browser to Supabase Storage (bucket `avatars`) using the user's own session, relying on Storage's own bucket policies rather than Postgres RLS.

## Business logic

### Splitting & balances

- `src/lib/split.ts`: `splitEqual`, `splitByPercent`, `splitByShares` — all cent-accurate (work in integer cents internally, then distribute any leftover cent deterministically so shares always sum exactly to the total, never off by a cent from floating-point rounding).
- `src/lib/calculations.ts`: pairwise balance calculation (`balanceBetween`), multi-currency normalization (`toBaseExpenses`, converting every expense into the user's base currency for aggregate math), and debt simplification.
- `src/lib/currency.ts`: static conversion-rate table + `formatMoney`/`convert` helpers.

### Friend-linking by email

Adding a friend is always "by email," never a raw local name:

- If that email already belongs to a real account → instant connection (a `friendships` row is created immediately).
- If not → a **placeholder** `profiles` row is created (`is_placeholder = true`) so the relationship/expenses can exist right away.
- The moment that email actually signs up, `POST /api/sync/claim-invites` (called client-side right after login/signup, **never** as a database trigger on `auth.users`/`auth.sessions` — a prior incident showed that pattern can break login itself) runs the `claim_placeholder_profile` Postgres function, merging the placeholder into the new real account so all its history carries over.

This is the same mechanism CSV import reuses for new names (see below), specifically to avoid ever creating an unlinked, fabricated "friend" that has no real account behind it — the bug that originally motivated the whole shared-backend migration.

### Recurring expenses

Due bills are materialized in two places for redundancy: optimistically on the client on load (`processRecurring` in `store.tsx`, cosmetic/local-only) and authoritatively on every server pull (`materializeDueRecurring`, called from `GET /api/sync/pull`), so a bill is never missed even if no device was open when it came due.

### Settlements & the dispute trail

"Settle Up" only deep-links out to Venmo/PayPal/Cash App — mysplitwise **never** processes or moves money itself. This was a deliberate choice to avoid money-transmitter licensing requirements. Because of that, mysplitwise has no way to verify a settlement actually happened; the "dispute" flag on a settlement (`expenses.disputed`, `dispute_reason`, `disputed_by`, `disputed_at`) is explicitly a **transparency tool**, not fraud prevention — it lets the payee say "I never got this," visible to both people and to staff via `/api/admin/disputed-settlements`, but doesn't and can't confirm what really happened with real money.

### Data-wipe / account-deletion guardrails

Once an account has any real expense/group/friend data attached, the "clear all data" action requires extra confirmation rather than being a single casual click — added after a review found the original flow could too easily wipe a real, populated account by accident. `POST /api/account/delete` similarly requires explicit confirmation before permanently removing an account.

### Notification preferences

A private, per-user setting (`recurringDue`, `comment`, `settlementReceived`, `settlementDisputed`, `aiNudge`, `friendOwesYou`, `youOweFriend`) controlling only the in-app bell — there is no email/push notification system in the app. **Architecturally important**: this is kept as a top-level field on `AppState`/the pull response, never passed through the `rowToUser` serializer used for `profiles` rows, because that serializer's output is shared with every friend and co-group-member a pull returns — a private preference must never leak onto a shared object.

### CSV import

Mysplitwise no longer offers a simple data export, so instead of trying to parse their format, mysplitwise ships its **own** CSV template (`src/lib/csv-import.ts` — a small dependency-free parser handling quoted/embedded-comma fields, matching this project's general habit of writing tiny parsers instead of adding npm dependencies, e.g. the User-Agent parser in `request-meta.ts`). The import wizard (`import-csv-dialog.tsx`) is a 3-stage flow:

1. **Upload & validate** — parse the file, validate every row, report exactly which rows are invalid and why.
2. **Name mapping** — every unique name from the `PaidBy`/`SplitWith` columns must be resolved to "this is me," an existing friend, or a brand-new friend added by real email (via the same `addFriend` flow as the regular Add Friend dialog) before continuing — this is what stops an import from ever creating a fabricated, unlinked identity.
3. **Import** — creates any new groups, then imports expenses one row at a time (not in parallel, so a progress bar is meaningful and the API isn't hammered), auto-suggesting a category via Claude only when the CSV's Category column was left blank (a typed-but-unmatched category falls back to "general," never silently reinterpreted by AI).

### Support reference ID & duplicate-account prevention

Every profile gets a short `support_id` (a Postgres **generated column** derived from the row's own already-unique `id` — no application code needed, works for every profile-creation code path automatically) that a user can quote to customer support instead of relying on name/email/phone lookups. Email and phone are both treated as canonical identity keys specifically to prevent the same person from ending up as two separate accounts.

## AI features

All AI calls run **server-side only**, through `src/lib/anthropic.ts` (`getAnthropic()` — the API key never reaches the browser), using model `claude-haiku-4-5` for cost/speed since these are short, well-scoped tasks:

| Route | What it does |
|---|---|
| `ai/categorize` | Suggests a category from an expense description. |
| `ai/ask` | Answers a natural-language question about the caller's own data. Context is **not** a vector DB/RAG pipeline — `src/lib/finance-summary.ts` builds a compact plain-text summary (balances with each friend, groups, up to 60 recent expenses, spending-by-category totals) and that whole summary is sent to Claude as context on each question. |
| `ai/draft-reminder` | Writes a friendly payment-reminder message for an outstanding balance. |
| `ai/parse-voice-expense` | Turns free-form spoken/typed text into a structured expense (amount, description, category, participants). |
| `ai/scan-receipt` | Vision call — extracts line items, amounts, tax/tip from a photographed receipt. |

**Not actually AI, despite the name**: the "spending nudges" notification type (`aiNudge` in notification prefs) is driven by `src/lib/predictive-nudges.ts`, a pure client-side statistical pattern-matcher (groups expenses by similar description, checks for a roughly-consistent recurrence interval, flags ones that look overdue) — it makes **no Claude API call**. It's named/grouped with the AI features in the UI because it feels similarly "smart" to a user, but it's plain heuristics.

## Security & observability

- **Activity log** (`activity_log` table, `src/lib/staff-admin.ts`'s `logActivity()`): every significant auth/security event is recorded with `event_type`, optional `description`, and a `metadata jsonb` blob built by `src/lib/request-meta.ts`:
  - **IP address** — first entry of `x-forwarded-for` (falls back to `x-real-ip`).
  - **Geo** — `x-vercel-ip-country` / `x-vercel-ip-city`, headers Vercel attaches to every request for free (no third-party geo-IP service integrated).
  - **Device/browser/OS** — a small dependency-free User-Agent parser (good enough for a security log, not a full device database).
  - Failed logins are logged too (via the unauthenticated `POST /api/log-activity`, since a failed login has no session to authenticate a normal call with), throttled per-IP over a 5-minute window to prevent the log itself from being spammed. This throttle is not the actual brute-force defense — Supabase Auth's own built-in rate limiting is.
- This log exists purely as a **visibility tool for staff** (detecting suspicious logins, investigating a reported problem) — it does not by itself block or prevent anything.

## Admin / staff console

`/admin` is a separate, permission-gated console for internal staff (not regular users), backed by `staff_members` + `staff_permission_overrides` + department defaults (`src/lib/permissions.ts`):

| Department | Default permissions |
|---|---|
| Business Owner | manage_staff, view_user_accounts, view_activity_log, view_payment_info |
| IT | manage_staff, view_user_accounts, view_activity_log |
| Support | view_user_accounts |
| Legal | view_user_accounts, view_activity_log |
| Finance | view_payment_info |
| Audit | view_activity_log |

An owner can grant or revoke any individual permission for any specific staff member on top of their department's defaults (`staff_permission_overrides`). Every `/api/admin/*` route re-derives this effective permission set server-side on every request via `requireCallerStaff()` — nothing is trusted from the client.

## Integrations

- **Resend** — custom SMTP provider for all Supabase Auth emails (signup confirmation, etc.), configured in Supabase Dashboard → Authentication → Emails, replacing Supabase's very-low-volume default testing sender. Currently sending from Resend's shared `onboarding@resend.dev` address; switching to a branded `@mysplitwise.com` sender is a deferred, purely cosmetic step requiring domain DNS verification.
- **Telegram bot** — users can opt in (via a link surfaced in the Account page when `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME` is set) to receive feature-announcement broadcasts. `api/telegram-webhook/[secret]` is the bot's inbound webhook; `api/broadcast-update` (guarded by a shared `BROADCAST_SECRET` header, not user auth) fans a message out to every row in `telegram_subscribers`.
- **Anthropic Claude API** — see [AI features](#ai-features).

## Mobile app

The iOS/Android apps (`ios/`, `android/`, via Capacitor) are **not** a separately-bundled copy of the frontend — `capacitor.config.ts` points the native shell's `server.url` straight at `https://mysplitwise.com`, so the native app always runs the same live website, same backend, same deploys, with no separate mobile build/release step needed for ordinary feature work. App id: `com.mysplitwise.app`.

## Deployment & environments

- **Source of truth**: GitHub repo `iakkrllc/www-mysplitwise-com`, `main` branch.
- **CI/CD**: every push to `main` triggers an automatic Vercel production build + deploy — there is no separate staging environment or manual deploy step in normal use.
- **Domain**: `mysplitwise.com` + `www.mysplitwise.com`, registered/managed through Vercel, DNS at GoDaddy.
- **Environment variables** (names only — values live only in Vercel project settings, never committed):
  - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` — browser-safe Supabase client config.
  - `SUPABASE_SERVICE_ROLE_KEY` — server-only, full-access Supabase key used by every API route.
  - `ANTHROPIC_API_KEY` — server-only Claude API key.
  - `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET` — Telegram bot integration.
  - `BROADCAST_SECRET` — shared secret gating `/api/broadcast-update`.
  - `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME` — browser-safe, used to render the "follow our bot" link.

## Conventions to follow when extending this app

These are the load-bearing patterns established across the codebase — new features should match them rather than introduce a new style:

1. **New API route** → `requireUser`/`requireCallerStaff` first, then `getSupabaseAdmin()`, try/catch, `NextResponse.json(..., { status })`. Never let the browser query Postgres directly.
2. **New store action** → optimistic local update, fire the matching `sync-api.ts` call, reconcile on success, roll back + toast on failure.
3. **New modal** → add one member to the `Modal` union (`ui-store.tsx`), build the dialog component, mount it once in `app-shell.tsx`.
4. **New private per-user preference** (like notification prefs) → top-level `AppState`/pull-response field, never through `rowToUser` — that function's output is shared with friends/co-members.
5. **New identity-bearing field** (like `venmo`, `phone`) → fine to include in `rowToUser`/`User`, since profile facts are meant to be visible to friends.
6. **Prefer a small dependency-free parser/helper over a new npm dependency** for simple, well-scoped parsing tasks (CSV, User-Agent) — an established preference in this codebase.
7. **Never add a Postgres trigger on `auth.users`/`auth.sessions`** — a prior incident showed this can break login itself. Use client-triggered API calls after login/signup instead (see `claim-invites`).
8. **Schema changes** are appended to the existing `supabase/*.sql` files (never rewritten) and run manually once in the Supabase SQL Editor — there is no migration-runner in this project.
