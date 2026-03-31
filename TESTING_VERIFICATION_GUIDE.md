# 🧪 SANDBOX FIX - VERIFICATION TESTING GUIDE

## **STEP 1: Verify Services Are Running**

```powershell
# Check all containers
docker-compose ps

# Expected output: All 9 containers should show "Up" status
```

## **STEP 2: Test via Web UI**

Navigate to: **http://127.0.0.1**

### Test Case 1: Symmetric Tree Problem
1. Login to your account
2. Find the "Symmetric Tree" problem
3. Submit this code:
   ```python
   import sys
   from collections import deque

   class TreeNode:
       def __init__(self, val=0):
           self.val = val
           self.left = None
           self.right = None

   def isMirror(t1, t2):
       if not t1 and not t2:
           return True
       if not t1 or not t2:
           return False
       if t1.val != t2.val:
           return False
       return isMirror(t1.left, t2.right) and isMirror(t1.right, t2.left)

   def isSymmetric(root):
       if root is None:
           return True
       return isMirror(root.left, root.right)

   # Read input
   n = int(sys.stdin.readline().strip())
   
   # Build tree from level-order input
   if n == 0:
       print('True')
   else:
       values = list(map(lambda x: int(x) if x != 'null' else None, sys.stdin.readline().strip().split()))
       nodes = [TreeNode(val) if val is not None else None for val in values]
       
       for i in range(n):
           if nodes[i]:
               left_idx = 2 * i + 1
               right_idx = 2 * i + 2
               if left_idx < len(nodes):
                   nodes[i].left = nodes[left_idx]
               if right_idx < len(nodes):
                   nodes[i].right = nodes[right_idx]
       
       root = nodes[0] if nodes else None
       print('true' if isSymmetric(root) else 'false')
   ```

4. **Expected Result:** ✅ Should show "Accepted" or correct output, NOT "Runtime Error"

### Test Case 2: Simple Two Sum (JavaScript)
```javascript
function twoSum(nums, target) {
    const map = new Map();
    for (let i = 0; i < nums.length; i++) {
        const complement = target - nums[i];
        if (map.has(complement)) {
            return [map.get(complement), i];
        }
        map.set(nums[i], i);
    }
    return [];
}

const nums = [2, 7, 11, 15];
const target = 9;
console.log(twoSum(nums, target));
```

4. **Expected Result:** ✅ Should output `[0, 1]` correctly

---

## **STEP 3: Manual Verification**

After submitting code, check that temp files were created:

```powershell
# List temp files on host
Get-ChildItem -Path "C:\Users\saisa\OneDrive\Desktop\MiniCodingPlat\tmp" -Recurse

# You should see NEW directories like:
# tmp\
#   ├─ test-uuid\         (old)
#   └─ <new-uuid>\        (NEW - just created!)
#       ├─ input.txt
#       ├─ solution.py (or .js, etc)
#       └─ output.txt (after execution)
```

## **STEP 4: Check Container Logs**

After submission, check worker logs:

```powershell
# Watch worker logs in real-time
docker-compose logs -f worker --tail 20

# Look for:
# ✅ "submission.*received"
# ✅ "executing.*Python|JavaScript|C++"
# ✅ "execution completed"
# ✅ "status: ACCEPTED" or "status: WRONG_ANSWER" (NOT "RUNTIME_ERROR")

# If you see RUNTIME_ERROR, look for:
# ❌ "ENOENT: no such file"
# ❌ "permission denied"
# ❌ "command not found"
```

## **STEP 5: Direct Container Test**

Test Python execution directly in the sandbox:

```powershell
# Create test files
mkdir c:\Users\saisa\OneDrive\Desktop\MiniCodingPlat\tmp\manual-test
Write-Host "print('Hello from Python')" | Out-File -FilePath "c:\Users\saisa\OneDrive\Desktop\MiniCodingPlat\tmp\manual-test\test.py" -Encoding ASCII
Write-Host "5" | Out-File -FilePath "c:\Users\saisa\OneDrive\Desktop\MiniCodingPlat\tmp\manual-test\input.txt" -Encoding ASCII

# Run Python in sandbox via docker
docker-compose exec -T worker python3 /sandbox/test.py

# Expected: "Hello from Python"
```

