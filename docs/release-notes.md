v1.0.0   日期2026.4.27---1
说明
- 建立正式文档体系与版本记录规则
- 重构根目录说明文档，只保留 README.md 与 AGENTS.md

v1.0.1   日期2026.4.28---2
说明
- 修复置顶状态刷新后丢失的问题
- 新增界面自定义项，可调整卡片、列数、间距、侧栏、圆角与按钮样式
- 优化卡片、顶部操作区与整体布局表现

v1.0.2   日期2026.4.28---3
说明
- 将界面自定义移动到编辑模式首页顶部，调节位置更直观
- 卡片尺寸、最小高度、间距、圆角改为更适合实时预览的滑动调整
- 正式版本发布后将自动补齐对应 git tag

v1.0.3   日期2026.4.28---4
说明
- 拆分 App.tsx/CollectModal.tsx/server.ts，提取常量、工具、Hooks 与子组件模块
- 新增社区功能：左侧侧边栏入口、图片发帖、标签筛选、最新/热门排序、Emoji 互动
- 社区发帖支持从剪切板读取图片并显示小预览
- 新增服务端社区路由、帖子持久化存储与图床上传代理

v1.0.4   日期2026.4.28---5
说明
- 配置 CF 图床默认 URL 与 Token，社区图片上传功能即时可用

v1.0.5   日期2026.4.28---6
说明
- 修复图床上传 Header 认证方式：改用 X-Auth-Token 匹配 CF Worker
- 增强上传错误返回信息，便于排查问题

v1.0.6   日期2026.4.28---7
说明
- 修复图床上传 401 认证问题：Header 改回 Authorization
- 上传方式改为 PUT + URL 路径拼接文件名，对齐 CF Worker 逻辑

v1.0.7   日期2026.4.28---8
说明
- 完成 App.tsx 与 server.ts 的深度拆分，提取并归类了大量的 Hook、组件、工具类和路由模块
- 增强社区功能：新增评论系统、点赞动画、发帖删除及纯文本发帖支持
- 优化了粘贴发帖的体验以及系统标签体系

v1.0.8   日期2026.4.28---9
说明
- 将底导与侧边栏重构为**全局响应式抽屉 (Drawer)**
- 编辑模式下新增抽屉弹出位置自定义（支持桌面端左/右，移动端底/侧边）
- 新增导航分类项的显隐控制与拖拽排序功能
- UI 层级深度优化，并增加了毛玻璃全局遮罩效果

v1.0.9   日期2026.4.28---10
说明
- 核心维度性能优化：引入 @tanstack/react-query 优化数据请求、轮询与状态缓存
- 代码分割优化：使用 React.lazy 与 Suspense 异步懒加载非首屏组件（CommunityPage、SettingsPage），减小初始包体积
- 静态资源优化：新增 LazyImage 懒加载骨架屏组件，提升社区图片加载体验（LCP）与平滑过渡

v1.0.10   日期2026.4.28---11
说明
- 优化协作与项目规则文档，强制要求进度追踪文档必须使用 `YYYY.M.D-N` (如2026.4.28-11) 序列号格式，以防止 AI 上下文重置后进度顺序错乱。

v1.0.11   日期2026.4.28---12
说明
- 撤销 v1.0.8 引入的 Drawer（抽屉）导航和相关 UI 设置改动。
- 恢复 v1.0.7 中的 Sidebar（侧边栏）及相关组件代码。
- 保留了 v1.0.9 引入的性能优化与 v1.0.10 的规范化更新。

v1.0.12   日期2026.4.29---1
说明
- **鉴权系统**：实现“用户名+密码”注册登录，支持 6 个月免登持久化。
- **社区体验**：社区页面支持刷新保持，接入 React Query 实现 10s 自动轮询看新帖。
- **评论优化**：评论默认展开，强制绑定真实身份（匿名/登录名切换），禁止手动篡改昵称。
- **静态资源优化**：优化了 LazyImage 懒加载骨架屏组件，提升社区图片加载体验（LCP）与平滑过渡。

