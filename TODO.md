# did.it — TODO

## In progress
- [ ] Groups/teams — do challenges with a small crew instead of just 1:1 friends, probably gets people opening the app more
- [ ] Let people edit their handle, right now it's locked in at signup
- [ ] Manual moderation review/appeal (right now bans and photo removal are purely automatic by report count, no human in the loop)
- [ ] Offline support (there's a service worker now, but only for push -- it doesn't cache anything, app still needs Supabase anyway so low priority)

## Backlog / Next Up
- [ ] Clean out `public/`, still has the unused default next.svg/vercel.svg/file.svg/globe.svg/window.svg from create-next-app
- [ ] Real favicon.ico, tab icon is still the default Next.js one even though the rest of the icons got redone

## Done
- [x] Daily shared challenge with photo proof (camera capture)
- [x] Streak tracking, doesn't break just because today's still open
- [x] Challenge rollover fixed to noon Eastern instead of midnight UTC
- [x] Social tab — search by handle, send/accept friend requests, chronological feed
- [x] Profile tab — display name + avatar upload
- [x] Anonymous sign-in by default, optional Google account linking
- [x] Welcome modal on first launch
- [x] PWA manifest + installable icon set (192/512/maskable/apple-touch)
- [x] Chalky outdoors re-theme — no more emoji, real SVG icons, Comfortaa font
- [x] Fixed dev server eating the whole machine (Turbopack was watching the entire home directory)
- [x] Fixed anonymous session recovery getting stuck on Social/Profile tabs
- [x] Self-healing profile row if it's ever missing for a valid account
- [x] Friend profile pages at /u/[handle] — streak, posts, only visible to friends
- [x] Claps + comments on completions, with per-user toggles for who's allowed
- [x] Reporting + auto-moderation, now reason-aware: 3 people reporting a photo for the *same* reason hides it (different reasons each = disregarded as shenanigans), and banning needs 10+ reports spread across at least 3 different posts, not just one unlucky photo
- [x] Chronological feed (newest first) with an unread dot for new posts/comments
- [x] Social split into a Friends pane (profiles + today's status, no photos) and a Feed pane (photos/captions/claps/comments) -- side by side on desktop, stacked halves on mobile
- [x] Captions on completion photos
- [x] Fixed broken Google-link recovery (identity_already_exists never got handled once AuthButton moved to /profile)
- [x] Fixed Profile settings toggles being invisible when off
- [x] Sped up Social page/feed (deduped repeated friend-list queries, batched photo signed-URL generation instead of one request per photo)
- [x] Push notifications for claps, comments, and friends completing the challenge
- [x] Fixed push subscribe failing with "no active Service Worker" (wasn't waiting for the worker to actually activate before subscribing)
- [x] Report rate limit: 1 per person every 2 hours, enforced in RLS (double-reporting the same photo was already blocked by a unique constraint)
- [x] Unread dot on a post clears once you open its comments, instead of only ever clearing on next page load
- [x] Hover the clap count to see who clapped
- [x] Friend profiles: show their friends list (toggle to hide it, in your own Profile tab) and mutual friends (always visible, no toggle)
- [x] Swapped all `<img>` tags for `next/image` — proper optimization, signed URLs now flow through the CDN
- [x] Route-level error boundaries (error.tsx, global-error.tsx, loading.tsx) — no more raw Next.js error pages on uncaught throws
- [x] Fixed OAuth sign-in getting stuck on the "Signing you in..." overlay if the Google redirect failed silently
