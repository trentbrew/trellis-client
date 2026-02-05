#!/bin/bash

# Quick test script for auth bypass feature
# This script starts the dev server and opens a browser with auth bypass enabled

echo "🧪 Testing Auth Bypass Feature"
echo ""

# Get port from JSON-LD graph
CONFIG_FILE="app/config/app-config.jsonld"
PORT=$(jq -r '.["@graph"][] | select(.["@type"] == "app:Application") | .devPort // 4141' "$CONFIG_FILE")

# Check if dev server is already running
if curl -s "http://localhost:$PORT" > /dev/null 2>&1; then
  echo "✅ Dev server is already running on port $PORT"
else
  echo "🚀 Starting dev server..."
  npm run dev > /dev/null 2>&1 &
  DEV_PID=$!
  echo "   Waiting for server to start..."
  sleep 5

  # Check if server started successfully
  if ! curl -s "http://localhost:$PORT" > /dev/null 2>&1; then
    echo "❌ Failed to start dev server"
    kill $DEV_PID 2>/dev/null
    exit 1
  fi
  echo "✅ Dev server started (PID: $DEV_PID)"
fi

echo ""
echo "📋 Test URLs:"
echo ""
echo "1. Collections page (protected route):"
echo "   http://localhost:$PORT/collections?testAuthBypass=true"
echo ""
echo "2. Home page:"
echo "   http://localhost:$PORT/?testAuthBypass=true"
echo ""
echo "3. Any protected route:"
echo "   http://localhost:$PORT/[route]?testAuthBypass=true"
echo ""
echo "🔍 What to check:"
echo "   - Page should load without redirecting to /auth/login"
echo "   - Browser console should show: '⚠️ TEST BYPASS ENABLED'"
echo "   - URL should contain 'testAuthBypass=true'"
echo ""
echo "🌐 Opening browser..."
echo ""

# Try to open browser (works on macOS, Linux, Windows)
if command -v open > /dev/null; then
  open "http://localhost:$PORT/collections?testAuthBypass=true"
elif command -v xdg-open > /dev/null; then
  xdg-open "http://localhost:$PORT/collections?testAuthBypass=true"
elif command -v start > /dev/null; then
  start "http://localhost:$PORT/collections?testAuthBypass=true"
else
  echo "   Please open the URL manually in your browser"
fi

echo ""
echo "✅ Test setup complete!"
echo "   Press Ctrl+C to stop the dev server when done"
