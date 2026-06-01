#!/bin/bash
# Script to run both backend and frontend concurrently in the quant-btc-valuation-system

# Ensure we are in the script's directory
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
cd "$DIR"

# Define DB Path
export DB_PATH="$DIR/database/metrics.db"
export PORT=3000

echo "=== STARTING QUANT BTC VALUATION SYSTEM ==="
echo "Database Path: $DB_PATH"
echo "Backend running on port: $PORT"
echo "Frontend running on port: 5173"
echo "==========================================="

# Function to clean up background processes on exit
cleanup() {
  echo "Stopping services..."
  kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
  exit
}
trap cleanup SIGINT SIGTERM EXIT

# Start backend
cd "$DIR/backend"
bun index.ts &
BACKEND_PID=$!

# Start frontend
cd "$DIR/frontend"
bun run dev &
FRONTEND_PID=$!

# Keep script running
wait
