# 17. Production Deployment Guide (AWS / DigitalOcean)

This guide outlines how to deploy the **Distributed Code Runner Platform** to a live production environment using a virtual machine (Droplet on DigitalOcean or EC2 on AWS) running Ubuntu 22.04 LTS.

---

## 17.1. Infrastructure Prerequisites

For a production environment where code execution workers run simultaneously with an API, a PostgreSQL database, and a Redis instance, we recommend:

*   **Instance Type**: AWS `t3.medium` (or `t3.large`) / DigitalOcean \$12-\$24 Droplet.
*   **Specifications**: At least 2 vCPUs and 4GB RAM. (Code compilation, especially Java and C++, can spike memory usage).
*   **OS**: Ubuntu 22.04 LTS.
*   **Security Groups / Firewall**:
    *   Allow Inbound **SSH (Port 22)** from your IP only.
    *   Allow Inbound **HTTP (Port 80)** from Anywhere (0.0.0.0/0).
    *   Allow Inbound **HTTPS (Port 443)** from Anywhere (for SSL later).
    *   *Do NOT* expose Ports 5000 (Backend), 5432 (Postgres), or 6379 (Redis) to the open internet. Nginx (Port 80/443) will proxy all requests to internal Docker networks.

---

## 17.2. Initial Server Setup

SSH into your fresh Ubuntu instance:
```bash
ssh root@YOUR_SERVER_IP
```

### A. Update the System
```bash
apt-get update -y
apt-get upgrade -y
```

### B. Install Docker & Docker Compose
The platform relies entirely on Docker-out-of-Docker architecture.

```bash
# Install Docker Engine
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose Plugin
apt-get install docker-compose-plugin -y

# Verify Installations
docker --version
docker compose version
```

---

## 17.3. Clone and Secure the Repository

```bash
# Move to the optimal directory
cd /opt

# Clone the platform repository
git clone https://github.com/yourusername/minileetcode-platform.git
cd minileetcode-platform
```

### Create the Environment File
Create the strictly private `.env` file that Docker Compose will read:

```bash
nano .env
```

**Contents:**
```env
NODE_ENV=production

# Core API Settings
BACKEND_PORT=5000
FRONTEND_URL=http://YOUR_SERVER_IP_OR_DOMAIN

# Infrastructure Auth
DATABASE_URL=postgresql://postgres:REPLACE_WITH_SECURE_PASSWORD@postgres:5432/minileetcode?schema=public
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=REPLACE_WITH_SECURE_REDIS_PASSWORD

# Security Tokens (Generate random strings for these)
JWT_SECRET=generate_a_random_sha256_hash_here
JWT_EXPIRES_IN=1h
REFRESH_TOKEN_SECRET=generate_another_random_sha256_hash_here
REFRESH_TOKEN_EXPIRES_IN=7d

# Worker limits
QUEUE_NAME=submission-queue
WORKER_CONCURRENCY=5
```

---

## 17.4. Build The Specific Docker execution limits

The worker container requires pre-built language sandbox images on the host machine. Run the build script to compile the Python, JS, C++, and Java images:

```bash
cd executor
chmod +x scripts/build_images.sh
./scripts/build_images.sh
cd ..
```
*Note: This process may take a few minutes as it downloads base compilers.*

---

## 17.5. Launching the Production Stack

With the `.env` file mapped and the execution images built, start the entire microservices stack in detached mode:

```bash
docker compose up -d --build
```

### Monitor the Boot Process
Ensure everything started cleanly (especially databases and redis):
```bash
docker compose ps
docker compose logs backend -f
docker compose logs worker -f
```

---

## 17.6. Database Migration (Prisma)

While the containers are running, the PostgreSQL database is currently empty. We need to deploy the table schemas:

```bash
# Execute the migration command inside the running backend container
docker compose exec backend npx prisma migrate deploy

# (Optional) If you have a seed script (admin user / demo problems):
docker compose exec backend npx prisma db seed
```

---

## 17.7. Next Steps: Setting up SSL (Certbot)

To secure user JWTs, HTTPS is mandatory for production. 

1. Point your domain A-record to `YOUR_SERVER_IP`.
2. Install Certbot on the host machine:
   ```bash
   apt install certbot python3-certbot-nginx
   ```
3. Update `infrastructure/nginx/conf.d/default.conf` to include your `server_name yourdomain.com`.
4. Run certbot (it will modify your Nginx config to include the SSL certs):
   ```bash
   certbot --nginx -d yourdomain.com
   ```
5. Restart the gateway container:
   ```bash
   docker compose restart nginx
   ```

You now have a production-ready, highly secure Distributed Code Execution Platform live on the internet!
