#!/usr/bin/env bash
set -euo pipefail

DEPLOY_PATH="${DEPLOY_PATH:-/opt/xiujiao-era}"
DEPLOY_BRANCH="${DEPLOY_BRANCH:-main}"
RUNTIME_DIR="${RUNTIME_DIR:-$DEPLOY_PATH/runtime}"
PRUNE_IMAGES="${PRUNE_IMAGES:-true}"

cd "$DEPLOY_PATH"

sync_deploy_branch() {
  git fetch origin "$DEPLOY_BRANCH"
  git checkout "$DEPLOY_BRANCH"

  local local_head remote_head backup_branch
  local_head="$(git rev-parse "$DEPLOY_BRANCH")"
  remote_head="$(git rev-parse "origin/$DEPLOY_BRANCH")"

  if git merge-base --is-ancestor "$local_head" "$remote_head"; then
    git reset --hard "origin/$DEPLOY_BRANCH"
    return
  fi

  backup_branch="deploy-backup/${DEPLOY_BRANCH}-$(date +%Y%m%d%H%M%S)"
  git branch "$backup_branch" "$local_head"
  echo "Deploy branch diverged. Saved local commit as $backup_branch"
  git reset --hard "origin/$DEPLOY_BRANCH"
}

sync_deploy_branch

mkdir -p "$RUNTIME_DIR" "$RUNTIME_DIR/uploads" "$RUNTIME_DIR/godspot/videos"

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
  community_comments.json \
  appearance.json \
  godspot/settings.json \
  godspot/metadata.json
 do
  target="$RUNTIME_DIR/$file"
  if [ ! -f "$target" ]; then
    mkdir -p "$(dirname "$target")"
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
      users.json|community_posts.json|community_activity.json|community_comments.json|auto_logs.json|daily_pwd_logs.json|auto_processed_videos.json|godspot/metadata.json)
        if [ -f "scripts/$file" ]; then
          cp "scripts/$file" "$target"
        else
          printf '[]\n' > "$target"
        fi
        ;;
      appearance.json)
        printf '{}\n' > "$target"
        ;;
      godspot/settings.json)
        printf '{"storageType":"local","cfUploadUrl":"","cfAuthToken":"","publicBaseUrl":""}\n' > "$target"
        ;;
    esac
  fi
 done

export RUNTIME_DIR

# 启用 BuildKit 以支持 Dockerfile 中的缓存挂载与 .npmrc 构建优化
export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1
export BUILDKIT_PROGRESS=plain

docker-compose build --build-arg BUILDKIT_INLINE_CACHE=1
docker-compose up -d

if [ "$PRUNE_IMAGES" = "true" ]; then
  docker image prune -f
fi
