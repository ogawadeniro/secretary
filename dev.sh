#!/bin/bash
# 開発サーバー起動スクリプト
# Spring Boot（API） + Vite（フロントエンド）を同時に起動
# 使い方: bash dev.sh
set -euo pipefail

JAR="target/secretary-0.0.1-SNAPSHOT.jar"
SPRING_PID=""
VITE_PID=""

cleanup() {
    echo ""
    echo "Shutting down..."
    [ -n "$SPRING_PID" ] && kill "$SPRING_PID" 2>/dev/null
    [ -n "$VITE_PID" ] && kill "$VITE_PID" 2>/dev/null
    wait 2>/dev/null
    echo "Done."
}

trap cleanup EXIT INT TERM

# JAR がなければビルド
if [ ! -f "$JAR" ]; then
    echo "JAR not found. Building..."
    bash build.sh
fi

# ポートチェック
if lsof -i :8080 > /dev/null 2>&1; then
    echo "Error: Port 8080 already in use."
    exit 1
fi
if lsof -i :5173 > /dev/null 2>&1; then
    echo "Error: Port 5173 already in use."
    exit 1
fi

# Spring Boot をバックグラウンド起動
echo "Starting Spring Boot..."
SPRING_PROFILES_ACTIVE=develop java -jar "$JAR" > /tmp/spring-dev.log 2>&1 &
SPRING_PID=$!

# Vite をバックグラウンド起動
echo "Starting Vite dev server..."
cd frontend
npm run dev > /tmp/vite-dev.log 2>&1 &
VITE_PID=$!
cd ..

echo ""
echo "================================"
echo "  Spring Boot: http://localhost:8080  (PID: ${SPRING_PID})"
echo "  Vite:        http://localhost:5173  (PID: ${VITE_PID})"
echo "================================"
echo "  Press Ctrl+C to stop all servers"
echo "================================"
echo ""

# 両方のプロセスを待機
wait
