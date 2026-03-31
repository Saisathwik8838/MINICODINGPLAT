#!/usr/bin/env pwsh
# Complete Sandbox Fix Script for Windows PowerShell
# Run this script to automatically fix all sandbox issues

param(
    [switch]$SkipImages = $false,
    [switch]$SkipRecreate = $false,
    [switch]$SkipTest = $false
)

$ErrorActionPreference = "Stop"
$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path

function Write-Header {
    param([string]$Message)
    Write-Host "`n╔════════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "║ $Message" -ForegroundColor Cyan
    Write-Host "╚════════════════════════════════════════════════╝" -ForegroundColor Cyan
}

function Write-Success {
    param([string]$Message)
    Write-Host "✅ $Message" -ForegroundColor Green
}

function Write-Error-Custom {
    param([string]$Message)
    Write-Host "❌ $Message" -ForegroundColor Red
}

function Write-Info {
    param([string]$Message)
    Write-Host "ℹ️  $Message" -ForegroundColor Blue
}

function Test-Docker {
    try {
        $result = docker --version 2>&1
        return $LASTEXITCODE -eq 0
    } catch {
        return $false
    }
}

function Build-ExecutorImage {
    param(
        [string]$DockerfileName,
        [string]$ImageName
    )
    
    Write-Info "Building $ImageName from $DockerfileName..."
    
    $dockerfile = Join-Path $scriptRoot "executor" $DockerfileName
    if (!(Test-Path $dockerfile)) {
        Write-Error-Custom "Dockerfile not found: $dockerfile"
        return $false
    }
    
    try {
        docker build -t $ImageName -f $dockerfile (Join-Path $scriptRoot "executor")
        if ($LASTEXITCODE -eq 0) {
            Write-Success "$ImageName built successfully"
            return $true
        } else {
            Write-Error-Custom "Failed to build $ImageName"
            return $false
        }
    } catch {
        Write-Error-Custom "Error building $ImageName : $_"
        return $false
    }
}

# ============================================
# BEGIN MAIN SCRIPT
# ============================================

Clear-Host
Write-Header "MiniCodingPlat - Complete Sandbox Fix"

# Step 0: Verify Docker
Write-Info "Checking Docker availability..."
if (!(Test-Docker)) {
    Write-Error-Custom "Docker is not running or not installed!"
    Write-Error-Custom "Please start Docker Desktop or install Docker."
    exit 1
}
Write-Success "Docker is available"

# Step 1: Check .env
Write-Header "STEP 1: Verify Configuration"
$envFile = Join-Path $scriptRoot ".env"
if (!(Test-Path $envFile)) {
    Write-Error-Custom ".env file not found at $envFile"
    Write-Error-Custom "Please create .env file with required variables"
    exit 1
}
Write-Success ".env file exists"

# Step 2: Build Executor Images
if (!$SkipImages) {
    Write-Header "STEP 2: Build Sandbox Executor Images"
    
    $imagesToBuild = @(
        @{ Dockerfile = "Dockerfile.python"; ImageName = "minileetcode-runner-python:latest" },
        @{ Dockerfile = "Dockerfile.node"; ImageName = "minileetcode-runner-node:latest" },
        @{ Dockerfile = "Dockerfile.cpp"; ImageName = "minileetcode-runner-gcc:latest" },
        @{ Dockerfile = "Dockerfile.java"; ImageName = "minileetcode-runner-java:latest" }
    )
    
    $allBuilt = $true
    foreach ($image in $imagesToBuild) {
        if (!(Build-ExecutorImage -DockerfileName $image.Dockerfile -ImageName $image.ImageName)) {
            $allBuilt = $false
        }
    }
    
    if (!$allBuilt) {
        Write-Error-Custom "Some images failed to build"
        exit 1
    }
    Write-Success "All executor images built"
} else {
    Write-Info "Skipping executor image builds (--SkipImages)"
}

