# 网站性能优化方案：响应式图片、分页、CDN 与线上压缩

**日期：** 2026年5月3日  
**目的：** 明确下一轮优化方向，优先解决图片加载体积、首页枪械分页、CDN 缓存、Brotli 线上生效、安全配置与动画资源占用问题。

## 优先级调整结论

### P1：响应式图片升级
当前社区图片上传阶段已经会压缩为 WebP，这是正确基础。下一步优先升级为响应式图像体系。

目标：
1. 上传图片后生成三档资源：
   - 缩略图：用于社区列表、小卡片、预览前占位。
   - 中图：用于普通帖子详情/列表较大卡片。
   - 原图或大图：用于点击图片后的全屏预览。
2. 列表默认加载缩略图，减少首屏和滚动时的图片带宽。
3. 点击预览时再加载大图，避免所有大图提前下载。
4. 前端 `<img>` 增加 `srcSet` / `sizes`，让浏览器按屏幕宽度和 DPR 自动选择合适资源。
5. 首屏关键图片可使用 `fetchpriority="high"`；非首屏图片继续使用 `loading="lazy"` 与 `decoding="async"`。

建议实现方式：
- 后端上传处理继续使用 `sharp`。
- 非 GIF 图片生成：
  - `thumb`：约 480px 宽，WebP，质量 70-75。
  - `medium`：约 960px 或 1280px 宽，WebP，质量 75-80。
  - `large`：约 1920px 宽，WebP，质量 80。
- GIF 暂时不强制转码，避免破坏动图；后续如需要可单独处理 GIF 首帧缩略图。
- 社区帖子数据结构建议从单个 `imageUrl` 扩展为兼容旧数据的结构：

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
- 列表卡片优先使用 `imageVariants.thumb || imageVariants.medium || imageUrl`。
- `srcSet` 使用 `thumb 480w, medium 960w, large 1920w`。
- `sizes` 根据布局设置，例如社区列表可用：

```html
<img
  src="thumb.webp"
  srcset="thumb.webp 480w, medium.webp 960w, large.webp 1920w"
  sizes="(max-width: 768px) 100vw, (max-width: 1280px) 66vw, 720px"
  loading="lazy"
  decoding="async"
/>
```

注意事项：
- 必须兼容历史帖子旧 `imageUrl` 数据，不能让旧图片失效。
- 删除帖子时，需要同步删除三档图片，避免图床残留。
- 上传失败时要返回清晰错误，避免只生成部分图片后数据不一致。

---

### P1：首页枪械分页
如果枪械数据继续增长，当前首页一次性渲染全部枪械卡片会增加 DOM 数量、动画数量和 React 渲染压力。现在需要加入分页功能。

目标：
1. 首页枪械列表每页显示 12 个枪械。
2. 搜索、分类、排序后，再基于过滤结果分页。
3. 切换分类、搜索关键词或排序方式时，页码自动回到第 1 页。
4. 分页控件显示：上一页、下一页、当前页、总页数。
5. 编辑模式下需要谨慎处理拖拽排序：
   - 建议第一版只允许当前页内拖拽。
   - 或者编辑模式下保留完整排序逻辑，但显示清晰提示。

建议实现方式：
- 在 `App.tsx` 中增加 `currentPage` 状态。
- 常量：`PAGE_SIZE = 12`。
- 计算流程建议为：
  1. `sourceData`
  2. 分类过滤
  3. 搜索过滤
  4. 排序
  5. 得到 `filteredData`
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

---

### P1：让 Brotli 真正在线上生效
当前项目已经通过 `vite-plugin-compression` 生成 `.br` 文件，但线上是否真正返回 Brotli 取决于静态服务配置。

目标：
1. 确认生产环境请求 JS/CSS 时，响应头包含：
   - `Content-Encoding: br`
   - 正确的 `Content-Type`
2. 如果前面有 Nginx，优先由 Nginx 处理 `.br` 静态文件。
3. 如果只靠 Express，需要增加支持 `.br` 预压缩资源返回的中间件。

推荐方案：
- Nginx 场景：
  - 开启 `brotli_static on;`。
  - 保留 gzip 兜底。
  - `index.html` 不做长期强缓存。
- Express 场景：
  - 在 `express.static` 前判断 `Accept-Encoding`。
  - 如果存在同名 `.br` 文件，则设置 `Content-Encoding: br` 并返回 `.br`。
  - API 继续交给 `compression()` 兜底。

