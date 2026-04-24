# Bower Access — Codebase Analysis

## Overview

**Bower Access** is a curated opportunity bulletin platform for founders and builders. It surfaces weekly curated funding, events, hiring, news, and bespoke opportunities in a newsletter-style web app, with an admin dashboard for content management and engagement analytics.

> [!NOTE]
> The project name in `package.json` is `tanstack_start_ts` (likely a scaffold artifact), but the actual product is **Bower Access** — branding visible throughout the UI and metadata.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | React 19 + Vite 7 (SPA) |
| **Language** | TypeScript 5.8 |
| **Routing** | React Router DOM v7 (client-side) |
| **Styling** | Tailwind CSS v4 (via `@tailwindcss/vite` plugin) |
| **UI Components** | Radix UI primitives + shadcn/ui pattern (46 components in `src/components/ui/`) |
| **Backend / DB** | Supabase (Auth, Postgres, Storage, RLS) |
| **Analytics** | PostHog (primary) + Supabase `engagement_events` table (legacy mirror) |
| **State** | React hooks + Context API (no Redux/Zustand) |
| **Fonts** | DM Sans + Space Grotesk (Google Fonts) |
| **Deployment targets** | Netlify, Vercel, Cloudflare Workers (configs for all three present) |

---

## Project Structure

```
├── api/ssr.ts                  # SSR handler (Node.js adapter for Netlify/Vercel/CF)
├── netlify/functions/ssr.ts    # Netlify-specific serverless SSR wrapper
├── supabase/migrations/        # 10 SQL migration files (schema evolution)
├── src/
│   ├── App.tsx                 # Root component: AuthProvider + BrowserRouter
│   ├── main.tsx                # Vite entry point
│   ├── styles.css              # Global Tailwind styles
│   ├── routes/
│   │   ├── __root.tsx          # 404 page
│   │   ├── index.tsx           # Home — opportunity bulletin feed (368 LOC)
│   │   ├── login.tsx           # Google OAuth login page
│   │   └── admin.tsx           # Admin dashboard (1202 LOC, largest file)
│   ├── components/
│   │   ├── Header.tsx          # Sticky navbar with auth/avatar
│   │   ├── OpportunityCard.tsx # Card + detail dialog for each opportunity
│   │   ├── FeedbackDialog.tsx  # Post-click "Was this useful?" thumbs up/down
│   │   └── ui/                 # 46 shadcn/ui components
│   ├── hooks/
│   │   ├── use-auth.tsx        # Auth context consumer
│   │   ├── use-item-view.tsx   # IntersectionObserver-based view tracking
│   │   ├── use-mobile.tsx      # Responsive breakpoint hook
│   │   └── use-page-tracking.tsx # Page view + time-on-page tracking
│   ├── contexts/
│   │   └── auth-context.ts     # AuthContext type definition
│   ├── providers/
│   │   └── auth-provider.tsx   # Supabase auth state management + PostHog identify
│   ├── integrations/
│   │   ├── supabase/           # client.ts, client.server.ts, types.ts
│   │   ├── posthog/            # client.ts, index.ts
│   │   └── lovable/            # Likely scaffolding from Lovable.dev
│   └── lib/
│       ├── bulletin.ts         # BulletinItem types, section config, categories
│       ├── bower-seed.ts       # 29 hardcoded seed items (initial bulletin content)
│       ├── tracking.ts         # Dual-write tracking (PostHog + Supabase)
│       └── utils.ts            # cn() helper (clsx + tailwind-merge)
├── wrangler.jsonc              # Cloudflare Workers config
├── netlify.toml                # Netlify build/redirect config
├── vercel.json                 # Vercel rewrite config
└── components.json             # shadcn/ui component configuration
```

---

## Key Features

### 1. Opportunity Bulletin (Home Page — `/`)
- Fetches **published opportunities** from Supabase `opportunities` table
- Groups items into 5 sections: Capital/Opportunities, Events, Hiring, News, Something New
- Category filtering (pill buttons) and date sorting (newest/oldest)
- Each item renders as an `OpportunityCard` with:
  - Banner image with configurable crop (x/y focus point, zoom)
  - Placeholder banners for poster-optional categories (news, hiring, something_new)
  - Click-to-open detail dialog with full poster, description, date/venue, and "Open Link" CTA
- View tracking via `IntersectionObserver` (1 second threshold)
- After clicking "Get Access", a **FeedbackDialog** pops up after 2 seconds asking thumbs up/down

