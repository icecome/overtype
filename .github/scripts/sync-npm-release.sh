#!/usr/bin/env bash
#
# Sync the npm-release branch: flatten packages/core from overtypeplus
# to the repo root so consumers can `npm install github:user/repo#npm-release`.
#
# Usage:
#   bash .github/scripts/sync-npm-release.sh
#
# Environment overrides:
#   SOURCE_BRANCH  (default: overtypeplus)
#   TARGET_BRANCH  (default: npm-release)
#   DRY_RUN        (default: false) — set to "true" to skip the push

set -euo pipefail

SOURCE_BRANCH="${SOURCE_BRANCH:-overtypeplus}"
TARGET_BRANCH="${TARGET_BRANCH:-npm-release}"
DRY_RUN="${DRY_RUN:-false}"

REPO_ROOT="$(git rev-parse --show-toplevel)"
cd "$REPO_ROOT"

echo "==> Syncing ${TARGET_BRANCH} from ${SOURCE_BRANCH}:packages/core"

# ---- verify source layout ----
if ! git rev-parse --verify "${SOURCE_BRANCH}" >/dev/null 2>&1; then
  echo "ERROR: source branch '${SOURCE_BRANCH}' not found" >&2
  exit 1
fi

if ! git rev-parse --verify "${SOURCE_BRANCH}:packages/core" >/dev/null 2>&1; then
  echo "ERROR: packages/core does not exist on '${SOURCE_BRANCH}'" >&2
  exit 1
fi

# ---- ensure target branch ref exists locally ----
git fetch origin "${TARGET_BRANCH}" 2>/dev/null || true
if git rev-parse --verify "origin/${TARGET_BRANCH}" >/dev/null 2>&1; then
  TARGET_BASE="origin/${TARGET_BRANCH}"
elif git rev-parse --verify "${TARGET_BRANCH}" >/dev/null 2>&1; then
  TARGET_BASE="${TARGET_BRANCH}"
else
  TARGET_BASE=""
fi

# ---- create temp worktree ----
WORKTREE="$(mktemp -d)"
cleanup() {
  git worktree remove "$WORKTREE" --force 2>/dev/null || true
  rm -rf "$WORKTREE" 2>/dev/null || true
}
trap cleanup EXIT

if [ -n "$TARGET_BASE" ]; then
  git worktree add "$WORKTREE" "$TARGET_BASE" 2>/dev/null
else
  # first run: create an orphan branch
  git worktree add --orphan "$WORKTREE" "$TARGET_BRANCH" 2>/dev/null
fi

# ---- clear worktree (keep .git) ----
find "$WORKTREE" -mindepth 1 -maxdepth 1 ! -name '.git' -exec rm -rf {} +

# ---- extract packages/core tree to root ----
git archive "${SOURCE_BRANCH}:packages/core" | tar -x -C "$WORKTREE"

# ---- write npm-release .gitignore ----
cat > "$WORKTREE/.gitignore" << 'GITIGNORE'
# Dependencies
node_modules/

# Development
.DS_Store
*.log
*.swp
.env
.env.local

# IDE
.vscode/
.idea/
*.sublime-project
*.sublime-workspace

# Build artifacts
*.map

# Testing
coverage/
.nyc_output/

# Temporary files
tmp/
temp/
*.tmp

# OS files
Thumbs.db

# Playwright MCP
.playwright-mcp/

# Claude Code
CLAUDE.md

# Codex CLI session data
.claude/

# Local working files (issue dumps, brainstorms, planning docs)
DONT_COMMIT/

.workbuddy/
.history/
GITIGNORE

# ---- commit & push ----
cd "$WORKTREE"
git add -A

if git diff --cached --quiet; then
  echo "==> No changes — ${TARGET_BRANCH} is already up to date"
  exit 0
fi

SOURCE_SHA="$(git rev-parse --short "${SOURCE_BRANCH}")"
git commit -m "chore: sync ${TARGET_BRANCH} from ${SOURCE_BRANCH} (${SOURCE_SHA})

Automated flattening of packages/core to repo root."

if [ "$DRY_RUN" = "true" ]; then
  echo "==> DRY_RUN=true — skipping push"
  git log --oneline -1
  exit 0
fi

git push origin "HEAD:${TARGET_BRANCH}" --force
echo "==> Pushed to origin/${TARGET_BRANCH}"
