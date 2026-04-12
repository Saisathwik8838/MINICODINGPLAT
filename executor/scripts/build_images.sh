#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
EXECUTOR_DIR="$(dirname "$SCRIPT_DIR")"

cd "$EXECUTOR_DIR"

echo "Building executor images..."

docker build -t minileetcode-runner-python:latest -f Dockerfile.python .
echo "✓ Python runner built"

docker build -t minileetcode-runner-node:latest -f Dockerfile.node .
echo "✓ Node.js runner built"

docker build -t minileetcode-runner-gcc:latest -f Dockerfile.cpp .
echo "✓ C++ runner built"

docker build -t minileetcode-runner-java:latest -f Dockerfile.java .
echo "✓ Java runner built"

echo ""
docker images --filter "reference=minileetcode-runner-*" --format "  {{.Repository}}:{{.Tag}}"
