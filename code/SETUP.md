# BantayLaot — Development Setup

## Overview

BantayLaot is a fisher monitoring system consisting of four components:

| Component | Directory | Description |
|---|---|---|
| Central Server | `central_server/` | Aggregates data from all municipality servers; hosted on Railway (self-hosting via Docker is also supported) |
| Municipality Server | `municipality_server/` | Per-municipality Node.js/Express API with MongoDB; syncs up to the central server every 15 minutes |
| Web Frontend | `bantaylaot_frontend/` | React dashboard for municipal admins, central admins, and researchers |
| Mobile App | *(separate repo)* | Android app (Kotlin) used by fishers |

---

## Prerequisites

| Tool | Version |
|---|---|
| Node.js | 18.x or higher |
| npm | bundled with Node.js |
| MongoDB | 6.x (or use Docker) |
| Docker & Docker Compose | latest stable (recommended for deployment) |
| Android Studio | 2024.x or higher (mobile only) |
| JDK | 17 (mobile only) |

---

## Environment Variables

Each server requires a `.env` file. Example templates are provided at the root level.

### Municipality Server — `.env.municipality`

Copy `.env.municipality.example` and fill in the values:

```
MUNICIPALITY_ID=104305000
MUNICIPALITY_NAME=Cagayan de Oro
PORT=3001
MONGODB_URI=mongodb://localhost:27017/BantayLaot_104305000
CENTRAL_SERVER_URL=https://bantaylaot-production.up.railway.app
JWT_SECRET=<32-char hex secret>
CLOUDINARY_CLOUD_NAME=<your_cloud_name>
CLOUDINARY_API_KEY=<your_api_key>
CLOUDINARY_API_SECRET=<your_api_secret>
```

See `.env.cdo.example` (Cagayan de Oro) and `.env.opol.example` (Opol) for per-municipality examples.

### Central Server — `.env.central` *(self-hosted only)*

Only needed if you are self-hosting the central server instead of using Railway. Copy `.env.central.example` and fill in the values:

```
PORT=4000
MONGODB_URI=mongodb://localhost:27017/BantayLaot_Central
JWT_SECRET=<32-char hex secret>
```

> **Docker note:** When using `docker-compose.yml`, set `MONGODB_URI` to use the Docker service name (`mongodb` for municipality, `mongodb-central` for central) instead of `localhost`.

---

## Local Development Setup

> The central server is hosted on Railway at `https://bantaylaot-production.up.railway.app`. Municipality servers point to it via `CENTRAL_SERVER_URL` — you do **not** need to run a local central server for normal development. Only run it locally if you are working on the central server code itself.

### 1. Municipality Server

```bash
cd municipality_server
npm install
cp ../.env.municipality.example .env
# Edit .env with your values
node index.js
```

The municipality server runs on **port 3001** by default. It connects to the central server and syncs data automatically after startup (and every 15 minutes thereafter).

### 2. Central Server *(only if developing the central server locally)*

```bash
cd central_server
npm install
cp ../.env.central.example .env
# Edit .env with your values
node index.js
```

The central server runs on **port 4000** by default. Update the municipality server's `CENTRAL_SERVER_URL` to `http://localhost:4000` when running both locally.

### 3. Web Frontend

```bash
cd bantaylaot_frontend
npm install
npm start
```

The development server runs on **port 3000** and proxies API calls to `http://localhost:3001` (the municipality server).

### 4. Mobile App (Android)

1. Open Android Studio and import the `mobile/` directory.
2. Sync Gradle to download all dependencies.
3. Verify `build.gradle` configuration:
   - **Minimum SDK**: 26
   - **Target SDK**: 34
   - **Compile SDK**: 35
   - **JVM Target**: 17
4. Connect a device or start an emulator, then build and run.

---

## PM2 Deployment (single server, multiple municipalities)

PM2 is an alternative to Docker for running multiple municipality servers and the central server on one machine. `ecosystem.config.js` at the root pre-configures this.

### Prerequisites

```bash
npm install -g pm2
```

### Setup

1. Create `.env` files for each municipality and for the central server:

```bash
cp .env.cdo.example   .env.cdo
cp .env.opol.example  .env.opol
cp .env.central.example .env.central
# Edit each file with real values
```

2. Install dependencies for both servers:

```bash
cd municipality_server && npm install && cd ..
cd central_server      && npm install && cd ..
```

