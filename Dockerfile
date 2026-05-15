# syntax=docker/dockerfile:1.4

# ────────────────────────────────────────────
# Stage 1: deps - 仅安装完整依赖（含 dev），用于构建
# 任何 package.json 未变更的提交都会复用这层缓存
# ────────────────────────────────────────────
FROM node:20-bookworm-slim AS deps
WORKDIR /app

RUN printf 'registry=https://registry.npmmirror.com\nstrict-ssl=false\nfetch-retries=5\nfetch-retry-mintimeout=20000\nfetch-retry-maxtimeout=120000\nprefer-offline=true\n' > .npmrc

COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm,id=npm-cache \
    npm ci --no-audit --no-fund --prefer-offline || \
    npm ci --no-audit --no-fund --prefer-offline || \
    npm ci --no-audit --no-fund

# ────────────────────────────────────────────
# Stage 2: prod-deps - 仅生产依赖，复制到运行镜像
# ────────────────────────────────────────────
FROM node:20-bookworm-slim AS prod-deps
WORKDIR /app

RUN printf 'registry=https://registry.npmmirror.com\nstrict-ssl=false\nfetch-retries=5\nfetch-retry-mintimeout=20000\nfetch-retry-maxtimeout=120000\nprefer-offline=true\n' > .npmrc

COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm,id=npm-cache \
    npm ci --omit=dev --no-audit --no-fund --prefer-offline || \
    npm ci --omit=dev --no-audit --no-fund --prefer-offline || \
    npm ci --omit=dev --no-audit --no-fund

# ────────────────────────────────────────────
# Stage 3: builder - 构建前端产物
# 源码改动只重跑 vite build，不再重装依赖
# ────────────────────────────────────────────
FROM node:20-bookworm-slim AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json ./
COPY index.html vite.config.ts tsconfig.json ./
COPY src ./src
COPY shared ./shared
RUN npm run build

# ────────────────────────────────────────────
# Stage 4: runner - 最终运行镜像
# ────────────────────────────────────────────
FROM node:20-bookworm-slim AS runner
WORKDIR /app

# 切换 Debian / pip 到国内镜像源，安装 Python 3、pip、Chromium
RUN set -eux; \
    printf 'Types: deb\nURIs: http://mirrors.tuna.tsinghua.edu.cn/debian\nSuites: bookworm bookworm-updates\nComponents: main\nSigned-By: /usr/share/keyrings/debian-archive-keyring.gpg\n\nTypes: deb\nURIs: http://mirrors.tuna.tsinghua.edu.cn/debian-security\nSuites: bookworm-security\nComponents: main\nSigned-By: /usr/share/keyrings/debian-archive-keyring.gpg\n' > /etc/apt/sources.list.d/debian.sources; \
    apt-get update; \
    apt-get install -y --no-install-recommends \
        python3 \
        python3-pip \
        python-is-python3 \
        chromium; \
    rm -rf /var/lib/apt/lists/*

# 直接复用 prod-deps 阶段的生产 node_modules，避免重复 npm ci
COPY --from=prod-deps /app/node_modules ./node_modules
COPY package.json package-lock.json ./

# 复制构建产物与运行时代码
COPY --from=builder /app/dist ./dist
COPY server ./server
COPY shared ./shared
COPY server.ts ./
COPY scripts ./scripts
COPY src ./src
COPY 爬取每日密码.py ./

# 安装 Python 依赖（playwright 使用系统 Chromium，跳过浏览器下载节省约 200MB）
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
COPY requirements.txt ./
RUN pip3 config set global.index-url https://pypi.tuna.tsinghua.edu.cn/simple && \
    pip3 install --no-cache-dir -r requirements.txt --break-system-packages

# 确保所有需要持久化保存的 JSON 文件存在且可写
RUN mkdir -p src scripts && \
    touch src/data.json src/daily_pwd.json scripts/collect_settings.json scripts/auto_processed_videos.json scripts/auto_logs.json scripts/daily_pwd_logs.json scripts/users.json scripts/community_posts.json scripts/community_activity.json scripts/community_comments.json

EXPOSE 3000
# Docker volume mount 时，如果宿主机文件不存在会创建目录而非文件，导致 JSON 写入失败
# 启动前先确保所有需要持久化的 JSON 文件是文件而非目录
CMD ["sh", "-c", "for f in src/data.json src/daily_pwd.json scripts/collect_settings.json scripts/auto_processed_videos.json scripts/auto_logs.json scripts/daily_pwd_logs.json scripts/users.json scripts/community_posts.json scripts/community_activity.json scripts/community_comments.json; do if [ -d \"/app/$f\" ]; then rm -rf \"/app/$f\"; fi; if [ ! -f \"/app/$f\" ]; then echo '[]' > \"/app/$f\"; fi; done && exec npx tsx server.ts"]
