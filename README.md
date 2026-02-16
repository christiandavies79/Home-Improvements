# HomeForge

A self-hosted PWA for households to collaboratively plan, track, and brainstorm home improvement projects. Think shared Trello meets Pinterest, purpose-built for home projects.

## Features

- **Multi-user accounts** — first user becomes admin and can add household members. Sessions last 30 days so you stay logged in.
- **Project tracking** — create projects with priority, status, assignee, budget, time estimates, due dates, and tags.
- **Spaces / Rooms** — organise projects by room (Kitchen, Bedroom, Outdoors, etc.) with 10 defaults and custom spaces.
- **Photo galleries** — upload before/during/after/inspiration photos per project. Camera integration on mobile with a lightbox viewer.
- **Design Board** — per-project brainstorming space to pin product links, upload inspiration photos, and write notes. Comment threads on each item with attribution.
- **Budget tracking** — estimated vs spent per project, with totals on the dashboard.
- **Activity feed** — see who added or changed what, and when.
- **PWA** — installable on your phone home screen with offline viewing support.
- **Responsive** — works on phone, tablet, and desktop with a warm, homey UI theme.

## Quick Start with Docker

### Using Docker Hub (recommended)

```bash
docker run -d \
  --name homeforge \
  --restart unless-stopped \
  -p 3000:3000 \
  -v homeforge-data:/app/data \
  -e SESSION_SECRET=$(openssl rand -hex 32) \
  <your-dockerhub-username>/homeforge:latest
```

### Using Docker Compose

1. Clone the repository:
   ```bash
   git clone https://github.com/christiandavies79/Home-Improvements.git
   cd Home-Improvements
   ```

2. Generate a session secret:
   ```bash
   export SESSION_SECRET=$(openssl rand -hex 32)
   ```

3. Start the container:
   ```bash
   docker compose up -d
   ```

4. Open [http://localhost:3000](http://localhost:3000) and create your admin account.

### Building from source

```bash
git clone https://github.com/christiandavies79/Home-Improvements.git
cd Home-Improvements
docker compose up -d --build
```

## Exposing to the Internet with Caddy

A `Caddyfile.example` is included. Caddy handles HTTPS automatically via Let's Encrypt.

```
homeforge.yourdomain.com {
    reverse_proxy localhost:3000
}
```

Replace the domain with your own, then:
```bash
caddy run --config Caddyfile.example
```

## Development

```bash
# Terminal 1 — server
cd server
npm install
npm run dev

# Terminal 2 — client
cd client
npm install
npm run dev
```

The client dev server runs at `http://localhost:5173` and proxies API requests to the backend on port 3000.

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Server port |
| `DATA_DIR` | `./data` | Directory for SQLite database and uploaded files |
| `SESSION_SECRET` | Random (dev only) | Secret for signing session cookies. **Set this in production.** |
| `NODE_ENV` | — | Set to `production` in Docker |

## Data & Backups

All persistent data lives in a single directory (`./data` by default, `/app/data` in Docker):
- `homeforge.db` — SQLite database
- `uploads/` — uploaded photos

To back up, just copy the `data/` directory. To restore, replace it.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React, TypeScript, Tailwind CSS, Vite |
| Backend | Node.js, Express, SQLite (better-sqlite3) |
| Auth | bcrypt + express-session (30-day cookies) |
| Container | Docker (multi-stage build, Node 20 Alpine) |
| CI/CD | GitHub Actions — builds and pushes to Docker Hub on merge to `main` |

## CI/CD

On every push to `main`, a GitHub Actions workflow automatically:
1. Builds the Docker image
2. Tags it with `latest` and the commit SHA
3. Pushes to Docker Hub

To pull the latest image:
```bash
docker pull <your-dockerhub-username>/homeforge:latest
```
