#!/bin/bash
cd "$(dirname "$0")"
PORT=5173
# 既に起動中なら再起動しない
if ! lsof -i :$PORT -sTCP:LISTEN -t > /dev/null 2>&1; then
  npm run dev -- --port $PORT &
  sleep 2
fi
open http://localhost:$PORT
