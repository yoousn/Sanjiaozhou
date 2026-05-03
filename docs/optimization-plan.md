# 网站优化方案

**最近更新：** 2026年5月6日  
**说明：** 本文档在原 P1/P2 基础上新增 P0（必须立即处理的安全事故），并按全项目扫描结果补充代码质量、部署、可观测方向。原有"明确不做"和"静态资源长期缓存说明"保持不变。

## 本次更新摘要（2026.5.6）

- 原 `P2：安全和配置项清理` 提级为 **P0**：真实 API Key 与图床 Token 已进入公开 git 历史并被打成多个 tag，必须先轮换再改代码。
- 新增 P0：全站写接口鉴权、JSON 原子写、接口速率限制。
- 新增 P1：`App.tsx` 拆分、`React.memo` / `useMemo` 重渲染优化。
- 新增 P2：死依赖清理、前后端共享类型、多阶段 Dockerfile、compose 健康检查与日志轮转、CI 空跑 build、Python 依赖锁定、结构化日志、ETag、命名修补、自动化测试。
- P1 响应式图片、首页分页、Brotli 三个章节按代码实际位置做了修订。

## P0：立即执行

### P0-1：轮换已泄漏的密钥并删除硬编码默认值

事故确认：
- 模型真实 API Key 出现在 `server/lib/collectSettings.ts` 的 DEFAULT_PROVIDER 默认值。
- 同一 Key 出现在 `scripts/collect_bilibili_test.py` 作为 `os.getenv` 的 default 参数。
- CF 图床地址与 Token 出现在 `server/lib/communityUpload.ts` 顶部。
- 这三处默认值都已进入 `origin/main` 并被 `v1.0.1` / `v1.0.4` / `v1.0.7` 等多个 tag 收纳，公开仓库 clone 者均可拿到。

处理步骤（顺序不可颠倒）：
1. 先在 yousn.me 控制台和 CF 图床分别重新生成 Key 和 Token，旧值立即作废。
2. 改代码：
   - `server/lib/collectSettings.ts` 的 `DEFAULT_PROVIDER.apiKey` 改为 `process.env.DEFAULT_PROVIDER_API_KEY || ""`，`baseUrl` 改为 `process.env.DEFAULT_PROVIDER_BASE_URL || "https://api.yousn.me/v1"`；`apiKey` 为空时 `hasApiKey` 置 false，前端调用返回"未配置 API Key"。
   - `server/lib/communityUpload.ts`：删除 `CF_AUTH_TOKEN`、`CF_UPLOAD_URL` 字符串默认值，缺失直接 500 + 中文错误。
   - `scripts/collect_bilibili_test.py` 的 `AI_API_KEY` 改为 `os.getenv("OPENAI_API_KEY")`，未配置时打印提示并 `sys.exit(1)`。
3. 重写 `.env.example`，字段名至少包括：`CF_UPLOAD_URL`、`CF_AUTH_TOKEN`、`DEFAULT_PROVIDER_BASE_URL`、`DEFAULT_PROVIDER_API_KEY`、`OPENAI_API_KEY`、`OPENAI_BASE_URL`、`OPENAI_MODEL`。一律不写真实值。
4. `docker-compose.yml` 的 `environment:` 从服务器 `.env` 注入以上变量；`docs/deployment.md` 补"首次部署前必须在 `/opt/xiujiao-era/.env` 写好这些变量"的说明。
5. 本轮不做 `git filter-repo` 历史清理，泄漏按"已发生事故"处理；如未来要做，需单独窗口并通知所有协作者重新 clone。

验收：
- `rg -n "sk-88"`、`rg -n "lrhlol"`、`rg -n "img.yousn.me"` 仅命中 `.env.example` 占位或文档引用。
- 未配置关键环境变量时，`/api/community/upload`、模型相关接口返回中文错误，不再悄悄打向旧图床或泄漏 Key。
- 服务端日志确认旧 Key 访问返回 401。

### P0-2：给写接口加鉴权

现状：`server/routes/builds.ts`、`server/routes/config.ts`、`server/routes/collect.ts`、`server/routes/community.ts` 里的写接口都没有身份校验；`useAuth` 只把用户对象塞在 `localStorage`，服务端完全无法识别请求方。

