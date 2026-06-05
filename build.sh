#!/bin/bash
set -euo pipefail

echo "=== Building Frontend (React) ==="
cd frontend
npm ci
npm run build
cd ..

echo "=== Copying Frontend to Static Resources ==="
rm -rf src/main/resources/static
cp -r frontend/dist src/main/resources/static

echo "=== Building Backend (Spring Boot) ==="
mvn clean package -DskipTests -q

echo "=== Done ==="
echo "JAR: target/secretary-0.0.1-SNAPSHOT.jar"
