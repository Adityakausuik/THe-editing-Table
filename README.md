# The Editing Table Platform

> Bespoke editorial post-production platform for luxury wedding photographers, filmmakers, and creative studios worldwide. Built with React.js, Vite, Tailwind CSS, Framer Motion, Express.js, and MongoDB Atlas.

---

## 🏗️ Architecture & Technology Stack

- **Frontend (`client/`)**:
  - React 18 & Vite 6
  - Tailwind CSS (Custom luxury color tokens, typography & shadows)
  - Framer Motion & GSAP (Scroll-driven section themes & entrance micro-interactions)
  - React Router 7 (SPA with client-side routing & deep-link fallbacks)
  - React Hook Form & Lucide Icons
- **Backend (`server/`)**:
  - Node.js & Express.js (Modular REST API architecture)
  - Mongoose ODM (Schemas, indexes, and soft-delete support)
  - Session-backed JWT Authentication with HttpOnly Cookies & CSRF Protection
  - Sharp Image Processing Pipeline (WebP conversion, auto-rotation, and thumbnails)
  - Security suite: Helmet, CORS origin validation, Rate-Limiting, NoSQL injection filtering, and centralized error sanitization
- **Database**:
  - MongoDB / MongoDB Atlas with fail-fast connection timeouts and automated reconnection
- **Repository Architecture**:
  - Monorepo using npm workspaces (`client`, `server`, `shared`)

---

## 🛠️ Prerequisites

- **Node.js**: `>= 20.0.0`
- **npm**: `>= 10.0.0`
- **MongoDB**: Local MongoDB instance (`mongodb://127.0.0.1:27017/the-editing-table`) or MongoDB Atlas URI (`mongodb+srv://...`)

---

## 🚀 Environment Configuration

### 1. Root Environment Variables (`.env`)
*(Copied or referenced by root tooling)*

```env
NODE_ENV=development
```

### 2. Backend Server Environment (`server/.env`)

Copy `server/.env.example` to `server/.env` and supply your secrets:

```env
# Application Runtime
NODE_ENV=production
PORT=5000

# Client Origins for CORS
CLIENT_URL=https://theeditingtable.com
CLIENT_ORIGIN=https://theeditingtable.com

# Database Connection (MongoDB Atlas)
MONGODB_URI=mongodb+srv://<db_user>:<db_password>@cluster0.xxxxx.mongodb.net/the-editing-table?retryWrites=true&w=majority

# Security Secrets (Must be unique and >= 24 / 32 characters in production)
JWT_SECRET=replace-with-a-long-random-secret-at-least-24-characters
JWT_EXPIRES_IN=1d
TWO_FACTOR_ENCRYPTION_KEY=replace-with-an-independent-random-secret-at-least-32-characters

# Initial Admin Bootstrap Credentials
ADMIN_EMAIL=admin@theeditingtable.com
ADMIN_PASSWORD=replace-with-a-strong-password-at-least-12-characters
ADMIN_SETUP_TOKEN=replace-with-a-random-one-time-setup-token
```

### 3. Frontend Client Environment (`client/.env`)

Copy `client/.env.example` to `client/.env`:

```env
# Development default:
VITE_API_URL=http://127.0.0.1:5000/api

# Production (Same-Origin / Reverse Proxy):
# VITE_API_URL=/api

# Production (Dedicated API Subdomain):
# VITE_API_URL=https://api.theeditingtable.com/api
```

---

## 💻 Development Workflow

From the root project directory:

```bash
# 1. Install all dependencies across workspaces
npm install

# 2. Start full-stack development environment (Vite + Express)
npm run dev

# Or clean restart dev ports if busy
npm run dev:clean

# Start frontend client only (http://127.0.0.1:5173)
npm run dev:client

# Start backend server only (http://127.0.0.1:5000)
npm run dev:server

# Seed initial database records
npm run db:seed
```

---

## 🧪 Verification, Linting & Production Build

```bash
# Run ESLint across client and server
npm run lint

# Compile frontend production assets (Vite optimized chunks)
npm run build

# Run security unit tests
npm run test:security -w server

# Verify full-stack production health
npm run verify
```

---

## ☁️ Deployment Guide

### Option A: Cloud Platform (Render / Railway / Fly.io / Heroku)

1. **Frontend (Vercel / Netlify / Cloudflare Pages)**:
   - **Root Directory**: `client`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Environment Variable**: `VITE_API_URL=https://api.theeditingtable.com/api`
   - The included `_redirects` file handles SPA routing rewrites automatically.

2. **Backend (Render / Railway / VPS)**:
   - **Root Directory**: `server`
   - **Start Command**: `npm start`
   - **Environment Variables**: Configure all variables from `server/.env.example`.
   - **Health Check Endpoint**: `/health` or `/api/health`

### Option B: Unified Single-Server / Docker / VPS (Ubuntu, Nginx, PM2)

1. Build the client bundle: `npm run build`
2. Serve static assets via Nginx reverse proxy routing `/api` and `/uploads` to Express on `http://127.0.0.1:5000`.
3. Manage the Node.js backend using PM2: `pm2 start server/src/index.js --name "editing-table-api"`.

---

## 📁 Media Storage & Production Persistence

- In local development, media is stored in `server/uploads/`.
- For ephemeral container deployments (like Heroku or Render without persistent disks), configure persistent disk volumes or connect an S3 / Cloudinary bucket adapter.

---

## 🔒 Security Highlights

- **Zero Hardcoded Secrets**: All keys, passwords, and connection strings are read via environment variables.
- **Strict Input Validation**: Zod request schema validation and NoSQL query injection prevention.
- **Session-Backed JWT & Anti-CSRF**: HttpOnly cookie session management with cryptographically verified CSRF tokens for mutating requests.
- **CORS Origin Whitelisting**: Dynamic strict origin checking in production.
- **Safe Error Shielding**: Stack traces and raw internal error details are masked in production mode.

---

## 🚢 GitHub Push Commands

*When authorized, run the following commands from the project root:*

```bash
# 1. Initialize Git repository
git init

# 2. Stage all production files (safe .gitignore prevents secret leakage)
git add .

# 3. Create initial clean commit
git commit -m "feat: complete production-ready build for The Editing Table Platform"

# 4. Set main branch
git branch -M main

# 5. Link your GitHub remote repository
git remote add origin https://github.com/<YOUR_USERNAME>/<YOUR_REPO_NAME>.git

# 6. Push to GitHub
git push -u origin main
```

---

## 🛠️ Troubleshooting

- **Port in use (`EADDRINUSE 5000` / `5173`)**: Run `npm run kill:ports` to cleanly release listeners.
- **MongoDB Connection Timeout**: Ensure your IP address is whitelisted in MongoDB Atlas Network Access (`0.0.0.0/0` or server IP).
- **Direct Route Refresh 404 on Static Hosts**: Verify `_redirects` is copied to the build output directory (`dist/_redirects`).

