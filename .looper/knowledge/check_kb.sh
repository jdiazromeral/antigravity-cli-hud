#!/usr/bin/env bash
set -e

KB_DIR="$(dirname "$0")"
ROOT_DIR="$KB_DIR/../.."
cd "$ROOT_DIR"

echo "Checking knowledge base..."

# 1. Coverage
for f in "$KB_DIR/README.md" "$KB_DIR/MAP.md" "$KB_DIR/glossary.md" "$KB_DIR/parser.md" "$KB_DIR/formatter.md"; do
  if [ ! -s "$f" ]; then
    echo "Error: $f is missing or empty"
    exit 1
  fi
done

# 2. Citations Resolve (very basic check)
# Check path references in MAP.md and area files
for path in "src/" "src/quota.ts" "src/subagents.ts" "src/parser.ts" "src/index.ts" "src/formatter.ts" "HOOKS.md" "LAYOUT_ENGINE.md"; do
  if [ ! -e "$path" ]; then
    echo "Error: Citation $path does not exist"
    exit 1
  fi
done

# 3. Commands Run (dry run or check they exist)
if ! grep -q '"build"' package.json; then echo "Error: build command missing"; exit 1; fi
if ! grep -q '"test"' package.json; then echo "Error: test command missing"; exit 1; fi
if ! grep -q '"lint"' package.json; then echo "Error: lint command missing"; exit 1; fi

# 4. Freshness
BUILT_COMMIT=$(grep "built_at_commit" "$KB_DIR/MAP.md" | awk '{print $2}')
if ! git merge-base --is-ancestor "$BUILT_COMMIT" HEAD; then
  echo "Error: built_at_commit $BUILT_COMMIT is not an ancestor of HEAD"
  exit 1
fi

# Check drift window (e.g. 50 commits)
DRIFT=$(git rev-list --count "${BUILT_COMMIT}..HEAD")
if [ "$DRIFT" -gt 50 ]; then
  echo "Error: KB is stale by $DRIFT commits (limit is 50)"
  exit 1
fi

echo "KB check passed!"
