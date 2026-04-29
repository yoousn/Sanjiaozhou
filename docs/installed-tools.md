# 已安装的 Claude Code 扩展工具

## 1. Awesome Claude Skills（社区技能合集）

**来源：** [ComposioHQ/awesome-claude-skills](https://github.com/ComposioHQ/awesome-claude-skills)（57k+ Stars）

**安装位置：** `~/.claude/skills/`（29 个新增技能目录）

**安装方式：** 从 GitHub 克隆后手动复制到 skills 目录

**使用方式：** Claude Code 会根据你的任务自动匹配并激活相关技能，无需手动调用。例如：
- 写代码时自动调用 `coding-standards`
- 处理文档时自动调用 `document-skills`（docx/pdf/pptx/xlsx）
- 创建 MCP 服务器时自动调用 `mcp-builder`

**对当前项目最有用的技能：**

| 技能名 | 用途 |
|--------|------|
| `changelog-generator` | 从 git 提交记录自动生成用户友好的 changelog |
| `webapp-testing` | 用 Playwright 测试本地 web 应用 |
| `mcp-builder` | 引导创建高质量的 MCP 服务器 |
| `document-skills` | Word/PDF/PPT/Excel 文档创建与编辑 |
| `skill-creator` | 指导你创建自己的自定义技能 |
| `theme-factory` | 为页面提供 10 种预设主题样式 |
| `file-organizer` | 智能整理文件和文件夹 |
| `canvas-design` | 创建海报、设计图等静态视觉作品 |

---

## 2. Claude-Mem（持久化记忆系统）

**来源：** [thedotmack/claude-mem](https://github.com/thedotmack/claude-mem)

**安装版本：** 12.4.8

**安装位置：**
- 插件本体：`~/.claude/plugins/marketplaces/thedotmack/`
- 记忆数据：`~/.claude-mem/`（含 SQLite 数据库、向量索引等）

**安装方式：** `npx claude-mem install`（已注册为 marketplace 插件，重启后自动生效）

**核心功能：** 自动捕获你在 Claude Code 中每一次操作，经 AI 压缩后持久化存储，在新会话中自动注入相关上下文，使 Claude 在会话间保持项目知识连续性。

**使用方式：**

| 操作 | 方法 |
|------|------|
| 自动记忆 | 无需任何操作，对话过程中自动记录 |
| 搜索历史记忆 | 在 Claude Code 中输入 `/mem-search` |
| 查看记忆流 | 浏览器打开 [http://localhost:37777](http://localhost:37777) |
| 启动后台服务 | `npx claude-mem start` |
| 排除敏感内容 | 在消息中用 `<private>...</private>` 包裹不想被记录的内容 |
| 查看状态 | `npx claude-mem status` |

**系统要求：** Node.js ≥ 18，SQLite 内置，Bun 和 uv（缺失时自动安装）

---

## 检查安装是否成功

在终端运行：

```bash
# 检查 skills 数量（应在 149 左右）
ls ~/.claude/skills/ | wc -l

# 检查 claude-mem 状态
npx claude-mem status

# 查看 awesome-skills 新增目录是否存在
ls ~/.claude/skills/changelog-generator ~/.claude/skills/mcp-builder
```

## 注意事项

- **claude-mem 需要重启 Claude Code 才能生效**。重启后新会话会自动加载之前会话的记忆。
- Awesome Claude Skills 已直接放入 skills 目录，Claude Code 会自动识别。
- 卸载 claude-mem 前必须先关闭所有 Claude Code 会话，否则 `~/.claude-mem` 会被活跃的 hooks 重新创建。
