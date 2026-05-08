# Bower Access — Freemium Access Gate: Feature Specification

## Project Context

You are working on **Bower Access**, a curated Opportunity Bulletin for builders and founders. It is a React 19 + Vite + TypeScript application using:
- **Supabase** as the backend (auth, database, storage)
- **Tailwind CSS v4** + **shadcn/ui** (Radix UI) for styling
- **React Router v7** for routing
- **PostHog** + a Supabase `engagement_events` mirror for analytics
- **date-fns** for all date logic
- **lucide-react** for icons

The main bulletin lives in `src/routes/index.tsx`. Opportunity cards are in `src/components/OpportunityCard.tsx`. The admin dashboard is in `src/routes/admin.tsx`. Analytics tracking uses `trackEvent` from `src/lib/tracking.ts`. The Supabase client is imported from `@/integrations/supabase/client`.

---

## Feature Goal

Implement a **freemium access model**. The bulletin is only accessible to logged-in users. Among logged-in users, two tiers exist:

- **Freemium users** — can see a limited number of unlocked opportunities per section. All remaining opportunities are visible but locked: content is blurred and the action button is disabled.
- **Premium users** — full unrestricted access to all opportunities, links, and details.

Premium access is granted in two ways:
1. **Auto-grant** — any user whose email ends with `@bowerschool.com` is automatically marked as premium on account creation.
2. **Manual grant** — an admin can manually grant premium status to any user via the Admin Dashboard.

There is no self-serve enrollment flow. The locked card experience tells the user to enroll in a Bower Course to get full access.

---

## Database Changes

### 1. Add `is_premium` column to `profiles` table

Add a boolean column `is_premium` (default `false`) to the existing `profiles` table in Supabase. This is the single source of truth for premium status.

The updated `profiles` row type should be treated as:

```
profiles.Row:
  avatar_url: string | null
  created_at: string
  email: string | null
  full_name: string | null
  id: string
  is_premium: boolean        ← NEW
  updated_at: string
  user_id: string
```

### 2. Postgres trigger for auto-grant

Create a Postgres function and trigger that fires **after insert on `auth.users`**. If the new user's email ends with `@bowerschool.com`, it should set `is_premium = true` on the corresponding row in `profiles`. The trigger must handle the case where the profiles row may not yet exist (it should upsert or wait for the profiles insert trigger if one already exists).

---

## New Hook: `useUserAccess`

Create a custom React hook at `src/hooks/useUserAccess.ts`.

**Purpose:** Centralise all access-tier logic so no component needs to query Supabase directly for premium status.

**What it should do:**
- Read the current authenticated user from Supabase auth.
- Fetch the user's `profiles` row and read `is_premium`.
- Return an object with:
  - `isPremium: boolean` — true if the user has premium access.
  - `isLoading: boolean` — true while the profile is being fetched.
  - `user` — the raw Supabase auth user object.

**Usage pattern across the app:**
```
const { isPremium, isLoading } = useUserAccess()
```

---

## Bulletin Access Gate (`src/routes/index.tsx`)

The entire bulletin is behind authentication. If a user is not logged in, they should not see the bulletin at all — redirect them to the login page.

### Free slot logic

Within each opportunity section (Funding/Capital, Events, News, Hiring, Something New), the **first 2 opportunities** (after the existing sort order is applied) are always shown as fully unlocked cards for freemium users.

All opportunities beyond the first 2 in each section are rendered as locked cards for freemium users.

Premium users always see all cards as fully unlocked — no change to their experience.

The unlock count (2) should be defined as a named constant at the top of the file so it can be easily adjusted:
```
const FREE_SLOTS_PER_SECTION = 2
```

---

## New Component: `LockedOpportunityCard`

Create a new component at `src/components/LockedOpportunityCard.tsx`.

**Visual design:**
- Renders the card at the same dimensions as a normal `OpportunityCard`.
- The banner image area, title, description, and detail lines are rendered but visually blurred (CSS `filter: blur(...)` or similar) to communicate that real content exists behind the lock.
- A centered overlay sits on top of the blurred content containing:
  - A lock icon (use lucide-react `Lock` icon).
  - A short label such as: `"Enroll in a Bower Course for full access"`