v1.0.13   日期2026.4.29---2
说明
- **移除冗余 UI**：去除了社区页面右下角的悬浮飘星点赞按钮。
- **重构互动表情**：将社区帖子的主互动表情由“🔥”更改为“👍”。
- **严控互动权限**：
  - 非登录用户现在被彻底禁止点赞或使用其他表情互动。
  - 每个注册用户对单篇帖子的单个表情（如👍）仅限点击一次。
  - 已参与互动的按钮会进入高亮且不可再次点击的状态。

v1.0.14   日期2026.4.29---3
说明
- **后端图片压缩**：新增加 `sharp` 图像处理引擎。用户上传的高清原图现在会在服务器端自动被压缩为高质量的 WebP 格式（最大宽度 1920px，80% 质量）后再上传至图床，彻底解决超大图片导致加载缓慢的问题。

v1.0.15   日期2026.4.29---4
说明
- **热修复 502 网关报错**：为后端 Node.js 启动流程增加了全局的防崩溃动态捕获（Dynamic Import Try-Catch）机制。未来如果由于系统依赖问题导致启动崩溃，不会再直接报错关停容器（导致 Nginx 报 502），而是能在网页上清晰显示出具体的报错原因。
- **修复重大的用户数据丢失隐患**：紧急补齐了 `v1.0.12 - v1.0.14` 期间遗漏的持久化挂载声明。现已确保 `users.json`、`community_posts.json` 等新加入的文件能够正确挂载在宿主机 `runtime/` 目录下，保证以后部署更新或重启不会丢失注册用户和帖子。

v1.0.16   日期2026.4.29---5
说明
- **互动撤回**：现在社区帖子支持”取消点赞”，已点赞（或其他表情）的高亮按钮再次点击即可撤销状态。
- **同步图床删除**：当发帖人或管理员删除某个包含图片的社区帖子时，系统现在会同步向 CF 图床发送删除指令，自动清理云端资源，不再遗留孤儿文件。
- **文案与 UI 抛光**：进一步精简了评论框界面，彻底统一了”👍”图标显示，并将社区活动的日志文案统一更正为”帖子”。

v1.0.17   日期2026.4.30---1
说明
- **移动端头部布局重排**：仅在 `@media (max-width: 768px)` 内通过 CSS 调整头部三区块垂直排列顺序（操作按钮→标题→密码卡片），PC 端布局完全不受影响。

v1.0.18   日期2026.4.30---2
说明
- **排序持久化**：默认排序改为按创建日期；切换其他排序方式后自动存入 localStorage，刷新页面不再重置。
- **社区图标统一**：社区帖子互动图标由 🔥 改为 👍，全站统一。
- **排序下拉文案调整**："默认排序" 对应按创建日期，"手动排序" 在编辑模式下可选手动拖拽排序。

v1.0.19   日期2026.5.1---1
说明
- **首页密度预设**：新增紧凑浏览、标准管理、大卡展示三种一键布局预设。
- **采集入口重构**：移除手动采集入口，顶部“采集”直接进入全自动采集配置。
- **模型配置独立化**：新增独立模型配置入口，支持获取模型、勾选启用模型、保存生效、测试模型与聊天操练场。
- **社区交互优化**：新增帖子搜索、筛选清除、站内图片预览、评论折叠与互动状态强化。

v1.0.20   日期2026.5.1---2
说明
- **模型源删除修复**：默认模型源现在可删除，删除后自动切换到剩余可用模型。
- **模型保存逻辑修复**：模型配置只按“获取模型”返回结果保存，避免旧模型残留。
- **勾选交互修复**：取消勾选模型后不再从列表消失，可重新勾选保存。
- **测试反馈修复**：模型测试返回失败时直接显示异常信息，不再误报空成功结果。

