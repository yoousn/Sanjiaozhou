# 部署与运行态说明

## 生产环境位置
生产环境固定部署在：
- `/opt/xiujiao-era`

目录职责：
- `/opt/xiujiao-era`：代码仓库、`Dockerfile`、`docker-compose.yml`、部署脚本
- `/opt/xiujiao-era/runtime`：真实运行态数据，换服务器时重点迁移这里

## 运行态数据
长期保留并迁移的核心文件：
- `/opt/xiujiao-era/runtime/data.json`
- `/opt/xiujiao-era/runtime/daily_pwd.json`
- `/opt/xiujiao-era/runtime/collect_settings.json`
- `/opt/xiujiao-era/runtime/auto_logs.json`
- `/opt/xiujiao-era/runtime/daily_pwd_logs.json`
- `/opt/xiujiao-era/runtime/auto_processed_videos.json`
- `/opt/xiujiao-era/runtime/cookies.txt`

其中最关键的是：
- `data.json`：网站主数据
- `collect_settings.json`：采集与模型配置
- `cookies.txt`：B 站登录态
- `daily_pwd.json` / `daily_pwd_logs.json`：每日密码缓存与日志

## 换服务器时的最小迁移方式
```bash
scp -r /opt/xiujiao-era/runtime root@新服务器IP:/opt/xiujiao-era/
```

如果新服务器上还没有项目目录，就先把代码部署到 `/opt/xiujiao-era`，再覆盖 `runtime/`。

## 首次迁移运行态文件
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

## 平滑更新规则
部署时必须始终遵守：

```bash
docker-compose build
docker-compose up -d
docker image prune -f
```

绝对不要先执行：

```bash
docker-compose down
```

原因：`build` 期间旧站必须继续对外服务，只有 `up -d` 替换时才允许极短抖动。

## GitHub Actions 自动部署
工作流文件：
- [.github/workflows/deploy.yml](../.github/workflows/deploy.yml)

触发条件：
- push 到 `main`
- 手动触发 `workflow_dispatch`

工作流行为：
1. GitHub Runner 执行 `npm ci` 与 `npm run build`
2. 通过 SSH 登录服务器
3. 在 `/opt/xiujiao-era` 执行：
   - `git fetch origin main`
   - `git checkout main`
   - `git pull --ff-only origin main`
   - `bash scripts/deploy_remote.sh`
4. 远程脚本继续执行：
   - 初始化 `runtime/` 缺失文件
   - `docker-compose build`
   - `docker-compose up -d`
   - 默认执行 `docker image prune -f`
5. 若本次 push 对应的是正式版本号更新，工作流会在部署成功后自动创建并推送 `v版本号` tag；同名 tag 已存在时会自动跳过

## GitHub Secrets
仓库 Actions Secrets 需要配置：
- `DEPLOY_HOST`
- `DEPLOY_PORT`
- `DEPLOY_USER`
- `DEPLOY_SSH_KEY`
- `DEPLOY_PATH`（固定为 `/opt/xiujiao-era`）
- `DEPLOY_KNOWN_HOSTS`（可选）
- `PRUNE_IMAGES`（可选，默认建议 `true`）

## 手动兜底部署
即使 GitHub Actions 异常，也可以在服务器手动执行：

```bash
cd /opt/xiujiao-era
bash scripts/deploy_remote.sh
```

这个脚本同样遵守平滑更新规则，不会主动执行 `docker-compose down`。
