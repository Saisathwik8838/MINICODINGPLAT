# 🔧 SITE CAN'T BE REACHED - TROUBLESHOOTING GUIDE

**Good news: All services ARE running and responding correctly!** ✅

The issue is likely with your browser or how you're accessing the site. Follow this guide to fix it.

---

## ✅ VERIFICATION - Services ARE Working

All services have been tested and are responding:

```
✅ Frontend:    http://127.0.0.1        (200 OK)
✅ Backend API: http://127.0.0.1:5000   (200 OK)
✅ Grafana:     http://127.0.0.1:3000   (200 OK)
✅ Prometheus:  http://127.0.0.1:9090   (200 OK)
```

---

## 🔍 COMMON CAUSES & FIXES

### **Issue 1: Browser Localhost Resolution**

**Problem:** Browser can't resolve "localhost" or "127.0.0.1"

**Fix:**

**Option A: Use 127.0.0.1 Instead of localhost**
```
Instead of:  http://localhost
Try:         http://127.0.0.1
```

**Option B: Check Windows Hosts File**
```
Open:        C:\Windows\System32\drivers\etc\hosts
Look for:    127.0.0.1    localhost
If missing, add this line:
             127.0.0.1    localhost
```

---

### **Issue 2: Browser Cache**

**Chrome/Chromium:**
1. Open DevTools (F12)
2. Right-click refresh button
3. Select "Empty cache and hard refresh"

**Firefox:**
1. Press Ctrl+Shift+Delete
2. Select "Cache" → "Clear Now"

**Edge:**
1. Press Ctrl+Shift+Delete
2. Check "Cookies and other site data" and "Cached images and files"
3. Click "Clear now"

---

### **Issue 3: Browser Extensions Blocking Content**

Try accessing with extensions disabled:

**Chrome:**
1. Press Ctrl+Shift+M (Incognito Mode)
2. Try http://127.0.0.1

**Firefox:**
1. Press Ctrl+Shift+P (Private Window)
2. Try http://127.0.0.1

---

### **Issue 4: Network/Firewall Issues**

**Windows Defender Firewall might be blocking Docker ports**

```
Allow Docker in Windows Firewall:
1. Open "Windows Defender Firewall"
2. Click "Allow an app through firewall"
3. Find and check "Docker Desktop"
4. Click "OK"
```

**Or test with PowerShell:**
```powershell
# Check if port 80 is listening
netstat -ano | findstr :80

# Should show listening on 0.0.0.0:80
```

---

### **Issue 5: Docker Network Issues**

**Restart Docker:**
```bash
docker-compose down
docker-compose up -d
docker-compose ps  # Wait 30 seconds, then run this again
```

**Force restart Docker Desktop** (if using Docker Desktop):
1. Right-click Docker icon in system tray
2. Click "Quit Docker Desktop"
3. Wait 10 seconds
4. Re-open Docker Desktop
5. Wait for "Docker is running" message
6. Try accessing the URL again

---

## 🧪 TEST PROCEDURES

### **Test 1: Check Ports Open**
```powershell
# Test each port
curl.exe http://127.0.0.1        # Frontend
curl.exe http://127.0.0.1:5000   # Backend
curl.exe http://127.0.0.1:3000   # Grafana
curl.exe http://127.0.0.1:9090   # Prometheus
```

If any fail, check the container status:
```bash
docker-compose ps
```

---

### **Test 2: Check Docker Containers**
```bash
# Ensure all containers are running
docker-compose ps

# Should show all 9 containers as "Up"
# If any show "Exited" restart:
docker-compose restart <container-name>
```

---

### **Test 3: Direct Container Access**
```bash
# Access frontend from inside Docker network
docker exec minileetcode-gateway curl -s http://frontend | head

# Access backend from inside Docker network
docker exec minileetcode-gateway curl -s http://backend:5000/api/v1/health
```

Both should return responses.

---

## 📱 CORRECT URLS

### **For Local Access (Computer Running Docker):**
```
Frontend:    http://127.0.0.1               or  http://localhost
Backend API: http://127.0.0.1:5000          or  http://localhost:5000
Grafana:     http://127.0.0.1:3000          or  http://localhost:3000
Prometheus:  http://127.0.0.1:9090          or  http://localhost:9090
```