v1.0.21   日期2026.5.1---3
说明
- **模型配置简化**：移除模型勾选区，获取到的模型只进入默认模型下拉与操练场下拉。
- **模型测试与窗口体验修复**：模型测试改走聊天接口，空回复会显示明确提示，弹窗滚动不再带动首页。
- **自动采集容错增强**：自动采集新增备用模型，主模型失败后立即切换备用模型，两次失败后保留该批视频并每 5 分钟重试直到成功。
- **每日密码刷新修复**：自动刷新不再记录为“手动刷新”，页面聚焦只做必要校验，避免重复刷新日志刷屏。

v1.0.22   日期2026.5.2---1
说明
- **模型密钥保存修复**：编辑已有模型源时，API Key 留空会继续沿用旧 Key，避免再次保存后接口失效。
- **密钥显示优化**：浏览器不回显真实 API Key，已保存密钥时仅显示占位提示，降低前端泄露风险。

v1.1.0   日期2026.5.3---1
说明
- **动效系统全面升级**：启用 framer-motion，为所有 Modal（新增枪械、登录注册、自动采集、模型配置）添加流畅的进出动画（scale + opacity），Toast 通知滑入滑出，卡片列表 stagger 入场
- **GPU 加速优化**：CSS 动画改用 translate3d 触发 GPU 合成层，为动画元素添加 will-change 提示
- **服务端压缩**：Express 启用 compression 中间件（gzip），API 响应体积显著减小
- **Vite 构建压缩**：新增 brotli 预压缩插件，构建产物自动生成 .br 文件，配合 Nginx 可实现零 CPU 开销的极致压缩传输
- **清理死依赖**：移除未使用的 motion 独立包，减少 node_modules 体积

v1.1.1   日期2026.5.3
说明
- **修复类型声明缺失**：安装 `@types/compression`、`@types/cookie-parser`、`@types/bcryptjs`，补全 `bcryptjs`、`vite-plugin-compression` 运行时依赖，`tsc --noEmit` 零错误通过
- **P2-4 统一前后端共享类型**：新建 `shared/` 目录，`GunGroup`/`GunVariant`/`CollectConcurrencySettings`/`CollectModelOption`/`CollectCreator` 统一由 `shared/types.ts` 导出，`buildModelOptionValue`/`parseModelOptionValue` 统一由 `shared/modelOption.ts` 导出，消除 `src/types.ts`↔`server/lib/shape.ts`、`src/utils.ts`↔`server/lib/collectSettings.ts` 的重复定义

v1.1.2   日期2026.5.3
说明
- **修复 Dockerfile 缺失 shared 目录**：添加 `COPY shared ./shared`，修复服务器启动报错 `Cannot find module '/app/shared/modelOption.js'`
- **P2-3 清理死依赖**：移除 `openai` 包（全项目无任何 import，节省 22 个传递依赖）
- **P2-11 命名/位置修补**：`useToast.ts` 从 `components/` 迁至 `hooks/`；`MotionProvider.tsx` 更名为 `motionPresets.ts`（文件内容为动画常量而非 Provider）；删除根目录 Cloudflare 验证文件 `23366171d0bc95587ccd61d43e8d880b.txt`
- **P2-2 will-change 审查**：确认仅 `index.css` 的 `@keyframes fadeInUp` 中使用，动画结束自动释放，符合最佳实践，无需修改

v1.1.3   日期2026.5.3
说明
- **修复首页分页**：`GROUPS_PER_PAGE` 从 24 改为 12，符合优化方案 P1-2 要求
- **修复登录灰屏**：`AuthModal` 移除 `if (!isOpen) return null` 提前返回（与 `AnimatePresence` exit 动画冲突），遮罩层增加 `onClick={onClose}`；`useAuth` 中 `/api/auth/me` 增加 content-type 检查，防止 HTML 响应导致 `.json()` 解析崩溃
- **修复社区 JSON 解析报错**：服务端 catch-all 路由 `/api/*` 路径未匹配时返回 JSON 而非 HTML，启动失败时 API 路径也返回 JSON，彻底消除 `Unexpected token '<'` 报错；`useCommunity` 查询增加 content-type 检查
- **社区帖子图片优化**：上传时自动生成 480px 缩略图存到 R2，帖子新增 `thumbUrl` 字段；列表卡片加载缩略图（快），点击预览加载原图（大图）；旧帖子 `thumbUrl` 兜底为 `imageUrl`；删除帖子时同时清理缩略图
- **社区标签防御**：`post.tags.map` 改为 `(post.tags || []).map`，防止旧数据无 tags 字段时崩溃

