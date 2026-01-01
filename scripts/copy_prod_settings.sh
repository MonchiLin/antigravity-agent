#!/usr/bin/env bash
set -euo pipefail

# Copy Antigravity Agent production settings to a local dev copy.
# Usage: ./scripts/copy_prod_settings.sh [target_dir]
# Default target_dir: ./dev_home

TARGET_DIR="${1:-./dev_home}"
PROD_DIR="$HOME/.antigravity-agent"

timestamp() {
  date +%Y%m%d_%H%M%S
}

if [ ! -d "$PROD_DIR" ]; then
  echo "Production config directory not found: $PROD_DIR"
  echo "If your production settings are stored elsewhere, pass the path as the first arg or ensure $PROD_DIR exists."
  exit 1
fi

mkdir -p "$TARGET_DIR"

# If target already exists, keep a backup
if [ -e "$TARGET_DIR" ] && [ "$(ls -A "$TARGET_DIR")" ]; then
  BACKUP_DIR="${TARGET_DIR}_backup_$(timestamp)"
  echo "Target $TARGET_DIR is not empty — creating backup at $BACKUP_DIR"
  mv "$TARGET_DIR" "$BACKUP_DIR"
  mkdir -p "$TARGET_DIR"
fi

echo "Copying production settings from $PROD_DIR to $TARGET_DIR..."

# Use rsync for a safe copy (preserves permissions, avoids partial copies)
if command -v rsync >/dev/null 2>&1; then
  rsync -a --delete "$PROD_DIR/" "$TARGET_DIR/"
else
  # fallback to cp
  cp -a "$PROD_DIR/." "$TARGET_DIR/"
fi

echo "Copy complete. Dev settings are at: $TARGET_DIR"
echo
echo "To run the app using this dev settings directory, run:" 
echo
echo "  HOME=$(pwd)/${TARGET_DIR} npm run dev"
echo
echo "Note: the created directory is added to .gitignore by the project, so it won't be committed."
