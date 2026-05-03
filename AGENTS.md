# AGENTS.md

本仓库支持双电脑、多 AI / CLI 工具协作。开始任何改动前，请先阅读必要文档，优先理解项目结构、部署规则与版本记录。

## 必读顺序
1. [README.md](README.md)
2. [docs/project-rules.md](docs/project-rules.md)
3. [docs/deployment.md](docs/deployment.md)
4. [docs/versioning.md](docs/versioning.md)
5. [docs/release-notes.md](docs/release-notes.md)
6. [docs/optimization-plan.md](docs/optimization-plan.md)（涉及性能、图片、分页、CDN、压缩、安全配置时阅读）

## 强制规则
- 正式版本说明统一写入 [docs/release-notes.md](docs/release-notes.md)每次必须放到最后一行
- 版本规则统一以 [docs/versioning.md](docs/versioning.md) 为准
- 部署必须遵守 [docs/deployment.md](docs/deployment.md) 的平滑更新顺序，严禁先 `docker-compose down`
- 运行态数据必须保留在服务器 `runtime/`，禁止用代码发布覆盖真实运行态数据
- 敏感配置必须使用环境变量，禁止在代码和文档中写入真实 Token、密钥或 Cookie

## 根目录约定
根目录只保留必要 Markdown 文档：
- [README.md](README.md)
- [AGENTS.md](AGENTS.md)

其他规则、部署、版本说明和优化方案统一放在 [docs/](docs/)
