# did.it

A daily challenge app. Everyone gets the same prompt each day, you snap a photo to prove you did it, and your streak goes up. Add friends to see who's actually doing it.

No account required. You get an anonymous session automatically — Google sign-in is optional and links the same account so you don't lose your streak.

---

## Features

**Today** — One shared challenge, revealed at noon Eastern. Snap a photo to mark it done and your streak updates immediately.

**Streaks** — Counts consecutive completed days. Doesn't break just because today is still open, only resets once a full day is actually missed.

**Social** — Search friends by handle, send and accept requests. Split view: a Friends pane shows everyone's status, a Feed pane shows photos, captions, claps, and comments. Unread dot clears when you actually open the thread, not just on next load.

**Claps + Comments** — React to a friend's completion or leave a comment. Per-user toggles in Profile settings control who can interact with your posts.

**Reporting** — Flag a photo for one of several reasons. Three people reporting the same photo for the *same reason* hides it; mismatched reasons are ignored. Ten reports spread across at least three different posts triggers a ban. Rate limited to one report per person every two hours.

**Friend profiles** — `/u/[handle]` shows a friend's streak, posts, and friends list. Their friends list has an opt-out toggle in your own settings.

**Push notifications** — Get notified when a friend completes the challenge, claps your photo, or leaves a comment. Opt in per device; toggle off anytime from Profile.

**Profile** — Set a display name and upload an avatar. Shown across the Social tab and friends feed.

**PWA** — Installable on mobile and desktop home screens.

---

## Stack

| | |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack, React Compiler) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| Backend | Supabase (Postgres + Storage + Auth) |
| Deployment | Vercel |

---

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Environment variables

Create `.env.local` in the project root (see `.env.example`):

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

For push notifications you'll also need VAPID keys:

```
NEXT_PUBLIC_VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:you@example.com
```

### 3. Supabase schema

Schema lives in `supabase/migrations`, applied straight to the hosted project — there's no local Docker DB for this one. Link your project and push:

```bash
npx supabase link --project-ref your-project-ref
npx supabase db push
```

### 4. Run

```bash
npm run dev
```

Only run one dev server at a time — Turbopack watches the whole workspace, a second instance just doubles up on RAM for nothing.

---

## Adding challenges

The prompt pool is just rows in the `challenges` table. Add more from the Supabase dashboard → Table Editor → `challenges`, with `active = true`. One gets picked at random each day at noon Eastern (`lib/challengeDate.ts`).

---

## Design

Chalky, muted palette pulled from the outdoors — sage green, dusty sky blue, soft mustard yellow — on a warm paper background (`#f7f4ea`) with dark warm ink text (`#393830`). Comfortaa for the typeface. Real SVG icons throughout, no emoji.

---

## What's left

See `TODO.md`.