目标：
1. 登录成功签发 HttpOnly + SameSite=Lax + Secure 的 cookie，内容为 `userId + role` + HMAC 签名，有效期与现有 180 天免登对齐。
2. 新建 `requireAuth` / `requireAdmin` middleware。
3. 接入范围：
   - `/api/builds` POST、`/api/config/*`、`/api/collect/*`、`/api/collect/auto*`：仅 admin。
   - `/api/community/posts` POST、评论 POST：登录用户即可。
   - `DELETE /api/community/posts/:id`、`DELETE /api/community/posts/:id/comments/:commentId`：仅帖子 / 评论作者本人或 admin。
4. `users.json` 新增 `role: "admin" | "user"` 字段，默认 `user`；部署后用脚本把第一个用户或指定用户名标记为 admin。
5. 新增 `/api/auth/me` 供前端首屏确认登录态并拿回 `role`；`useAuth` 不再仅依赖 `localStorage`。

验收：
- 未登录 curl 调 `/api/builds` POST、`DELETE /api/community/posts/:id`、`/api/config/cookie` POST 等一律 401。
- 非作者用户不能删除他人帖子或评论。
- 前端"删除帖子"按钮仅在 `post.uploader === auth.user.username || role === "admin"` 时渲染。

### P0-3：JSON 持久化改为原子写

现状：`server/lib/communityStore.ts`、`server/lib/userStore.ts`、`server/lib/commentStore.ts`、`server/lib/communityActivity.ts`、`server/lib/collectSettings.ts`、`server/lib/logs.ts`、`server/routes/builds.ts`、`server/routes/dailyPassword.ts` 都直接 `fs.writeFileSync`。容器 `up -d` 重启或进程异常时写入中途被 kill，会留下空文件或半截 JSON，直接丢失运行态数据。

处理：
1. 新增 `server/lib/atomicJson.ts`，提供 `writeJsonAtomic(path, data)`：写 `path + ".tmp"` 后 `fs.renameSync` 覆盖。
2. 以上所有写 JSON 位置统一切换到新函数。
3. 读端遇到遗留 `.tmp` 文件选择忽略或清理。

验收：
- 模拟写入中 kill 进程，目标 JSON 仍是上一个完整版本。
- 代码中不再出现 `writeFileSync(..., JSON.stringify(...))` 的组合。

### P0-4：登录 / 上传 / 发帖接口加速率限制

接入 `express-rate-limit`：
- `/api/auth/*`：每 IP 每分钟 5 次。
- `/api/community/upload`：每 IP 每分钟 10 次。
- `/api/community/posts` POST：每 IP 每分钟 10 次。
- 超限返回 429，带 `Retry-After`。

验收：对以上接口 curl 压测 50 次可见 429 响应。

---

## P1：下一轮重点

### P1-1：响应式图片升级
当前社区图片上传阶段已经会压缩为 WebP，这是正确基础。下一步优先升级为响应式图像体系。

目标：
1. 上传图片后生成三档资源：
   - 缩略图：用于社区列表、小卡片、预览前占位。
   - 中图：用于普通帖子详情 / 列表较大卡片。
   - 原图或大图：用于点击图片后的全屏预览。
2. 列表默认加载缩略图，减少首屏和滚动时的图片带宽。
3. 点击预览时再加载大图，避免所有大图提前下载。
4. 前端 `<img>` 增加 `srcSet` / `sizes`，让浏览器按屏幕宽度和 DPR 自动选择合适资源。
5. 首屏关键图片可使用 `fetchpriority="high"`；非首屏图片继续使用 `loading="lazy"` 与 `decoding="async"`。

建议实现方式：
- 后端上传处理继续使用 `sharp`；上传前先 `sharp(buffer).metadata()` 真实探测格式，失败直接拒绝，防止 MIME 伪造绕过。
- 非 GIF 图片生成：
  - `thumb`：约 320px 宽（社区卡片实际宽 < 360px，原 480px 偏大），WebP，质量 70。
  - `medium`：约 960px 宽，WebP，质量 75-80。
  - `large`：约 1920px 宽，WebP，质量 80。
- GIF 除 MIME 校验外，增加"最大像素宽度 4000、最大体积 10MB、最大帧数 200"限制；不强制转码以免破坏动图。
- 社区帖子数据结构从单个 `imageUrl` 扩展为兼容旧数据的结构：

