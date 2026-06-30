# Gamifikasi Desa Wisata Hanjeli — DWH

Location-based gamification web app for the Hanjeli tourism village.
Backend API (Express + MySQL) and a React frontend (Vite + Leaflet/Mapbox).

## Stack

| Layer    | Tech                                             |
| -------- | ------------------------------------------------ |
| Backend  | Node.js ≥18, Express, MySQL (`mysql2`), Socket.IO, JWT, Multer, Sharp |
| Frontend | React 19, TypeScript, Vite, TailwindCSS, Leaflet + react-leaflet, Mapbox GL, React Router |
| Database | MySQL / MariaDB (XAMPP)                         |

## Repository layout

```
backend/        Node.js API & database-driven logic
frontend/       React single-page app
database_schema.sql   DDL for the MySQL database (import in phpMyAdmin or mysql CLI)
compose.yaml / docker-compose.yml   Local-only deploy scaffolding — not committed to collaborators
ansible/        Homelab-only deploy artifacts — local only
```

## Prerequisites

- **Node.js ≥18** (use `nvm install 18 && nvm use 18`, or download from nodejs.org)
- **MySQL / MariaDB** running locally (XAMPP's MySQL is fine)
- **npm** (bundled with Node)

## Setup

### 1. Clone

```bash
git clone https://github.com/TubagusAulia/gamifikasi-desa-wisata-hanjeli.git
cd gamifikasi-desa-wisata-hanjeli
```

### 2. Create the database

Open phpMyAdmin (`http://localhost/phpmyadmin`) or a MySQL client and import the schema:

```bash
mysql -u root -p   # or: mysql -u root (XAMPP default has no password)
```

Then either paste the contents of `database_schema.sql` into the SQL tab, or (if your MySQL client supports `\.`) run it against the `gamifikasi_dwh` file.

The schema file both creates the database and defines all tables — you don't need to create the schema manually.

### 3. Backend

```bash
cd backend
cp .env.example .env          # adjust DB creds / JWT secret if needed
npm install
npm run dev                   # uses --watch for hot reload; fallback: npm start
```

Backend runs at `http://localhost:3000` by default.

### 4. Frontend (new terminal)

```bash
cd frontend
cp .env.example .env          # add VITE_MAPBOX_TOKEN if using Mapbox layers
npm install
npm run dev
```

Frontend dev server runs at `http://localhost:5173` and proxies API calls to the backend (see `vite.config.ts`).

### 5. Seed sample data (optional)

```bash
cd backend
node seeder.js
```

This populates the database with starter data (kelompok, peserta, quiz, agenda, etc.) so the UI isn't empty on first run.

## Environment variables

### `backend/.env`

| Variable        | Default                | Purpose                                      |
| --------------- | ---------------------- | -------------------------------------------- |
| `DB_HOST`       | `localhost`            | MySQL host                                   |
| `DB_PORT`       | `3306`                 | MySQL port                                   |
| `DB_USER`       | `root`                 | MySQL user                                   |
| `DB_PASSWORD`   | *(empty)*              | MySQL password (XAMPP default is empty)      |
| `DB_NAME`       | `gamifikasi_dwh`       | Database name                                |
| `JWT_SECRET`    | `your-super-secret...` | JWT signing key — **change this**            |
| `PORT`          | `3000`                 | Backend listen port                          |
| `FRONTEND_URL`  | `http://localhost:5173`| Allowed CORS origin                          |

### `frontend/.env`

| Variable             | Purpose                                                        |
| -------------------- | -------------------------------------------------------------- |
| `VITE_API_URL`       | Override backend URL if not `http://localhost:3000`            |
| `VITE_MAPBOX_TOKEN`  | Mapbox public token — **required for Mapbox basemap layers**   |

The frontend falls back to a Leaflet-based basemap (OpenStreet Map tiles) when no Mapbox token is set.

## NPM scripts

### Backend

| Script        | Action                          |
| ------------- | ------------------------------- |
| `npm start`   | Run `server.js` normally        |
| `npm run dev` | Run with `--watch` hot reload   |

### Frontend

| Script            | Action                                  |
| ----------------- | --------------------------------------- |
| `npm run dev`     | Vite dev server with HMR               |
| `npm run build`   | Type-check + production build to `dist/`|
| `npm run preview` | Serve the local `dist/` build           |
| `npm run lint`    | Oxlint                                |

## Friend-test deploy notes

If a friend pulls this repo and just wants to try it:

```bash
# Only needs to do this once
mysql -u root < database_schema.sql   # import schema into local MySQL

# Two terminals:
(cd backend  && cp .env.example .env && npm install && npm run dev)
(cd frontend && cp .env.example .env && npm install && npm run dev)
```

Then open `http://localhost:5173` in a browser.

The `compose.yaml`, `docker-compose.yml`, and `ansible/` directory in this
repo are **local-only deployment scaffolding** (homelab/personal server) and
are not required for normal development. They're gitignored.
