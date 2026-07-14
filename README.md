# 1geladen 🎉

Events organisieren wie 2010. Nur besser. („1" → „eins" → „**Ein**geladen". Genau.) — Organize events like it's 2010. Only better.

A small, bold event site for dinner evenings and gatherings: **where/when/what** front and center, RSVPs (the sacred *Attending / Maybe / Can't* trinity), a wall for posts + comments, a claimable **"What do I bring?"** list, and a photo gallery that unlocks once the party starts.

Built with **Next.js 16 + Payload CMS 3** in one app. The frontend is the party; `/admin` is backstage.

## Local development

```bash
pnpm install
pnpm seed     # optional: demo users + a spaghetti night (skips if users exist)
pnpm dev      # http://localhost:3000
```

Seeded logins (all password `partey2010`):

| Who | Email | Role |
| --- | --- | --- |
| Michael | michael@inversestudio.io | admin |
| Anna / Ben / Clara | anna/ben/clara@example.com | guest |

Without the seed, the **first registered user automatically becomes admin**. Everyone after that is a guest; only admins can promote roles (in `/admin` → Users).

## How it works

- **Admin panel** at `/admin` (Payload) — create events, manage users/roles, moderate everything. Only `role: admin` users can enter.
- **Guests** register on the site, then RSVP, post on the wall, comment, add/claim bring-items, and upload photos.
- **Photo gallery** opens automatically once the event start time passes, or earlier via the event's `photosOpen` checkbox.
- **i18n:** frontend is German/English (cookie-based toggle in the header). Event `title` and `description` are localized fields — enter both languages in the admin via its locale switcher.

### Collections

`users` (admin/guest) · `events` · `posts` · `comments` · `bring-items` · `rsvps` · `media`

Ownership is enforced server-side: authors are stamped from the session, guests can only edit/delete their own content, and the `role` field is admin-locked (tested: registering with `"role": "admin"` gets you a guest badge).

## Deploying to Vercel

The config is environment-aware: `DATABASE_URL=file:...` → SQLite + local disk (dev); `POSTGRES_URL` → Vercel/Neon Postgres, and `BLOB_READ_WRITE_TOKEN` → uploads on Vercel Blob (production). The `vercel-build` script runs `payload migrate` before `next build`, applying the migrations in `src/migrations/`.

One-time setup:

1. Import the repo at vercel.com → root directory `.` (this app).
2. In the Vercel project → Storage: add **Neon Postgres** and **Blob** — both inject their env vars (`POSTGRES_URL`, `BLOB_READ_WRITE_TOKEN`) automatically.
3. Add env vars: `PAYLOAD_SECRET` (long random string) and `NEXT_PUBLIC_GIPHY_API_KEY`.
4. Deploy. Then register the first user — they become admin.
5. Domains: add `1geladen.de` (+ `www`), set the DNS records Vercel shows at your registrar.

After schema changes, generate a migration and commit it: `pnpm payload migrate:create <name>` (with `POSTGRES_URL` set; a dummy URL works — generation is offline).

## Scripts

| Command | What it does |
| --- | --- |
| `pnpm dev` | dev server |
| `pnpm seed` | seed demo party |
| `pnpm build` / `pnpm start` | production build / serve |
| `pnpm generate:types` | regenerate `payload-types.ts` after schema changes |
| `pnpm test` | vitest + playwright |

---

Mit Liebe und Abendessen gebaut. 🍝