```ts
imageUrl?: string; // 旧字段，继续兼容
imageVariants?: {
  thumb?: string;
  medium?: string;
  large?: string;
  original?: string;
};
```

前端显示策略：
- `src/components/community/CommunityPostCard.tsx` 里的 `LazyImage` 升级为支持 `srcSet` + `sizes` 透传。
- 列表卡片优先使用 `imageVariants.thumb || imageVariants.medium || imageUrl`。
- `srcSet` 使用 `thumb 320w, medium 960w, large 1920w`。
- `sizes` 根据布局设置，例如社区列表：

```html
<img
  src="thumb.webp"
  srcset="thumb.webp 320w, medium.webp 960w, large.webp 1920w"
  sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 360px"
  loading="lazy"
  decoding="async"
/>
```

注意事项：
- 必须兼容历史帖子旧 `imageUrl` 数据，不能让旧图片失效。
- 删除帖子时同步删除三档图片，避免图床残留；`communityUpload.ts` 的 CF 删除封装对每个 variant 调用一次。
- 上传已生成但 `createPost` 步骤失败时，必须回滚已上传到 CF 的资源（当前 `src/components/community/CommunityComposer.tsx` 的 upload + create 两步流程会在第二步失败时留下孤儿图片）。
- 上传失败时要返回清晰错误。

---

### P1-2：首页枪械分页
如果枪械数据继续增长，当前首页一次性渲染全部枪械卡片会增加 DOM 数量、动画数量和 React 渲染压力。

目标：
1. 首页枪械列表每页显示 12 个枪械，`PAGE_SIZE = 12` 作为常量放入 `src/constants.ts`。
2. 搜索、分类、排序后，再基于过滤结果分页。
3. 切换分类、搜索关键词或排序方式时，页码自动回到第 1 页。
4. 分页控件显示：上一页、下一页、当前页、总页数。
5. 编辑模式下且 `sortBy === 'default'` 时，禁用分页（或给出"手动排序时已显示全部"的提示），避免跨页拖拽与 `@dnd-kit` 的 `SortableContext` 列表不一致。

建议实现方式：
- 在 `App.tsx` 中新增 `currentPage` 状态。
- 必须先把 `viewData` 用 `useMemo` 缓存（当前 `src/App.tsx:501-524` 没有做 memo，每次 state 变化都在重算过滤 + 排序；见 P1-5），再在 memo 结果上分页。
- 计算流程：
  1. `sourceData`
  2. 分类过滤
  3. 搜索过滤
  4. 排序
  5. 得到 `filteredData`（useMemo）
  6. 根据 `currentPage` 切出 `pagedData`
  7. 页面渲染 `pagedData`

```ts
const totalPages = Math.max(1, Math.ceil(filteredData.length / PAGE_SIZE));
const safePage = Math.min(currentPage, totalPages);
const pagedData = filteredData.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
```

交互建议：
- 数据少于等于 12 条时不显示分页器。
- 页码变化后可滚动回列表顶部。
- 移动端分页按钮要足够大，避免误触。
- 未来数据量超过约 300 条时，再考虑 `@tanstack/react-virtual` 虚拟滚动替代分页。

---

### P1-3：让 Brotli 真正在线上生效
当前项目已经通过 `vite-plugin-compression` 生成 `.br` 文件，但线上是否真正返回 Brotli 取决于静态服务配置。生产环境看起来直接把 Express 暴露在 `:3000`，没有 Nginx 前置层，因此推荐直接走 Express 路线。

目标：
1. 确认生产环境请求 JS/CSS 时，响应头包含：
   - `Content-Encoding: br`
   - 正确的 `Content-Type`
2. `index.html` 不做强缓存，`/assets/*` 做长期 immutable 缓存。
3. 动态 API 不受影响。

推荐方案（Express 路线）：
- 接入 `express-static-gzip`，`{ enableBrotli: true, orderPreference: ["br", "gz"], serveStatic: { setHeaders } }`，自动优先命中预生成的 `.br`。
- 在 `setHeaders` 里对 `.html` 设 `Cache-Control: no-cache, must-revalidate`，对 `/assets/*` 设 `Cache-Control: public, max-age=31536000, immutable`。
- API 路由继续由 `compression()` 兜底。

