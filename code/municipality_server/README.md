# BantayLaot — Municipality Server

Node.js/Express REST API for a single municipality. Stores fishing sessions, catches, locations, and user accounts in MongoDB, and syncs data to the central server every 15 minutes.

## Setup

```bash
npm install
cp ../.env.municipality.example .env
# Edit .env with your values
node index.js
```

Default port: **3001**

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3001` | Port the server listens on |
| `MUNICIPALITY_ID` | `M001` | Unique municipality identifier |
| `MUNICIPALITY_NAME` | `Municipality 1` | Display name used in logs |
| `MONGODB_URI` | `mongodb://localhost:27017/BantayLaot_M001` | MongoDB connection string |
| `CENTRAL_SERVER_URL` | `http://localhost:4000` | URL of the central server for data sync |
| `JWT_SECRET` | — | Secret for signing JWTs (required) |
| `CLOUDINARY_CLOUD_NAME` | — | Cloudinary credentials for image storage |
| `CLOUDINARY_API_KEY` | — | |
| `CLOUDINARY_API_SECRET` | — | |

## API Endpoints

### Auth
| Method | Path | Description |
|---|---|---|
| `POST` | `/api/auth/signup` | Register a new user |
| `POST` | `/api/auth/login` | Log in, returns JWT |
| `GET` | `/api/auth/admin-exists` | Check if an admin account exists |
| `POST` | `/api/auth/admin-setup` | First-run admin account creation |
| `POST` | `/api/auth/fisher-setup` | Register a fisher account |

### Sessions & Fishing
| Method | Path | Description |
|---|---|---|
| `POST` | `/api/sessions` | Submit a fishing session (mobile) |
| `GET` | `/api/sessions/:userId` | Get sessions for a fisher |
| `POST` | `/api/fishing` | Submit fishing/catch record (mobile) |
| `GET` | `/api/fishing/:userId` | Get catch records for a fisher |
| `POST` | `/api/locations` | Submit GPS location record (mobile) |
| `POST` | `/api/reports` | Submit a violation report |
| `GET` | `/api/reports` | List all reports (admin) |

### Analytics
| Method | Path | Description |
|---|---|---|
| `GET` | `/api/sessions/by-date` | Sessions grouped by date |
| `GET` | `/api/sessions/recent-date` | Most recent session date |
| `GET` | `/api/violations/by-date` | Violations grouped by date |
| `GET` | `/api/violations/recent-date` | Most recent violation date |
| `GET` | `/api/summary/violations` | Violation summary stats |
| `GET` | `/api/summary/cpue` | CPUE (catch per unit effort) summary |
| `GET` | `/api/summary/sessions-map` | Session data for map display |
| `GET` | `/api/dashboard/sessions` | Dashboard session data |

### User Management
| Method | Path | Description |
|---|---|---|
| `GET` | `/api/users` | List all users |
| `PUT` | `/api/users/:id` | Update a user |
| `PUT` | `/api/users/:id/status` | Activate or deactivate a user |
| `DELETE` | `/api/users/:id` | Delete a user |
| `GET` | `/api/profile/:userId` | Get a fisher's profile |

### Internal
| Method | Path | Description |
|---|---|---|
| `PUT` | `/api/internal/users/:id/status` | Status update called by central server |

## Data Sync

On startup (after 5 seconds) and every 15 minutes, the server pushes all sessions, locations, catches, reports, users, and boats to the central server via `POST /api/sync/municipality`. Image URLs are rewritten to absolute URLs before syncing so the central dashboard can load them.