# Step 3: Stop and clean containers
Write-Header "STEP 3: Prepare Docker Compose"

Write-Info "Stopping running containers..."
docker-compose down
if ($LASTEXITCODE -ne 0) {
    Write-Error-Custom "Failed to stop containers"
}

# Step 4: Build services
Write-Header "STEP 4: Build Services"

Write-Info "Building Docker Compose services (this may take 5-15 minutes)..."
docker-compose build --no-cache

if ($LASTEXITCODE -ne 0) {
    Write-Error-Custom "docker-compose build failed"
    exit 1
}
Write-Success "Services built successfully"

# Step 5: Start services
Write-Header "STEP 5: Start Services"

Write-Info "Starting services..."
docker-compose up -d

if ($LASTEXITCODE -ne 0) {
    Write-Error-Custom "docker-compose up failed"
    exit 1
}

Write-Info "Waiting for services to be healthy (60 seconds)..."
Start-Sleep -Seconds 60

# Verify services are running
$psOutput = docker-compose ps
Write-Info "`nService Status:"
Write-Host $psOutput -ForegroundColor Gray

Write-Success "Services started"

# Step 6: Initialize database
Write-Header "STEP 6: Initialize Database"

Write-Info "Running database migrations..."
docker-compose exec -T backend npx prisma migrate deploy

if ($LASTEXITCODE -ne 0) {
    Write-Error-Custom "Database migrations failed"
} else {
    Write-Success "Database initialized"
}

# Step 7: Verify worker
Write-Header "STEP 7: Verify Worker"

Write-Info "Checking worker logs..."
$workerLogs = docker-compose logs worker | Select-String "🚀|listening|error|Error|ERROR" | Select-Object -First 20
Write-Host $workerLogs -ForegroundColor Gray

if ($workerLogs | Select-String "🚀|listening") {
    Write-Success "Worker appears to be running correctly"
} else {
    Write-Error-Custom "Worker may not have started properly"
    Write-Info "Check logs with: docker-compose logs worker"
}

# Step 8: Test Sandbox
if (!$SkipTest) {
    Write-Header "STEP 8: Test Sandbox"
    
    Write-Info "Testing Docker images..."
    $testPassed = $true
    
    try {
        $pythonTest = docker run --rm minileetcode-runner-python:latest python3 -c "print('test')" 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Python image test passed"
        } else {
            Write-Error-Custom "Python image test failed"
            $testPassed = $false
        }
    } catch {
        Write-Error-Custom "Python image test error: $_"
        $testPassed = $false
    }
    
    if ($testPassed) {
        Write-Success "Sandbox images are working"
    }
} else {
    Write-Info "Skipping sandbox tests (--SkipTest)"
}

# Final Summary
Write-Header "✅ SETUP COMPLETE!"

Write-Host @"
╔════════════════════════════════════════════════╗
║  Your sandbox is now ready to use!             ║
╚════════════════════════════════════════════════╝

📍 Access Your Application:
   │
   ├─ Frontend:    http://localhost
   ├─ Backend API: http://localhost:5000
   ├─ Grafana:     http://localhost:3000 (admin/admin)
   ├─ Prometheus:  http://localhost:9090

🔍 Monitor Execution:
   │
   ├─ Worker logs:   docker-compose logs -f worker
   ├─ Backend logs:  docker-compose logs -f backend
   ├─ All logs:      docker-compose logs -f

🐛 Troubleshoot:
   │
   ├─ Verify images: docker images | findstr minileetcode-runner
   ├─ Check services: docker-compose ps
   ├─ Rebuild images: .\sandbox-fix.ps1 -SkipRecreate
   ├─ Full reset: docker-compose down && docker system prune

📚 Documentation:
   └─ See COMPLETE_SANDBOX_FIX.md for detailed information

@ -ForegroundColor Cyan

Write-Host "`nNext step: Go to http://localhost and test submitting code!`n" -ForegroundColor Green