备选方案（若未来引入 Nginx）：
- 开启 `brotli_static on;`，保留 gzip 兜底。
- `index.html` 不做长期强缓存。

验收：
- 浏览器 Network 面板查看主 JS/CSS，能看到 `Content-Encoding: br`。
- 服务器不需要每次动态压缩 Vite 静态产物。
- API、设置保存、每日密码等动态接口响应不变。

---

### P1-4：拆分 `App.tsx`
现状：`src/App.tsx` 729 行，承担每日密码同步、鉴权、主题、模型配置、Cookie 上传、设置下载、排序、拖拽、编辑模式等多个职责，耦合严重、难维护。

拆分计划（hooks 放 `src/hooks/`）：
- `useBuildsMutations`：save / pin / applyCollected / `queryClient.setQueryData`。
- `useModelProviderForm`：fetch / save / delete provider、selected provider / selected model 状态。
- `useSettingsActions`：cookie 上传、data.json 下载、settings 下载、settings-file status。
- `useCardDnd`：卡片 + widget 拖拽逻辑。

拆完后 `App.tsx` 只保留路由 / 布局 / Modal 组合，目标 < 250 行。

验收：
- 单组件行数 < 300。
- `npm run lint` 通过。
- 回归：密码刷新、添加枪械、保存、编辑、拖拽、采集、社区、设置下载、主题切换全部正常。

---

### P1-5：列表项 `React.memo` + `useCallback`
现状：`GunCard`、`VariantItem`、`CommunityPostCard` 作为长列表项均未 memo 化；`App.tsx` 内大量 handler 未 `useCallback`。在搜索框每输入一个字符，整个列表会全量重绘。

处理：
- 对列表项组件加 `React.memo`。
- 传入列表项的 handler 用 `useCallback` 包装，避免每次 render 都产生新引用。
- `viewData`、`filteredSuggestions`、`gridClassName`、`sortableItems` 用 `useMemo`。
- `src/hooks/useCommunity.ts` 里 `queryClient.setQueryData(..., (prev) => prev.map(...))` 需要处理 `prev` 可能为 `undefined` 的情况（`(prev ?? []).map`）。
- 社区乐观更新与 `refetchInterval: 10000` 会互相覆盖，考虑互动后主动 `invalidateQueries` 或引入短暂的 refetch 暂停窗口。

验收：
- React DevTools Profiler 下，输入搜索字符时未变化的卡片不再出现在渲染列表中。
- 搜索输入 / 切分类 / 切排序 时帧率显著平稳。

---

## P2：规划中

### P2-1：完善 CDN 策略
当前社区图片已经走外部图床，但网站静态资源、图片多尺寸缓存、CDN 域名策略还可以继续规范。

目标：
1. 图片资源优先走图床/CDN。
2. 响应式图片三档资源全部使用唯一文件名，适合长期缓存。
3. JS/CSS 是否接 CDN 暂缓，先确认部署流程和缓存策略后再做。
4. API、设置、模型配置、每日密码、社区列表不走 CDN 强缓存。

推荐策略：
- 第一阶段只做图片 CDN 与图片长期缓存。
- 第二阶段再考虑 Vite `assets/*` 通过 CDN 缓存（已由 P1-3 的 immutable 头打好基础）。
- `index.html` 必须短缓存或不缓存，保证发布后能拉到最新资源入口。
- 动态 API 明确加 `Cache-Control: no-store` 或保持默认不缓存。

---

### P2-2：谨慎使用 `will-change`
全项目 grep 仅 `src/index.css:23` 一处使用，范围已经很小。本轮只需：
- 不再额外添加 `will-change`。
- 新动效统一走 framer-motion 内置合成优化，不手写 `will-change`。
- 如移动端滚动出现卡顿，优先检查合成层数，再决定是否引入。

---

### P2-3：清理死依赖
`package.json` 中 `@google/genai`、`openai`、`rss-parser`、`@types/sharp`（sharp 0.32+ 自带类型）全项目无任何 `import`。清理后可节省 `node_modules` 几十 MB 和 `npm ci` 数秒时间。

验收：`rg -n "from '@google/genai'"`、`rg -n "from 'openai'"`、`rg -n "from 'rss-parser'"` 全项目无命中，即可从 `package.json` 移除并重跑 `npm install`。

---

