# mysplitwise

A full-featured bill-splitting and shared-expense tracking app.

## Done
- [x] Project setup (Next.js + shadcn, Mulish font, custom brand palette)
- [x] Data layer: types, categories, split math, balance engine, debt simplification
- [x] Store with localStorage persistence + navigation + CRUD actions
- [x] Custom overlapping-circles logo mark + avatars + category icons
- [x] Header (logo, Add expense, Settle up, account menu, mobile drawer)
- [x] Sidebar (Dashboard / Activity / All expenses, Groups, Friends w/ live balances)
- [x] Dashboard view (summary bar + you owe / you are owed)
- [x] Group view (header, expense list, balances panel, suggested settle-up)
- [x] Friend view (balance banner + pairwise expenses)
- [x] Recent activity feed
- [x] All expenses view
- [x] Account view (edit profile, avatar color, reset data)
- [x] Add/Edit expense dialog (equal / exact / % / shares, payer, group)
- [x] Settle up dialog
- [x] Create/Edit group dialog
- [x] Add friend dialog
- [x] Expense detail dialog (breakdown, edit, delete)

## Verified
- [x] Balance math correct (dashboard, group, friend)
- [x] Group view + balances panel
- [x] Add expense dialog UI + validation

## To finish
- [x] Final polish pass
- [x] Mobile responsive check (verified on deployed site)
- [x] Deploy — live at https://same-f0pnm5mnnj7-latest.netlify.app

## v4 features (all done)
- [x] Command palette (⌘K): jump to views/groups/friends + actions, with header search button
- [x] Import/export JSON backup (download + restore) in Account
- [x] Itemized bills: line items + tax + tip, proportional split, shown in detail
- [x] Friends list view (nav + page) + per-friend category & balance charts
- [x] PWA: manifest, icons, service worker (offline), installable, theme-color

## v3 features (all done)
- [x] Dark mode (next-themes, brand-aware dark palette, toggle in header + landing + mobile menu)
- [x] Search & filter bar on All Expenses (text, category, group, date range) + dynamic totals
- [x] Export CSV + PDF for expenses (filtered) and balances (lazy-loaded jsPDF)
- [x] Notifications bell with unread badge, derived alerts, remind/settle/log actions
- [x] Per-group insights: monthly budget tracker, category donut, top spenders + budget field

## v2 features (all done)
- [x] Multi-currency (14 currencies) + base-currency conversion engine
- [x] Receipt photos (compressed), notes & comment threads on expenses
- [x] Recurring expenses (auto-generate on load) + Recurring view + nav
- [x] Dashboard charts: spending-by-category donut + balance-over-time area
- [x] Marketing landing page at / (app moved to /app); Sign out link
- [x] Fixed chart Y-axis label formatting