v1.1.4   日期2026.5.4
说明
- **修复登录无法完成**：根本原因是 `secure: process.env.NODE_ENV === "production"` 导致 HTTP 环境下浏览器拒绝设置 cookie，改为仅在 `HTTPS=true` 时启用 secure；同时 `login`/`register` 请求添加 `credentials: "same-origin"` 确保 cookie 随请求发送；`clearAuthCookie` 同步 secure 标志
- **修复登录灰屏**：AuthModal 重写，添加 `key` 确保 AnimatePresence 退出动画正确播放；添加 ESC 关闭和状态重置
- **修复图片预览显示缩略图**：预览层改为 `max-w-[95vw] max-h-[90vh]` 确保全屏展示原图；点击图片本身不关闭预览（stopPropagation）

v1.1.5   日期2026.5.4
说明
- **修复登录后发帖仍提示未登录**：Cookie `secure` 标志改为通过 `x-forwarded-proto` 头动态检测（Cloudflare 自动设置此头），解决了 HTTPS 站点 behind HTTP 容器的 cookie 问题；`setAuthCookie`/`clearAuthCookie` 接收 `req` 参数
- **修复图片预览覆盖页面而非全屏弹出**：根本原因是 CSS `transform` 动画使 `position: fixed` 相对于动画父元素定位；改用 `createPortal` 将预览层渲染到 `document.body`，z-index 提升到 9999
- **修复发帖请求缺少 cookie**：`CommunityComposer` 的上传和发帖 fetch 添加 `credentials: "same-origin"`

v1.1.6   日期2026.5.4
说明
- **修复发帖 502 / Unexpected token '<'**：`auth.ts` 中 login/register 路由未传 `req` 给 `setAuthCookie`，导致 cookie `secure` 默认 `true`（因 `NODE_ENV=production`），浏览器拒绝在 HTTP 容器上设置 cookie → 所有认证请求 401 → 容器频繁崩溃重启 502
- **全面补齐 credentials: "same-origin"**：`useCommunity` 中 `deletePost`、`addComment`、`deleteComment`、`fetchComments`、posts/activity 查询全部添加 `credentials: "same-origin"`；`CommunityComposer` 上传和发帖添加 content-type 检查
- **登录/注册/退出 Toast 提示**：登录成功显示"欢迎回来"、注册成功显示"已自动登录"、退出显示"已退出登录"、登录失败显示错误消息

v1.1.7   日期2026.5.4
说明
- **第一个注册用户自动成为管理员**：`createUser` 判断 `users.length === 0` 时 role 设为 `"admin"`，解决"权限不足，需要管理员权限"问题
- **修复每日密码 403**：前端自动同步不再调用 admin-only 的 `/refresh` 接口，仅轮询 GET 端点等待服务端定时任务刷新；手动刷新 403 时提示"权限不足，需要管理员权限"
- **修复 Docker volume mount 导致 JSON 文件变目录**：CMD 启动前检查并修复所有持久化 JSON 文件，确保是文件而非目录，解决社区发帖 500 错误
- **社区接口增加错误日志**：发帖、获取帖子、上传图片的错误现在会记录到容器日志
- **修复 Docker bind mount EBUSY 崩溃**：`atomicJson.ts` 的 `renameSync` 在 Docker bind mount 上可能返回 `EBUSY`，导致所有 JSON 写入失败→容器反复崩溃 502；现增加 fallback 直接写入