### P2-4：统一类型与工具，减少前后端重复定义
- `GunGroup` / `GunVariant` 在 `src/types.ts:54-72` 和 `server/lib/shape.ts` 各写一份，字段已经出现偏差风险。
- `buildModelOptionValue` / `parseModelOptionValue` 在 `src/utils.ts:79-89` 和 `server/lib/collectSettings.ts` 各实现一次。

处理：
- 新建 `shared/` 目录，`tsconfig.json` 和 `tsconfig.server.json` 都加 `paths` 映射。
- 双方 import `shared/types`、`shared/modelOption`，删除各自的重复副本。

---

### P2-5：Dockerfile 多阶段 + 镜像瘦身
现状：单阶段 Dockerfile 把 devDependencies、npm 缓存、构建链、Chromium、playwright 全部打在一起，镜像估计超过 1GB。

改造：
- stage1 `deps`：`npm ci` 仅装依赖。
- stage2 `build`：复制源码并 `npm run build`。
- stage3 运行时：只复制 `dist/`、`server/`、`server.ts`、`package.json`，再 `npm ci --omit=dev`；Python + chromium + playwright 仍在 stage3 层。

验收：镜像尺寸下降至少 40%，`docker-compose up -d` 启动时间不劣化，每日密码脚本仍可正常跑。

---

### P2-6：`docker-compose.yml` 小修
- 删除 `version: '3.8'`（Compose v2 已废弃）。
- 增加 `healthcheck:`，例如 `curl -f http://localhost:3000/api/config/cookie/status`。
- 增加 `logging: driver: json-file, options: { max-size: "10m", max-file: "3" }`，避免日志无限增长。
- 评估 `container_name: xiujiao-ai` 是否需要保留（会阻碍蓝绿升级）。

---

### P2-7：去掉 CI 流水线中的空跑 build
`.github/workflows/deploy.yml` 中 `npm ci + npm run build` 的产物从未被上传到服务器，真正构建在服务器 Docker 内。建议：
- CI 只保留 `npm run lint`（`tsc --noEmit`）。
- build 完全交给服务器 Docker 执行。
- 预计节省 2-3 分钟流水线时间。

---

### P2-8：Python 依赖锁定
`requirements.txt` 只有 25 字节，但 `Dockerfile` 里 `pip install requests yt-dlp playwright` 未锁版本（yt-dlp 变更极频繁）。让 `requirements.txt` 统一覆盖全部 Python 依赖并锁版本，Dockerfile 改为 `pip install -r requirements.txt`。

---

### P2-9：结构化日志
后端只有几行 `console.log / console.error`，Docker 日志没有结构。建议：
- 接入 `morgan` 做访问日志。
- 接入 `pino` 做应用日志（含 level、timestamp、请求 id）。
- `auto_logs.json` / `daily_pwd_logs.json` 保持 100 条上限逻辑不变。

---

### P2-10：热接口加 ETag
builds `refetchInterval: 60000`、社区 `refetchInterval: 10000`、activity `refetchInterval: 15000`，长开页面持续打服务端。服务端基于 mtime 或 JSON hash 返回 `ETag` / `Last-Modified`，客户端命中 304 就不再回传整包 JSON 体。

---

### P2-11：命名、位置与小修补
- `src/components/useToast.ts` 迁到 `src/hooks/useToast.ts`。
- `src/components/MotionProvider.tsx` 并没有 Provider，改名 `motionPresets.ts`。
- `DELETE /api/community/posts/:id/comments/:commentId` 的 `:id` 路径参数当前未参与查找，建议改为 `/api/community/comments/:commentId` 或内部校验 postId 与 commentId 对应。
- `CommunityPostCard` 的 Trash 按钮同时写了 `opacity-0`、`hover:opacity-100` 和 `style={{opacity: 0.6}}`，内联 style 永远赢，删掉冗余类名；并结合 P0-2 只对帖子作者 / admin 渲染。
- 评论区 `window.alert` / `window.confirm` 统一替换为现有 Toast 体系。
- 根目录 `23366171d0bc95587ccd61d43e8d880b.txt` 看起来像 Cloudflare 域名验证文件，确认用途并在 README 注明，或删除。

---