### 2. Authentication
- **Google OAuth** only (via Supabase Auth)
- Unauthenticated users are redirected to `/login`
- Auto-profile creation on signup via database trigger
- Role-based access: `user_roles` table with `admin` role check
- PostHog user identification on login

### 3. Admin Dashboard (`/admin`)
- **6 tabs**: Analytics, Overview, Content, Users, Feedback, Events
- **Analytics tab**: Links to PostHog workspace (funnels, cohorts, replay, feature flags)
- **Overview tab**: Legacy snapshot cards (total users, unique viewers, page views, clicks, CTR, avg time)
- **Content tab**: Full CRUD for opportunities (create/edit/archive) with:
  - Image upload to Supabase Storage (`opportunity-posters` bucket)
  - Banner crop tool (click-to-set focus point + zoom slider)
  - Seed content import (29 predefined items from `bower-seed.ts`)
  - Per-item views/clicks/CTR metrics
- **Users/Feedback/Events tabs**: Data tables sourced from Supabase

### 4. Engagement Tracking (Dual-write)
- **Primary**: PostHog (`capturePostHogEvent`) for product analytics
- **Legacy mirror**: Supabase `engagement_events` table (powers admin Overview tab)
- Event types: `page_view`, `click_get_access`, `click_apply`, `click_login`, `click_logout`, `item_viewed`, `feedback_useful`, `feedback_not_useful`, `click_admin_action`
- Session management via `sessionStorage`

---

## Database Schema (Supabase)

| Table | Purpose |
|---|---|
| `profiles` | Auto-created user profiles (name, avatar, email) |
| `user_roles` | Role assignments (admin, moderator, user) |
| `opportunities` | Core content — title, description, category, status, dates, poster, banner crop |
| `visits` | Login visit records with referral source |
| `engagement_events` | All tracked user interactions (views, clicks, feedback) |

**Key schema features:**
- Row Level Security (RLS) on all tables
- `has_role()` security definer function for admin checks
- `handle_new_user()` trigger for auto-profile creation
- Categories enum: `funding`, `events`, `hiring`, `news`, `something_new`
- `count_unique_visitors` RPC function

---

## Deployment

The project has configurations for **three platforms** simultaneously:

| Platform | Config | Approach |
|---|---|---|
| **Netlify** | `netlify.toml` + `netlify/functions/ssr.ts` | SSR via serverless function |
| **Vercel** | `vercel.json` + `api/ssr.ts` | SSR via serverless function |
| **Cloudflare** | `wrangler.jsonc` | Workers-based deployment |

All three use the same `api/ssr.ts` Node.js adapter that loads the built server entry and converts Node HTTP to Web Fetch API.

---

## Observations

> [!TIP]
> **Well-structured areas:**
> - Clean separation of concerns (hooks, providers, contexts, integrations)
> - Comprehensive engagement tracking with dual-write pattern
> - Thoughtful UX: feedback collection, view tracking, banner crop tool
> - Proper RLS policies and security definer functions

> [!WARNING]
> **Areas of concern:**
> - `admin.tsx` is **1,202 lines** in a single file — could benefit from being broken into sub-components
> - Package name `tanstack_start_ts` doesn't match the project; likely leftover from scaffolding
> - Three deployment configs maintained simultaneously may cause drift
> - No test files found anywhere in the codebase
> - `.env` file is committed (519 bytes) — should be in `.gitignore` (it is listed, but the file exists)
> - `@lovable.dev/cloud-auth-js` dependency suggests this was originally scaffolded on Lovable.dev

---

## File Size Breakdown (Source Files)

| File | Lines | Notes |
|---|---|---|
| `routes/admin.tsx` | 1,202 | Largest — full admin dashboard |
| `routes/index.tsx` | 368 | Home page + filtering + sorting |
| `lib/bower-seed.ts` | 331 | 29 seed bulletin items |
| `components/OpportunityCard.tsx` | 239 | Card + detail dialog |
| `components/FeedbackDialog.tsx` | 153 | Post-click feedback collection |
| `providers/auth-provider.tsx` | 116 | Auth state + PostHog identification |
| `lib/tracking.ts` | 94 | Dual-write event tracking |
| `lib/bulletin.ts` | 73 | Types + section configuration |
| `components/Header.tsx` | 75 | Sticky navbar |
| `routes/login.tsx` | 37 | Google OAuth login |
