# Tandooriwala Bhadrak — website

A mobile-first site for a tandoor-led restaurant in Bhadrak, Odisha. North Indian,
Mughlai, Punjabi and Indo-Chinese cooking; warm charcoal, cream and tandoor-inspired
saffron/burnt-orange palette; oversized condensed display type.

Content pages (home, about, menu, visit, contact) plus a real reservation area: table
bookings on a chair map, customer accounts with a profile photo, and ticket history that
downloads as a PDF. Everything that writes goes through the Node backend and SQLite —
there are no mocked success states.

## Process for Installation in Your Local Computer

Written for someone who got this project from the repository page as **Code → Download ZIP** and has
never opened a terminal. Every command here was run and checked, on Windows 11 with Node v22.14.0,
npm 10.9.2 and Vite 7.3.7; the `npm …` lines are byte-for-byte identical on macOS and Linux.
Nothing in this section is production-only unless it says so — publishing the site publicly is
[`DEPLOYING.md`](DEPLOYING.md), and no step below needs an account on any external service.

### 1. Unzip it, and put the folder somewhere short

The ZIP contains one folder (named after the repository). Extract it — right-click → **Extract All**
on Windows, double-click on macOS, `unzip Tandooriwala.com-main.zip` on Linux — and move the result
somewhere with a short path:

```
C:\dev\tandooriwala          (Windows)
~/dev/tandooriwala           (macOS, Linux)
```

You should now see `package.json`, `index.html`, `src/`, `server/`, `scripts/`, `.env.example` inside
it. If you are still looking at a folder called `Tandooriwala.com-main` *inside* another folder of the
same name, that inner one is the project. A very deep path on Windows can make step 4 fail with
`ENAMETOOLONG` — that is why "somewhere short" matters more than "somewhere tidy".

### 2. What has to be installed first

| Need | Version | Why |
| --- | --- | --- |
| **Node.js** | **22.13 or newer** (24 recommended) | The backend stores bookings with `node:sqlite`, which is built into Node from 22.13. There is no database server to install. |
| **npm** | ships with Node | Installs the dependencies and runs the scripts. |
| Git | not required | You downloaded a ZIP, so you do not need it. |
| Docker | not required | Optional, see the last item in this section. |

