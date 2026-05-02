# 项目进度存档

> 本文档记录详细施工过程与历史节点，不等同于正式版本说明。正式版本摘要请看 [release-notes.md](release-notes.md)。

## [当前节点] 修复自动采集死循环与异常重试机制
**时间：** 2026年5月2日
**编号：** 2026.5.2-1
**状态：**
1. 修复了 `scripts/collect_bilibili_test.py` 中解析 AI 响应缺失 `choices` 时导致 `'NoneType' object is not subscriptable` 的崩溃问题。
2. 修复了自动采集在视频提取成功（未发生异常）但未收集到枪械数据时，被错误判定为失败并无限加入 5 分钟重试队列的问题。
3. 在自动采集设置面板中新增了“取消重试任务”按钮，同时提供 `POST /api/collect/auto/cancel-retry` 接口支持一键终止死循环重试。

---更真实的请查看release-notes.md

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

## [当前节点] 恢复 v1.0.7 UI 并保留性能优化发版 v1.0.11
**时间/编号：** 2026.4.28-12
**状态：**
1. 从 `v1.0.7` 备份目录中恢复了 `Sidebar.tsx`、`EditCustomizePanel.tsx`、`types.ts` 和 `utils.ts`。
2. 移除了 `Drawer.tsx` 及其目录。
3. 谨慎修改了 `App.tsx`，将 `Drawer` 替换回 `Sidebar`，同时保留了 `useQuery`、`React.lazy` 等 v1.0.9/1.0.10 引入的性能优化与规范化代码。
4. 更新版本号为 `v1.0.11`，并同步了 `release-notes.md`。
5. 完成后删除了 `v1.0.7/` 备份文件夹和临时任务清单。

更新编号：2026.4.28-12

---

## [当前节点] 社区体验深度优化与鉴权系统上线 v1.0.12
**时间/编号：** 2026.4.29-1
**状态：**
1. **页面持久化**：使用 `localStorage` 记录 `activeTab`，刷新页面不再重置回首页。
2. **实时更新**：社区模块接入 `React Query` 并开启 10s 轮询，实现无刷新加载新帖。
3. **评论系统优化**：评论默认展开，并修复了评论列表的展示逻辑。
4. **鉴权系统上线**：
   - 实现“用户名+密码”注册登录（`bcryptjs` 加密）。
   - 登录凭证持久化 6 个月（180天免登）。
   - 强制身份逻辑：未登录评论固定显示为“匿名用户”，已登录则使用账号名，禁止手动篡改。
5. **图片加载**：优化了 `LazyImage` 骨架屏平滑过渡体验。

## [当前节点] 社区互动细节重构 v1.0.13
**时间/编号：** 2026.4.29-2
**状态：**
1. **移除彩蛋功能**：删除了页面右下角的纯 UI 飘星点赞悬浮按钮及其相关动画代码。
2. **点赞限制与身份校验**：
   - 将原来帖子的“🔥(火)”表情改为“👍(赞)”。
   - 更新数据库与前端状态，记录每个帖子的互动用户名单 (`reactedUsers`)。
   - 彻底拦截非登录用户的互动行为（前端警报提示，后端接口 401 拦截）。
   - 限制每个用户对每个表态（赞、钱、骷髅）只能点击一次，点击后按钮变为高亮禁用状态。
3. **安全更新**：接口层补齐了对缺失 `userId` 的异常处理，确保恶意调用无效。

## [当前节点] 后端图片压缩与发版 v1.0.14
**时间/编号：** 2026.4.29-3
**状态：**
1. **安装依赖**：引入了高性能的 Node.js 图像处理库 `sharp`。
2. **后端压缩**：在 `server/lib/communityUpload.ts` 中拦截上传流，强制将非 GIF 的超大图片在上传到 Cloudflare 之前：
   - 最大宽度限制为 1920px（不放大原图）。
   - 转换为 `WebP` 格式（80% 质量），极限缩小体积且几乎无损画质。
