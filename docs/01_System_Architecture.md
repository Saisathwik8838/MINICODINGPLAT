# 1. System Architecture: Distributed Code Runner Platform

## 1.1. Overview
The Distributed Code Runner Platform (Mini LeetCode) is designed using a microservices-oriented distributed architecture. The system is decoupled into independent scalable components that handle specific responsibilities, ensuring high availability, fault tolerance, and secure execution of untrusted user code.

The core underlying philosophy is **event-driven asynchronous processing** for code execution to provide a non-blocking, responsive user experience. 

## 1.2. Core Components

### 1. Frontend (Client Tier)
- **Technology**: React, TailwindCSS, Monaco Editor.
- **Role**: Provides the modern interactive coding UI. Communicates with the Backend API over REST. 
- **Features**: Code editor with syntax highlighting, language selection, submission polling/WebSockets for result display, leaderboard view, and discussions.

### 2. API Gateway & Load Balancer
- **Technology**: Nginx.
- **Role**: Acts as the single entry point to the system. Routes API requests to the Backend, serves the static Frontend bundle (if not on a CDN), and provides basic DDoS protection.
- **Features**: SSL termination, reverse proxy, request routing.

### 3. Backend API Service
- **Technology**: Node.js, Express, Prisma ORM.
- **Role**: The core business logic layer. 
- **Responsibilities**:
  - Handles User Authentication (JWT + Refresh Tokens).
  - Exposes REST endpoints for Problems, Submissions, Leaderboard, and Discussions.
  - Implements API Rate Limiting (10 code runs/min, 5 submissions/min) using Redis.
  - Pushes code execution jobs to the Redis Queue (BullMQ).

### 4. Message Broker / Queue
- **Technology**: Redis + BullMQ.
- **Role**: Decouples the API from the heavy task of code execution. 
- **Responsibilities**: Holds the queue of pending code submissions. Provides a sliding window state for rate-limiting purposes.

### 5. Worker Service
- **Technology**: Node.js.
- **Role**: Consumes jobs from the Redis queue.
- **Responsibilities**:
  - Pulls submission payloads (code, language, test cases).
  - Interacts with the Docker daemon to spin up isolated executor containers.
  - Monitors the execution lifecycle.
  - Captures `stdout`, `stderr`, and runtime metrics.
  - Compares the output against the expected results.
  - Stores the final evaluation state in PostgreSQL.
  - Updates the Leaderboard based on success.

### 6. Code Execution Engine (Sandbox)
- **Technology**: Docker.
- **Role**: The secure, ephemeral environment where untrusted code runs.
- **Security & Constraints**: 
  - Containers have **NO network access** (`--network=none`).
  - Strict resource limits (`--memory=256m`, `--cpus=0.5`).
  - Hardened security settings (`--security-opt=no-new-privileges`, `read-only` root fs).
  - Short-lived lifespan (5-second timeout enforced by the worker and internal script).

### 7. Database Layer (State Tier)
- **Technology**: PostgreSQL.
- **Role**: The single source of truth for persistent relational data.
- **Managed Data**: Users, Problems, Test Cases, Submissions, Leaderboard records, and Discussions.

### 8. Monitoring & Observability Stack
- **Technology**: Prometheus, Grafana, Winston.
- **Role**: Ensures system health tracking and troubleshooting.
- **Responsibilities**: Application logs (Winston), API latency, execution time metrics, queue length, and resource utilization alerts.

---

## 1.3. Information Flow (Execution Lifecycle)
1. **Submit**: A user writes code in the Monaco Editor and clicks "Submit".
2. **API Request**: The React app sends a POST request with the source code and language to the API Server.
3. **Validation & Rate Limit**: The API validates the JWT and checks the Redis rate limiter (max 5 submissions / min).
4. **Queue Job**: If allowed, a new Submission record is created in PostgreSQL with a `Pending` status. The API pushes the payload into BullMQ (Redis) and returns a submission ID to the user.
5. **Poll/Listen**: The frontend starts polling the API (or uses SSE/WebSockets) for the status of the submission ID.
6. **Task Pickup**: An idle Worker picks up the job from the queue.
7. **Sandbox Execution**: The Worker spins up a secure Docker container for the specific language (`python`, `node`, `gcc`, `openjdk`), passing the code and test cases in a read-only volume or via `stdin`.
8. **Evaluation**: Code evaluates. The Worker collects the outcome (Accepted, Wrong Answer, Time Limit Exceeded, Memory Limit Exceeded, Runtime Error).
9. **State Update**: The Worker writes the final results (runtime, memory, status) into PostgreSQL.
10. **Result Delivered**: The frontend successfully fetches the completed status, and the user sees their result.

---

## 1.4. Scalability Profile
- The **Frontend** can be hosted on a CDN or horizontally scaled Nginx instances.
- The **Backend API** is stateless (JWT + Redis for rate limits) and can be replicated and horizontally scaled behind the load balancer.
- The **Worker Service** can be horizontally scaled across multiple VMs. If the submission queue grows large, adding more worker nodes instantly increases throughput.
- The **Database** can utilize read replicas to handle high traffic on the Leaderboard and Problem reading endpoints.