### P2-12：引入自动化测试
- Vitest 单测：`mergeCollectedGroups`、`mergeGroupVariants`、`ensureGroupShape`、`parseModelOptionValue`、未来的 `writeJsonAtomic`。
- Playwright E2E：登录 / 发帖 / 评论 / 点赞 / 删除 的最小链路。
- `npm run lint` 扩展覆盖 ESLint，不只 `tsc --noEmit`。

---

## 明确不做

### 暂不做：减少动态效果适配
本轮不做用户"减少动态效果"适配，不接入 `prefers-reduced-motion` 或 Framer Motion 的 `useReducedMotion()`。

原因：当前优先目标是 P0 安全、P1 图片/分页/Brotli/拆分、P2 部署与可观测。

### 暂不做：git 历史清理
`git filter-repo` 重写历史会让所有协作者需要重新 clone，成本高。本轮只做 P0-1 的"密钥轮换 + 删除默认值"，已泄漏的 commit 按已发生事故处理。如未来要做历史清理，需单独排窗口期并通知所有协作者。

---

## 静态资源长期缓存策略说明

### 结论
可以优先只对“图片类静态资源”做长期缓存；暂时不建议贸然对所有资源统一强缓存。

你的担心是合理的：网站里有设置保存、主题配置、模型配置、社区数据等动态内容，这些内容必须保存后立即生效，不能被缓存影响。

### 可以缓存的内容
适合长期缓存：
- 图床图片。
- 上传后文件名带唯一时间戳或 hash 的图片。
- Vite 构建后带 hash 的 `assets/*.js`、`assets/*.css` 理论上也可以长期缓存，但需要确认线上部署和 HTML 更新策略。

### 不建议强缓存的内容
不要强缓存：
- `index.html`。
- `/api/*` 接口。
- 用户设置接口。
- 模型配置接口。
- 每日密码接口。
- 社区帖子列表接口。
- 本地 JSON 数据接口。

### 推荐策略
第一阶段只做：
1. 图片 CDN / 图床缓存。
2. 图片文件名保持唯一，例如 `community_时间戳_thumb.webp`。
3. 图片响应头可设置较长缓存，例如：

```http
Cache-Control: public, max-age=31536000, immutable
```

暂不改：
- `index.html` 缓存。
- API 缓存。
- 用户配置相关缓存。

后续确认 Vite 构建产物 hash 与部署流程稳定后，再考虑给 `/assets/*` 增加长期缓存。

---

## 建议执行顺序

**P0（本周内完成）**
1. P0-1 轮换泄漏密钥 + 删除硬编码默认值 + 更新 `.env.example` 与 `docker-compose.yml` ✔
2. P0-3 JSON 原子写（为后续数据改动建立安全底座）✔。
3. P0-2 写接口鉴权（依赖 `users.json` 加 `role` 字段）✔。
4. P0-4 登录 / 上传 / 发帖接口速率限制 ✔。

**P1（下一阶段）**
5. P1-1 响应式图片三档生成（**延后**：当前 R2+Worker 不支持动态缩图，需先升级 Worker；已做的部分：`LazyImage` 已有 `loading="lazy"`/`decoding="async"`/aspect-ratio 防 CLS，上传端已用 `sharp` 压成 `webp@1920px@q80`）。
6. P1-5 `React.memo` / `useMemo` / `useCallback` 基础优化 ✔（`GunCard`、`SortableGunCard`、`CommunityPostCard`、`LazyImage` 已 memo；`viewData` 已 useMemo）。
7. P1-2 首页枪械分页 ✔（每页 24 张，编辑模式下不分页避免与拖拽冲突，切换分类/搜索/排序时自动回到首页）。
8. P1-4 拆分 `App.tsx` 为专用 hooks（**延后到 P2**：729 行高度耦合，纯重构无功能收益且风险高）。
9. P1-3 接入 `express-static-gzip` ✔（生产环境优先 Brotli，开启 ETag）。

