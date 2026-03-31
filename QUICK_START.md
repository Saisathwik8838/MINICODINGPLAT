# 🚀 QUICK START - SANDBOX FIX

**Just run this on Windows:**

```powershell
# Open PowerShell in your project directory, then:
.\sandbox-fix.ps1
```

**Or follow these quick steps:**

```bash
# 1. Build executor images
cd executor
docker build -t minileetcode-runner-python:latest -f Dockerfile.python .
docker build -t minileetcode-runner-node:latest -f Dockerfile.node .
docker build -t minileetcode-runner-gcc:latest -f Dockerfile.cpp .
docker build -t minileetcode-runner-java:latest -f Dockerfile.java .
cd ..

# 2. Rebuild containers
docker-compose build --no-cache
docker-compose down && docker-compose up -d

# 3. Init database & verify
docker-compose exec backend npx prisma migrate deploy
docker-compose logs worker | findstr "🚀"

# 4. Test (replace TOKEN with your JWT)
curl -X POST http://localhost:5000/api/v1/submissions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{"code":"print(123)","language":"PYTHON","problemId":"1","isRun":true}'
```

---

## ✅ What Was Fixed

| Issue | Root Cause | Fix |
|-------|-----------|-----|
| Worker won't start | Prisma not generating | Set env vars before npm install |
| "Sandbox running" forever | No Docker image validation | Added validateImageExists() |
| Windows volume mount fails | Bad path resolution | WSL2 path conversion |
| No error details | Silent failures | Added comprehensive logging |
| Docker not responding | No daemon check | Added validateDockerAvailable() |

---

## 📋 Verify Setup

```bash
# Check all executor images built
docker images | findstr minileetcode-runner
# Should show 4 images: python, node, gcc, java

# Check all services running
docker-compose ps
# Should show 8 services all "Up"

# Check worker connected to queue
docker-compose logs worker | head -20
# Should show "🚀 Worker started and listening"

# Test Python sandbox
docker run --rm minileetcode-runner-python:latest python3 -c "print('✓ Works')"
```

---

## 📚 Full Documentation

- **`COMPLETE_SANDBOX_FIX.md`** ← **Read this first** (Complete guide with all details)
- **`SANDBOX_TECHNICAL_SUMMARY.md`** ← Technical details of what was fixed
- **`setup-sandbox.sh`** ← Bash alternative to PowerShell script
- **`sandbox-fix.ps1`** ← Windows PowerShell automation script

---

## 🎯 Files Changed

1. **`worker/Dockerfile`** - Fixed Prisma generation
2. **`backend/Dockerfile`** - Fixed Prisma generation  
3. **`worker/src/utils/dockerSandbox.js`** - Complete rewrite with proper error handling
4. **`docker-compose.yml`** - Fixed HOST_PROJECT_PATH default

---

## 🧪 Test Your Sandbox

**After running the fix commands above:**

1. Go to http://localhost
2. Login to your account
3. Select any problem
4. Paste test code:
   ```python
   print("Hello World!")
   ```
5. Click "Run Code"
6. **You should see:**
   - ✅ Output showing "Hello World!"
   - ✅ Status "Accepted" or "Wrong Answer" (not "INTERNAL_ERROR")
   - ✅ No timeout or generic errors

---

## 🆘 Quick Troubleshooting

**"Docker is not available"**
```bash
docker ps  # Check Docker is running
# If fails, start Docker Desktop
```

**"Sandbox images not found"**
```bash
cd executor && docker build -t minileetcode-runner-python:latest -f Dockerfile.python .
# Repeat for node, cpp, java
```

**"Worker still shows Prisma errors"**
```bash
docker-compose build --no-cache worker
docker-compose restart worker
docker-compose logs worker | head -50
```

**"Still stuck?"**
```bash
# Full reset:
docker-compose down -v
docker system prune -a
.\sandbox-fix.ps1
```

---

## ⚡ Key Improvements

✅ Prisma client generation now validated  
✅ Docker availability checked before execution  
✅ Sandbox images validated before running  
✅ Windows Docker Desktop path support  
✅ Comprehensive error logging with execution IDs  
✅ Proper temporary file cleanup  
✅ Better error messages to users  
✅ Cross-platform compatibility  

---

**Next Step:** Run `.\sandbox-fix.ps1` or follow the manual steps above 👆
