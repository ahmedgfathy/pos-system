#!/usr/bin/env bash
trap 'kill $(jobs -p) 2>/dev/null' SIGINT SIGTERM

echo "Starting Sell-It backend on http://localhost:3001"
cd "$(dirname "$0")"
node backend/src/server.js &
BACKEND_PID=$!

echo "Starting Sell-It Expo server on http://localhost:8081"
echo "Scan the QR code with Expo Go while your phone is on the same Wi-Fi."
cd frontend && REACT_NATIVE_PACKAGER_HOSTNAME="${EXPO_LAN_HOST:-192.168.1.9}" npx expo start --lan --port 8081 &
FRONTEND_PID=$!

wait $BACKEND_PID $FRONTEND_PID
