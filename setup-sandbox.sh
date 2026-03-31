#!/bin/bash

# Setup script for building executor sandbox images
# Run this before starting docker-compose

echo "================================================"
echo "Building Sandbox Executor Images"
echo "================================================"

cd executor || exit 1

echo "Building Python Runner..."
docker build -t minileetcode-runner-python:latest -f Dockerfile.python . || exit 1

echo "Building JavaScript Runner..."
docker build -t minileetcode-runner-node:latest -f Dockerfile.node . || exit 1

echo "Building C++ Runner..."
docker build -t minileetcode-runner-gcc:latest -f Dockerfile.cpp . || exit 1

echo "Building Java Runner..."
docker build -t minileetcode-runner-java:latest -f Dockerfile.java . || exit 1

echo "================================================"
echo "✅ All sandbox executor images built successfully!"
echo "================================================"
echo ""
echo "Next steps:"
echo "1. Make sure your .env file is set up with DATABASE_URL and other required vars"
echo "2. Run: docker-compose up -d"
echo "3. Initialize the database: docker-compose exec backend npx prisma migrate deploy"
echo "4. Test a code submission from the frontend"
