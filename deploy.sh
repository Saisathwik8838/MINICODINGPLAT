#!/bin/bash
set -e

echo "Navigating to /opt/MINICODINGPLAT..."
cd /opt/MINICODINGPLAT

echo "Creating .env file..."
cat > .env << 'EOF'
NODE_ENV=production
PORT=5000
JWT_SECRET=4V4F+mN3jI/R+e8k8A9W4b7K0U9q9Xw2h4r3L4M5n6o=
REFRESH_TOKEN_SECRET=2n5K8a9W4b7K0U9q9Xw2h4r3L4M5n6o4V4F+mN3jI/R=
JWT_EXPIRE=7d
REFRESH_TOKEN_EXPIRE=30d
POSTGRES_PASSWORD=StrongAzurePassword2026
DATABASE_URL=postgresql://postgres:StrongAzurePassword2026@postgres:5432/minileetcode?schema=public
FRONTEND_URL=http://40.81.243.115
MAX_CODE_SIZE_KB=100
CLEANUP_ENABLED=true
AUTO_BUILD_SANDBOX_IMAGES=true
SANDBOX_ASSETS_DIR=/usr/src/app/executor
EOF

echo "Pulling latest code changes locally so it's fully synced before Github Actions takes over or to force changes immediately..."
sudo git pull origin main || true

echo "Building executor images..."
cd executor
sudo docker build -t minileetcode-runner-python:latest -f Dockerfile.python .
sudo docker build -t minileetcode-runner-node:latest -f Dockerfile.node .
sudo docker build -t minileetcode-runner-gcc:latest -f Dockerfile.cpp .
sudo docker build -t minileetcode-runner-java:latest -f Dockerfile.java .
cd ..

echo "Copying latest built frontend to public..."
cd frontend
sudo npm install
sudo npm run build
cd ..
sudo rm -rf backend/public
sudo cp -r frontend/dist backend/public

echo "Rebuilding and restarting services..."
sudo docker-compose down
sudo docker-compose build --no-cache backend
sudo docker-compose up -d

echo "Waiting for PostgreSQL to be completely up..."
sleep 20

echo "Running prisma migrations & seeds..."
sudo docker exec minileetcode-backend npx prisma migrate deploy
sudo docker exec minileetcode-backend npm run db:seed || true

echo "Checking health..."
sudo docker-compose ps
curl http://localhost/api/v1/health || true
echo "Setup completely executed!"
