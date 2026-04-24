FROM node:20-alpine

WORKDIR /app

# 安装 Python 3 和 pip
RUN apk add --no-cache python3 py3-pip

# 安装依赖
COPY package*.json ./
RUN npm install

# 复制源代码
COPY . .

# 构建生产版本
RUN npm run build

# 安装 Python 爬虫所需的依赖 (Alpine 3.19+ 需要加 break-system-packages)
RUN pip3 install --no-cache-dir requests yt-dlp --break-system-packages

# 确保所有需要持久化保存的 JSON 文件存在且可写
RUN mkdir -p src scripts && \
    touch src/data.json scripts/collect_settings.json scripts/auto_processed_videos.json scripts/auto_logs.json

# 暴露端口
EXPOSE 3000

# 启动命令 - 用 tsx 运行 server.ts
CMD ["npx", "tsx", "server.ts"]