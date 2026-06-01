# 三角洲行动 (Sanjiaozhou)

简体中文 | [English](./README.md)

一个围绕枪械配置整理、自动采集与每日密码展示的全栈站点。项目由 [server.ts](server.ts) 统一启动 Express 服务与 Vite 前端，数据以 JSON 文件形式持久化，部分采集能力依赖 Python 脚本。

## 技术栈

- **前端：** React 19 + Vite 6 + Tailwind CSS 4
- **后端：** Express + TypeScript
- **数据存储：** 本地 JSON 文件 / 服务器 `runtime/` 持久化文件
- **辅助脚本：** Python（B 站采集、每日密码抓取）
- **部署：** GitHub Actions + SSH + Docker Compose

## 项目结构

| 路径 | 说明 |
|---|---|
| [server.ts](server.ts) | 服务端入口 — 统一处理 API、静态资源与运行态文件读写 |
| [src/](src/) | 前端页面与组件 |
| [server/](server/) | 后端路由与工具模块 |
| [scripts/](scripts/) | 部署脚本、采集配置、运行日志模板 |
| `爬取每日密码.py` | 每日密码抓取脚本 |
| `runtime/` | 仅服务器保留的真实运行态数据目录（**禁止**被代码发布覆盖） |
| [docs/](docs/) | 项目规则、部署、版本说明和优化方案 |
| [AGENTS.md](AGENTS.md) | AI / CLI 工具协作入口 |

## 快速开始

### 前置要求

- Node.js 20+
- npm
- Python 3
- Docker / Docker Compose（仅部署需要）

### 常用命令

| 命令 | 说明 |
|---|---|
| `npm install` | 安装依赖 |
| `npm run dev` | 启动本地开发服务 |
| `npm run lint` | 类型检查 |
| `npm run build` | 前端生产构建 |
| `npm run restart` | 端口冲突时重启 |

默认本地地址：`http://127.0.0.1:3000`

## 运行态数据

项目运行时会直接读写以下文件：

- `data.json` — 枪械配置数据
- `daily_pwd.json` — 每日密码
- `collect_settings.json` — 采集设置
- `auto_logs.json` — 自动化日志
- `daily_pwd_logs.json` — 每日密码抓取日志
- `auto_processed_videos.json` — 已处理视频记录
- `cookies.txt` — B 站 Cookie
- `users.json` — 用户账号
- `community_posts.json` — 社区帖子
- `community_activity.json` — 社区动态数据
- `community_comments.json` — 社区评论

> **⚠️ 重要：** 生产环境中，所有运行态文件必须统一放在服务器 `/opt/xiujiao-era/runtime/` 下，并通过 Docker Compose 单文件挂载给容器。**严禁**随代码仓库一起覆盖。

## 部署概览

当前生产环境通过 GitHub Actions 在 `main` 分支 push 后自动部署到服务器 `/opt/xiujiao-era`，远程执行 [scripts/deploy_remote.sh](scripts/deploy_remote.sh) 完成：

```bash
docker-compose build
docker-compose up -d
docker image prune -f
```

> **🚫 严禁**在替换前执行 `docker-compose down`。部署脚本采用滚动更新以避免停机。

## 文档索引

| 文档 | 说明 |
|---|---|
| [AGENTS.md](AGENTS.md) | AI / CLI 工具协作入口 |
| [docs/project-rules.md](docs/project-rules.md) | 项目硬规则与产品约束 |
| [docs/deployment.md](docs/deployment.md) | 部署、运行态与 GitHub Actions 说明 |
| [docs/versioning.md](docs/versioning.md) | 版本号规则 |
| [docs/release-notes.md](docs/release-notes.md) | 正式版本更新说明 |
| [docs/optimization-plan.md](docs/optimization-plan.md) | 性能、图片、分页、CDN、压缩与安全配置优化方案 |

