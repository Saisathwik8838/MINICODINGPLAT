# MiniLeetCode - Distributed Code Runner Platform

A highly scalable, secure, and performant microservices-based coding platform enabling users to write, execute, and submit code against standardized test cases in Python, C++, Java, and Node.js.

![Platform Hero](./docs/assets/placeholder.png) <!-- Update later with a screenshot of the Frontend UI -->

## 🌟 Key Features

- **Secure Execution Engine**: Uses true Docker-out-of-Docker sandboxing to completely isolate arbitrary user code execution with hard `ulimit` bounds, memory constraints, network disabling, and unprivileged user mappings.
- **Microservices Architecture**: Completely decoupled API, Worker, Redis queue, Postgres state, and React Vite single-page application.
- **Real-Time Responsiveness**: Polling-based asynchronous submission engine built natively on `BullMQ`.
- **Premium User Interface**: Dark-themed, glassmorphic UI built in React + TailwindCSS natively integrating Microsoft's Monaco Editor.
- **Global Leaderboard & Discussion Forum**: Inherent gamification to calculate scores rapidly and a community board for optimal solution sharing.
- **Enterprise Observability**: Integrated Prometheus & Grafana stack configured to chart queue lengths and API latencies natively using `prom-client`.
- **Production CI/CD Automation**: GitHub Actions configured to provision, lint, build, and deploy zero-downtime updates directly to a Linux Cloud VPS.

---

## 🏗 System Architecture

The environment relies on completely deterministic Docker scaling.

1. **Nginx API Gateway**: Reverses proxy all incoming port 80/443 traffic either to the `React` client or `Express` backend.
2. **Backend API**: Stateless Node.js application managing `JWT` authentication, Prisma ORM Postgres operations, and enqueueing code submissions into Redis via BullMQ.
3. **Queue / Rate-Limiting**: Centralized `Redis` database to pass high-traffic objects across clusters without overwhelming the DB.
4. **Execution Workers**: Consumes from the queue, pulls secure execution images, mounts the user's plain code into a temporary Volume, uses the host's Docker socket to execute safely against the test cases, and saves the payload back to PostgreSQL.

For a detailed view, read [System Architecture (docs/01_System_Architecture.md)](./docs/01_System_Architecture.md).

---

## 🚀 Local Development Setup

### 1. Prerequisites
- Docker & Docker Compose
- Node.js `20.x`
- Bash environment (Linux/macOS/WSL on Windows)

### 2. Prepare Sandbox Images
First, you must build the customized execution runner constraints. Open your terminal:
```bash
cd executor
bash scripts/build_images.sh
cd ..
```

### 3. Spin Up the Platform
Fire up all 6 microservices instantly via Docker Compose:
```bash
docker compose up -d
```
*Note: The frontend will boot automatically alongside the gateway.*

### 4. Database Setup (First-time only)
While your stack is running, create the PostgreSQL table map for the very first time and seed it:
```bash
docker compose exec backend npx prisma migrate deploy
docker compose exec backend npx prisma db seed
```

### 5. Verify Everything Works
  Backend health: http://localhost/api/v1/health
  Frontend: http://localhost/
  Admin login: email=admin@minileetcode.com password=Admin@123
  After login, you should see 5 problems in the problems list.

---

## 📖 Access the Platform

- **Frontend**: `http://localhost/`
- **Backend Health Check**: `http://localhost/api/v1/health`
- **Prometheus**: `http://localhost:9090/`
- **Grafana**: `http://localhost:3000/` (Default Auth: `admin` / `admin`)

---

## 🛠️ Tech Stack Outline

**Frontend:**
- Vite
- React 18
- TailwindCSS (Dark Glassmorphism UI)
- Lucide React (Icons)
- Monaco Editor (VSCode Web Core)
- React Router DOM

**Backend:**
- Node.js (ES Modules)
- Express.js
- Prisma (ORM)
- BullMQ (Message Queue)
- Winston (Daily Rotating Logs)
- Prom-Client (Observability)
- JWT Middleware

**Infrastructure:**
- Docker / Docker Compose
- PostgreSQL (Primary Store)
- Redis (Job & Rate Limiting Storage)
- Nginx (Gateway Reverse Proxy)
- Prometheus & Grafana (Monitoring)
- GitHub Actions (CI/CD)

---

## 🛡️ Admin Account Verification

To access the `/admin` controls immediately:
1. Connect directly to your PostgreSQL container on port `5432`.
2. Locate your User record.
3. Update the enum: `UPDATE "User" SET role = 'ADMIN' WHERE username = 'your_username';`

---

## 🔐 License & Security Declaration

This platform was built as a highly robust proof-of-concept. The `docker-compose.yml` mounts `/var/run/docker.sock` to the Worker container natively. While the underlying execution containers (`minileetcode-runner-python`, etc.) are securely sandboxed, mounting the daemon inside a worker on a shared cluster is not recommended for Multi-Tenant Kubernetes. It is designed efficiently for monolithic/clustered Virtual Machines.

Developed by **Antigravity**.