Install Node from [nodejs.org](https://nodejs.org/) (the LTS button) and check what you actually got:

```bash
node -v     # v22.13.0 or higher — this is the one that bites
npm -v      # any recent number; 10.x or 11.x both work
```

An old Node left over from another project is the single most common reason this site will not start.
`npm run setup` (step 5) checks it for you and says so in plain words.

### 3. Open a terminal inside the project folder

- **Windows**: open the folder in File Explorer, click into the address bar, type `cmd` and press
  Enter. Or use *Git Bash* / *PowerShell* — both work; the commands below are the same in all three.
- **macOS**: Terminal app → `cd` and a space, drag the folder onto the window, press Enter.
- **Linux**: your file manager's *Open Terminal Here*, or `cd ~/dev/tandooriwala`.

Confirm the terminal is in the right place before going on — `package.json` must be listed:

```bash
dir          # Windows cmd
ls -a        # PowerShell, macOS, Linux
```

### 4. Install the dependencies

```bash
npm install
```

Use plain `npm install`, **not** `sudo npm install` — `sudo` on macOS/Linux writes root-owned files
that the next run cannot replace. This reads [`package-lock.json`](package-lock.json), so everyone gets
exactly the versions this site was built and tested with: React 19, Vite 7, Tailwind 4, Express 5,
`sharp` (profile-photo resizing) and `jspdf` (the ticket). It creates a `node_modules/` folder and
prints no error when it succeeds; a couple of `deprecated` warnings are normal. `npm ci` also works and
is stricter — it wipes `node_modules/` first, which is what you want if the folder is half-installed
or you are re-testing a clean download.

If it fails on `sharp`, keep reading step 10 — the site still runs; only photo uploads are affected.

### 5. Configuration: one command, or one copied file

**Locally you need almost nothing.** Every value has a working default, and no third-party account,
API key, map token, payment gateway or SMTP server is involved anywhere in this project. There is
exactly one value worth creating on a laptop — the key that opens the owner's inbox at `/admin`:

```bash
npm run setup
```

That checks your Node version and writes a `.env` for you containing a freshly generated
`TANDOORIWALA_ADMIN_KEY` and nothing that would break a local run. Re-running it never overwrites an
existing `.env`. The file is gitignored, so it cannot be committed by accident, and it holds only a
local-only secret — no real credential belongs in this project at all.

Prefer to do it by hand, or want the full variable list? Copy the template instead:

```bash
copy .env.example .env       (Windows cmd)
cp .env.example .env         (PowerShell: Copy-Item .env.example .env — macOS, Linux)
```

⚠️ If you copy the template, **delete or comment out `NODE_ENV=production` and `TRUSTED_ORIGIN`** for
local work. `.env.example` is written as a production template, and the server deliberately refuses to
start in production mode with an `.example` origin — that guard exists so nobody publishes a site whose
links, cookies and CORS still point at localhost. [`DEPLOYING.md`](DEPLOYING.md) §3 is where those two
lines belong. `npm run setup` sidesteps the whole problem by only writing the one line you need.

### 6. Database, migrations and photo storage — all automatic

There is nothing to create, no `mysql` to log into, no seed script to forget, and no ORM to configure:

- The SQLite file path defaults to `data/enquiries.db`; [`server/db.js`](server/db.js) makes the folder
  and the file on first boot.
- [`server/migrate.js`](server/migrate.js) applies the four ordered steps (`0001_enquiries`,
  `0002_bookings`, `0003_accounts`, `0004_booking_owner`) the moment the server starts, records them in
  `schema_migrations`, and is idempotent — so restarting never double-applies anything.
- Profile photos go to `data/uploads/avatars/`. That folder is never served as a directory; the only way
  in is `GET /api/profile/photo`, which checks the session and the owner.
- Bookable seatings and the floor plan are *setup values* the restaurant edits in
  [`server/config.js`](server/config.js) — see "Edit these first" below. They are not stored in the
  database, so there is nothing to seed.

So "set up the database" here means: **start the server once.** To begin from an empty inbox and an
empty booking diary, stop the server and delete the `data/` folder; it is rebuilt on the next boot.
`data/` is gitignored because it holds real customers' phone numbers.

### 7. Start it — pick one of these two

**A. The one-terminal version (simplest).** Build the front end once, then run the server that serves
both the site and the API on a single port:

```bash
npm run build      # tsc --noEmit && vite build  -> dist/
npm start          # http://localhost:8787
```

`npm run build` typechecks first, so a broken page is reported there instead of at runtime.

**B. The development version (hot reload), which needs two terminals.** This is what you want if you
are editing code; keep both running:

```bash
# terminal 1 — the API
npm start

# terminal 2 — the site, which proxies /api to http://localhost:8787
npm run dev        # http://localhost:5173
```

`npm start` with no `dist/` is not a failure — it prints `dist/ not built — API only (run npm run dev
for the site)` and serves `/api` alone, which is exactly what terminal 2's proxy needs. Terminal 1 can
stay silent; it is doing work. If you use VS Code: *Terminal → New Terminal* twice, or the split `+`.

### 8. Open it and confirm it is really working

Route A → <http://localhost:8787>. Route B → <http://localhost:5173>. Both serve the same site; the
difference is only whether editing source reloads the page.

Check, in this order:

1. The home page paints with the wordmark and the food photography.
2. **The API is reachable** — <http://localhost:8787/api/health> (or `/api/health` on 5173) answers:
   ```json
   {"ok":true,"uptime":2033,"signed_in":false,"store":"ok","restaurant_day":"2026-10-23","timezone":"Asia/Kolkata"}
   ```
   `"store":"ok"` is the useful part: it means SQLite opened and the migrations applied.
3. **The booking map has real data** — <http://localhost:8787/api/tables?date=2026-10-25> returns
   `"slots":["12:30","13:30","20:00","21:00"]` plus the floor plan. Ask for a past date and it answers
   `{"error":"invalid","fields":{"date":"Pick a date from today onward."}}` — that is the validation
   working, not a bug.
4. **Book a table end to end**: `/book` → pick a day and seating → click chairs → details → confirm.
   You get a booking reference; the same chair on the same day and seating is now greyed out for everyone,
   including in a second browser. Repeat a booking that you already took and the server answers `409`.
5. **Sign up, upload a photo, download the ticket**: `/account` → create an account → `/profile` →
   upload a JPG/PNG (it is resized to 512px and stored under `data/uploads/avatars/`) → *My Bookings* →
   **Download booking ticket**. The PDF is drawn in your browser by `jspdf` from the row the server gave
   that account, so it needs no service, key, or print dialog on the server.
6. **The owner inbox**: <http://localhost:8787/admin> — paste the `TANDOORIWALA_ADMIN_KEY` value from
   `.env` into the key field. Without that key the endpoints answer 503 on purpose: the inbox keeps
   accepting messages but nobody can read them.

To see it on a phone on the same Wi-Fi, open the `Network:` URL `npm run dev` prints (for example
`http://192.168.1.12:5173/`). The proxy runs inside Vite, so `/api` works from the phone too. Windows
asks whether to allow Node on the network — say yes to *Private* networks. That is local reach only:
a customer outside your network still needs a real deployment.

### 9. Stop it

`Ctrl+C` in each terminal. The server prints nothing dramatic; the port simply stops answering.

The verification suites can run while the site is up, because they never touch your real data:
`npm run check` (36 assertions across double bookings, accounts, tickets, uploads and the private-room
limit) opens its own throwaway databases — `data/.double-booking-check.db` and `data/.accounts-check.db` —
and `check-accounts` binds its own port (`8901 + pid % 40`) instead of 8787. `node scripts/contrast-audit.mjs`
reads no server at all. All three are safe to run any time.

### 10. When it does not work, by operating system

| What you see | What it means and what to do |
| --- | --- |
| `node: bad option --env-file-if-exists` at `npm start` | Your Node is older than 22.9. Install Node 24 and re-run `npm install`. This is step 2 biting, and it is Windows-macs-Linux equal. |
| `Cannot find package 'node:sqlite'` / `ERR_UNKNOWN_BUILTIN_MODULE` | Node between 22.5 and 22.12, where `node:sqlite` needs a flag this app does not pass. Same fix: Node 22.13+ or 24. |
| `npm install` dies on `sharp`, `ECONNRESET` or a post-install script | `sharp` is a prebuilt binary download. Re-run `npm install` with a working network; if it stays broken, the site and bookings still run — only profile-photo uploads report a failure, because `sharp` is imported lazily in [`server/uploads.js`](server/uploads.js). |
| `EADDRINUSE :::8787` | Something already owns the port — usually a previous `npm start` that did not exit. Change ports instead of hunting it: set `PORT=8788` in `.env`, or find it: `netstat -ano \| findstr :8787` then `taskkill /PID <pid> /F` (Windows), `lsof -i :8787` then `kill <pid>` (macOS, Linux). Never kill a process you cannot name. |
| The site loads but every write says it cannot reach the server, and `/book` shows an offline banner | Route B only: terminal 1 (`npm start`) is not running, so Vite's proxy has nothing to talk to. `API_URL` in `.env` overrides where it proxies. |
| `dist/index.html is missing — run npm run build` at `npm start` | You used Route A without building, or deleted `dist/`. `npm run build`. |
| The server refuses to boot and lists production problems, mentioning `TRUSTED_ORIGIN` | You have `NODE_ENV=production` in `.env` (step 5's warning). Remove it, or set a real HTTPS origin when you deploy. |
| `/admin` says the inbox is closed, or `GET /api/enquiries` returns 503 | No `TANDOORIWALA_ADMIN_KEY` in `.env`, or the wrong one typed. It is a case-sensitive copy-paste from `.env`. |
| `Picking a date from today onward` when you try to book today's dinner | The clock is `Asia/Kolkata` by design ([`server/clock.js`](server/clock.js)), so a slot that has already passed in Bhadrak is not bookable from another country. Not a bug; `RESTAURANT_TIMEZONE` is the knob. |
| A booking you can see but not download as PDF | Only *confirmed* bookings produce a ticket, and only for the account that made them. That is the privacy rule working. |
| Windows: "Windows protected your PC" on `node.exe`, or `npm` is not recognised in PowerShell after installing Node | Node's installer did not add itself to `PATH` — re-run it and choose *Add to PATH*, then open a **new** terminal. SmartScreen: *More info → Run anyway* is safe when you installed Node from nodejs.org yourself. |
| macOS: `command not found: node` in a fresh Terminal window | Your PATH does not yet have the version manager's shim. Open a new window; with `nvm`, `nvm use --lts`. Do not install with `sudo`. |
| Linux: `EACCES` on `npm install`, or permission denied on `data/` | Do not use `sudo`. Install Node through `nvm` (or your distro's Node 22+ package) so the project folder is owned by you: `chown -R "$USER" <folder>`. On a read-only mount (a USB stick, a Downloads folder on some distros) move the project to your home directory first. |
| Pages look unstyled | Tailwind v4 is compiled by the Vite plugin — you ran `npm run dev`/`npm run build` from the project root, and [`src/index.css`](src/index.css) was imported. Opening `index.html` by double-clicking never works; it is a build tool, not a static file. |

### Optional: Docker instead of the steps above

The repo has a [`Dockerfile`](Dockerfile) that builds the site and runs the API in one image. It needs
Docker Desktop (Windows/macOS) or Docker Engine (Linux), neither of which this project can install for
you — and note that the commands below follow the committed Dockerfile but were not executed in this
environment, so treat them as a starting point rather than as verified as step 7 was.

```bash
docker build -t tandooriwala .
docker run --rm -p 8787:8787 \
  -e TANDOORIWALA_ADMIN_KEY=<a-long-random-string> \
  -v tandooriwala-data:/data \
  tandooriwala
```

Then open <http://localhost:8787>. Two details matter: **do not** pass `--env-file=.env`, because the
image already points `DATA_FILE` and `UPLOAD_DIR` at the `/data` volume and your local `.env` would
override them back to relative paths — the bookings would land outside the volume and vanish on restart.
The `-v` is what makes data survive. For a public deployment you additionally need `NODE_ENV=production`
and a real `TRUSTED_ORIGIN`; see [`Dockerfile`](Dockerfile) and [`DEPLOYING.md`](DEPLOYING.md) §7C.

## Stack

- Vite 7 + React 19 + TypeScript 5.9 (strict) + react-router-dom 7
- Tailwind CSS v4 — CSS-first config, no `tailwind.config.js`; every token lives in
  the `@theme` block of [`src/index.css`](src/index.css)
- Fonts: Archivo (condensed uppercase display), Shrikhand (wordmark), Inter (body),
  Caveat (handwritten accents) via Google Fonts
- `sharp` for responsive JPEG generation, the image manifest and profile-photo resizing
- `jspdf`, loaded lazily in the browser, to draw the downloadable ticket
- Optional backend: Express 5 + Node's built-in `node:sqlite` (no ORM, no native
  compile) for the enquiry inbox, the reservation flow and the accounts in
  [`server/`](server/)

## Commands

```bash
npm run setup       # check Node, create a local .env with its own admin key — see the install guide
npm run dev         # http://localhost:5173 (proxies /api to http://localhost:8787)
npm run build       # tsc --noEmit && vite build -> dist/
npm run preview     # serve dist/ on http://localhost:4173
npm run typecheck   # tsc --noEmit only
npm start           # API + built dist/ — http://localhost:8787 in dev, TRUSTED_ORIGIN in production
npm run check       # both suites below, in one command
npm run check:bookings -- --workers 12  # hammer one chair from 12 OS processes
npm run check:accounts                  # accounts, tickets, uploads and room limits
node scripts/contrast-audit.mjs         # numeric WCAG 2.2 AA check on every colour pair
node scripts/optimize-images.mjs        # rebuild public/images + imageManifest.ts
```

Deploying it publicly is [`DEPLOYING.md`](DEPLOYING.md); [`.env.example`](.env.example) is the
variable list. `npm start` needs no proxy of its own — it serves `dist/` and answers `/api` on the
same origin.

## Routes

| Path | Purpose |
| --- | --- |
| `/` | Hero, cuisine ticker, a short four-traditions teaser, featured categories, and compact Visit Us + Contact Us teasers. Full About and Menu content deliberately stays off Home. |
| `/about` | The four traditions, how the food is cooked, and an honest list of what is still unconfirmed. |
| `/menu` | Nine categories, searchable and diet-filterable, in-place price placeholders. |
| `/visit` | Exact address, prominent Get Directions, live map embed, and a "hours not published" card. |
| `/contact` | Tap-to-call as the primary action, what to call about, and the enquiry form that posts to the backend. |
| `/book` | Four-step reservation: date + seating, chair map, contact details, review → success. Works signed-in or as a guest. The success panel downloads the ticket as a PDF. |
| `/account` | Sign up / log in as a two-tab panel; sends you to `/profile` on success. |
| `/profile` | Editable name and phone, profile photo upload, and My Bookings as ticket cards — each confirmed one downloadable as a PDF. Sign-out lives here. |
| `/ticket/:ref` | One ticket, read from the backend and only if it belongs to the signed-in account. |

Shared chrome lives in [`src/components/Layout.tsx`](src/components/Layout.tsx):
skip link, scroll manager, JSON-LD, header, main, footer.

## Backend: enquiries, reservations, accounts

Three write paths, all stored on the restaurant's own disk and read back by the owner
or by the customer who made them. There is no cart, no payment, no delivery claim and
no third-party service anywhere in this code.

| File | Role |
| --- | --- |
| [`server/index.js`](server/index.js) | Express 5 app: every `/api` route, `/admin`, rate limiting, security headers, static `dist/` + SPA fallback. |
| [`server/config.js`](server/config.js) | **Setup values**: the bookable seatings, the floor plan and the private dining room's couple limit. Editable, not invented — see below. |
| [`server/validate.js`](server/validate.js) | The single trust boundary — field lengths, `+91` phone shape, date/time/party range, past-slot check, seat ids that exist, the two-couple cap, control-character scrub. |
| [`server/clock.js`](server/clock.js) | Whose clock: every date and seating is computed in `RESTAURANT_TIMEZONE` (Asia/Kolkata), not the container's or the customer's — the bookable window, the past-slot cut-off and "today" all come from here. |
| [`server/db.js`](server/db.js) | `node:sqlite` (`DatabaseSync`), WAL journal, `foreign_keys=ON`, `busy_timeout`, prepared statements only. |
| [`server/migrate.js`](server/migrate.js) | Ordered schema steps recorded in `schema_migrations`; applied on boot, idempotent. |
| [`server/bookings.js`](server/bookings.js) | The transactional create/cancel, availability reads, and the per-account ticket reads. |
| [`server/auth.js`](server/auth.js) | scrypt password hashing, session start/end/read, profile updates. |
| [`server/uploads.js`](server/uploads.js) | Profile photos: byte sniffing, `sharp` resize to 512px JPEG, private folder, ownership-checked read. |
| [`server/admin.html`](server/admin.html) | Owner viewer for enquiries and bookings. Built with `textContent`, never `innerHTML`, so stored text cannot execute. |
| [`src/pages/Book.tsx`](src/pages/Book.tsx) | The four-step flow; every availability fact comes from `GET /api/tables`. |
| [`src/components/TableMap.tsx`](src/components/TableMap.tsx) | The chair glyphs and the private-room map — positions derived from the server's floor plan, never duplicated client-side. |
| [`src/pages/Account.tsx`](src/pages/Account.tsx) [`Profile.tsx`](src/pages/Profile.tsx) [`Ticket.tsx`](src/pages/Ticket.tsx) | Sign in / sign up, profile + My Bookings, and one ticket. |
| [`src/lib/account.tsx`](src/lib/account.tsx) [`src/lib/bookings.ts`](src/lib/bookings.ts) | The session provider and the typed fetch wrappers, with result unions (`rejected` / `conflict` / `rate-limited` / `unreachable`). |
| [`src/lib/ticketPdf.ts`](src/lib/ticketPdf.ts) [`src/components/TicketDownload.tsx`](src/components/TicketDownload.tsx) | The downloadable A5 ticket: the PDF is drawn in the browser from the booking row the server handed this account, and the button that asks for it. |
| [`src/components/EnquiryForm.tsx`](src/components/EnquiryForm.tsx) | The enquiry form; client validation mirrors the server's rules. |

```bash
TANDOORIWALA_ADMIN_KEY='pick-your-own-long-secret' npm start
```

### Environment

Everything the server reads is listed in [`.env.example`](.env.example) with comments;
[`DEPLOYING.md`](DEPLOYING.md) is the production walkthrough. These are the ones that change
behaviour:

| Variable | Default | What it does |
| --- | --- | --- |
| `TANDOORIWALA_ADMIN_KEY` | *unset* | Gates `GET`/`PATCH` on both lists and `/admin`. Unset ⇒ the inbox and the booking list are write-only (503, never open). Compare with `timingSafeEqual`. Wrong keys are rate limited; correct ones are not, so refreshing the inbox never burns the budget. |
| `DATA_FILE` | `data/enquiries.db` | SQLite path — relative to the project, or absolute when a deployment mounts a volume (`/data/enquiries.db`). One file holds enquiries, bookings, seats, users and sessions. |
| `UPLOAD_DIR` | `data/uploads/avatars` | Where profile photos live; also relative-or-absolute, and resolved with `path.resolve` so an absolute `/data/...` is honoured rather than grafted onto the project. Never served as a folder — see `/api/profile/photo`. |
| `NODE_ENV` | *unset* | `production` turns on the boot guards, the HTTP→HTTPS redirect, HSTS and the `Secure` cookie, and makes the startup log print the deployed origin instead of localhost. |
| `TRUSTED_ORIGIN` | *unset* | **Required in production** (`https://`, no trailing slash, never localhost). The public origin: the host that mutating `/api` calls must come from, the cookie's `Secure` flag, where plain-HTTP visitors are sent, and what replaces `{{SITE_ORIGIN}}` in the served `index.html`. |
| `TRUST_PROXY_HOPS` | `1` | How many proxies sit in front. One is right for Fly.io, Render, Railway, nginx and Caddy; too high lets a client forge `X-Forwarded-For` past the rate limits. |
| `RESTAURANT_TIMEZONE` | `Asia/Kolkata` | IANA zone the kitchen is in. Seating times, the past-slot cut-off and "today" are read here — not in the server's zone and not in the customer's. |
| `RESTAURANT_UTC_OFFSET` | `+05:30` | Fixed-offset fallback for a Node build with no timezone data (`small-icu`); must match the zone above. |
| `ALLOWED_ORIGINS` | *unset* | Only for split hosting (site on one origin, API on another): exact origins allowed to send credentialed requests. Empty ⇒ same-origin, no CORS headers at all. |
| `COOKIE_SAME_SITE` | `Lax` (`None` when `ALLOWED_ORIGINS` is set) | `None` needs HTTPS and is refused at boot without an allowlist. |
| `VITE_API_ORIGIN` | *unset* | Build-time: the API origin the bundle prefixes onto `/api/...` in the split layout only. A URL, never a key — it compiles into public JS. |
| `VITE_SITE_ORIGIN` | *unset* | Build-time: `restaurant.siteUrl`, for share previews when the site is not served from the origin it is read on. |
| `PORT` | `8787` | API + static port. Platforms that inject their own (`FLY_PORT`) win, by design. |
| `API_URL` | `http://localhost:8787` | Dev-only: what Vite proxies `/api` to. Never read by a production build. |

Nothing secret is in client code: the admin key is only ever typed into `/admin` and
sent as an `x-admin-key` header, and a session token is only ever an HttpOnly cookie —
no JSON body, `localStorage` or URL ever carries it.

### Schema (migrations run themselves on boot)

`server/migrate.js` steps: `0001_enquiries`, `0002_bookings`, `0003_accounts`
(`users`, `sessions`), `0004_booking_owner` (`bookings.user_id`). Applied ids are
recorded in `schema_migrations`, so an existing database and a brand-new one converge
on the same shape and there is no separate command to forget. Restart the server to
apply anything missing.

`bookings(id, ref, booked_for, slot, name, phone, party_size, note, status, created_at, user_id)`
with `status IN ('active','cancelled')`, `user_id` nullable (a guest booking belongs to
nobody) and `ON DELETE SET NULL`, plus

```sql
booking_seats(booking_id REFERENCES bookings(id) ON DELETE CASCADE,
              booked_for, slot, chair,
              PRIMARY KEY (booked_for, slot, chair))
```

That composite primary key is the last line of defence: two rows for the same chair in
the same seating are impossible at the storage layer. `chair` holds a main-hall chair
(`A1-2`) **or** a private-room couple slot (`P1`), which is why the same key also caps
each room table at one couple. `server/bookings.js` wraps the "are these seats free →
insert the booking → insert the seats" sequence in `BEGIN IMMEDIATE`, so the second
writer waits on the write lock (5s `busy_timeout`) instead of racing past the first.

`users(id, email UNIQUE, name, phone, password_hash, avatar, created_at)` and
`sessions(token_hash PRIMARY KEY, user_id, expires_at)` — only the SHA-256 of the
32-byte token is stored, so a database dump cannot sign in as anybody.

### Endpoints

- `GET /api/tables?date=YYYY-MM-DD[&slot=HH:MM]` — the seating list, the floor plan, the
  private dining room, and what is already held for that seating, split into `taken`
  (hall chairs) and `takenCouples` (room tables). `slot` is optional so the client can
  bootstrap before it knows the times. Also returns `today` and `timezone` — the
  restaurant's own date and zone — which is what the date picker floors itself to, so a
  customer two timezones behind Bhadrak cannot default to yesterday.
- `POST /api/bookings` — **6 writes per 10 minutes per IP**, 8kb body cap, honeypot
  `company` field. `201` with the booking read back from the row that was just written —
  so "confirmed" never precedes the commit; `409 {seats}` when a chosen seat went to
  somebody else meanwhile (the map refreshes and says so); `400 {fields}` for anything
  the server does not accept. Signs the booking to the session's account when one is
  present, and to nobody otherwise — the account id is never taken from the body.
- `GET /api/bookings/mine`, `GET /api/tickets/:ref` — signed-in only, filtered by the id
  behind the session cookie. Another customer's reference answers 404 "That ticket is not
  on this account", the same as a reference that does not exist.
- `POST /api/auth/signup`, `/api/auth/login` (12 per 10 minutes), `/api/auth/logout`,
  `GET /api/auth/me` — one generic message for a wrong email and a wrong password.
- `GET`/`PATCH /api/profile` — own name and phone only. The email is stored but not
  editable here.
- `POST`/`DELETE /api/profile/photo`, `GET /api/profile/photo` — **24 uploads per 10
  minutes**, a base64 data URL under 5 MB. `sharp` re-encodes to a 512px JPEG, so an
  uploaded file cannot carry a payload the browser would run, and the folder is not
  published: the read route hands back the caller's own picture with
  `Cache-Control: private`.
- `GET /api/bookings`, `PATCH /api/bookings/:id` (`{status:'cancelled'}`) — admin key
  required. Cancelling deletes the seat rows, which is what releases chairs.
- `POST /api/enquiries` is rate limited to **8 submissions per 10 minutes per IP**;
  `GET`/`PATCH /api/enquiries/:id` need the same header.
- `/admin` lists both: newest first, "Mark handled" per enquiry, "Cancel and free
  seats" per booking.
- Rows and photos live under `data/`. That directory is gitignored because it holds
  customers' phone numbers and their pictures; back it up or delete it as you prefer.
- `GET /api/health` — no key, no session. It runs `SELECT 1` against the real store and answers
  `200 {ok,store:"ok",restaurant_day,timezone}` or `503 {store:"unreachable"}`, so a volume
  mounted in the wrong place is a failing check rather than a green dashboard. It is also the one
  route that stays reachable over plain HTTP, for a probe inside the platform's own network.
- In dev, Vite proxies `/api` to `http://localhost:8787` (override with `API_URL`),
  so run `npm start` alongside `npm run dev`. In production the built site and the API are the
  same origin, so no proxy and no CORS configuration is involved.
- `trust proxy` is set to `TRUST_PROXY_HOPS` (default one) so the rate limiter sees the real
  client IP behind a single reverse proxy — raise it only when the platform documents more hops,
  because every hop you trust is an `X-Forwarded-For` entry a client could invent.
- Every mutating `/api` call is checked against `TRUSTED_ORIGIN` (or the request's own
  host when unset), so a page on another site cannot spend somebody's session.

### What the checks prove

- `npm run check:bookings -- --workers 12` — 12 separate OS processes all fight for
  `A1-1` and exactly one wins; the rest get HTTP 409. It runs on a throwaway database
  file, removed at the end.
- `npm run check:accounts` — 36 checks against a real server on a throwaway database,
  driven over HTTP with two separate cookie jars: duplicate email, bad credentials,
  session isolation, one customer cannot read another's ticket, the private room takes
  exactly two couples and a decorative chair cannot raise that, a non-image is refused
  on its bytes, and a cross-origin write is rejected.

### Before you open the booking page to customers

`server/config.js` ships with **placeholder seatings (`12:30`, `13:30`, `20:00`,
`21:00`) and an approximate floor plan** — the site labels them as setup values on
screen and links a "Confirm with the restaurant" pending chip, because the real
operating hours were never supplied. Replace `bookingSlots` with the hours the owner
confirms and `floorPlan` with the actual tables (id, shape, seat count, and x/y in the
`room` unit grid); the map, the chair ids and the availability check all follow the
config, so nothing else needs editing. A chair is one guest.

The same file draws the labelled areas — balcony, toilet, cash counter, party area and
the private dining room block — and then the room itself:

```js
diningRoom.couples = [{ id: 'P1', table: 'P1', guests: 2, bookable: ['P1-1','P1-3'], extra: ['P1-2','P1-4'] }, …]
diningRoom.limit   = { couples: 2, perTable: 1 }
```

Four chairs are drawn at each table because that is what the room has, but only the
`bookable` pair can be reserved and picking either holds the whole table for one
couple. `extra` chairs are muted, unreachable and never counted. The cap is not a
front-end trick: `server/validate.js` rejects a third couple and a party size other
than two, and `booking_seats` cannot take `P1` twice in one seating. If the room
changes, edit `couples` and `limit` here — nothing is duplicated in the client.

## Accounts, sessions and photos

- Passwords are scrypt (`N=16384, r=8, p=1`, 64-byte key) with a per-user salt,
  compared with `timingSafeEqual`. An unknown email still runs a dummy hash so the
  response time does not tell a guesser which half was wrong. There is no password-reset
  token and no email sent anywhere: that needs a mail provider, and nobody has picked one.
- A session is 32 random bytes in the `tw_session` cookie — HttpOnly, SameSite=Lax,
  `Secure` over HTTPS, 30 days — and only its SHA-256 is stored. Log out deletes the
  row, so a stolen cookie dies with the session. There is no OAuth or JWT anywhere, so
  there is no provider client secret to keep and no `redirect_uri` to register.
- `/profile`, `/bookings/mine` and `/tickets/:ref` filter on the account id behind the
  cookie, never on an id in the request. `/account`, `/profile` and `/ticket/:ref` ship
  `noindex, nofollow`.
- Profile photos: JPEG/PNG/WebP only, checked by magic bytes and again after `sharp`
  re-encodes, 3 MB before encoding, and written to `UPLOAD_DIR` with a generated name.
  Nothing is uploaded to a third party and the folder is not statically served.
- A guest booking is fully supported — `/book` works signed out and such a ticket lives
  on the phone number, not in any history. There is no claim-your-booking flow.

### The ticket PDF

Every confirmed booking carries a **Download booking ticket** button: on the `/book`
success panel, on each card in My Bookings, and on `/ticket/:ref`. It writes
`tandooriwala-ticket-<REF>.pdf` and nothing else — no request leaves the page.

- **The data is already this customer's.** The PDF is drawn from the `Booking` row the
  server handed to this account (`/api/bookings/mine`, `/api/tickets/:ref`, or the `201`
  response), so there is no second lookup that could widen the net. `status !== 'active'`
  is refused twice over: the button is not rendered for a cancelled table, and
  `buildTicketPdf` returns an error rather than printing "CONFIRMED" on one.
- **One A5 page** (148×210mm), 6.5mm keyline, 14mm text margin, so nothing lands on a
  printer's unprintable edge. Restaurant name, reference, date and seating, guests, name,
  phone, table and chairs, the note for the floor when there is one, the status, then the
  logo and the address beneath the details.
- **Text stays text.** Everything except the logo mark is real PDF text in the standard
  Helvetica faces — selectable, searchable, and crisp at any print size. The dark ink
  gradient is banded vector rectangles, so it prints as a fill instead of vanishing the
  way a CSS background can.
- **Contrast is audited, not assumed.** `node scripts/contrast-audit.mjs` checks every
  tone on the lightest gradient stop: cream values 13.8:1, the muted labels 5.9:1, the
  saffron eyebrow 5.9:1, cream on the confirmed pill 5.6:1 — all above AA for their size.
- **The logo is the project's own artwork.** `public/favicon.svg` is imported with
  `?raw`, rasterised through a canvas at 320px onto the plate's exact ink, and embedded as
  a ~9kb JPEG (an RGB PNG costs 300kb for the same mark). Swap the favicon — or point that
  one import at your own file — and the ticket logo follows. If a browser refuses to draw
  the SVG, the ticket still generates with the wordmark.
- **Failure is a sentence, not a silent no-op.** `role="alert"` under the button covers a
  generation failure and a browser that will not take the file; success flips the icon to
  a check and says so in a `role="status"` region. The blob URL is revoked after a minute
  rather than on the next tick, because Safari is still reading it by then.
- jsPDF is a lazy chunk (`~126kb` gzipped) fetched the first time the button is pressed, so
  no other page pays for it. No new environment variable, no third-party service.

## Edit these first

- [`src/data/restaurant.ts`](src/data/restaurant.ts) — **the single source** for the
  name, description, cuisines, address, phone, map URL, coordinates, hours and the
  WhatsApp flag. Every page, the footer, the head metadata and the structured data
  read from here.
- [`src/data/menu.ts`](src/data/menu.ts) — all menu categories and dish lines.
  The file header documents the four-step procedure for pushing real data live:
  replace the name/note, set `price`, set `verified: true`, delete anything not
  actually served. `menuIsPlaceholder` flips off automatically once every line is
  verified, which removes the placeholder notice from the Menu page.
- [`src/components/Seo.tsx`](src/components/Seo.tsx) — per-route title, description,
  canonical, Open Graph/Twitter tags. Set `restaurant.siteUrl` after deploying so
  social previews resolve.

## Images

Every JPG in `public/images/` is an AI-generated illustrative stand-in, not a photo
of this kitchen — the footer says so and each `alt` reads "Illustrative photo". See
[`public/images/README.md`](public/images/README.md) for the slug → page table.

To replace them: drop same-named files into `public/images/`, or put source PNGs in
`vibe_images/` and run `node scripts/optimize-images.mjs`, which emits a width
ladder (480/800/1024/1200/1600, capped by native width), regenerates
[`src/data/imageManifest.ts`](src/data/imageManifest.ts), and rebuilds
`og-cover.jpg`. [`src/components/DishImage.tsx`](src/components/DishImage.tsx)
builds `srcset`/`width`/`height` from that manifest, so a missing file shows a
visible "Missing image" box instead of a broken icon, and layout never shifts.

## Accessibility & motion

- Keyboard navigable throughout; a 3px focus ring in ember on light surfaces and
  saffron on dark ones (ember on charcoal is only ~2.6:1, below the 3:1 bar).
- All colour pairs — including every chair-glyph state and the map's area labels — are
  audited numerically by `scripts/contrast-audit.mjs` at AA.
- Scroll reveals, the marquee and the embers are gated on `prefers-reduced-motion` in
  both JS and CSS; the hero print is a still image and the `.hero-fade` mask is
  dropped entirely under `forced-colors`.
- Semantic landmarks, one `h1` per page, real `<address>`, `aria-live` filter
  counts, and decorative SVGs hidden from AT.
- The enquiry form labels every field in the visible text, moves focus to the error
  summary after a rejected submit (and to the `role="status"` panel on success), and
  gives the radio chips an explicit `chip-focus` ring because a `<label>` never gets
  `:focus-visible` itself.
- Seats are drawn as top-down **chair icons**, not dots: white = free, amber = yours,
  red with a diagonal slash = booked, muted = the private room's side chairs. The four
  states are also spelled out in a legend and in each button's `aria-label`, so colour
  is never the only signal.
- Every selectable chair is a real `<button>` with `aria-pressed` and a spoken label;
  booked ones are `disabled` and cannot be tabbed into by accident. Each
  map is a focusable `role="region"` with `aria-describedby="map-legend"`, so screen
  readers get the legend with the plan and phone users can scroll it sideways. The maps
  keep a minimum width (`40rem` hall, `26rem` room), so a chair never shrinks below
  ~38px square — above the 24px WCAG 2.2 AA target-size bar even at the smallest phone.
- The hall / private-room switch and the sign-in / sign-up switch are `role="tablist"`
  pairs with `aria-selected`, `aria-controls` and an `aria-labelledby` panel, and both
  take Left/Right/Home/End with selection following focus
  ([`src/lib/tabKeys.ts`](src/lib/tabKeys.ts)). Focus moves to the step heading whenever
  the step changes, and the stepper uses `aria-current="step"`.
- Every secondary page, booking step, profile subpage and ticket view has a visible back
  control ([`src/components/Back.tsx`](src/components/Back.tsx)). It returns to the
  in-app page the customer actually came from — tracked with a `sessionStorage` depth
  counter in [`src/lib/navDepth.ts`](src/lib/navDepth.ts), because browser history length
  counts other sites' pages too — and falls back to Home or the parent page when they
  arrived directly. Browser, hardware and gesture Back are untouched, and the controls
  are 44px tall for thumbs.
- The ticket download is a 44×44px icon `<button>` named **Download booking ticket** by
  both `aria-label` and `title`, with its result read out beside it in a live region and
  the button disabled while the PDF is being made — so a double-tap cannot queue two
  files. The same control is reachable by keyboard on every ticket surface, and because
  the page is written as real text it can be read back and searched, not just looked at.

## Deploying

**[`DEPLOYING.md`](DEPLOYING.md) is the guide** — accounts, every variable, HTTPS and cookie
rules for the deployed domain, migrations, the persistent disk, the publish steps for Fly.io and
Render, custom domain + DNS, and the pre-launch checklist. [`fly.toml`](fly.toml),
[`render.yaml`](render.yaml) and [`Dockerfile`](Dockerfile) are committed and ready; nothing in
this repository publishes anything by itself.

Two shapes, briefly:

1. **Static only** — `dist/` is fully static, but the enquiry form, `/book` and the whole
   account area then degrade to "we could not reach the kitchen, please call" (the API is
   the only thing they talk to). This is an SPA with `BrowserRouter`, so the host must
   rewrite unknown paths to `index.html` — otherwise `/about`, `/menu`, `/visit`,
   `/contact`, `/book`, `/account`, `/profile` and `/ticket/…` 404 on direct load or
   refresh.
2. **One origin, site + API** — `npm run build` then `NODE_ENV=production TRUSTED_ORIGIN=https://…
   npm start` on Node **22.13 or newer** (`node:sqlite`; verified on 24). `server/index.js` serves
   `dist/` *and* the API from one origin, does the SPA fallback itself, and needs
   `TANDOORIWALA_ADMIN_KEY` in the environment. It **refuses to boot** in production without a
   real `https://` `TRUSTED_ORIGIN` or without `dist/index.html`, so a misconfigured deploy fails
   loudly instead of half-working with an unusable cookie. `data/` (database **and** profile
   photos) must be on persistent disk, and SQLite serialises writes through one process, so run a
   **single instance**. That rules out serverless hosts — no persistent filesystem means the
   double-booking guard has nothing to lock on.

Behind it all: `trust proxy` uses `TRUST_PROXY_HOPS` (1) so the rate limiter sees real client
IPs; HTTP `GET`/`HEAD` is 301'd to the **https** version of the host the proxy supplied — but only
when that host is one the app was configured with, so a forged `Host` header cannot bounce a
customer onto someone else's site — while a mutation over plain HTTP is refused with
`403 https_required` rather than redirected into a body-less retry. `/api/health` answers
`store: ok|unreachable` by actually querying the database, so a volume mounted in the wrong place
cannot look green. Hashed assets are `immutable`, the app shell is `no-cache`, and `{{SITE_ORIGIN}}`
in `index.html` is replaced at request time from `TRUSTED_ORIGIN` — moving to a custom domain is
one variable and a restart, not a rebuild.

## Unconfirmed business details

Deliberately left as placeholders rather than invented: opening hours, the bookable
seatings and floor plan in `server/config.js`, dish names and prices, whether
+91 89173 92926 is active on WhatsApp (so no WhatsApp button ships), email/social
handles, real photography, founding story, chef, awards and sourcing claims.

**What the owner has to provide before this goes out:**

| Needed | Where it goes |
| --- | --- |
| Confirmed seating times for online booking | `bookingSlots` in `server/config.js` |
| The real table layout, seat counts and the private room's chairs | `floorPlan` + `diningRoom` in `server/config.js` |
| An admin key of their own | `TANDOORIWALA_ADMIN_KEY` |
| The live address origin (for HTTPS cookies + CSRF check) | `TRUSTED_ORIGIN` |
| Confirmation that +91 89173 92926 works on WhatsApp, if they want the button | `src/data/restaurant.ts` |
| The real logo, if the flame mark is not it (the ticket PDF reads the same file) | `public/favicon.svg` |
| Email / social handles, real photography, menu prices | `src/data/restaurant.ts`, `public/images/`, `src/data/menu.ts` |

No third-party credentials are needed to run any of this: passwords, sessions and photos
are handled locally, storage is the restaurant's own disk, ticket PDFs are drawn in the
customer's own browser, and the only dependency that touches bytes is `sharp`.

There is no online ordering, cart, payment or delivery on this site. `/book` holds
chairs and couples in the restaurant's own database and nothing else — the success panel
says plainly that the floor still phones to confirm, and the enquiry form only parks a
request in the owner's list.

## Buy Me a Coffee

<img src="docs/coffee-cup.svg" width="30" height="30" alt="" role="presentation">

If this project saved you a few evenings, you can buy me a coffee. It is a plain **UPI**
tip — no order, no subscription, nothing to download.

**UPI ID: `rb492713@ybl`** — pay it from any UPI app, or scan the code below.

<p>
  <img src="docs/upi-qr.png" width="240" height="240"
       alt="A square UPI payment QR code: black modules on a white field, three finder squares in the corners, and a white rupee sign inside a black circle at the centre. Scanning it opens a payment request to this project's UPI ID in any UPI app." />
</p>

A few honest notes about it:

- **Different UPI apps handle these links differently.** GPay, PhonePe, Paytm, BHIM and
  your bank's app each open the code in their own screen, and some ask you to confirm the
  payee name before they let in an amount. If one app refuses the link, another will
  usually take the same ID typed in by hand. A QR is a convenience, not a guarantee.
- The name shown by your app before you pay is the account holder's own UPI display name,
  set at the bank — it is not stored anywhere in this repository.
- The cup above is a plain icon drawn for this README. It is **not** the Buy Me a Coffee
  logo and this is not a buymeacoffee.com page, an affiliation or a sponsorship; the
  heading just says what it is for.
- Nothing else about the restaurant is involved: no money touches Tandooriwala Bhadrak,
  the booking database, or any customer, and this section exists only in the repository's
  README. The public site deliberately still has no payment path of any kind.

**To update it**, there are exactly two places: the UPI ID line above, and
[`docs/upi-qr.png`](docs/upi-qr.png) — replace the file with the same name and the README
picks it up with no other edit. Keep the `alt` text accurate if the new code looks
different.


