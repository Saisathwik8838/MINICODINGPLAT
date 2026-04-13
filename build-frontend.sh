#!/bin/bash
echo "📦 Building frontend..."
cd frontend
npm install
npm run build
if [ ! -d "dist" ]; then
  echo "❌ Frontend build failed!"
  exit 1
fi
cd ..
rm -rf backend/public
cp -r frontend/dist backend/public
echo "✅ Frontend built successfully"