### **For Remote Access (Different Computer):**
Replace 127.0.0.1 with your machine's IP address:
```
Frontend:    http://<YOUR-IP>
Backend API: http://<YOUR-IP>:5000
Grafana:     http://<YOUR-IP>:3000
Prometheus:  http://<YOUR-IP>:9090

Example: http://192.168.1.100
```

To find your IP:
```powershell
ipconfig
# Look for "IPv4 Address" under your network adapter
```

---

## 🆘 STEP-BY-STEP RECOVERY

If nothing works:

### **Step 1: Stop Everything**
```bash
docker-compose down
```

### **Step 2: Verify Docker is Running**
```bash
docker ps
# Should list containers or show "CONTAINER ID IMAGE COMMAND..."
```

### **Step 3: Start Services**
```bash
docker-compose up -d
```

### **Step 4: Wait 30 Seconds**
```bash
timeout 30
```

### **Step 5: Verify Services**
```bash
docker-compose ps
# All containers should show "Up"
```

### **Step 6: Test**
```bash
curl.exe http://127.0.0.1
```

### **Step 7: Try in Browser**
Open fresh browser tab and try:
```
http://127.0.0.1
```

---

## 🔎 DETAILED DIAGNOSTICS

### **Check All Ports Are Listening**
```bash
docker-compose ps
# Look at PORTS column
# Should show:
# - 0.0.0.0:80->80/tcp (Frontend)
# - 0.0.0.0:5000->5000/tcp (Backend)
# - 0.0.0.0:3000->3000/tcp (Grafana)
# - 0.0.0.0:9090->9090/tcp (Prometheus)
```

### **Check Container Logs for Errors**
```bash
# Frontend logs
docker logs minileetcode-frontend | tail -20

# Backend logs
docker logs minileetcode-backend | tail -20

# Nginx logs
docker logs minileetcode-gateway | tail -20

# Worker logs
docker logs minileetcode-worker | tail -20
```

### **Check Service Response**
```bash
# Frontend
curl.exe -v http://127.0.0.1 2>&1 | findstr "Connected\|200\|404"

# Backend
curl.exe -v http://127.0.0.1:5000/api/v1/health 2>&1 | findstr "Connected\|200"
```

---

## ✅ QUICK CHECKLIST

Before troubleshooting, verify:

- [ ] Docker Desktop is running
- [ ] All containers show "Up" in `docker-compose ps`
- [ ] Using correct URL format (http://, not https://)
- [ ] Using correct IP (127.0.0.1 for local access)
- [ ] Browser cache cleared
- [ ] Browser extensions disabled (if still not working)
- [ ] Windows Firewall allows Docker
- [ ] Port 80/5000/3000 not in use by other applications

---

## 💡 BROWSER TIPS

### **Chrome/Chromium:**
```
Address Bar: http://127.0.0.1
Press Enter
If still can't reach: Ctrl+Shift+M (Incognito)
```

### **Firefox:**
```
Address Bar: http://127.0.0.1
Press Enter
If still can't reach: Ctrl+Shift+P (Private Window)
```

### **Edge:**
```
Address Bar: http://127.0.0.1
Press Enter
If still can't reach: Ctrl+Shift+N (InPrivate)
```

---

## 🎯 FINAL TEST

Once you fix the issue, you should see:

1. ✅ MiniLeetCode login page loads
2. ✅ Login with your credentials works
3. ✅ Dashboard displays without errors
4. ✅ Can select a problem
5. ✅ Can submit code and see results

If you get to step 5 **without "sandbox running" error**, the sandbox fix worked! 🚀

---

## 🆘 Still Not Working?

Run this diagnostic:
```bash
# Generate diagnostic info
docker-compose ps > diagnostic.txt
docker images >> diagnostic.txt
docker logs minileetcode-backend >> diagnostic.txt
docker logs minileetcode-worker >> diagnostic.txt
netstat -ano | findstr :80 >> diagnostic.txt
```

Then share the output for more specific help.
