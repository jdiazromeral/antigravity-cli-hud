#!/bin/bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Walk up the process tree to safely find if THIS specific agy instance has the flag
CURRENT_PID=$PPID
while [ "$CURRENT_PID" -gt 1 ]; do
  ARGS=$(ps -o args= -p "$CURRENT_PID" 2>/dev/null)
  if echo "$ARGS" | grep -q "dangerously-skip-permissions"; then
    export AGY_SKIP_PERMISSIONS="true"
    break
  fi
  # Get parent PID
  CURRENT_PID=$(ps -o ppid= -p "$CURRENT_PID" 2>/dev/null | tr -d ' ')
  if [ -z "$CURRENT_PID" ]; then break; fi
done

cat | node "$DIR/../dist/index.js"
