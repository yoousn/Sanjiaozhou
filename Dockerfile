# syntax=docker/dockerfile:1.4

# ── Builder：构建前端产物 ──
FROM node:20-bookworm-slim AS builder
WORKDIR /app

RUN --mount=type=cache,target=/root/.npm,id=npm-cache \
    printf 'registry=https://registry.npmmirror.com\nstrict-ssl=false\nfetch-retries=5\nfetch-retry-mintimeout=20000\nfetch-retry-maxtimeout=120000\nprefer-offline=true\n' > .npmrc

COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm,id=npm-cache \
    npm ci --no-audit --no-fund

COPY . .
RUN npm run build

# ── Runner：精简运行镜像 ──
FROM node:20-bookworm-slim
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

# 仅安装生产 npm 依赖
COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm,id=npm-cache \
    printf 'registry=https://registry.npmmirror.com\nstrict-ssl=false\nfetch-retries=5\nfetch-retry-mintimeout=20000\nfetch-retry-maxtimeout=120000\nprefer-offline=true\n' > .npmrc && \
    npm ci --omit=dev --no-audit --no-fund

# 复制构建产物与运行时代码
COPY --from=builder /app/dist ./dist
COPY server ./server
COPY shared ./shared
COPY server.ts ./
COPY scripts ./scripts
COPY src ./src

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
