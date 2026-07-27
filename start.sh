#!/usr/bin/env bash
trap 'kill $(jobs -p) 2>/dev/null' SIGINT SIGTERM

echo "Starting Sell-It backend on http://localhost:3001"
cd "$(dirname "$0")"
node backend/src/seed.js >/dev/null
node backend/src/server.js &
BACKEND_PID=$!

echo "Starting Sell-It frontend on http://localhost:8081"
cd frontend && npx expo start --web --port 8081 &
FRONTEND_PID=$!

wait $BACKEND_PID $FRONTEND_PID
