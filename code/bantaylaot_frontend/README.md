# BantayLaot — Web Frontend

React-based dashboard for the BantayLaot fisher monitoring system. Provides role-specific views for municipal admins, central admins, and researchers.

## Routes

| Path | Role | Description |
|---|---|---|
| `/login` | All | Login page |
| `/setup` | — | One-time admin setup (first run only) |
| `/municipal` | `municipal_admin` | Municipality dashboard: sessions, catches, map, violations, user management |
| `/central` | `central_admin` | Aggregated view across all municipalities |
| `/researcher` | `researcher` | Read-only analytics and fishing data |
| `/manage-users` | `municipal_admin` | Fisher and user account management |

Unauthenticated users are redirected to `/login`. Authenticated users landing on `/` are redirected to the dashboard for their role.

## Development Setup

```bash
npm install
npm start
```

Runs on **http://localhost:3000**. API calls are proxied to `http://localhost:3001` (the municipality server) — see `proxy` in `package.json`.

## Build for Production

```bash
npm run build
```

Output goes to the `build/` directory. In Docker deployments, this is served by Nginx with API requests proxied to the municipality server.

## Key Dependencies

| Package | Purpose |
|---|---|
| react-router-dom | Client-side routing |
| react-bootstrap / bootstrap | UI components |
| react-google-charts | Charts and data visualization |
| ol (OpenLayers) | Interactive fishing maps |
| file-saver / jszip | CSV/ZIP export of data |
| sass | Custom stylesheet compilation |

## Environment

The frontend reads no `.env` variables at runtime — all configuration is driven by the proxy and the API responses from the municipality server. To connect to a different server, update the `proxy` field in `package.json` before running `npm start`.
