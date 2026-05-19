# MiniLeetCode

MiniLeetCode is a distributed code execution platform inspired by online coding judges like LeetCode. It allows users to solve coding problems, submit solutions in multiple programming languages, execute them securely inside isolated Docker containers, and receive verdicts based on test case evaluation.

---

# Features

- Secure sandboxed code execution using Docker
- Multi-language support
  - Python
  - JavaScript
  - C++
  - Java
- Real-time submission evaluation
- PostgreSQL database with Prisma ORM
- React + Vite frontend
- Node.js + Express backend
- Docker-based execution environment
- Nginx reverse proxy
- Authentication and role-based access control
- Resource-constrained execution environment

---

# Architecture

```text
                    ┌──────────────────┐
                    │     Frontend     │
                    │   React + Vite   │
                    └────────┬─────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │      Nginx       │
                    │  Reverse Proxy   │
                    └────────┬─────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │  Node.js Backend │
                    │     Express      │
                    └────────┬─────────┘
                             │
         ┌───────────────────┴───────────────────┐
         ▼                                       ▼
┌──────────────────┐                 ┌──────────────────┐
│   PostgreSQL     │                 │ Docker Sandbox   │
│ Prisma ORM Layer │                 │ Code Execution   │
└──────────────────┘                 └──────────────────┘
```

---

# Project Structure

```bash
MiniLeetCode/
│
├── frontend/                         # React + Vite frontend
│   ├── src/
│   │   ├── pages/                    # Route pages
│   │   ├── components/               # Reusable UI components
│   │   ├── store/                    # Zustand state management
│   │   ├── api/                      # Axios API clients
│   │   └── utils/                    # Helper utilities
│   │
│   ├── vite.config.js                # Vite configuration
│   └── package.json
│
├── backend/                          # Express backend server
│   ├── src/
│   │   ├── server.js                 # Server entrypoint
│   │   ├── app.js                    # Express app setup
│   │   ├── routes/                   # API routes
│   │   ├── controllers/              # Route controllers
│   │   ├── services/                 # Business logic
│   │   ├── middlewares/              # Authentication & error handling
│   │   ├── utils/                    # JWT, logging, Docker utilities
│   │   ├── config/                   # Database & environment config
│   │   └── public/                   # Built frontend files
│   │
│   ├── Dockerfile
│   └── package.json
│
├── executor/                         # Sandboxed execution environment
│   ├── Dockerfile.python             # Python runner image
│   ├── Dockerfile.node               # Node.js runner image
│   ├── Dockerfile.cpp                # C++ runner image
│   ├── Dockerfile.java               # Java runner image
│   │
│   ├── runners/                      # Language-specific execution scripts
│   └── scripts/                      # Executor image build scripts
│
├── infrastructure/                   # Deployment & DevOps configuration
│   ├── docker-compose.yml            # Service orchestration
│   ├── nginx/                        # Reverse proxy configuration
│   └── monitoring/                   # Monitoring configuration
│
├── prisma/                           # Prisma ORM
│   ├── schema.prisma                 # Database schema
│   ├── migrations/                   # Prisma migrations
│   └── seed.js                       # Seed data
│
├── docs/                             # Documentation
│   ├── API_SPECS.yaml                # OpenAPI/Swagger specs
│   ├── ARCHITECTURE.md               # System design details
│   └── SETUP.md                      # Deployment guide
│
└── .env.example                      # Environment template
```

---

# Tech Stack

| Layer              | Technology              |
| ------------------ | ----------------------- |
| Frontend           | React, Vite, Zustand    |
| Backend            | Node.js, Express        |
| Database           | PostgreSQL              |
| ORM                | Prisma                  |
| Sandbox Execution  | Docker                  |
| Reverse Proxy      | Nginx                   |
| Container Orchestration | Docker Compose     |

---

# Sandbox Security Model

MiniLeetCode executes untrusted user code inside isolated Docker containers with strict runtime restrictions.

## Security Restrictions

| Restriction | Description |
| --- | --- |
| Network Isolation | Containers run with `--network=none` |
| CPU Limits | Maximum `0.5` CPU allocation |
| Memory Limits | Strict per-language memory limits |
| PID Limits | Maximum `64` processes |
| Execution Timeouts | Hard timeout enforcement |
| Non-root Execution | Runs as restricted user |
| Privilege Escalation | Disabled using `no-new-privileges` |

## Example Runtime Configuration

```bash
docker run \
  --network=none \
  --memory=128m \
  --cpus=0.5 \
  --pids-limit=64 \
  --security-opt=no-new-privileges:true
```

---

# Execution Flow

```text
User Submission
       │
       ▼
Frontend sends API request
       │
       ▼
Backend validates submission
       │
       ▼
Backend spawns isolated Docker container
       │
       ▼
Code compilation/execution
       │
       ▼
Test case evaluation
       │
       ▼
Verdict stored in database
       │
       ▼
Frontend receives execution result
```

---

# Quick Start

## 1. Clone the Repository

```bash
git clone <repository-url>
cd MiniLeetCode
```

## 2. Build Executor Images

```bash
./executor/scripts/build_images.sh
```

## 3. Configure Environment Variables

```bash
cp .env.example .env
```

Edit `.env` and configure the required values.

Example:

```env
DATABASE_URL=
JWT_SECRET=
POSTGRES_PASSWORD=
```

## 4. Start the Platform

```bash
docker compose up -d
```

## 5. Run Database Migrations

```bash
docker exec -it minileetcode-backend \
npx prisma migrate deploy
```

## 6. Seed Initial Data

```bash
docker exec -it minileetcode-backend \
npm run db:seed
```

---

# Admin Setup

Promote an existing user to admin using the following SQL query:

```sql
UPDATE "User"
SET role = 'ADMIN'
WHERE email = 'your-email@example.com';
```

---

# Access URLs

| Service | URL |
| --- | --- |
| Frontend Application | `http://localhost` |
| Backend API | `http://localhost:5000` |

---

# Design Decisions

## Monolithic Architecture

MiniLeetCode intentionally uses a monolithic architecture for:

- Easier development
- Simpler deployment
- Lower infrastructure overhead
- Faster iteration cycles

## Docker Socket Mounting

The backend directly controls Docker containers in order to:

- Spawn ephemeral execution containers
- Apply runtime restrictions
- Simplify orchestration
- Avoid external worker dependencies

---

# Future Improvements

- Queue-based execution pipeline
- Distributed workers
- WebSocket-based live verdicts
- Kubernetes deployment
- Contest support
- Rate limiting
- Custom test case execution
- AI-assisted code review

---

# License

MIT License