验收标准：
- 浏览器 Network 面板查看主 JS/CSS，能看到 `br` 编码。
- 服务器不需要每次动态压缩 Vite 静态产物。
- 不影响 API、设置保存和每日密码等动态接口。

---

### P2：完善 CDN 策略
当前社区图片已经走外部图床，但网站静态资源、图片多尺寸缓存、CDN 域名策略还可以继续规范。

目标：
1. 图片资源优先走图床/CDN。
2. 响应式图片三档资源全部使用唯一文件名，适合长期缓存。
3. JS/CSS 是否接 CDN 暂缓，先确认部署流程和缓存策略后再做。
4. API、设置、模型配置、每日密码、社区列表不走 CDN 强缓存。

推荐策略：
- 第一阶段只做图片 CDN 与图片长期缓存。
- 第二阶段再考虑 Vite `assets/*` 通过 CDN 缓存。
- `index.html` 必须短缓存或不缓存，保证发布后能拉到最新资源入口。
- 动态 API 明确加 `Cache-Control: no-store` 或保持默认不缓存。

---

### P2：谨慎使用 `will-change`
`will-change` 可以提高动画流畅度，但长期挂在大量元素上会占用额外合成层和 GPU 内存。

目标：
1. 不给大量列表卡片永久挂 `will-change`。
2. 只给真正高频动画元素使用，例如弹窗、Toast、临时进入动画。
3. 如果动画元素数量很多，动画结束后移除或避免使用 `will-change`。

建议处理：
- 保留少量关键动效的 `will-change: transform, opacity`。
- 首页大量卡片优先依赖 Framer Motion 的 transform 动画，不额外批量添加 `will-change`。
- 如发现移动端滚动卡顿或内存占用高，优先检查是否存在过多合成层。

---

### P2：安全和配置项清理
当前图床配置存在默认值写在代码里的风险，后续应清理为纯环境变量配置。

目标：
1. 移除代码中的真实 Token 或容易误用的默认 Token。
2. 图床地址、图床 Token、模型 API Key 等敏感配置全部从环境变量读取。
3. 提供 `.env.example` 或部署文档说明字段名，但不写真实值。
4. 没有配置时功能应明确报错，而不是使用代码里的默认密钥。

建议处理：
- `CF_UPLOAD_URL`：可保留空默认或文档示例，但不应写真实生产地址/密钥组合。
- `CF_AUTH_TOKEN`：必须来自环境变量。
- 上传接口发现缺少 Token 时返回“图床服务未配置”。
- 检查 release、文档、示例中是否误写真实 Token。

---

## 明确不做

### 暂不做：减少动态效果适配
本轮不做用户“减少动态效果”适配，不接入 `prefers-reduced-motion` 或 Framer Motion 的 `useReducedMotion()`。

原因：当前优先目标是图片、分页、Brotli、CDN、安全配置与 `will-change` 使用控制。

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

1. 实现社区图片三档生成与数据结构兼容。
2. 前端图片组件支持 `srcSet`、`sizes`、缩略图列表展示、大图预览。
3. 删除图片时同步删除多尺寸文件。
4. 首页枪械列表加入 12 条/页分页。
5. 确认 Brotli 在线上真正返回 `Content-Encoding: br`。
6. 完善图片 CDN 与图片长期缓存策略。
7. 清理图床 Token、模型密钥等敏感配置默认值。
8. 检查并控制 `will-change` 使用范围。
9. 完成后执行类型检查与构建验证。

## 验收标准

### 响应式图片
- 新上传图片会生成缩略图、中图、大图。
- 旧帖子只有 `imageUrl` 时仍能正常显示。
- 社区列表优先加载小图。
- 点击预览加载大图。
- 图片标签包含合理的 `srcSet` / `sizes`。
- 删除帖子时不会残留多尺寸图片。

### 首页分页
- 每页最多显示 12 个枪械。
- 分类、搜索、排序后分页结果正确。
- 切换过滤条件后自动回到第一页。
- 数据不足 12 条时不显示分页器。
- 移动端分页控件可正常使用。

### Brotli / CDN / 缓存
- JS/CSS 线上能看到 `Content-Encoding: br`。
- 图片可以长期缓存。
- 设置保存、接口数据、每日密码、社区列表不受缓存影响，保存后仍能立即生效。

### 安全配置
- 代码中不保留真实 Token。
- 未配置图床环境变量时明确报错。
- 示例文档只写变量名，不写真实密钥。
