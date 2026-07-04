This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Infrastructure & architecture reference

mysplitwise (**mysplitwise.com**) is a bill-splitting and shared-expense tracking app. This section is the living reference for how it's built, hosted, and run in production — kept up to date as the app grows.

### Tech stack at a glance

| Layer | Choice |
|---|---|
| Framework | Next.js 15 (App Router), React 18, TypeScript |
| Styling / UI | Tailwind CSS, shadcn/ui (Radix primitives), lucide-react icons, next-themes (dark mode) |
| Charts | Recharts |
| Exports | jsPDF + jspdf-autotable (PDF), custom CSV writer/reader |
| Backend / data | Supabase (Postgres, Auth, Storage) |
| AI | Anthropic Claude API (`@anthropic-ai/sdk`), model `claude-haiku-4-5` |
| Email | Supabase Auth emails sent via custom SMTP (Resend) |
| Bot integration | Telegram Bot API (app-update broadcasts) |
| Mobile shell | Capacitor (iOS + Android wrappers around the same web app) |
| Hosting / CI-CD | Vercel, auto-deploying on every push to the GitHub repo's `main` branch |
| Domain | mysplitwise.com + www.mysplitwise.com, registered/managed through Vercel, DNS at GoDaddy |

### Frontend architecture

- **App Router structure**: marketing/landing page at `/`, the authenticated app at `/app`, `/login` + `/signup` for auth, `/admin` for the internal staff console, plus `/privacy` and `/terms`.
- **State management**: no Redux/Zustand — a hand-rolled React Context store (`src/lib/store.tsx`) holds the whole client-side `AppState` (users, groups, expenses, recurring bills, templates, notification prefs). A second context (`src/lib/ui-store.tsx`) owns transient UI state (which modal is open, command palette).
- **Optimistic-update convention**: every mutating store action (`addExpense`, `addGroup`, `updateProfile`, etc.) updates local state immediately, fires the matching call in `src/lib/sync-api.ts`, and reconciles on success (swaps the temp id for the server's row) or rolls back + shows a `sonner` toast on failure.
- **Sync model**: the server (`GET /api/sync/pull`) is the single source of truth. localStorage is only a resilience cache — it seeds the UI instantly on load and survives brief outages, but every load re-pulls from the server, and the client polls every 30s (plus refetches on window focus/visibility) so a friend's changes show up without a manual refresh.
- **Dialogs**: every modal (add expense, settle up, create group, add friend, phone change, CSV import, etc.) is a standalone component in `src/components/dialogs/`, mounted once in `src/components/app-shell.tsx`, and opened by dispatching a typed `Modal` value (`{ kind: "..." }`) through the UI store — new dialogs just add one union member and one mount line.
- **PWA + mobile**: installable PWA (manifest, service worker, offline shell) for the web, and the same codebase is wrapped with Capacitor for native iOS/Android builds.

### Backend architecture

- **Supabase Postgres** holds all real data. Every table has **Row Level Security enabled with zero client-facing policies** — the browser never talks to Postgres directly. All reads/writes go through Next.js API routes using the Supabase **service-role key** (`src/lib/supabase-admin.ts`), after the route itself checks who's calling.
- **Auth pattern**: `requireUser(req)` (`src/lib/require-user.ts`) validates the caller's Supabase session for normal user-facing routes; `requireCallerStaff(req)` (`src/lib/staff-admin.ts`) validates staff/admin sessions and resolves their effective permissions for `/api/admin/*` routes. Every route follows the same shape: authenticate → authorize → `getSupabaseAdmin()` → try/catch → `NextResponse.json(..., { status })`.
- **API surface** (`src/app/api/*`):
  - Core data: `sync/pull`, `sync/claim-invites`, `sync/migrate`, `expenses`, `expenses/[id]`, `expenses/[id]/comments`, `groups`, `groups/[id]`, `friends`, `friends/[id]`, `profiles/[id]`, `recurring`, `recurring/[id]`, `recurring/[id]/log-now`, `settlements`.
  - Account: `account/delete`.
  - AI: `ai/categorize`, `ai/ask`, `ai/draft-reminder`, `ai/parse-voice-expense`, `ai/scan-receipt`.
  - Admin/staff console: `admin/me`, `admin/staff`, `admin/staff/[id]`, `admin/users`, `admin/activity`, `admin/disputed-settlements`.
  - Integrations: `telegram-webhook/[secret]`, `broadcast-update`, `log-activity`.
- **Database schema** (`supabase/expenses-schema.sql`, `supabase/admin-schema.sql`):
  - Product data: `profiles`, `friendships`, `groups`, `group_members`, `expenses`, `expense_shares`, `line_items`, `line_item_participants`, `expense_comments`, `recurring_expenses`, `recurring_expense_shares`.
  - Admin/security: `staff_members`, `staff_permission_overrides`, `activity_log`.
- **Friend-linking-by-email**: `profiles.email` is the join key between real accounts. Adding a friend by email either connects instantly (if that email already has an account) or creates a placeholder profile that auto-resolves via the `claim_placeholder_profile` Postgres function the moment that email signs up (called from `/api/sync/claim-invites`, invoked from the client after login/signup — deliberately **not** a database trigger on `auth.users`, since that broke login once before).
- **Duplicate-account prevention**: email and phone are treated as canonical identity keys so the same person can't end up as two accounts.
- **Support reference ID**: every profile gets a short random `MSW-XXXXXXXX`-style `support_id`, generated straight from the row's own globally-unique `id` via a Postgres **generated column** — no application code needed, works retroactively for every profile-creation path.

### Business logic

- **Splitting engine** (`src/lib/split.ts`, `src/lib/calculations.ts`): equal/exact/percentage/shares splits, all cent-accurate (remainder cents distributed deterministically so shares always sum exactly to the total). Balance and multi-party debt-simplification math lives in `calculations.ts`.
- **Multi-currency**: `src/lib/currency.ts` handles conversion to a per-user base currency for balance math and dashboards.
- **Recurring expenses**: due bills are materialized both optimistically on the client (`processRecurring`) and authoritatively on the server on every pull (`materializeDueRecurring`), so nothing is missed if the client was never open when a bill came due.
- **Settlements & dispute trail**: "Settle Up" only deep-links to Venmo/PayPal/Cash App — mysplitwise never moves money itself (deliberately, to avoid money-transmitter licensing). Because of that, a dispute flag on a settlement is a **transparency tool, not fraud prevention**: it lets the payee flag "I never actually received this," visible to both parties and to staff, but can't verify real-world payment.
- **Data-wipe guardrails**: once an account has any real expense/group/friend data, the "clear all data" action requires extra confirmation rather than being a single casual click — added after an incident where local-only data made wiping too easy.
- **CSV import** (`src/lib/csv-import.ts`, `import-csv-dialog.tsx`): rather than trying to parse another app's proprietary export format, mysplitwise ships its **own** CSV template (dependency-free parser, no `papaparse`) that users fill in by hand. A 3-stage wizard (upload & validate → map every name to "me" / an existing friend / a new friend added by real email → import) deliberately reuses the same friend-linking-by-email flow as the regular Add Friend dialog, so an import can never create a fabricated, unlinked identity.
- **Notification preferences**: a private per-user setting (recurring due, comments, settlements received/disputed, AI nudges, friend-owes-you, you-owe-friend) controlling the in-app bell only. Architecturally kept as a top-level `AppState`/pull-response field — **never** passed through the shared `rowToUser` serializer — since that serializer's output is visible to every friend and co-group-member a pull returns.
- **Phone number changes**: real Supabase Auth OTP flow (`updateUser({phone})` → texts a code → `verifyOtp(..., type: "phone_change")`), the same trust model already used for phone login, so `profiles.phone` is as verified as `profiles.email`.

### Security & observability

- **Security activity log** (`activity_log` table + `metadata jsonb`): records IP address, Vercel-provided geo (country/city, free — no third-party geo-IP service), and a lightweight dependency-free User-Agent parse (device/browser/OS) for auth events including failed logins (throttled per-IP to prevent log-spam), reviewable by staff in `/admin`.
- **Staff/admin console** (`/admin`): department-based RBAC (`src/lib/permissions.ts`, `staff-admin.ts`) with per-staff permission overrides layered on department defaults, used for reviewing users, activity logs, and disputed settlements.

### AI features (Claude, Haiku 4.5)

`ai/categorize` (auto-suggest an expense category from its description), `ai/ask` (natural-language Q&A over a user's own data), `ai/draft-reminder` (writes a friendly nudge message for an outstanding balance), `ai/parse-voice-expense` (turns spoken/typed free text into a structured expense), `ai/scan-receipt` (extracts line items/amount from a photographed receipt). All AI routes run server-side only (`src/lib/anthropic.ts` — the client never sees the API key).

### Integrations

- **Resend** — custom SMTP provider for all Supabase Auth emails (signup confirmation, etc.), replacing Supabase's low-volume default test sender.
- **Telegram bot** — users can subscribe for feature-announcement broadcasts; `api/telegram-webhook/[secret]` handles the bot's inbound webhook, `api/broadcast-update` (secret-header protected) fans a message out to all subscribers.
- **Capacitor** — packages the same Next.js web app for iOS/Android app store builds.

### Deployment

- Source of truth: GitHub repo `iakkrllc/www-mysplitwise-com`, `main` branch.
- Every push to `main` triggers an automatic Vercel production build + deploy — no manual deploy step.
- Live at **mysplitwise.com** / **www.mysplitwise.com** (domain + DNS managed through Vercel, registrar is GoDaddy).
- Key environment variables (values kept in Vercel project settings, never committed): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`, `BROADCAST_SECRET`, `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME`.

---

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
