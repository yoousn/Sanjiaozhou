# AGENTS.md

本仓库支持双电脑、多 AI / CLI 工具协作。开始任何改动前，请先阅读下列文档，并严格按照其中规则执行。

## 必读顺序
1. [README.md](README.md)
2. [docs/project-rules.md](docs/project-rules.md)
3. [docs/collaboration.md](docs/collaboration.md)
4. [docs/progress.md](docs/progress.md)
5. [docs/release-notes.md](docs/release-notes.md)
6. [docs/deployment.md](docs/deployment.md)

## 强制规则
- 任何命令造成的改动都必须记录到 [docs/progress.md](docs/progress.md)
- `docs/progress.md` 最后一行必须更新“更新时间”，并使用北京时间
- 正式版本说明统一写入 [docs/release-notes.md](docs/release-notes.md)
- 版本规则统一以 [docs/versioning.md](docs/versioning.md) 为准
- 部署必须遵守 [docs/deployment.md](docs/deployment.md) 的平滑更新顺序，严禁先 `docker-compose down`

## 根目录约定
根目录只保留两个 Markdown 文档：
- [README.md](README.md)
- [AGENTS.md](AGENTS.md)

其他规则、进度、部署、版本说明统一放在 [docs/](docs/)
