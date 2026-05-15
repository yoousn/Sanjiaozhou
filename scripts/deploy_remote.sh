#!/usr/bin/env bash
set -euo pipefail

DEPLOY_PATH="${DEPLOY_PATH:-/opt/xiujiao-era}"
DEPLOY_BRANCH="${DEPLOY_BRANCH:-main}"
RUNTIME_DIR="${RUNTIME_DIR:-$DEPLOY_PATH/runtime}"
PRUNE_IMAGES="${PRUNE_IMAGES:-true}"
FORCE_BUILD="${FORCE_BUILD:-false}"

cd "$DEPLOY_PATH"

# ────────────────────────────────────────────
# 1. 同步代码到 origin/<branch>
# ────────────────────────────────────────────
sync_deploy_branch() {
  local prev_head=""
  if git rev-parse --verify "$DEPLOY_BRANCH" >/dev/null 2>&1; then
    prev_head="$(git rev-parse "$DEPLOY_BRANCH")"
  fi

  git fetch origin "$DEPLOY_BRANCH"
  git checkout "$DEPLOY_BRANCH"

  local local_head remote_head backup_branch
  local_head="$(git rev-parse "$DEPLOY_BRANCH")"
  remote_head="$(git rev-parse "origin/$DEPLOY_BRANCH")"

  if git merge-base --is-ancestor "$local_head" "$remote_head"; then
    git reset --hard "origin/$DEPLOY_BRANCH"
  else
    backup_branch="deploy-backup/${DEPLOY_BRANCH}-$(date +%Y%m%d%H%M%S)"
    git branch "$backup_branch" "$local_head"
    echo "Deploy branch diverged. Saved local commit as $backup_branch"
    git reset --hard "origin/$DEPLOY_BRANCH"
  fi

  echo "$prev_head"
}

PREV_HEAD="$(sync_deploy_branch)"
NEW_HEAD="$(git rev-parse HEAD)"

# ────────────────────────────────────────────
# 2. 准备 runtime 目录与初始数据文件
# ────────────────────────────────────────────
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

if command -v docker-compose >/dev/null 2>&1; then
  COMPOSE="docker-compose"
else
  COMPOSE="docker compose"
fi

# ────────────────────────────────────────────
# 3. 判断是否需要重建镜像
# 影响镜像的路径：源码、Dockerfile、依赖清单、compose、scripts
# 不影响镜像的路径：docs/、README*.md、*.md、.github/、runtime/
# ────────────────────────────────────────────
LAST_BUILD_FILE="$RUNTIME_DIR/.last_build_sha"
LAST_BUILD_SHA=""
if [ -f "$LAST_BUILD_FILE" ]; then
  LAST_BUILD_SHA="$(cat "$LAST_BUILD_FILE" 2>/dev/null || echo '')"
fi

container_running() {
  docker inspect --format '{{.State.Running}}' xiujiao-ai 2>/dev/null | grep -q true
}

image_exists() {
  docker image inspect xiujiao-era-app >/dev/null 2>&1
}

needs_build() {
  if [ "$FORCE_BUILD" = "true" ]; then
    echo "FORCE_BUILD=true, will rebuild"
    return 0
  fi
  if ! image_exists; then
    echo "Image xiujiao-era-app not found, will build"
    return 0
  fi
  if [ -z "$LAST_BUILD_SHA" ]; then
    echo "No previous build SHA recorded, will build"
    return 0
  fi
  if ! git cat-file -e "$LAST_BUILD_SHA" 2>/dev/null; then
    echo "Previous build SHA $LAST_BUILD_SHA no longer in git history, will build"
    return 0
  fi
  if [ "$LAST_BUILD_SHA" = "$NEW_HEAD" ]; then
    echo "HEAD unchanged since last build ($NEW_HEAD), skip build"
    return 1
  fi
  local changed
  changed="$(git diff --name-only "$LAST_BUILD_SHA" "$NEW_HEAD" -- \
    ':(exclude)docs/**' \
    ':(exclude).github/**' \
    ':(exclude)runtime/**' \
    ':(exclude)*.md' \
    ':(exclude)README*' \
    ':(exclude)AGENTS.md' \
    ':(exclude).gitignore' \
    ':(exclude).gitattributes' \
    ':(exclude).dockerignore' \
    | head -1)"
  if [ -z "$changed" ]; then
    echo "No image-affecting files changed between $LAST_BUILD_SHA..$NEW_HEAD, skip build"
    return 1
  fi
  echo "Image-affecting changes detected, will build"
  return 0
}

if needs_build; then
  $COMPOSE build --build-arg BUILDKIT_INLINE_CACHE=1
  echo "$NEW_HEAD" > "$LAST_BUILD_FILE"
fi

# 即使跳过 build，也确保容器在跑（首次部署 / 容器被手动停掉的情况）
$COMPOSE up -d

if [ "$PRUNE_IMAGES" = "true" ]; then
  docker image prune -f
fi
