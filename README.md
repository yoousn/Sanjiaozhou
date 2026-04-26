# 项目说明

## 本地运行

### 前置要求
- Node.js 20+
- npm
- Python 3（用于采集脚本）
- Docker / Docker Compose（用于部署）

### 启动步骤
1. 安装依赖：`npm install`
2. 本地启动：`npm run dev`
3. 默认访问地址：`http://127.0.0.1:3000`

当前项目由 Express + Vite 共同启动，服务端入口为 [server.ts](server.ts)，前端与运行时数据都由该进程统一管理。

## 运行态数据
本项目会在运行时直接读写以下文件：
- `src/data.json`
- `src/daily_pwd.json`
- `scripts/collect_settings.json`
- `scripts/auto_logs.json`
- `scripts/daily_pwd_logs.json`
- `scripts/auto_processed_videos.json`
- `scripts/cookies.txt`

这些文件不能再跟代码一起整目录挂载或随仓库更新覆盖。部署时应统一保存在服务器的 `runtime/` 目录，再以单文件挂载到容器中。

## Docker 部署
### 服务器目录
生产环境固定部署在：
- `/opt/xiujiao-era`

运行态文件目录：
- `/opt/xiujiao-era/runtime`

### 首次迁移运行态文件
启用自动部署前，先在服务器执行一次迁移：

```bash
cd /opt/xiujiao-era
mkdir -p runtime
cp src/data.json runtime/data.json
cp src/daily_pwd.json runtime/daily_pwd.json
cp scripts/collect_settings.json runtime/collect_settings.json
cp scripts/auto_logs.json runtime/auto_logs.json
cp scripts/daily_pwd_logs.json runtime/daily_pwd_logs.json
cp scripts/auto_processed_videos.json runtime/auto_processed_videos.json
cp scripts/cookies.txt runtime/cookies.txt
```

如果个别文件还不存在，请按当前线上真实状态补齐，避免首次切换后容器读取到空文件。

### 平滑更新规则
部署时必须始终遵守这个顺序：

```bash
docker-compose build
docker-compose up -d
docker image prune -f
```

绝对不要先执行：

```bash
docker-compose down
```

原因：`build` 期间旧站要继续对外服务，只有在 `up -d` 瞬间替换时才允许极短抖动。

## GitHub Actions 自动部署
### 触发方式
已新增工作流：
- [deploy.yml](.github/workflows/deploy.yml)

触发条件：
- push 到 `main`
- GitHub Actions 页面手动触发 `workflow_dispatch`

### 工作流行为
1. GitHub Runner 执行：
   - `npm ci`
   - `npm run build`
2. 通过 SSH 登录服务器
3. 在 `/opt/xiujiao-era` 执行：
   - `git fetch origin main`
   - `git checkout main`
   - `git pull --ff-only origin main`
   - `bash scripts/deploy_remote.sh`
4. 远程脚本再执行：
   - 初始化 `runtime/` 缺失文件
   - `docker-compose build`
   - `docker-compose up -d`
   - 默认执行 `docker image prune -f`

### 需要配置的 GitHub Secrets
仓库 Settings → Secrets and variables → Actions 中新增：

- `DEPLOY_HOST`：服务器 IP 或域名
- `DEPLOY_PORT`：SSH 端口
- `DEPLOY_USER`：SSH 用户名
- `DEPLOY_SSH_KEY`：部署私钥
- `DEPLOY_PATH`：固定填写 `/opt/xiujiao-era`
- `DEPLOY_KNOWN_HOSTS`：可选，服务器 host key
- `PRUNE_IMAGES`：可选，默认建议填 `true`

### 服务器准备
服务器需要满足：
1. `/opt/xiujiao-era` 已是当前项目的 git 工作目录
2. 服务器本机有权限拉取你的私有 GitHub 仓库
3. 已安装 Docker 和 Docker Compose
4. 已完成 `runtime/` 迁移

## 手动兜底部署
即使 GitHub Actions 异常，也可以在服务器手动执行：

```bash
cd /opt/xiujiao-era
bash scripts/deploy_remote.sh
```

这个脚本同样遵守平滑更新规则，不会主动执行 `docker-compose down`。
...