**P2（规划中）**
10. P2-1 图片 CDN / 长期缓存策略 ✔（dist/assets/ 带 hash 文件设置 1 年长期缓存，index.html 保持 0）。
11. P2-3 清理死依赖 ✔（移除 `@google/genai`、`rss-parser`、`autoprefixer`、`@types/sharp` 共 4 个死依赖）。
12. P2-4 统一前后端共享类型 / 工具 ✔（新建 `shared/` 目录，`GunGroup`/`GunVariant`/`CollectConcurrencySettings`/`CollectModelOption`/`CollectCreator` 统一由 `shared/types.ts` 导出；`buildModelOptionValue`/`parseModelOptionValue` 统一由 `shared/modelOption.ts` 导出；`src/types.ts`、`server/lib/shape.ts`、`server/lib/collectSettings.ts`、`server/lib/merge.ts` 全部改为从 shared 引入，删除各处重复副本）。
13. P2-5 Dockerfile 多阶段 + 镜像瘦身 ✔（builder 阶段构建 dist，runner 阶段仅保留生产依赖与运行代码）。
14. P2-6 docker-compose 健康检查 + 日志轮转 ✔（健康检查探测 /api/builds，日志限制 10m×3 份）。
15. P2-7 CI 去除空跑 build（无 `.github/workflows`，跳过）。
16. P2-8 Python 依赖锁定 ✔（`requirements.txt` 固定 requests/yt-dlp/playwright 版本，Dockerfile 改为 `-r requirements.txt` 安装）。
17. P2-9 结构化日志 ✔（后端 console.* 全部替换为 JSON 格式 logger，含 time/level/msg 字段）。
18. P2-10 热接口 ETag ✔（builds、community/posts、collect/meta 已接入 mtime 基础 ETag + 304 返回）。
19. P2-11 命名 / 位置 / 小修补。
20. P2-12 自动化测试（Vitest + Playwright + ESLint）。
21. P2-2 `will-change` 审查（体量很小，作为最后 sanity check）。
22. 完成后执行类型检查、`npm run lint`、构建验证。

## 验收标准

### P0 安全与数据完整性
- `rg -n "sk-88"`、`rg -n "lrhlol"`、`rg -n "img.yousn.me"` 仅命中 `.env.example` 占位或文档引用。
- 未配置关键环境变量时，`/api/community/upload` 与模型接口返回明确中文错误；服务端日志确认旧 Key 请求返回 401。
- 未登录 curl 调 `/api/builds` POST、`DELETE /api/community/posts/:id`、`/api/config/cookie` POST 等一律 401；非作者不能删除他人帖子或评论。
- 模拟写入中 kill 进程，所有运行态 JSON 仍然是上一次完整版本（`writeFileSync(..., JSON.stringify(...))` 组合在代码中不再出现）。
- 对登录 / 上传 / 发帖接口 curl 压测 50 次可见 429 响应。

### 响应式图片
- 新上传图片会生成缩略图、中图、大图。
- 旧帖子只有 `imageUrl` 时仍能正常显示。
- 社区列表优先加载小图。
- 点击预览加载大图。
- 图片标签包含合理的 `srcSet` / `sizes`。
- 删除帖子时不会残留多尺寸图片。
- 上传成功但建帖失败时 CF 上的图片会被清理。

### 首页分页 / 重渲染优化
- 每页最多显示 12 个枪械。
- 分类、搜索、排序后分页结果正确。
- 切换过滤条件后自动回到第一页。
- 数据不足 12 条时不显示分页器。
- 移动端分页控件可正常使用。
- React DevTools Profiler 下，输入搜索字符时未变化的卡片不再重新渲染。

### App.tsx 拆分
- `App.tsx` 主组件 < 250 行。
- 每日密码、添加枪械、保存、编辑、拖拽、采集、社区、设置下载、主题切换全部回归通过。

### Brotli / CDN / 缓存
- JS/CSS 线上能看到 `Content-Encoding: br`。
- `index.html` 不走长期缓存，`/assets/*` 带 `immutable` 头。
- 图片可以长期缓存。
- 设置保存、接口数据、每日密码、社区列表不受缓存影响，保存后仍能立即生效。

### 部署 / 构建
- Docker 镜像尺寸下降至少 40%。
- docker-compose 带 healthcheck + 日志轮转。
- CI 流水线去掉空跑 build 后仍能部署成功。
- Python 依赖锁定版本，Dockerfile 只通过 `requirements.txt` 安装。

### 可观测 / 测试
- 后端能在 Docker 日志看到结构化访问日志与应用日志。
- builds / community / activity 三个热接口具备 ETag，命中 304 时不再回传完整 JSON 体。
- Vitest 单测覆盖核心纯函数；Playwright E2E 跑通最小登录+社区链路。
