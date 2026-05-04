#!/bin/bash
cd "$(dirname "$0")"
PORT=5173
# 既に占有中のプロセスを終了してから起動
PID=$(lsof -i :$PORT -sTCP:LISTEN -t 2>/dev/null)
if [ -n "$PID" ]; then
  kill "$PID" 2>/dev/null
  sleep 1
fi
npm run dev -- --port $PORT &
sleep 2
open http://localhost:$PORT
