# QuickMan — Asset Management System

A full-stack asset management system built across three platforms: iOS app, web dashboard, and backend server.

**Live Demo**
- Web Dashboard: https://quickman.heshanws.top
- API: https://api.heshanws.top
- Admin login: `admin` / `admin123`

---

## Project Structure

```
QuickMan/
├── mobile/       # React Native iOS app
├── web/          # React web dashboard
└── server/       # Node.js backend
```

---

## Getting Started

### 1. Backend Server

```bash
cd server
npm install
```

Create `.env`:
```
PORT=3000
DB_HOST=localhost
DB_USER=your_db_user
DB_PASS=your_db_password
DB_NAME=quickman
JWT_SECRET=your_secret_key
```

Set up the database:
```bash
mysql -u root -p
CREATE DATABASE quickman;
# then run schema.sql
```

Start the server:
```bash
npm run dev          # development
pm2 start server.js  # production
```

---

### 2. Web Dashboard

```bash
cd web
npm install
```

Create `.env`:
```
VITE_API_URL=https://api.heshanws.top/api
```

```bash
npm run dev    # development → http://localhost:5173
npm run build  # production build
```

---

### 3. iOS App

```bash
cd mobile
npm install
```

> **Note:** This app uses the NIIMBOT JCAPI Bluetooth printer SDK, which requires a native Xcode build. Standard Expo Go will not work.

```bash
npx expo prebuild
```

Then open `ios/QuickMan.xcworkspace` in Xcode, add `JCAPI.a` to Build Phases, and run on a physical device.

---

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| Mobile | React Native, Expo Dev Client, SQLite, AsyncStorage |
| Web | React, Ant Design, Axios |
| Server | Node.js, Express, MySQL, JWT |
| Infrastructure | Nginx, HTTPS, PM2 |
| Native SDK | NIIMBOT JCAPI (iOS Bluetooth printing) |

---

## Key Features

- **Offline-first** — all operations work without network, synced automatically when connectivity returns
- **Two-way sync** — incremental sync using `updated_at` timestamps, push pending changes and pull server updates
- **QR scanning** — scan asset QR codes to borrow/return
- **Bluetooth printing** — print asset labels via NIIMBOT thermal printer
- **GPS tagging** — record cabinet locations with coordinates
- **Web dashboard** — admin-only interface with real-time inventory data