3. **性能区分**：向用户明确区分了 `v1.0.12` 的 `LazyImage`（属于前端延迟加载+骨架屏，不改变真实文件大小）与本次的后端硬压缩区别。

## [当前节点] 502 网关错误热修复与持久化数据防丢 v1.0.15
**时间/编号：** 2026.4.29-4
**状态：**
1. **彻底排查 502 错误**：将 `server.ts` 中的所有路由引入改造为`动态 import`，并放入最外层的 `try-catch` 块中。这样即使容器内部发生了罕见的原生模块（如 `sharp` 或 `bcryptjs`）加载崩溃，容器也绝**不会退出报错**，而是能成功启动 3000 端口，并在网页端直接暴露出具体的红字报错堆栈。从根源上将难以排查的“502 Bad Gateway”降级为可以直接在浏览器上肉眼看到原因的 500 页面。
2. **修复严重的数据丢失隐患**：之前的几次更新中，在 `scripts/` 目录下新增了鉴权文件（`users.json`）和社区文件（`community_posts.json`等），但**忘记了将它们映射到宿主机**。这会导致容器重启或重新构建时丢失所有的用户账号和社区动态！现在已经在 `docker-compose.yml` 和 `deploy_remote.sh` 脚本里全部加上了相应的 Volume 持久化映射。
3. **修复部署脚手架**：在 `Dockerfile` 和部署脚本中提前触碰新建（`touch`）这些新增的 JSON 文件，避免 Docker 把它们错误地作为空文件夹挂载。

## [当前节点] 社区交互体验增强与同步删除 v1.0.16
**时间/编号：** 2026.4.29-5
**状态：**
1. **取消点赞功能**：解除了之前互动表情（赞、钱、骷髅）的点按锁定状态。现在用户再次点击高亮的表情可以撤销互动（点赞总数-1），实现了和主流社区一致的 Toggle 逻辑。
2. **同步删除图床数据**：在调用 `DELETE /api/community/posts/:id` 时，如果原帖子包含图片，系统现在会自动提取 `imageUrl` 并附带管理员权限向 CF Workers 发送 `DELETE` 请求，彻底清除 R2 存储桶中的无用图片，防止空间浪费。
3. **UI 与文案抛光**：
   - 移除了社区评论框上方多余的“发布身份”栏，因为头像和身份已经显示在了右上角和每条评论左侧。
   - 彻底修复了帖子主表情之前仍为“🔥”的问题，现在全站统一并正确渲染为“👍”。
   - 修正了后端 Activity 日志的文案，将“分享/删除了配置”规范化为“分享/删除了帖子”。

更新编号：2026.4.29-5

---

## [当前节点] 移动端头部布局重排 v1.0.17
**时间/编号：** 2026.4.30-1
**状态：**
1. 在 `src/index.css` 中新增 `@media (max-width: 768px)` 媒体查询，仅对移动端生效。
2. 将 header 三区块（操作按钮组、标题描述、今日密码卡片）改为垂直居中排列，使用 CSS `order` 属性控制显示顺序：操作按钮→搜索栏→标题→密码卡片。
3. 完全未修改任何 HTML 结构或 JSX 类名，PC 端布局不受影响。
4. 同步更新 `package.json` 版本号为 `1.0.17`，`docs/release-notes.md` 新增对应版本说明。
5. 通过 `npm run build` 验证，无报错。

更新编号：2026.4.30-1

## [历史节点] 排序持久化与社区图标统一 v1.0.18
**时间/编号：** 2026.4.30-2
**状态：**
1. **排序持久化**：
   - 默认排序从 `'default'` 改为 `'date'`（按创建日期），刷新页面后按日期排序。
   - 切换其他排序方式（名称、价格）后自动写入 `localStorage`，刷新后读取恢复，不再重置为默认。
   - Header 下拉文案调整："默认排序" 对应按创建日期，编辑模式下的手动排序标为"手动排序"。
2. **社区图标统一**：社区帖子互动表情 `🔥` → `👍`。
3. **版本号升至 `1.0.18`**，通过 `npm run build` 验证，无报错。
更真实的请查看release-notes.md