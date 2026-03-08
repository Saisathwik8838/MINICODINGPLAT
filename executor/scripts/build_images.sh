#!/bin/bash

# Build script to generate the isolated execution images

echo "Building Python Runner..."
docker build -t minileetcode-runner-python -f Dockerfile.python .

echo "Building JavaScript Runner..."
docker build -t minileetcode-runner-node -f Dockerfile.node .

echo "Building C++ Runner..."
docker build -t minileetcode-runner-gcc -f Dockerfile.cpp .

echo "Building Java Runner..."
docker build -t minileetcode-runner-java -f Dockerfile.java .

echo "All runner images built successfully."
