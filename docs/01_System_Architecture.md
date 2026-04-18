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
  - Processes code execution directly via dockerSandbox.js utility.



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
3. **Validation**: The API validates the JWT.
4. **Execution Start**: A new Submission record is created in PostgreSQL with a `Pending` status. The backend responds to the client with a 202 status and a submission ID.
5. **Sandbox Execution**: The `processSubmission()` function runs asynchronously. It spins up a secure Docker container for the specific language (`python`, `node`, `gcc`, `openjdk`) via `dockerSandbox.js`.
6. **Evaluation**: Code evaluates. The backend collects the outcome.
7. **State Update**: The backend writes the final results (runtime, memory, status) into PostgreSQL.
8. **Result Delivered**: The frontend polls the API and successfully fetches the completed status, and the user sees their result.

---

## 1.4. Scalability Profile
- The **Frontend** can be hosted on a CDN or horizontally scaled Nginx instances.
- The **Backend API** is stateless and can be replicated and horizontally scaled behind the load balancer.
- The **Database** can utilize read replicas to handle high traffic on the Leaderboard and Problem reading endpoints.
