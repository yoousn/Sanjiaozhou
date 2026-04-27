# 项目说明

这是一个围绕枪械配置整理、手动采集与每日密码展示的全栈站点。当前项目由 [server.ts](server.ts) 统一启动 Express 服务与 Vite 前端，数据以 JSON 文件形式持久化，部分采集能力依赖 Python 脚本。

## 技术栈
- 前端：React 19 + Vite 6 + Tailwind CSS 4
- 后端：Express + TypeScript
- 数据存储：本地 JSON 文件 / 服务器 `runtime/` 持久化文件
- 辅助脚本：Python（B 站采集、每日密码抓取）
- 部署：GitHub Actions + SSH + Docker Compose

## 项目结构
- [server.ts](server.ts)：服务端入口，统一处理 API、静态资源与运行态文件读写
- [src/](src/)：前端页面与组件
- [scripts/](scripts/)：部署脚本、采集配置、运行日志模板
- `爬取每日密码.py`：每日密码抓取脚本
- `runtime/`：仅服务器保留的真实运行态数据目录（不应被代码发布覆盖）
- [docs/](docs/)：项目规则、协作、部署、版本与进度文档
- [AGENTS.md](AGENTS.md)：提供给 AI / CLI 工具的协作入口

## 本地开发
### 前置要求
- Node.js 20+
- npm
- Python 3
- Docker / Docker Compose（仅部署需要）

### 常用命令
- 安装依赖：`npm install`
- 本地开发：`npm run dev`
- 类型检查：`npm run lint`
- 前端构建：`npm run build`
- 端口冲突时重启：`npm run restart`

默认本地地址：`http://127.0.0.1:3000`

## 运行态数据
项目运行时会直接读写以下文件对应的数据：
- `data.json`
- `daily_pwd.json`
- `collect_settings.json`
- `auto_logs.json`
- `daily_pwd_logs.json`
- `auto_processed_videos.json`
- `cookies.txt`

生产环境中，这些文件必须统一放在服务器 `/opt/xiujiao-era/runtime/` 下，并通过 Docker Compose 单文件挂载给容器；不要再把整目录随代码仓库一起覆盖。

## 部署概览
当前生产环境通过 GitHub Actions 在 `main` 分支 push 后自动部署到服务器 `/opt/xiujiao-era`，远程执行 [scripts/deploy_remote.sh](scripts/deploy_remote.sh) 完成：
- `docker-compose build`
- `docker-compose up -d`
- `docker image prune -f`

严禁在替换前执行 `docker-compose down`。

## 文档索引
- [AGENTS.md](AGENTS.md)：AI / CLI 工具协作入口
- [docs/project-rules.md](docs/project-rules.md)：项目硬规则与产品约束
- [docs/collaboration.md](docs/collaboration.md)：双电脑 / 多 AI 协作规则
- [docs/deployment.md](docs/deployment.md)：部署、运行态与 GitHub Actions 说明
- [docs/versioning.md](docs/versioning.md)：版本号规则
- [docs/release-notes.md](docs/release-notes.md)：正式版本更新说明
- [docs/progress.md](docs/progress.md)：详细施工日志与历史进度
