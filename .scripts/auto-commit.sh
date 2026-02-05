#!/bin/bash

# Auto-commit script for Toolkit UI
# Interval in seconds (default 60)
INTERVAL=${1:-60}

echo "🚀 Starting auto-commit watcher (interval: ${INTERVAL}s)..."
echo "Press Ctrl+C to stop."

while true; do
  # Check if there are changes
  if [[ -n $(git status -s) ]]; then
    # Stage all changes
    git add .
    
    # Commit with timestamp
    TIMESTAMP=$(date "+%Y-%m-%d %H:%M:%S")
    git commit -m "chore(auto): backup at ${TIMESTAMP} [skip ci]" --no-verify
    
    echo "✅ Auto-committed changes at ${TIMESTAMP}"
  fi
  
  sleep $INTERVAL
done