## **STEP 6: Container Filesystem Check**

Verify volume mount path is correct:

```powershell
# From host
docker exec minileetcode-worker sh -c "ls -la /usr/src/app/tmp && echo '---' && ls -la /sandbox 2>&1 || echo 'sandbox doesnt exist yet'"

# Expected:
# - /usr/src/app/tmp should show test-uuid and any other directories
# - /sandbox might not exist (created only during execution)
```

---

## **TROUBLESHOOTING**

### ❌ **Still Getting "Runtime Error"**

1. Check worker logs:
   ```powershell
   docker-compose logs worker | Select-String "error|Error|RUNTIME"
   ```

2. Check if path conversion is working:
   ```powershell
   docker exec minileetcode-worker node -e "
   const path = require('path');
   const hostPath = '/usr/src/app';
   const final = hostPath.replace(/\\\\$/, '');
   console.log('Host path:', final);
   "
   ```

3. Manually test path conversion on Windows:
   ```powershell
   # This is what should happen:
   # C:\Users\... → /c/Users/...
   # NOT /mnt/c/Users/...
   
   $windowsPath = "C:\Users\saisa\test"
   $dockerPath = $windowsPath.Replace("\", "/").Replace("C:", "/c")
   Write-Host $dockerPath
   # Output: /c/Users/saisa/test
   ```

### ❌ **"docker: not found" Error**

Worker can't access Docker daemon:
```powershell
# Make sure docker socket is mounted
docker-compose inspect worker | Select-String "docker.sock"

# Restart worker
docker-compose restart worker
```

### ❌ **"No such file" Errors**

1. Temp directory not created:
   ```powershell
   # Check if directory exists on host
   Test-Path "C:\Users\saisa\OneDrive\Desktop\MiniCodingPlat\tmp"
   
   # Check if writable
   $testFile = "C:\Users\saisa\OneDrive\Desktop\MiniCodingPlat\tmp\test-write.txt"
   "test" | Out-File $testFile
   Remove-Item $testFile
   ```

2. Volume mount not working:
   ```powershell
   # Recreate volume mount
   docker-compose down
   docker-compose up -d
   docker exec minileetcode-worker ls -la /usr/src/app/tmp
   ```

### ✅ **All Tests Pass?**

If submission shows output without "Runtime Error", you can celebrate! The sandbox is now fixed! 🎉

---

## **EXPECTED RESULTS**

### ✅ **Working (After Fix)**
- Code submits without error
- Execution completes in <10s
- Shows "Accepted" or correct test output
- Temp files created in `./tmp/` directory
- Worker logs show successful execution
- No "RUNTIME_ERROR" status

### ❌ **Not Working (Before Fix)**
- "Runtime error" message
- Execution timeout
- No temp files created
- Worker logs show path errors
- Docker volume mount fails

---

## **KEY FILES TO MONITOR**

```
Backend Logs:        docker-compose logs backend
Worker Logs:         docker-compose logs worker  
Temp Files on Host:  C:\Users\saisa\OneDrive\Desktop\MiniCodingPlat\tmp\
Docker Inspect:      docker inspect minileetcode-worker
```

---

## **FINAL CHECKLIST**

Before declaring the fix complete:

- [ ] Website loads at http://127.0.0.1
- [ ] Can login to account
- [ ] Submit code without error
- [ ] Code executes (shows output or test result)
- [ ] NO "Runtime Error" message
- [ ] Temp files visible in ./tmp/ directory
- [ ] Worker logs show "execution completed"
- [ ] Multiple languages work (Python, JavaScript, etc)

**Once all pass → Sandbox is fully fixed!** ✅
