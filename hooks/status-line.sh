#!/bin/bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Fast 1-hop check if parent agy process has dangerously-skip-permissions flag
if [ -z "$AGY_SKIP_PERMISSIONS" ]; then
  if ps -o args= -p $PPID 2>/dev/null | grep -E -q '(^|[[:space:]])--dangerously-skip-permissions([[:space:]]|$)'; then
    export AGY_SKIP_PERMISSIONS="true"
  fi
fi

exec node "$DIR/../dist/index.js"
