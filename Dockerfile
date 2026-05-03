# syntax=docker/dockerfile:1.4

FROM node:20-bookworm-slim

WORKDIR /app

# 切换 Debian / pip / npm 到国内镜像源并安装 Python 3、pip 与系统 Chromium
RUN set -eux; \
    printf 'Types: deb\nURIs: http://mirrors.tuna.tsinghua.edu.cn/debian\nSuites: bookworm bookworm-updates\nComponents: main\nSigned-By: /usr/share/keyrings/debian-archive-keyring.gpg\n\nTypes: deb\nURIs: http://mirrors.tuna.tsinghua.edu.cn/debian-security\nSuites: bookworm-security\nComponents: main\nSigned-By: /usr/share/keyrings/debian-archive-keyring.gpg\n' > /etc/apt/sources.list.d/debian.sources; \
    apt-get update; \
    apt-get install -y --no-install-recommends \
        python3 \
        python3-pip \
        python-is-python3 \
        chromium; \
    rm -rf /var/lib/apt/lists/*

# ── npm 镜像 + SSL 稳定性配置 ──
# 1) 用 .npmrc 替代 npm config set（更可靠、可缓存）
# 2) strict-ssl=false 仅在构建期使用，避免 CDN TLS 分帧问题
# 3) fetch-retries/fetch-retry-mintimeout 增强网络抖动容忍
# 4) prefer-offline 优先使用缓存层中的包，减少网络请求
COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm,id=npm-cache \
    printf 'registry=https://registry.npmmirror.com\nstrict-ssl=false\nfetch-retries=5\nfetch-retry-mintimeout=20000\nfetch-retry-maxtimeout=120000\nprefer-offline=true\n' > .npmrc && \
    npm ci --no-audit --no-fund

# 复制源代码
COPY . .

# 构建生产版本
RUN npm run build

# 安装 Python 爬虫依赖
RUN pip3 config set global.index-url https://pypi.tuna.tsinghua.edu.cn/simple && \
    pip3 install --no-cache-dir requests yt-dlp playwright --break-system-packages

# 确保所有需要持久化保存的 JSON 文件存在且可写
RUN mkdir -p src scripts && \
    touch src/data.json src/daily_pwd.json scripts/collect_settings.json scripts/auto_processed_videos.json scripts/auto_logs.json scripts/daily_pwd_logs.json scripts/users.json scripts/community_posts.json scripts/community_activity.json scripts/community_comments.json

# 暴露端口
EXPOSE 3000

# 启动命令 - 用 tsx 运行 server.ts
CMD ["npx", "tsx", "server.ts"]
