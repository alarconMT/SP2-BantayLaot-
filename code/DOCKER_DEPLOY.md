# BantayLaot — Municipality Deployment Guide

This guide is for IT staff at each municipality who need to install the BantayLaot webapp on a local server or PC. You only need **Docker** — no Node.js, MongoDB, or other tools required.

---

## What You Need

### 1. Software
Install **one** of the following depending on your operating system:

| OS | Install |
|----|---------|
| Windows 10/11 | [Docker Desktop for Windows](https://docs.docker.com/desktop/install/windows-install/) |
| macOS | [Docker Desktop for Mac](https://docs.docker.com/desktop/install/mac-install/) |
| Ubuntu / Linux Server | Docker Engine + Docker Compose plugin (see below) |

**Ubuntu/Linux quick install:**
```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER   # then log out and back in
```

### 2. The BantayLaot Codebase
Get the project files from your BantayLaot contact (developer/admin). They will provide either:
- A `.zip` file to extract, **or**
- A link to clone: `git clone <repo-url>`

### 3. Credentials (provided by your BantayLaot contact)
Your contact will give you a filled-in `.env.municipality` file or the values needed to create one:

| Value | Description |
|-------|-------------|
| `MUNICIPALITY_ID` | Your PSGC code (e.g. `104305000`) |
| `MUNICIPALITY_NAME` | Display name (e.g. `Cagayan de Oro`) |
| `JWT_SECRET` | A secret key for login security |
| `CLOUDINARY_*` | Three Cloudinary credentials for photo storage |
| `CENTRAL_SERVER_URL` | URL of the BantayLaot central server |

---

## Step-by-Step Installation

### Step 1 — Get the code

**Option A: Extract from zip**
```
Extract bantaylaot.zip → you get a folder called "code" (or similar)
```

**Option B: Clone with git**
```bash
git clone <repo-url>
cd <repo-folder>
```

### Step 2 — Create your environment file

Inside the project folder, copy the example file and rename it:

**Windows (Command Prompt):**
```cmd
copy .env.municipality.example .env.municipality
```

**Mac / Linux:**
```bash
cp .env.municipality.example .env.municipality
```

Open `.env.municipality` with Notepad (or any text editor) and fill in the values:

```env
MUNICIPALITY_ID=104305000
MUNICIPALITY_NAME=Cagayan de Oro
PORT=3001

# Do NOT change "mongodb" in this line — it is the Docker service name
MONGODB_URI=mongodb://mongodb:27017/BantayLaot_104305000

CENTRAL_SERVER_URL=https://bantaylaot-production.up.railway.app

JWT_SECRET=<paste the secret your contact gave you>

CLOUDINARY_CLOUD_NAME=<paste value>
CLOUDINARY_API_KEY=<paste value>
CLOUDINARY_API_SECRET=<paste value>
```

> **Important:** The `MONGODB_URI` line must say `mongodb://mongodb:27017/...`.
> Do **not** change `mongodb` to `localhost` — Docker uses that name to find the database internally.

### Step 3 — Start the app

Open a terminal (Command Prompt / PowerShell / Terminal) inside the project folder and run:

```bash
docker compose up -d --build
```

Docker will:
1. Download the required base images (Node.js, Nginx, MongoDB) — takes a few minutes on first run
2. Build the municipality server and the web frontend
3. Start all three services

You will see output ending with something like:
```
✔ Container code-mongodb-1             Healthy
✔ Container code-municipality-server-1 Started
✔ Container code-frontend-1            Started
```

### Step 4 — Open the app

Open a web browser and go to:
```
http://localhost
```

If you are accessing from another computer on the same network, use the server's IP address instead:
```
http://192.168.x.x
```

On first launch you will be prompted to **create the admin account**. Complete that setup to start using the system.

---

## Daily Commands

| Task | Command |
|------|---------|
| Start the app | `docker compose up -d` |
| Stop the app | `docker compose down` |
| Restart everything | `docker compose restart` |
| View live logs | `docker compose logs -f` |
| Check service status | `docker compose ps` |

---

## Getting Updates

When your BantayLaot contact releases a new version:

1. Replace the project files (re-extract the zip, or `git pull` if using git)
2. Keep your `.env.municipality` file — **do not overwrite it**
3. Rebuild and restart:
   ```bash
   docker compose up -d --build
   ```

> **Your data is safe.** All fisher records, sessions, and reports are stored in a Docker volume (`mongodb_data`) that is never deleted by the above commands.

---

## Troubleshooting

**The app does not load in the browser**
```bash
docker compose ps
```
All three services (`mongodb`, `municipality-server`, `frontend`) should show `running`. If any shows `exited`, check logs:
```bash
docker compose logs municipality-server
```

**"MongoDB connection failed" in logs**
The database health check takes up to 30 seconds on first start. Wait a moment then try again. If it keeps failing, double-check that `MONGODB_URI` in `.env.municipality` starts with `mongodb://mongodb:27017/`.

**Port 80 is already in use**
Add this line to `.env.municipality`:
```
FRONTEND_PORT=8080
```
Then restart:
```bash
docker compose down && docker compose up -d
```
The app will now be at `http://localhost:8080`.

**Forgot the admin password**
Contact your BantayLaot system administrator — they can reset it from the central dashboard.

---

## What the Developer Provides to Each Municipality

Before a municipality can install, the BantayLaot developer/admin must supply:

1. **The codebase** — zip file or git repo link
2. **Filled-in credentials** — either a ready `.env.municipality` file or the individual values:
   - `MUNICIPALITY_ID` (PSGC code for the municipality)
   - `MUNICIPALITY_NAME`
   - `JWT_SECRET` — generate with: `openssl rand -hex 16`
   - Cloudinary account credentials (one account per municipality, or a shared account with separate upload folders)
   - `CENTRAL_SERVER_URL` — the Railway URL or IP of the self-hosted central server

---

## Architecture Overview (for reference)

```
Browser
  └── http://localhost (port 80)
        └── Nginx (frontend container)
              ├── /api/*      → municipality-server (Node.js, port 3001)
              ├── /uploads/*  → municipality-server (serves uploaded images)
              └── /*          → React SPA (built static files)

municipality-server
  └── mongodb (port 27017, internal only)
  └── central-server (Railway / self-hosted, syncs every 3 hours)
```

All three containers run on the same machine and communicate internally through Docker networking. Only port 80 (or `FRONTEND_PORT`) is exposed to the outside.
