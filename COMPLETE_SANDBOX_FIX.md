# 🚨 COMPREHENSIVE SANDBOX FIX GUIDE

This guide fixes all sandbox execution issues in your MiniCodingPlat application.

## ⚠️ Root Causes Identified

1. **Prisma Client not generating** - Dockerfiles had execution order issues
2. **Docker image validation missing** - Sandbox tried to run images that weren't built
3. **Windows path resolution broken** - Volume mounts failed on Docker Desktop
4. **Insufficient error logging** - Sandbox errors were hidden from users
5. **No Docker availability check** - Daemon issues went unnoticed

---

## 🔧 What Was Fixed

### 1. **Worker Dockerfile**
- ✅ Set `PRISMA_CLI_BINARY_TARGETS` BEFORE npm install
- ✅ Copy prisma schema before generating
- ✅ Added validation that Prisma client was actually generated
- ✅ Better error messages if generation fails

### 2. **Backend Dockerfile**
- ✅ Same Prisma generation fixes
- ✅ Added source maps for better debugging
- ✅ Schema validation checks

### 3. **Docker Sandbox Execution** (`worker/src/utils/dockerSandbox.js`)
- ✅ Validates Docker is running
- ✅ Validates sandbox images exist
- ✅ Proper Windows/Unix path handling
- ✅ Better error reporting and logging
- ✅ Detailed execution flow logging
- ✅ Proper temporary file cleanup

---

## 🚀 COMPLETE DEPLOYMENT STEPS

### Step 1: Verify .env Configuration
```bash
# Windows Command Prompt
echo %DATABASE_URL%
echo %REDIS_HOST%
echo %NODE_ENV%
```

**Your .env file should have:**
```env
NODE_ENV=production
DATABASE_URL=postgresql://postgres:postgrespassword@postgres:5432/minileetcode
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=
PORT=5000
HOST_PROJECT_PATH=.
QUEUE_NAME=submission-queue
WORKER_CONCURRENCY=2
JWT_SECRET=your-jwt-secret-here
REFRESH_TOKEN_SECRET=your-refresh-token-secret
```

### Step 2: Build Executor Sandbox Images
These images are needed to run user code.

```bash
cd executor

echo Building Python Runner...
docker build -t minileetcode-runner-python:latest -f Dockerfile.python .

echo Building Node Runner...
docker build -t minileetcode-runner-node:latest -f Dockerfile.node .

echo Building C++ Runner...
docker build -t minileetcode-runner-gcc:latest -f Dockerfile.cpp .

echo Building Java Runner...
docker build -t minileetcode-runner-java:latest -f Dockerfile.java .

cd ..

echo ✓ All sandbox images built!
docker images | findstr minileetcode-runner
```

**Expected output:**
```
minileetcode-runner-python     latest    YOUR_IMAGE_ID   Created 5 minutes ago   500MB
minileetcode-runner-node       latest    YOUR_IMAGE_ID   Created 5 minutes ago   400MB
minileetcode-runner-gcc        latest    YOUR_IMAGE_ID   Created 4 minutes ago   1.2GB
minileetcode-runner-java       latest    YOUR_IMAGE_ID   Created 4 minutes ago   600MB
```

### Step 3: Clean Previous Containers and Images
```bash
# Stop all running containers
docker-compose down

# Remove old images (keep .env and data)
docker rmi minileetcode-backend minileetcode-worker minileetcode-frontend 2>nul || true

# Prune dangling images
docker image prune -f
```

### Step 4: Build and Start Services
```bash
# Rebuild all services with fresh images
docker-compose build --no-cache

# Start all services
docker-compose up -d

# Wait for services to be healthy (30 seconds)
timeout 30
```

### Step 5: Verify All Services Are Running
```bash
docker-compose ps
```

**Expected output:**
```
NAME                    STATUS          PORTS
minileetcode-postgres   Up (healthy)    5432/tcp
minileetcode-redis      Up (healthy)    6379/tcp
minileetcode-backend    Up (healthy)    5000/tcp
minileetcode-worker     Up              5001/tcp
minileetcode-frontend   Up              80/tcp
minileetcode-gateway    Up              80->80
prometheus              Up              9090/tcp
grafana                 Up              3000->3000
```

### Step 6: Initialize Database
```bash
# Run database migrations
docker-compose exec backend npx prisma migrate deploy

# Check if migrations were successful
docker-compose exec backend npx prisma db push
```

### Step 7: Verify Worker is Connected
```bash
# Check worker logs for successful startup
docker-compose logs worker

# Look for these messages:
# "🚀 Worker started and listening to queue..."
# "📊 Worker Metrics Server listening on port 5001"
```

### Step 8: Test Sandbox Execution
```bash
# Run a simple Python test
curl -X POST http://localhost:5000/api/v1/submissions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "code": "print(\"Hello, World!\")",
    "language": "PYTHON",
    "problemId": "your-problem-id",
    "isRun": true
  }'
```

---

## 🧪 TESTING THE SANDBOX

### Test 1: Check Docker Images
```bash
# Verify all images exist
docker image ls | findstr minileetcode-runner
docker run --rm minileetcode-runner-python:latest python3 -c "print('✓ Python works')"
docker run --rm minileetcode-runner-node:latest node -e "console.log('✓ Node works')"
docker run --rm minileetcode-runner-gcc:latest gcc --version
docker run --rm minileetcode-runner-java:latest javac -version
```