v1.1.8   日期2026.5.4
说明
- **修复 admin API 全部 403**：App.tsx 和 AutoCollectConfigModal 中所有 `/api/collect/*`、`/api/builds`、`/api/config/*`、`/api/model/*` 的 POST 请求补齐 `credentials: "same-origin"`，cookie 不再丢失
- **修复社区动态为空**：`useCommunity` 的 activity 查询引用了未定义变量 `data`，改为 `json`，社区动态恢复正常
- **评论默认展开**：帖子评论区默认展开，帖子加载时自动获取评论数据
- **评论数量显示**：评论图标旁始终显示评论数（之前仅在评论加载后才显示）
- **操作 Toast 提示**：发帖成功/失败、删帖成功/失败、评论成功/失败、删除评论成功/失败、图片上传失败均有 toast 提示

v1.2.0   日期2026.5.5---大更新
说明
- **全新外观设置页面**：左侧导航栏“系统设置”上方新增“外观设置”独立入口
- **站点信息自定义**：支持修改站点名称与站点描述，描述用于元信息及社交媒体卡片
- **自定义代码注入**：支持在 `<head>` 和 `</body>` 前注入任意 HTML/CSS/JavaScript，由服务端模板渲染动态替换
- **自定义 Favicon**：支持上传本地图片作为浏览器标签页图标，服务端持久化保存到 runtime/uploads/
- **自定义外观总开关**：一键启用/关闭全局背景图与玻璃拟态效果
- **背景图片支持**：支持输入图片 URL 或随机图 API，同时支持本地上传，上传后自动保存到服务端
- **背景固定模式**：开启后背景固定不随页面滚动，关闭则背景随内容滚动
- **毛玻璃模糊强度**：0-20px 滑动调节，数值越大越模糊
- **整体透明度**：70-100% 滑动调节，控制玻璃层覆盖透明度
- **圆角大小**：0-16px 滑动调节，全局控制卡片与面板圆角
- **光晕强度**：0-20px 滑动调节，控制组件阴影/光晕强度
- **服务端模板注入**：Production 模式下 Express 接管 index.html 渲染，动态注入 title、favicon、customHead、customBody
- **实时预览卡片**：外观设置页内置实时预览，调整参数即时看到玻璃拟态效果
- **配置持久化**：所有外观配置写入 runtime/appearance.json，上传文件保存到 runtime/uploads/，避免部署覆盖
- **借鉴 komari 项目架构**：参考其配置体系与模板注入方案，深度融合到本项目中
- **版本号更新**：package.json 版本号从 1.1.8 更新为 1.2.0，左下角版本标签同步
- **删除无用设置**：移除"枪械卡片样式"独立面板（卡片不透明度与底色），合并到全局玻璃化中统一管理
- **外观设置页面卡片统一透明**：panelClass 增加 `bg-white dark:bg-[#121214]`，使外观设置页面自身面板也被全局 CSS 玻璃化覆盖，与其他页面保持一致
- **枪械卡片文字颜色自定义**：新增体系名称/型号、改枪码、来源作者/链接三组文字颜色设置，支持亮色/暗色模式分别配置，留空则使用默认颜色
- **实时预览增强**：外观设置实时预览区域增加枪械卡片模拟小窗口，可即时预览文字颜色变化效果
- **全局卡顿性能优化**：
  - 提取 `<style>` CSS 注入为独立 `StyleInjector` memo 组件，只在配置变化时重新计算
  - 首页 `motion.div` 移除按 idx 递增的 stagger delay，简化动画降低 framer-motion 计算量
  - 全局玻璃化 CSS 去掉每个 `.bg-white` 元素上的 `backdrop-filter`，改为由全屏背景 overlay 统一提供模糊，避免数十个元素同时触发 GPU 重绘
  - **关键修复**：全屏遮罩层的 `backdrop-filter: blur()` 改为对**背景图本身**使用 `filter: blur()`（配合 `overflow: hidden + scale(1.05)` 避免边缘白边），`backdrop-filter` 完全移除。`backdrop-filter` 会强制浏览器对下方所有 DOM 进行实时合成重绘，任何滚动/动画都触发全 viewport 重算；`filter: blur()` 只模糊单个元素，不影响页面其他内容的渲染，120 帧恢复丝滑