3. Start all processes:

```bash
pm2 start ecosystem.config.js
```

This starts three processes: `municipality-cdo`, `municipality-opol`, and `central-server`.

### Common PM2 Commands

| Command | Description |
|---|---|
| `pm2 list` | Show status of all processes |
| `pm2 logs` | Stream logs from all processes |
| `pm2 logs municipality-cdo` | Logs for a specific process |
| `pm2 restart all` | Restart all processes |
| `pm2 stop all` | Stop all processes |
| `pm2 save` | Save process list |
| `pm2 startup` | Generate startup script (auto-start on reboot) |

> To add a new municipality, copy an existing `.env.<name>.example`, add a new entry in `ecosystem.config.js`, then run `pm2 start ecosystem.config.js`.

---

## Docker Deployment

### Transferring Code to the Server

The recommended way to get the code onto a server is with `git archive`. This produces a clean tarball — no `.git` history, no `node_modules`, and no `.env` files (which are gitignored and must be created on the server separately).

**1. On your local machine — create and upload the archive:**

```bash
# Create a tarball of the current HEAD
git archive --format=tar.gz HEAD -o bantaylaot.tar.gz

# Copy it to the server
scp bantaylaot.tar.gz user@<server-ip>:~/
```

**2. On the server — extract and set up:**

```bash
mkdir -p ~/bantaylaot && tar -xzf bantaylaot.tar.gz -C ~/bantaylaot
cd ~/bantaylaot

# Create the .env file (example files are included in the archive)
cp .env.municipality.example .env.municipality
nano .env.municipality   # fill in real values
```

**3. Start the stack:**

```bash
docker compose up -d --build
```

> For subsequent deployments, repeat steps 1–2 to replace the code, then run `docker compose up -d --build` again to rebuild and restart.

---

### Municipality Deployment

Deploys MongoDB + municipality server + Nginx-served frontend as a single stack.

```bash
cp .env.municipality.example .env.municipality
# Edit .env.municipality — use "mongodb" as the MONGODB_URI hostname
docker compose up -d --build
```

Frontend is served at `http://<server-ip>` (port 80 by default). Set `FRONTEND_PORT` in `.env.municipality` to override.

### Central Server Deployment *(self-hosted alternative to Railway)*

```bash
cp .env.central.example .env.central
# Edit .env.central — use "mongodb-central" as the MONGODB_URI hostname
docker compose -f docker-compose.central.yml up -d --build
```

Central server is exposed on **port 4000**. Point each municipality's `CENTRAL_SERVER_URL` to `http://<central-server-ip>:4000`.

---

## Dependencies Summary

### Municipality Server (`municipality_server/`)

| Package | Purpose |
|---|---|
| express | HTTP server |
| mongoose | MongoDB ODM |
| bcryptjs | Password hashing |
| jsonwebtoken | JWT auth |
| multer | File uploads |
| cloudinary | Cloud image storage |
| axios | HTTP client (sync to central) |
| cors, body-parser, dotenv | Middleware / config |

### Central Server (`central_server/`)

| Package | Purpose |
|---|---|
| express | HTTP server |
| mongoose | MongoDB ODM |
| bcryptjs | Password hashing |
| jsonwebtoken | JWT auth |
| axios | HTTP client |
| cors, body-parser, dotenv | Middleware / config |

### Web Frontend (`bantaylaot_frontend/`)

| Package | Purpose |
|---|---|
| react, react-dom | UI framework |
| react-router-dom | Client-side routing |
| react-bootstrap, bootstrap | UI components |
| react-google-charts | Charts and analytics |
| ol (OpenLayers) | Interactive maps |
| file-saver, jszip | Data export |
| sass | Stylesheet preprocessing |

---

## User Roles

| Role | Dashboard Route | Description |
|---|---|---|
| `municipal_admin` | `/municipal` | Manages fishers and views municipality-level data |
| `central_admin` | `/central` | Views aggregated data across all municipalities |
| `researcher` | `/researcher` | Read-only access to fishing data and analytics |
| `fisher` | Mobile app | Records fishing sessions and catches |

---

## Notes

- The first run of the frontend prompts an admin setup at `/setup`.
- Uploaded images (catch photos) are stored in Cloudinary; the municipality server prefixes full URLs before syncing to the central server.
- See each server's own README for API endpoint details.
