# 协作与工作流

## 双电脑开发
- 当前项目在公司和家里两台电脑之间切换开发
- 换设备前后，优先查看 [progress.md](progress.md) 最新记录恢复上下文
- 任何环境、配置、代码或部署相关的小改动，都必须记进进度文档

## 多 AI / CLI 工具协作
- 不要假设任何工具会自动理解仓库背景
- 开始工作前，应先阅读根目录 [README.md](../README.md) 与 [AGENTS.md](../AGENTS.md)
- 涉及规则、部署、版本、进度时，再分别阅读对应 `docs/` 文档

## 进度记录规则
- 任何命令造成的改动都必须记录到 [progress.md](progress.md)
- 时间必须使用北京时间
- 时间格式使用精确的“年月日 时:分”，禁止使用“刚刚”等模糊写法
- 每次更新 [progress.md](progress.md) 后，必须在最后一行写明最新“更新时间”

## 协作习惯
- 切换电脑开发时，先看最新进度，再继续工作
- 正式版本发布时，除进度记录外，还要同步更新 [release-notes.md](release-notes.md)
- 版本升级规则统一遵循 [versioning.md](versioning.md)
