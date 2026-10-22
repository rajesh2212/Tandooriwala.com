# Making the site public

The restaurant's own site, reachable from any country, with real bookings behind it.
Nothing in this file publishes anything — the last steps are yours to run, deliberately.

Read [§1](#1-what-you-are-actually-deploying) and [§2](#2-what-you-need-to-have) first: they say
what to buy. [§7](#7-publish) is the part with the commands.

---

## 1. What you are actually deploying

One process. It serves the built site *and* the API from the same origin, and it owns its data
as files on its own disk.

```
visitor anywhere ──HTTPS──► platform proxy (TLS) ──HTTP──► one Node process
                                                            ├── dist/                (the site)
                                                            ├── /api/*               (bookings, accounts, photos)
                                                            └── DATA_FILE + UPLOAD_DIR  (persistent disk)
```

There is no database server, no object storage bucket, no auth provider, no queue, no CDN to
configure and no second service to keep alive. That is why the whole deployment is one app, one
domain and one volume.

Three consequences to accept before you start:

- **SQLite is single-writer, so one instance is a requirement, not a preference.** Two replicas
  mean two `bookings` files, and the composite primary key that makes double-booking impossible
  stops being a global guarantee. Scale vertically (bigger RAM/CPU) if you ever need to.
- **The rate limiter lives in this process's memory.** Same constraint, same fix.
- **`data/` is the business.** A container restart with no mounted disk deletes every enquiry,
  booking, account and profile photo. This is the single most common way to lose the site's data,
  and both platform configs here mount a disk on purpose.

Serverless hosts (Vercel, Netlify, Cloudflare Workers, Lambda) cannot run this shape: they give
no persistent filesystem, so bookings and photos would vanish on every cold start. They can host
the static pages only, in which case `/book`, `/account` and the enquiry form fall back to the
"we could not reach the kitchen — please call" state they already handle.

---

## 2. What you need to have

| What | Why | Rough cost |
| --- | --- | --- |
| **A host that gives a persistent disk + automatic TLS** — pick one: Fly.io, Render, Railway, or a small VPS (Hetzner, DigitalOcean, Vultr, Linode) | One long-lived Node process with a real filesystem. | Fly/Render free tiers exist but a disk is usually paid; a VPS is about USD 4–5/month. |
| **A domain** — any registrar you like, plus access to its DNS | `TRUSTED_ORIGIN`, cookies, and the social-preview links all key off it. | USD 8–12/year. |
| **A git remote** (GitHub is what the two platform flows assume) | Both Fly and Render deploy from a repository. | Free. |
| **Node 22.13 or newer locally** if you want to build the Docker image or run the checks yourself | `node:sqlite` is a built-in module from that version. | — |

**No other account is needed, and there is no API key to buy.** Concretely:

| Service people usually sign up for | What this project uses instead |
| --- | --- |
| Postgres / MySQL / Mongo / Supabase | `node:sqlite`, one file at `DATA_FILE`. No connection string exists to leak. |
| Auth0 / Clerk / Firebase Auth / Supabase Auth, OAuth apps, `redirect_uri` whitelists | scrypt-hashed passwords and random session tokens stored as SHA-256, in that same file. There is nothing to register and no callback URL to configure. |
| S3 / Cloudinary / a signed-URL storage key | Profile photos are written to `UPLOAD_DIR` on the same disk and are served only through an authenticated route. |
| A PDF generation API | jsPDF draws the ticket in the customer's own browser. |
| A JWT signing secret / `SESSION_SECRET` | Sessions are opaque random bytes looked up in the table, so there is no secret to sign with. |
| Email/SMS provider | None — and so **no confirmation email or SMS is sent**. The floor still phones. Adding real confirmations is a separate piece of work with its own provider account. |

The only secret in the entire system is the owner's inbox key, `TANDOORIWALA_ADMIN_KEY`.

---

## 3. Environment variables

Copy [`.env.example`](.env.example) to `.env` and fill it in — or paste the same names into the
platform's environment/secret UI. `.env` is gitignored, and `.dockerignore` keeps it out of the
image: **a real key must never be committed or baked into a layer.**

| Variable | Required | Value | What it does |
| --- | --- | --- | --- |
| `NODE_ENV` | yes | `production` | Turns on the boot guards, the HTTP→HTTPS redirect, HSTS and the `Secure` cookie. Unset means the startup log prints a localhost URL. |
| `TRUSTED_ORIGIN` | **yes — the server refuses to boot without it** | `https://your-domain` — no trailing slash, never `localhost`, no port | The single production URL. Decides the cookie's `Secure` flag, which `Origin` a mutating `/api` call must come from, where HTTP visitors are sent, and what replaces `{{SITE_ORIGIN}}` in `index.html`. |
| `TANDOORIWALA_ADMIN_KEY` | strongly | 32+ chars, random | Unlocks `GET`/`PATCH` on `/api/enquiries` and `/api/bookings`, and therefore `/admin`. Unset ⇒ the inbox still accepts messages but nobody can read them (`503`). Only *wrong* keys are rate limited. |
| `DATA_FILE` | yes, if the disk is elsewhere | `/data/enquiries.db` on Fly/Docker, `/var/data/enquiries.db` on Render | SQLite path. Default `data/enquiries.db` is relative to the project and **is not persistent** in a container. |
| `UPLOAD_DIR` | yes, if the disk is elsewhere | `/data/uploads/avatars` (Docker/Fly), `/var/data/uploads/avatars` (Render) | Profile photos. The folder is never published; the API is the only way in. |
| `RESTAURANT_TIMEZONE` | defaults correctly | `Asia/Kolkata` | Every seat time and the "is today" cut-off are read in this zone. Keep it on Bhadrak even when the container sits in Europe or Singapore. |
| `RESTAURANT_UTC_OFFSET` | defaults correctly | `+05:30` | Fixed-offset fallback for a Node build with no timezone data (`small-icu`). Must match the zone above. |
| `TRUST_PROXY_HOPS` | defaults correctly | `1` | Hops in front of this process. Too high and a client can forge `X-Forwarded-For` to escape the limits. |
| `PORT` | platform-set | leave it | Fly and Render inject their own; the Dockerfile deliberately does not bake one in. |
| `ALLOWED_ORIGINS` | only §8 | exact frontend origin(s) | Enables credentialed CORS. Empty means same-origin, which is the normal case. |
| `COOKIE_SAME_SITE` | only §8 | `None` | Refused at boot unless `ALLOWED_ORIGINS` is non-empty. |
| `VITE_API_ORIGIN` | only §8, build-time | the API's public origin | The only URL the bundle prefixes onto `/api/...`. A URL, never a key — it is visible in the shipped JS. |
| `VITE_SITE_ORIGIN` | only §8, build-time | the site's public origin | Sets `restaurant.siteUrl` for canonical/OG links when the site is not served from its own origin. |

Generating the one secret:

```bash
node -e "console.log(require('node:crypto').randomBytes(24).toString('base64url'))"
```

Build-time variables (`VITE_*`) are compiled into `dist/`, so changing one needs a rebuild.
Everything else is read at boot, so moving to a new domain is one variable and a restart.

---

## 4. HTTPS, cookies, CORS and "redirect URLs"

The four settings that silently break sign-in when they disagree — and what this project does
about each:

- **TLS itself** is the platform's job. Fly.io and Render issue and renew the certificate for your
  domain and forward plain HTTP to the app with `X-Forwarded-Proto`. On your own VPS, Caddy
  (`reverse_proxy 127.0.0.1:8787`) or nginx + certbot does the same. `TRUSTED_ORIGIN` must be the
  `https://` URL people will actually open, and the app then enforces it: HTTP `GET`/`HEAD` gets a
  `301` to the https version of the host the proxy supplied — but only if that host is one the app
  was configured with, so a forged `Host` header cannot bounce a customer onto somebody else's
  site. `Strict-Transport-Security` is sent for 180 days with `includeSubDomains`, which means
  **do not set `TRUSTED_ORIGIN` to a domain you might later serve over plain HTTP**.
- **The session cookie needs no configuration.** `tw_session` is always `HttpOnly` and always
  `Secure` in production, with `SameSite=Lax` for the normal same-origin deploy — never read by
  page script, never sent to another site, never in clear text. It is not a
  redirect target, so there is nothing to "whitelist": a customer who signs in at
  `https://tandooriwala.example` is only recognised at that exact origin. If you later add `www`
  or a staging subdomain, treat it as a different site: pick one canonical host and have the other
  redirect to it at the platform layer.
- **CORS stays off by design.** Same-origin requests carry the cookie automatically and need no
  preflight, so the app sends no CORS headers at all in the normal layout. Nothing to misconfigure,
  and no wildcard that could leak a session. Turn it on only in §8.
- **There are no third-party auth redirects to register.** No OAuth client, no `redirect_uri`
  field anywhere, no provider console to visit. After sign-up and sign-in the app routes to
  `/profile` from in-memory router state — never from a `?next=` parameter — so a crafted link
  cannot send a signed-in customer to an outside site.
- **No localhost URL survives the build.** `src/lib/api.ts` uses relative same-origin calls,
  `index.html`'s canonical and Open Graph tags are stamped with `TRUSTED_ORIGIN` at request time,
  the startup log prints `api https://your-domain/api` in production, and `restaurant.siteUrl`
  stays empty unless you set it on purpose. The dev proxy's `API_URL` is never read by a
  production build.

---

## 5. Database, migrations and the disk

**Migrations run themselves.** `server/migrate.js` applies `0001_enquiries`, `0002_bookings`,
`0003_accounts` and `0004_booking_owner` in order when the server starts, recording each id in
`schema_migrations`, so an empty volume and a restored one converge on the same shape. There is
no separate migrate command to forget, and the first boot log says:

```
schema     applied 0001_enquiries, 0002_bookings, 0003_accounts, 0004_booking_owner
```

To rehearse against a copy first:

```bash
cp -r data /tmp/data-copy && DATA_FILE=/tmp/data-copy/enquiries.db npm start   # then Ctrl-C
```

Two invariants to preserve if you ever write a step of your own:

- `booking_seats` has `PRIMARY KEY (booked_for, slot, chair)` — the storage-layer guarantee that
  one chair cannot be sold twice in one seating. `chair` holds a hall chair (`A1-1`) or a private
  room table (`P1`), which is also what caps each room table at one couple.
- `sessions.token_hash` is the primary key and stores only the SHA-256 of the token, never the
  token itself. A database dump therefore cannot be used to sign in as anybody.

**The disk.** WAL mode means `DATA_FILE` grows `-wal` and `-shm` siblings; back all three up
together, or checkpoint first (`PRAGMA wal_checkpoint(TRUNCATE)`). There is no dump service, so
the backup is a file copy — `sqlite3 … .backup`, `rsync`, or the platform's volume snapshot.
Restore is: stop the app, copy the files in, start it. Do it once, deliberately, before a
customer depends on the data.

A mis-mounted volume is the failure worth designing around, and `/api/health` exists for exactly
that: it runs `SELECT 1` and answers `503 {"store":"unreachable"}` instead of pretending to be
fine. Both configs health-check that path on every restart, so a container that cannot open its
database gets caught by the platform rather than by the first booking of the evening.

---

## 6. Bookings across devices and countries

Fixed in this build, and verifiable after the deploy (§9):

- Seating times are wall-clock hours **in Bhadrak**, computed from `RESTAURANT_TIMEZONE`, not from
  the container's clock. On a UTC server, a `20:00` table used to be judged against `20:00Z` — a
  five-and-a-half-hour error that would open a finished evening or lock a live one.
- The bookable window (`validDate`) is measured in the restaurant's day, so the last table of
  tonight does not disappear at 18:30 local for a customer in New York.
- `GET /api/tables` returns `today` and `timezone`, and `/book` defaults its date picker to the
  server's `today` rather than the device's.
- When the device's zone differs from the restaurant's, the form says so plainly: hours are on the
  kitchen's clock, not the phone's.
- Everything is one shared production database, so a friend abroad sees the same red chairs the
  customer next door just made brown.

---

## 7. Publish

Pick **one** of these. A and B are the two that need the least thinking; C is for a VPS.

### A. Fly.io — recommended

`fly.toml` and `Dockerfile` are committed and already agree: build from the Dockerfile, mount a
volume at `/data`, let the platform set `PORT`, health-check `/api/health`.

```bash
# 1. Install flyctl for your OS (Homebrew `brew install flyctl` on macOS; Windows has a winget
#    package and its own installer), then sign in:
fly auth login

# 2. Create the app. `fly launch` reads the committed fly.toml rather than inventing a new one,
#    and offers a Postgres and a Redis this app does not want — decline both. It will also try to
#    deploy, which fails until the secrets and the volume exist. That is harmless.
fly launch --region bom1            # bom1 = Mumbai: the closest region to Odisha

# 3. The volume the database and the profile photos live on. 1 GB is plenty for one restaurant.
fly volumes create tandooriwala_data --region bom1 --size 1

# 4. Secrets, from the .env you filled in (§3). Never put them in fly.toml — that file is
#    committed, and its [env] block is only for the non-secret defaults.
fly secrets create --from-env-file .env

# 5. Build, ship, and ask what it thinks.
fly deploy
fly check health
```

`bom1` keeps the round trip short for customers in Bhadrak while still serving a friend in another
country from an edge rather than from your laptop. The committed `fly.toml` mounts the volume at
`/data`, which is exactly where its `[env]` block points `DATA_FILE` and `UPLOAD_DIR`, sets
`TRUST_PROXY_HOPS=1` and the restaurant's timezone, and health-checks `/api/health`. Its
`internal_port` is 8080 because that is the port Fly's proxy forwards to and the value Fly
injects into `PORT` — the image deliberately bakes no `PORT` in, so a plain `docker run` still uses
the app's own 8787 default. Change `internal_port` only if you pin `PORT` yourself.

### B. Render — Blueprint, mostly clicks

[`render.yaml`](render.yaml) creates the web service, the build and start commands, the health
check, the 1 GB disk at `/var/data`, and a generated value for the admin key.

1. Push this repository to GitHub.
2. Render dashboard → **New + → Blueprint** → pick the repository.
3. Before the first deploy, set **`TRUSTED_ORIGIN`** in the service's Environment to your
   `https://` domain. It is marked `sync: false`, so the Blueprint will not overwrite it — but it
   must be present, or the app refuses to start.
4. Deploy, then confirm `/api/health` answers `200` with `"store":"ok"`. Nothing else needs
   creating by hand: `UPLOAD_DIR` is made inside the mount on the first upload.

Render's free web services do not support persistent disks, so this Blueprint asks for a paid
`starter` instance — that is not a preference, a free service would run happily and then lose
every booking on the next restart. A small Fly.io volume is usually the cheaper way to get the
same durability. Region `singapore` is set for lower latency
to Odisha; it does not affect what customers see elsewhere.

### C. A VPS or any container host

```bash
docker build -t tandooriwala .
docker run -d --name tandooriwala -p 127.0.0.1:8787:8787 \
  -v /srv/tandooriwala/data:/data \
  --env-file /etc/tandooriwala.env \
  tandooriwala
```

Then terminate TLS in front of it — Caddy with `reverse_proxy 127.0.0.1:8787`, or nginx plus
`proxy_set_header Host $host; proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;`. `Host` and `X-Forwarded-Proto` must reach the app
untouched: the first builds the HTTPS redirect target, the second sets the `Secure` cookie.

> **Status of this option, honestly:** the Dockerfile is written and reviewed but **not
> build-verified** — no Docker CLI exists on this machine, so `docker build` has never run here.
> The steps it performs *are* verified: `npm ci`, `npm run build`, and `NODE_ENV=production`
> booting against the real server. Expect the first build to take a few minutes because `sharp`
> resolves its native binary for the container platform.

### Then: the custom domain

1. In the host's dashboard, add the domain (Fly `fly certs add`, Render **Settings → Domain**)
   and read the record it asks for.
2. At your registrar/DNS: an `A`/`ALIAS`/`CNAME` flattening for the apex `tandooriwala.example`,
   and a `CNAME` for `www` pointing at the same place — or, simpler, serve only the apex and let
   the host redirect `www`.
3. Wait for the certificate to issue, then load `https://tandooriwala.example`. The app already
   sends everyone there, so plain `http://` links in WhatsApp and on Google still work.
4. Set `TRUSTED_ORIGIN` to exactly the winner (apex or `www`, not both) and restart. If you flip
   it later, customers who signed in under the old host are signed out — that is the cookie rule,
   not a bug.
5. Update the git remote/host link if you renamed the app, and confirm `/api/health` reports the
   new origin's `restaurant_day`.

---

## 8. Optional: site and API on two origins

Only if you already have a static host you are committed to. Single-origin needs none of this.

| Set on the API | Set at build time on the frontend |
| --- | --- |
| `ALLOWED_ORIGINS=https://tandooriwala.example` | `VITE_API_ORIGIN=https://api.tandooriwala.example` |
| `COOKIE_SAME_SITE=None` | `VITE_SITE_ORIGIN=https://tandooriwala.example` |
| `TRUSTED_ORIGIN=https://tandooriwala.example` | |

Then credentialed cross-origin calls work: the app echoes the exact allowed origin, adds
`Access-Control-Allow-Credentials: true` and `Vary: Origin`, answers `OPTIONS` preflights for
`content-type` and `x-admin-key`, and issues `SameSite=None; Secure`. Requests from a host that is
not listed get 401/403 instead of the cookie — which is what `check:accounts` asserts.

Both domains must be HTTPS before this is worth trying: a `SameSite=None` cookie without `Secure`
is dropped by every browser, which is why the boot guard refuses `COOKIE_SAME_SITE=None` unless an
allowlist exists, and why `TRUSTED_ORIGIN` has to be `https://` in production at all.

---

## 9. Verify it from outside your own network

From a phone on mobile data — not from the host:

```bash
curl -s https://tandooriwala.example/api/health
curl -s "https://tandooriwala.example/api/tables?date=2026-11-15"
curl -sI http://tandooriwala.example/book
```

Expect, in order: `200` with `"store":"ok"`, the restaurant's own `restaurant_day` and
`"timezone":"Asia/Kolkata"`; a seating list whose `today` matches India, not the container's
timezone; and a `301` to `https://tandooriwala.example/book`. A `503` with
`"store":"unreachable"` means the volume is missing or unwritable — fix that before anything else.

Then in the browser:

1. `/book` → the date defaults to today in Bhadrak, and the seat list loads white/amber/red.
2. Sign up, land on `/profile`, upload a photo, reload → still there.
3. Book one chair in an incognito window at the same seating; the first window's map must show it
   taken on refresh, and a second attempt on that chair must be refused.
4. Download the ticket PDF and open it on the phone.
5. `/contact` → send an enquiry, then read it at `/admin` with the key.
6. Ask your friend in another country to load the site, book, and send you the PDF.

---

## 10. Before you tell anyone it is live

- [ ] **Real seating times.** `bookingSlots` in [`server/config.js`](server/config.js) ships as
      `12:30 / 13:30 / 20:00 / 21:00` and the UI labels them setup values, because the restaurant's
      hours were never supplied. Confirm them with the owner, edit that array, redeploy. Never
      publish invented hours.
- [ ] **Real floor plan**, if the drawing differs: `floorPlan` and `diningRoom` in the same file.
- [ ] **Test data cleared.** `data/enquiries.db` here holds bookings `TB-0001`…`TB-0007`, test
      accounts including `pdf.ticket@example.test`, and two avatars. Do not ship a live booking
      onto a chair a test row already holds.
- [ ] **Logo.** `public/favicon.svg` is a placeholder flame mark and is also what the ticket PDF
      draws. Swap it and the ticket follows.
- [ ] **Photography or the honest label.** Every image in `public/images/` is an AI-generated
      illustration, labelled as such in the footer and in each `alt`. Replace with real photos or
      leave the label; do not silently pass them off as this kitchen.
- [ ] **Menu prices and hours.** Still placeholders on purpose — nothing unverified was invented.
- [ ] **WhatsApp.** No button ships, because nobody has confirmed that +91 89173 92926 is active on
      WhatsApp. `whatsappConfirmed` in [`src/data/restaurant.ts`](src/data/restaurant.ts) is the
      flag, once the owner says so.
- [ ] **Secrets are in the platform, not in git** — and `.env` was never committed.
- [ ] **`TRUSTED_ORIGIN`** is the exact https host customers will open: no port, no trailing slash,
      no localhost. Check the startup log, not just the dashboard.
- [ ] **Backups**: you have copied `DATA_FILE` off the volume and restored it once.
- [ ] **One instance / one replica**, because SQLite and the rate limiter are both per-process.
- [ ] `npm run check` passes against the build you shipped.

---

## 11. Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| `refused to start  NODE_ENV=production needs TRUSTED_ORIGIN…` | Guard at boot. | Set the https origin. Do not "fix" it by dropping `NODE_ENV`. |
| `refused to start  dist/index.html is missing…` | Build output not in the image/serving directory. | `npm run build` (or check the Dockerfile `COPY --from=build`). |
| Sign-in works, then the customer is anonymous on the next page | Cookie not `Secure` because the page reached them over HTTP, or the origin differs. | Serve one canonical https host; confirm `TRUSTED_ORIGIN` matches it exactly. |
| `/admin` answers `503` | `TANDOORIWALA_ADMIN_KEY` is unset. | Set the secret and restart. |
| Every visitor shares one rate-limit bucket | Proxy hops beyond `TRUST_PROXY_HOPS`. | Raise it to the real hop count. |
| `503 {"store":"unreachable"}` while the site renders | Volume not mounted, or the path is unwritable. | Fix the mount or `DATA_FILE`; the health check is doing its job. |
| Bookings and photos gone after a redeploy | `data/` was container-local. | Point `DATA_FILE`/`UPLOAD_DIR` at the mounted disk — which is what `fly.toml` and `render.yaml` already do. |
| A booking for the wrong day, or "no tables tonight" abroad | Timezone. | Check `RESTAURANT_TIMEZONE` is `Asia/Kolkata` and that `/api/health` reports the same `restaurant_day` as Bhadrak. |
| `403 https_required` on a booking | The `POST` arrived over plain HTTP — redirected `POST`s lose their body, so it is refused rather than mangled. | Send the form from the https origin; the `301` handles page visits. |
| 404 on `/profile` refresh from a static host | SPA fallback missing. | Use the Express server, or configure the host to rewrite unknown paths to `index.html`. |

---

## 12. What stays deliberately absent

No online ordering, cart, payment or delivery claim. No confirmation email or SMS — that needs a
provider nobody has been given. No invented hours, prices, reviews, awards, chef biographies or
founding story. No third-party analytics or tracking. If any of those appear later, they arrive
with their own environment variables and their own accounts, not as a silent assumption in this
guide.
