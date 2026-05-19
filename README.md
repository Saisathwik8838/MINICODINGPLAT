# MiniLeetCode

#projectStructure
.
├── frontend/                    # React + Vite app
│   ├── src/
│   │   ├── pages/              # Route pages (Auth, Dashboard, Editor, etc)
│   │   ├── components/         # Reusable UI components
│   │   ├── store/              # Zustand state management
│   │   ├── api/                # Axios HTTP client
│   │   └── utils/              # Helper functions
│   ├── vite.config.js          # Vite build configuration
│   └── package.json            # Frontend dependencies
│
├── backend/                     # Node.js/Express API
│   ├── src/
│   │   ├── server.js           # Entry point
│   │   ├── app.js              # Express configuration
│   │   ├── routes/             # API route handlers
│   │   ├── controllers/        # Request handlers
│   │   ├── services/           # Business logic
│   │   ├── middlewares/        # Auth, error handling
│   │   ├── utils/              # JWT, logging, Docker, etc
│   │   ├── config/             # Environment & DB setup
│   │   └── public/             # Static files (built React)
│   ├── Dockerfile              # Backend containerization
│   └── package.json            # Backend dependencies
│
├── executor/                    # Docker sandboxing
│   ├── Dockerfile.python       # Python 3 runner
│   ├── Dockerfile.node         # Node.js runner
│   ├── Dockerfile.cpp          # C++ runner
│   ├── Dockerfile.java         # Java runner
│   ├── runners/                # Language-specific execution scripts
│   └── scripts/                # Image build scripts
│
├── infrastructure/              # DevOps configuration
│   ├── docker-compose.yml      # Service orchestration
│   ├── nginx/                  # Reverse proxy config
│   └── monitoring/             # Prometheus/Grafana (optional)
│
├── prisma/                     # Database ORM
│   ├── schema.prisma           # Database schema
│   ├── migrations/             # Schema migrations
│   └── seed.js                 # Initial data
│
├── docs/                       # Documentation
│   ├── API_SPECS.yaml         # OpenAPI/Swagger specs
│   ├── ARCHITECTURE.md         # System design details
│   └── SETUP.md               # Deployment guide
│
└── .env.example               # Environment template

MiniLeetCode is a distributed code runner platform that allows users to submit solutions to coding problems, execute them in a secure sandbox, and receive real-time feedback on their code's performance against varying test cases.

## Architecture

The platform follows a monolithic architecture designed for simplicity and efficiency:

- **Frontend:** React + Vite
- **Reverse Proxy:** Nginx (routes traffic)
- **Backend:** Node.js/Express (serves API and handles submissions)
- **Database:** PostgreSQL via Prisma ORM
- **Sandbox:** Docker-out-of-Docker sandboxing (Backend spins up ephemeral Docker containers for execution by mounting the Docker socket)

There is **no separate worker process**, no Redis, and no BullMQ. Submissions are processed synchronously in the backend via a fire-and-forget mechanism, returning an immediate 202 status to the client while execution happens asynchronously.

## Sandbox Security Model

To safely execute untrusted user code, MiniLeetCode uses Docker containers with several security restrictions:
- **Network Isolation:** Containers are run with `--network=none` to prevent external network access.
- **Resource Limits:** CPU is capped at `0.5`, and memory is strictly limited depending on the language (e.g., 128MB for NodeJS/Python, 512MB for C++/Java).
- **Time Limits:** PIDs are limited to `64` to prevent fork bombs. Strict timeouts are enforced via Docker execution control.
- **Unprivileged User:** Code executes as a restricted standard user (`runner` or `node`).
- **No Privilege Escalation:** Containers run with `--security-opt=no-new-privileges:true`.

## Quick Start

1. **Build executor images:**
   ```bash
   ./executor/scripts/build_images.sh
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env and set your secrets and database password
   ```

3. **Start the platform:**
   ```bash
   docker compose up -d
   ```

4. **Initialize Database:**
   ```bash
   # Run Prisma migrations
   docker exec -it minileetcode-backend npx prisma migrate deploy
   
   # Seed the database
   docker exec -it minileetcode-backend npm run db:seed
   ```

## Admin Setup

To promote an existing user to an admin, run the following SQL command directly on your PostgreSQL database instance:

```sql
UPDATE "User" SET role = 'ADMIN' WHERE email = 'your-email@example.com';
```

## Access URLs

| Service             | Entrypoint                 |
|---------------------|----------------------------|
| Frontend App        | http://localhost           |
| Backend API Server  | http://localhost:5000      |

