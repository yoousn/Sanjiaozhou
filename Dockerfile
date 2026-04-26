FROM node:20-bookworm-slim

WORKDIR /app

# 安装 Python 3、pip 与 Playwright 运行 Chromium 所需环境
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    python-is-python3 \
    && rm -rf /var/lib/apt/lists/*

# 安装依赖
COPY package*.json ./
RUN npm install

# 复制源代码
COPY . .

# 构建生产版本
RUN npm run build

# 安装 Python 爬虫依赖，并预装 Playwright Chromium
RUN pip3 install --no-cache-dir requests yt-dlp playwright --break-system-packages && \
    python -m playwright install --with-deps chromium

# 确保所有需要持久化保存的 JSON 文件存在且可写
RUN mkdir -p src scripts && \
    touch src/data.json scripts/collect_settings.json scripts/auto_processed_videos.json scripts/auto_logs.json

# 暴露端口
EXPOSE 3000

# 启动命令 - 用 tsx 运行 server.ts
CMD ["npx", "tsx", "server.ts"]