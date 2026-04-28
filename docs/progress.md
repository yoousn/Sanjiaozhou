# 项目进度存档

> 本文档记录详细施工过程与历史节点，不等同于正式版本说明。正式版本摘要请看 [release-notes.md](release-notes.md)。

## [当前节点] App.tsx 深度拆分 Section 2 全部完成
**时间：** 2026年04月28日
**状态：**
1. 提取 `useDailyPassword.ts` 与 `useTheme.ts`。
2. 提取 `SettingsPage.tsx`、`DailyPwdCard.tsx` 等5个组件。
3. 深度重构 `App.tsx`，大幅降低了主文件的代码行数，且通过了 lint 与 build 验证。

---

## [当前节点] 社区功能增强 Section 1 全部完成
**时间：** 2026年04月28日 14:15
**状态：**
1. **评论系统：** 实现前端展示与折叠（超过3条折叠），要求填写昵称。
2. **点赞动画：** 右下角新增 👍 悬浮图标，点击触发綠星飘动动画。
3. **删除功能：** 实现后端 `DELETE /api/community/posts/:id`，前端增加删除按钮并支持删除动态记录。
4. **发帖优化：** 支持纯文字发帖、按钮更名为“发布帖子/图片”、支持 Ctrl+V 粘贴剪切板图片并提供预览。
5. **标签增强：** 新增 `#赌桥` 标签选项。
6. **架构优化：** 将社区相关 API 统一迁移至 `server/routes/community.ts`，并实现 `CommunityActivity` 的独立文件存储以支持删除记录。

---

## [当前节点] 拆分 server.ts 与新增评论后端 API
**时间：** 2026年04月28日 13:43
**状态：**
1. 提取 `server/lib/commentStore.ts`，实现社区评论的数据存储。
2. 提取 `server/lib/logs.ts` 和 `server/lib/shape.ts`，开始拆分冗长的 `server.ts`。
3. 在 `server.ts` 中新增了获取、发表、删除评论的 API。
4. 更新了 `docs/收尾任务.md` 进度状态。

---

## [当前节点] v1.0.4 图床配置即时可用
**时间：** 2026年04月28日
**状态：**
1. 已在 `server/lib/communityUpload.ts` 中填写 CF 图床默认 URL (`img.yousn.me`) 与 Token，社区发帖上传功能即时可用。
2. 版本号升至 1.0.4。

---

## [当前节点] v1.0.1 构建修复与页面版本显示补充
**时间：** 2026年04月28日 01:38
**状态：**
1. 已移除 `Dockerfile` 中对 `npmmirror` 的强制 npm registry 覆盖，改为让 `npm ci` 直接使用锁文件当前的 `registry.npmjs.org` 来源，降低远端 Docker 构建阶段的 TLS / 镜像不一致风险。
2. 已通过 `vite.config.ts` 将 `package.json` 版本号注入前端构建产物，避免页面版本显示手写死值。
3. 桌面端已在左侧边栏底部增加持续可见的版本号显示，移动端也补充了左下角轻量版本标签，并避开底部导航区域。
4. 本次改动将继续通过 lint/build/docker build 验证，再根据新的部署日志判断是否仍存在纯网络环境问题。

---

## [当前节点] v1.0.1 置顶持久化修复、界面自定义与每日密码自动刷新
**时间：** 2026年04月28日 00:50
**状态：**
1. 修复后端 `ensureGroupShape()` 未保留 `pinned` 字段的问题，置顶状态现在可随 `/api/builds` 正常持久化。
2. 新增 `uiPreferences` 持久化配置，支持卡片尺寸、最小高度、每卡显示数量、列数、间距、侧栏宽度、圆角、按钮样式自定义。
3. `Header`、`Sidebar`、`GunCard`、`VariantItem` 已接入统一 UI 配置，首页浏览态与编辑态网格共用同一布局配置。
4. 已移除服务端内置明文 API Key，改为读取环境变量 `YOUSN_API_KEY`；配置文件下载接口也已改为脱敏输出，不再返回 provider 的真实密钥。
5. 前端新增“每日密码”跨天自动检测逻辑：进入新一天后会继续轮询检查，直到源头真正产出当天密码，同时支持页面回到前台时立即补检查，无需手动刷新整页。
6. 已同步更新 `package.json` 版本到 `1.0.1`，重写 `docs/release-notes.md` 为简短版本记录格式，并完成 lint/build 校验。

---

## [当前节点] 代码审查修复 — 必修项 + 延期项
**时间：** 2026年04月27日
**状态：** 全部修复完成

---

### 必修项（已完成）