- **保存提示修复**：外观设置保存/恢复默认时，页面内 banner + 全局 Toast 同时提示，3 秒后自动消失
  - **彻底移除 `[class*="..."]` 属性选择器**：全局 CSS 注入中原有 `[class*="shadow-"]`、`[class*="hover:bg-zinc-100"]`、`[class*="border-zinc-200"]` 等属性选择器会在每次样式计算时强制浏览器遍历整个 DOM 扫描 class 属性，节点越多开销越大；现全部替换为明确类名选择器
  - **`useTheme` 引用稳定化**：返回值用 `useMemo` 包装，update/reset 函数用 `useCallback` 包装，避免 App 任何微小重渲染导致 `theme` 对象引用变化，触发整棵树不必要的重渲染

v1.3.0   日期2026.5.7---1
说明
- **新增神人点位页面**：左侧导航栏新增“神人点位”入口，进入独立页面而非弹窗
- **视频上传管理**：支持上传本地已压缩视频，填写自定义视频名称并关联地图名称
- **地图按钮筛选**：新增横向地图按钮组，默认“全部”，支持“零号🚌 / 长工戏骨 / 巴克什 / 航天基地 / 抄袭监狱”快速切换
- **三列视频网格**：视频按卡片网格展示，点击卡片即可在当前页面快速预览
- **可配置存储后端**：默认存储到 `runtime/godspot/videos/`，同时支持通过环境变量切换到 Cloudflare R2 / S3 兼容对象存储
- **流式上传与安全校验**：上传采用 busboy 流式写临时文件，避免大视频全量进内存；增加视频 MIME 白名单和大小限制
- **运行态持久化**：视频元数据写入 `runtime/godspot/metadata.json`，本地视频通过 `/godspot-files` 静态目录访问，切换云存储后旧本地文件仍可播放
- **部署分叉修复**：远程部署脚本遇到服务器 `main` 与 `origin/main` 分叉时，会先创建 `deploy-backup/main-时间戳` 备份分支，再同步到最新远端，避免 `git pull --ff-only` 导致构建失败
- **Actions 引导同步修复**：GitHub Actions 在调用服务器部署脚本前会先内联同步服务器仓库，避免服务器旧版 `deploy_remote.sh` 尚未更新时继续执行旧的 `git pull --ff-only`
- **Docker 构建稳定性修复**：Dockerfile 中构建依赖与生产依赖的 `npm ci` 增加缓存优先与多次重试，减少 npm 镜像源网络 `ETIMEDOUT` 导致的部署失败
- **神人点位存储后台设置**：系统设置新增“神人点位视频存储”，管理员可选择服务器本地存储或 Cloudflare R2 / 对象存储，并保存上传地址、公开地址和 Token 到运行态配置
- **神人点位运行态挂载**：`docker-compose.yml` 挂载 `runtime/godspot` 到容器内，确保服务器本地视频和存储设置不会随容器重建丢失

v1.3.1   日期2026.5.7---2
说明
- **修复系统设置页无限请求**：系统设置页进入时不再依赖每日密码 Hook 整体对象，避免每次日志更新触发重复 `status` / `logs` 请求，解决浏览器 `ERR_INSUFFICIENT_RESOURCES` 和 `Failed to fetch` 问题
- **修复神人点位接口 404**：补齐服务端 `/api/godspot` 路由挂载，解决神人点位页面请求 `/api/godspot/videos` 返回 404 的问题

v1.3.2   日期2026.5.7---3
说明
- **彻底修复神人点位云存储上传 400**：直连 Cloudflare R2 / S3 兼容对象存储上传视频时自动计算 `x-amz-content-sha256`，并补齐 `x-amz-date` 与 AWS SigV4 签名，解决 `Missing x-amz-content-sha256`、`No date provided in x-amz-date nor date header` 导致 `/api/godspot/upload` 返回 500 的问题
- **兼容两类云存储授权方式**：自建 Worker 上传地址继续支持原 `Authorization Token`；直连 R2 / S3 地址支持 `AccessKeyId:SecretAccessKey[:region]` 或 JSON 格式密钥，删除云端视频时也使用同一套签名逻辑


