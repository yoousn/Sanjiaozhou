#!/usr/bin/env bash
set -euo pipefail

DEPLOY_PATH="${DEPLOY_PATH:-/opt/xiujiao-era}"
DEPLOY_BRANCH="${DEPLOY_BRANCH:-main}"
RUNTIME_DIR="${RUNTIME_DIR:-$DEPLOY_PATH/runtime}"
PRUNE_IMAGES="${PRUNE_IMAGES:-true}"

cd "$DEPLOY_PATH"

mkdir -p "$RUNTIME_DIR"

for file in \
  data.json \
  daily_pwd.json \
  collect_settings.json \
  auto_logs.json \
  daily_pwd_logs.json \
  auto_processed_videos.json \
  cookies.txt \
  users.json \
  community_posts.json \
  community_activity.json \
  community_comments.json
 do
  target="$RUNTIME_DIR/$file"
  if [ ! -f "$target" ]; then
    case "$file" in
      cookies.txt)
        if [ -f "scripts/cookies.txt" ]; then
          cp "scripts/cookies.txt" "$target"
        else
          cp "scripts/cookies.txt.example" "$target"
        fi
        ;;
      data.json)
        if [ -f "src/data.json" ]; then
          cp "src/data.json" "$target"
        else
          printf '[]\n' > "$target"
        fi
        ;;
      daily_pwd.json)
        if [ -f "src/daily_pwd.json" ]; then
          cp "src/daily_pwd.json" "$target"
        else
          printf '{}\n' > "$target"
        fi
        ;;
      collect_settings.json)
        if [ -f "scripts/collect_settings.json" ]; then
          cp "scripts/collect_settings.json" "$target"
        else
          printf '{}\n' > "$target"
        fi
        ;;
      users.json|community_posts.json|community_activity.json|community_comments.json|auto_logs.json|daily_pwd_logs.json|auto_processed_videos.json)
        if [ -f "scripts/$file" ]; then
          cp "scripts/$file" "$target"
        else
          printf '[]\n' > "$target"
        fi
        ;;
    esac
  fi
 done

export RUNTIME_DIR

git fetch origin "$DEPLOY_BRANCH"
git checkout "$DEPLOY_BRANCH"
git pull --ff-only origin "$DEPLOY_BRANCH"

docker-compose build
docker-compose up -d

if [ "$PRUNE_IMAGES" = "true" ]; then
  docker image prune -f
fi