| # | 问题 | 改动 |
|---|------|------|
| 1 | 类型安全 | `GunGroup` 增加 `pinned?: boolean`; 替换所有 `as any`; `cardDragHandleProps` 改为 `React.HTMLAttributes<HTMLElement>`; logs 改为具体类型; applyDailyPwd/shouldRefreshDailyPwd 参数改为联合类型 |
| 2 | 运行稳定性 | `handleCopy` 改为 async + clipboard fallback; `searchPollRef` 添加 useEffect cleanup; `pinTimeoutRef` 添加 useEffect cleanup |
| 3 | 数据一致性 | `handleSave` 改为信任服务端返回 `setSavedData(Array.isArray(serverData) ? serverData : draftData)` |
| 4 | 误操作风险 | 删除枪系/配置前增加 `window.confirm()` |
| 5 | API密钥隐藏 | 移除 vite.config.ts 中 `GEMINI_API_KEY` 注入和 `loadEnv` |

### 延期项（已完成）

| # | 问题 | 改动 |
|---|------|------|
| 4 | toast 缺 error 类型 | `ToastType` 添加 `'error'`; 颜色区分 error(红) / warn(橙) / success(黑) |
| 5 | 无加载 spinner | 首次 fetchData 非静默; 增加 spinner + 失败 retry 按钮 |
| 6 | 暗黑模式不完整 | AddGunModal、模式选择弹窗、自动采集弹窗补全 `dark:` 样式 |
| 7 | 来源链接无 URL 验证 | VariantItem sourceUrl 增加 `^https?:\/\/` 校验 |
| 8 | 无离线兜底 UI | 增加 `savedDataLoadError` 状态 + retry 按钮 |
| 9 | 代码重复 | `buildModelOptionValue/parseModelOptionValue` 提取到 `src/utils.ts`; App.tsx 删除本地定义改为 import |
| 10 | API 无分页 | 暂不需要 — 数据量极小(~507行JSON), 全量返回够用 |

### 未处理项（用户决定不修）

| # | 问题 | 原因 |
|---|------|------|
| 延期1 | App.tsx 过大 | 不拆 |
| 延期2 | CustomTheme 类型位置 | 不改 |
| 延期3 | onBlur setTimeout hack | 不改 |
| 必修6-12 | 后端安全 | 个人站, 仅朋友用 |

### 修改的文件

| 文件 | 改动摘要 |
|------|----------|
| `src/types.ts` | `GunGroup` 增加 `pinned?: boolean` |
| `src/App.tsx` | 去 `as any`; 类型安全; handleSave 信任服务端; confirm; spinner/retry; toast error; 暗黑补全; 去重函数; import 更新; searchPoll cleanup; fetchData 非静默 |
| `src/components/GunCard.tsx` | `cardDragHandleProps` 类型; `group.pinned` 去 as any; `handleCopy` async+fallback; pinTimeout cleanup |
| `src/components/AddGunModal.tsx` | 暗黑模式补全 |
| `src/components/VariantItem.tsx` | sourceUrl URL 格式校验 |
| `src/components/useToast.ts` | 添加 `error` 类型; toast 颜色区分 |
| `src/utils.ts` | 添加 `buildModelOptionValue` / `parseModelOptionValue` |
| `vite.config.ts` | 移除 `GEMINI_API_KEY` 注入 |

---

### 远期建议

1. 数据量超过 200 条时为 `/api/builds` 加分页
2. App.tsx 维护困难时拆分为独立组件
3. 网站对外开放时需后端安全加固（认证、速率限制、CSRF、helmet）

---

## [历史节点] 梳理规则与修复环境依赖
**时间：** 2026年04月24日 03:15
**状态：**
1. 精简并更新了规则文档，明确了后续上传 1Panel 的最终目标。
2. 明确了公司和家里两台电脑开发的交接规则。
3. 发现本地环境执行 Python 采集时报错 `No module named yt_dlp`。
4. **下一步待办**：在本地 Python 环境安装相关依赖以使得搜索及采集功能可以正常运行。

## [当前节点] 文档体系重构与版本基线建立
**时间：** 2026年04月27日 23:11
**状态：**
1. 新建 `docs/` 目录，准备集中放置规则、协作、部署、版本与进度文档。
2. 重写根目录 `README.md`，改为真实项目入口文档。
3. 新增根目录 `AGENTS.md`，作为 AI / CLI 工具协作入口。
4. 新增 `docs/project-rules.md`、`docs/collaboration.md`、`docs/deployment.md`、`docs/versioning.md`、`docs/release-notes.md`。
5. 将当前稳定基线正式定义为 `v1.0.0`。

## [当前节点] 深度拆分 server.ts 路由与工具库
**时间：** 2026年04月28日
**状态：**
1. 提取 `server/lib/collectSettings.ts`、`server/lib/merge.ts`、`server/lib/collector.ts` 等核心业务逻辑。
2. 提取 `server/routes/builds.ts`、`server/routes/collect.ts`、`server/routes/config.ts`、`server/routes/dailyPassword.ts` 路由模块。
3. 删除 `server.ts` 中的重复类型，改为复用 `src/types.ts`。
4. 在完成以上拆分后，对整体项目进行了 `lint` 与 `build` 校验，未发现异常。

更新时间：2026年04月28日