- The action button (normally "Get Access") is rendered in a disabled/muted state and is not clickable.
- The card should NOT be grayscale — blurring alone communicates the locked state. The card should still look like it belongs on the bulletin.

**On click (anywhere on the locked card):**
- Opens a modal dialog (use the existing `shadcn/ui` `Dialog` component pattern already in the codebase).
- The modal content:
  - Heading: `"Full access is reserved for Bower Course students"`
  - Body: Explain that this opportunity and all others are available to enrolled students. Keep it brief and friendly.
  - A primary CTA button that links to the Bower Course enrollment page (accept the URL as a prop called `enrollmentUrl` with a sensible fallback).
  - A secondary close button.
- Do not dismiss the modal automatically — user must explicitly close it.

**Props the component accepts:**
- `opportunity` — the full opportunity row object (same type as used in `OpportunityCard`), used to render the blurred preview.
- `enrollmentUrl` — string, the URL to send users to enroll. Default to `"https://bowerschool.com"` if not provided.

**Analytics:**
- When the locked card is clicked (modal opens), call `trackEvent` with event type `"view"` and metadata indicating `{ locked: true, opportunity_id: opportunity.id }`.
- When the enrollment CTA in the modal is clicked, call `trackEvent` with event type `"click_get_access"` and metadata `{ locked: true, opportunity_id: opportunity.id, destination: enrollmentUrl }`.

---

## Admin Dashboard Changes (`src/routes/admin.tsx`)

Add a new sub-section within the existing **Content Management** tab (or create a new **"User Access"** tab if the Content Management tab is already crowded) called **"Grant Premium Access"**.

### UI

- A text input field labeled `"User email address"`.
- A **"Grant Premium"** button next to it.
- Below, a read-only list of all users who currently have `is_premium = true`, showing their email and the date their profile was created. This acts as an audit list.

### Logic

**Granting premium:**
1. Admin enters an email and clicks "Grant Premium".
2. Look up the `profiles` row where `email = input` using the Supabase client.
3. If found: set `is_premium = true` on that row.
4. If not found: show an inline error — `"No account found with that email address."`
5. On success: show an inline confirmation — `"Premium access granted."` and refresh the audit list.
6. Call `trackEvent` with event type `"click_admin_action"` and metadata `{ action: "grant_premium", target_email: email }`.

**Revoking premium (optional, nice to have):**
- Each row in the audit list has a **"Revoke"** button.
- Sets `is_premium = false` on that profile row.
- Call `trackEvent` with `{ action: "revoke_premium", target_email: email }`.

### Supabase query notes

- Always use the `@supabase/supabase-js` client — no raw SQL.
- Use `.eq("email", inputEmail)` to look up the profile.
- Use `.update({ is_premium: true })` to grant access.
- Wrap all mutations in try/catch and surface errors in the UI inline, not as browser alerts.

---

## Routing & Auth Guard

The bulletin route (`/`) must check authentication before rendering. If `useUserAccess` returns no authenticated user (after loading completes), redirect to `/login`.

Do not show a flash of the bulletin to unauthenticated users — render a loading state or blank screen while auth is resolving.

---

## Summary of Files to Create or Modify

| File | Action |
|---|---|
| Supabase migration | Add `is_premium` column to `profiles` + auto-grant trigger |
| `src/hooks/useUserAccess.ts` | Create — centralised premium status hook |
| `src/components/LockedOpportunityCard.tsx` | Create — blurred locked card with modal |
| `src/routes/index.tsx` | Modify — auth guard, free slot logic, render locked cards |
| `src/routes/admin.tsx` | Modify — add Grant Premium UI and audit list |

---

## Constraints & Conventions to Respect

- Always use Tailwind classes for styling. Check for existing `shadcn/ui` components before building new ones.
- All Supabase interactions go through the client at `@/integrations/supabase/client` — no direct SQL.
- All new user actions must call `trackEvent` from `src/lib/tracking.ts`.
- Use `date-fns` for any date formatting in the audit list.
- Do not add new npm packages unless strictly necessary. All UI primitives needed (Dialog, Button, Input) already exist via `shadcn/ui`.
- The `FREE_SLOTS_PER_SECTION` constant must be easy to find and change — define it at the top of `index.tsx`.
