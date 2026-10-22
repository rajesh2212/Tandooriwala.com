# syntax=docker/dockerfile:1
#
# The restaurant's whole site in one image: the built front end and the Express server that
# serves it, answers the booking API, and owns the SQLite file. Node 24 because `node:sqlite`
# needs it — 22.13 works too, 22.5-22.12 wants a flag this app does not pass.
#
#   docker build -t tandooriwala .
#   docker run --rm -p 8787:8787 \
#     -e NODE_ENV=production \
#     -e TRUSTED_ORIGIN=https://your-domain.example \
#     -e TANDOORIWALA_ADMIN_KEY=... \
#     -v tandooriwala-data:/data \
#     tandooriwala
#
# /data is the only thing that must survive a restart: the database and the profile photos.
# Mount a volume there and set DATA_FILE/UPLOAD_DIR to point inside it.

# ---------------------------------------------------------------- build
FROM node:24-bookworm-slim AS build
WORKDIR /app

# Lockfile first, so editing a component does not reinstall the world.
COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json vite.config.ts index.html ./
COPY public ./public
COPY src ./src

# `npm run build` typechecks as it goes: a broken build never reaches a host.
RUN npm run build

# ---------------------------------------------------------------- runtime
FROM node:24-bookworm-slim AS runtime
WORKDIR /app

# No PORT here on purpose: the app already defaults to 8787 for a plain `docker run`, and a
# baked-in ENV would fight the port a platform injects (Fly uses 8080).
ENV NODE_ENV=production \
    DATA_FILE=/data/enquiries.db \
    UPLOAD_DIR=/data/uploads/avatars

COPY package.json package-lock.json ./
# sharp and express are the only thing this half of the app needs; vite and typescript stay
# in the build stage. sharp loads lazily, so if its binary does not fit the platform only
# profile-photo uploads degrade — the site and bookings keep working.
RUN npm ci --omit=dev && npm cache clean --force

COPY server ./server
COPY scripts ./scripts
COPY --from=build /app/dist ./dist

# Where the volume goes; the app creates the folders it needs inside it.
RUN mkdir -p /data
VOLUME /data

EXPOSE 8787

# Fails when the process cannot reach its own store, which is exactly the misconfiguration
# a green deployment badge would otherwise hide.
HEALTHCHECK --interval=30s --timeout=4s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||8787)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# node:sqlite still prints an experimental warning on Node 24; a log drain does not need it.
CMD ["node", "--disable-warning=ExperimentalWarning", "server/index.js"]