### Test 2: Check Worker Logs
```bash
# Stream worker logs
docker-compose logs -f worker

# In another terminal, submit code, then check logs for:
# - "Processing submission ..."
# - "Executing testcase..."
# - "Submission completed..."
```

### Test 3: Check Database Connection
```bash
docker-compose exec backend npx prisma studio
# This opens a web UI showing your database state
```

### Test 4: Full End-to-End Test
1. Go to http://localhost (your app)
2. Login with your account
3. Choose a problem
4. Write test code in the editor
5. Click "Run Code"
6. Check the output section

---

## 🔍 DEBUGGING

### Issue: Worker won't start - Prisma errors
```bash
# Check the dockerfile build logs
docker-compose build --no-cache worker

# Look for:
# ✓ Prisma schema found
# ✓ Prisma client generated
# If you see ✗, there's a build error
```

**Solution:**
```bash
# Restart worker  
docker-compose restart worker

# Check logs
docker-compose logs worker | head -50
```

### Issue: "Code running in sandbox" with no results
```bash
# Check if sandbox images exist
docker images | findstr minileetcode-runner

# If missing, rebuild them:
cd executor
bash setup-sandbox.sh
cd ..
```

**Solution:**
```bash
# Rebuild images
docker-compose down
bash executor/scripts/build_images.sh
docker-compose build --no-cache worker
docker-compose up -d worker
```

### Issue: Docker volume mount errors
```bash
# Check if Docker Desktop is running properly
docker ps

# Test volume mount
docker run --rm -v %cd%\tmp:/test alpine ls -la /test
```

**For Windows, check:**
- Docker Desktop is running
- Hyper-V is enabled (if using WSL2)
- File sharing is enabled in Docker settings

### Issue: Timeout on code execution
```bash
# Check the timeout settings in docker-compose.yml
# SUBMISSION_TIMEOUT_SECONDS should be >= expected execution time

# Check worker resource usage
docker stats minileetcode-worker

# If high CPU/memory, scale up in docker-compose.yml:
# WORKER_CONCURRENCY: 1 (reduce parallelism)
```

---

## 📊 MONITORING

### View Metrics
```bash
# Worker metrics
curl http://localhost:5001/metrics

# Prometheus (job metrics)
curl http://localhost:9090

# Grafana dashboards
http://localhost:3000  (admin/admin)
```

### View Detailed Logs
```bash
# Backend errors
docker-compose exec backend tail -f logs/backend-error-*.log

# Worker errors
docker logs minileetcode-worker -f

# All container logs
docker-compose logs -f
```

---

## 🛠️ QUICK RECOVERY

If everything breaks, here's the fastest recovery:

```bash
# 1. Stop everything
docker-compose down

# 2. Remove volume data (WARNING: deletes all data!)
docker volume rm minileetcode_postgres-data minileetcode_redis-data

# 3. Rebuild executor images
cd executor
for %%F in (Dockerfile.*) do docker build -t minileetcode-runner-%%~nF:latest -f %%F .
cd ..

# 4. Start fresh
docker-compose build --no-cache
docker-compose up -d

# 5. Wait for services
timeout 60

# 6. Initialize DB
docker-compose exec backend npx prisma migrate deploy

# 7. Verify worker
docker-compose logs worker | findstr "🚀\|Worker"
```

---

## ✅ VERIFICATION CHECKLIST

Run through this checklist to ensure everything works:

- [ ] All executor images built (`docker images | findstr minileetcode-runner`)
- [ ] All containers running (`docker-compose ps`)
- [ ] Worker shows "listening to queue" in logs
- [ ] Backend shows "Health check passed"
- [ ] Database migrations completed with no errors
- [ ] Can access frontend at http://localhost
- [ ] Can login successfully
- [ ] Can submit code and get results (not just "sandbox running")
- [ ] Metrics accessible at http://localhost:5001/metrics
- [ ] No error messages in `local /tmp` directories

---

## 🔑 KEY FILES MODIFIED

| File | Change | Impact |
|------|--------|--------|
| `worker/Dockerfile` | Fixed Prisma generation order | Worker now starts correctly |
| `backend/Dockerfile` | Fixed Prisma generation & validation | Backend initializes properly |
| `worker/src/utils/dockerSandbox.js` | Complete rewrite | Better error handling, cross-platform support |
| `docker-compose.yml` | Fixed HOST_PROJECT_PATH default | Windows Docker Desktop compatibility |

---

## 📝 NOTES

- The sandbox runs code in completely isolated Docker containers
- Each execution gets a unique UUID and temporary directory
- Code runs as non-root user for security
- Memory limited to 64-256MB per execution
- CPU limited to 0.5 cores per execution
- 8-12 second timeout per code execution
- All temporary files cleaned up after execution (unless debugging)

---

## 🆘 Still Having Issues?

1. **Check all 3 executor image builds completed**
2. **Check worker logs show "Worker started"**
3. **Ensure DATABASE_URL environment variable is set**
4. **Verify Redis is able to communicate with worker**
5. **Check temporary `/tmp` directories exist and are writable**

Last resort:
```bash
# Full diagnostic dump
docker-compose ps > diagnostic.txt
docker images >> diagnostic.txt  
docker-compose logs worker >> diagnostic.txt
docker-compose logs backend >> diagnostic.txt

# Share diagnostic.txt for debugging
```
