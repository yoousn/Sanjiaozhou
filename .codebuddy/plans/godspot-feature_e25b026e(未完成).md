---
name: godspot-feature
overview: 在左侧导航栏新增"神人点位"页面，支持视频上传、ffmpeg自动压缩、网格预览、地图筛选按钮、可切换本地/Cloudflare存储后端。
todos:
  - id: create-godspot-config-and-storage
    content: 创建 server/lib/godspotConfig.ts（环境变量配置读取）+ godspotStorage.ts（storeVideo/deleteVideo 抽象层，支持本地和 CF R2）
    status: pending
  - id: create-godspot-store
    content: 创建 server/lib/godspotStore.ts：元数据 CRUD + fluent-ffmpeg 压缩 + 首帧缩略图生成
    status: pending
    dependencies:
      - create-godspot-config-and-storage
  - id: create-godspot-api
    content: 创建 server/routes/godspot.ts：GET列表/POST上传压缩+存储/DELETE删除
    status: pending
    dependencies:
      - create-godot-store
  - id: register-route-and-deps
    content: 修改 server.ts 注册路由+条件静态文件服务；更新 package.json (fluent-ffmpeg, v1.3.0) 和 Dockerfile (安装ffmpeg)
    status: pending
    dependencies:
      - create-godspot-api
  - id: create-godspot-page
    content: 创建 src/pages/GodSpotPage.tsx：完整管理页面（地图按钮组+上传区+3列视频网格+内嵌预览）
    status: pending
  - id: add-nav-and-routing
    content: 修改 Sidebar.tsx 新增导航按钮（Crosshair）；修改 App.tsx 添加 activeTab='godspot' + React.lazy
    status: pending
    dependencies:
      - create-godspot-page
  - id: update-release-notes
    content: 更新 docs/release-notes.md 添加 v1.3.0 版本说明
    status: pending
---

## 核心需求

在面板网站左侧导航栏新增"神人点位"独立页面，支持：

1. **导航入口**：左侧导航栏新增"神人点位"按钮（Crosshair 图标），点击切换至独立页面
2. **视频上传与自动压缩**：选择本地视频上传，服务端 ffmpeg 自动压缩（H.264, CRF28, 720p, AAC 64kbps）
3. **地图筛选按钮**：横向胶囊按钮组——全部 | 零号🚌 | 长工戏骨 | 巴克什 | 航天基地 | 抄袭监狱；默认选中"全部"，点击筛选
4. **自定义命名**：上传时可填写视频的自定义显示名称
5. **3列视频网格**：CSS Grid 3列卡片，每张含视频封面、名称、地图标签、大小/压缩率、删除
6. **内嵌预览**：点击卡片在当前页展开 HTML5 `<video>` 播放器
7. **可配置存储后端**：通过环境变量运行时切换本地存储/Cloudflare R2，无需改代码
8. **独立页面**：完整页面实现，非弹窗，React.lazy 懒加载

## 技术栈

| 层级 | 技术 | 说明 |
| --- | --- | --- |
| 前端 | React 19 + TypeScript + Tailwind CSS 4 + Framer Motion | 沿用现有技术栈 |
| 图标 | lucide-react (Crosshair, Film, Upload, Trash2) | 导航及页面图标 |
| 后端 | Express 4 + TypeScript | 沿用现有服务端 |
| 文件解析 | busboy | 复用社区上传的 multipart 解析方案 |
| 视频压缩 | fluent-ffmpeg + 系统 ffmpeg | 服务端压缩（libx264, CRF28, 720p） |
| 持久化 | JSON 文件 (atomicJson) | runtime/godspot/metadata.json |
| 存储后端 | 本地文件系统 / Cloudflare R2（S3兼容API） | 通过环境变量切换 |
| 认证 | requireAuth 中间件 | 上传/删除操作需登录 |
| 版本更新 | v1.2.0 -> v1.3.0 | 次版本号升级 |


## 实现方案

### 整体策略

沿用 `activeTab + localStorage` 的 SPA 路由模式，复用 busboy 解析 multipart 文件上传模式。视频压缩采用服务端 fluent-ffmpeg。存储后端采用策略模式，通过环境变量 `GODSPOT_STORAGE=local|cloudflare` 在运行时切换，零代码改动。

### 存储抽象架构

```
godspotStore.ts (压缩流程)
    │
    ▼
storeVideo(buffer, fileName) ← 统一存储接口
    │
    ├─ GODSPOT_STORAGE=local
    │   └─ writeFileSync → runtime/godspot/videos/{uuid}.mp4
    │
    └─ GODSPOT_STORAGE=cloudflare
        └─ fetch(PUT) → CF_UPLOAD_URL/{uuid}.mp4
```

完全复用现有 `communityUpload.ts` 的 CF 上传模式（`fetch + PUT + Authorization header`）。

### 视频上传与压缩流程

1. 前端 multipart/form-data 上传（文件 + customName + mapName）
2. busboy 解析原始视频 buffer，写入临时文件
3. fluent-ffmpeg 压缩：

- 视频: libx264, max 1280px 宽（保持比例）, CRF28, medium preset
- 音频: AAC 64kbps

4. 提取首帧作为缩略图（ffmpeg 截图）
5. 调用 `storeVideo()` 将压缩后文件存入配置的存储后端
6. 元数据写入 `runtime/godspot/metadata.json`
7. 清理临时文件
8. 返回: id, videoUrl, originalSize, compressedSize, compressionRatio, thumbnailUrl

### 地图筛选实现

- 地图按钮组为受控组件：`const [selectedMap, setSelectedMap] = useState('全部')`
- 按钮列表：`['全部', '零号🚌', '长工戏骨', '巴克什', '航天基地', '抄袭监狱']`
- "全部"不过滤，其他按 `video.mapName === selectedMap` 过滤
- 上传时的地图名通过上传表单的一个下拉选择器或同列表按钮选择

### 3列网格布局

```html
<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
  <!-- 每张卡片 -->
  <div class="video-card">
    <div class="thumbnail-area">
      <video poster={thumbnailUrl} ... />
      <button class="play-button">▶</button>
    </div>
    <div class="info">
      <span class="name">{customName}</span>
      <span class="map-badge">{mapName}</span>
      <span class="size">{originalSize} → {compressedSize} ({ratio}%)</span>
      <button class="delete">删除</button>
    </div>
  </div>
</div>
```

点击播放按钮展开全宽 `<video controls>` 播放器。

## 架构设计

### 系统架构图

```mermaid
flowchart TD
    subgraph 前端 (React)
        A[Sidebar.tsx] -->|activeTab='godspot'| B[App.tsx]
        B -->|React.lazy| C[GodSpotPage.tsx]
        C --> D[地图按钮组: 全部 | 零号🚌 | ...]
        C --> E[上传区: 拖拽 + 表单]
        C --> F[视频网格: 3列卡片]
        C -->|fetch| G[/api/godspot/*]
    end

    subgraph 服务端 (Express)
        G --> H[GET / -> 列表查询]
        G --> I[POST /upload]
        I --> J[busboy 解析 multipart]
        J --> K[fluent-ffmpeg 压缩]
        K --> L{storeVideo()}
        L -->|local| M[writeFile runtime/godspot/videos/]
        L -->|cloudflare| N[PUT fetch → CF R2]
        K --> O[ffmpeg 截图首帧]
        O --> L
        G --> P[DELETE /:id]
        P --> Q[deleteVideo()]
    end

    subgraph 持久化
        I --> R[runtime/godspot/metadata.json]
        P --> R
    end
```

### 数据结构

```typescript
type GodSpotVideo = {
  id: string;               // uuid
  customName: string;        // 用户自定义名称
  mapName: string;           // 关联地图（如"零号🚌"）
  fileName: string;          // 存储文件名 (uuid.mp4)
  videoUrl: string;          // 可访问的 URL（本地 /godspot-files/ 或 CDN URL）
  thumbnailUrl: string;      // 首帧缩略图 URL
  originalSize: number;      // 原始字节数
  compressedSize: number;    // 压缩后字节数
  storageType: 'local' | 'cloudflare'; // 存储类型标记
  createdAt: string;         // ISO 时间戳
};
```

### 环境变量配置表

| 变量名 | 默认值 | 说明 |
| --- | --- | --- |
| `GODSPOT_STORAGE` | `local` | 存储类型：`local` 或 `cloudflare` |
| `GODSPOT_LOCAL_DIR` | `./runtime/godspot/videos` | 本地存储路径 |
| `GODSPOT_CF_UPLOAD_URL` | 无 | Cloudflare Worker/R2 的 PUT URL |
| `GODSPOT_CF_AUTH_TOKEN` | 无 | Cloudflare 认证 Token |
| `GODSPOT_PUBLIC_URL` | 无 | 公开访问的 CDN URL 前缀（可选） |


### 设计风格

采用与项目一致的极简功能型设计，Tailwind CSS zinc 色调 + 暗色模式兼容。

页面分三大区块：

1. **顶部导航区**：返回首页按钮 + 页面标题"神人点位管理" + 横向地图胶囊按钮组（选中态：深色背景白色文字；非选中态：浅灰背景深色文字，hover 变深）
2. **上传区**：左右两列布局。左侧虚线边框拖拽/点击上传区（上传图标 + "拖拽或点击选择视频"提示文字，选中文件后显示文件名和大小）；右侧表单（自定义名称输入框 + 地图名选择按钮组 + "上传并压缩"按钮）。上传中显示进度条 + "正在上传..." / "正在压缩..." 阶段提示
3. **视频网格**：3列 CSS Grid，每张视频卡片包含缩略图区域（视频首帧 + 居中播放按钮→图标）、自定义名称、地图标签小徽章、文件大小及压缩率文字、右下角删除按钮（点击确认后删除）。点击播放按钮或卡片展开内嵌全宽 `<video controls>` 播放器

## 目录结构

```
d:/Desktop/网站2/
├── src/
│   ├── pages/
│   │   └── GodSpotPage.tsx          [NEW] 神人点位管理页面（地图按钮组+上传区+3列网格+内嵌预览）
│   ├── components/
│   │   └── Sidebar.tsx               [MODIFY] 新增"神人点位"导航按钮（Crosshair 图标）
│   └── App.tsx                       [MODIFY] 新增 activeTab='godspot' 路由 + React.lazy 懒加载
├── server/
│   ├── routes/
│   │   └── godspot.ts                [NEW] API 路由: GET /, POST /upload, DELETE /:id
│   └── lib/
│       ├── godspotStore.ts           [NEW] 元数据 CRUD + fluent-ffmpeg 压缩封装
│       ├── godspotConfig.ts          [NEW] 存储配置读取与环境变量管理
│       └── godspotStorage.ts         [NEW] 存储抽象层（storeVideo / deleteVideo - 支持本地和 CF）
├── server.ts                         [MODIFY] 注册 godspot 路由 + 本地模式静态文件服务
├── package.json                      [MODIFY] 新增 fluent-ffmpeg 依赖, 版本 v1.3.0
├── Dockerfile                        [MODIFY] apt-get 安装 ffmpeg
└── docs/
    └── release-notes.md              [MODIFY] 新增 v1.3.0 版本说明
```

## 实现要点

### 关键设计决策

- **存储抽象层**：`storeVideo()` 和 `deleteVideo()` 根据环境变量路由到本地写文件或 CF PUT 请求，前端通过 API 返回的 `videoUrl` 渲染，完全不感知后端存储
- **环境变量解析**：通过 `godspotConfig.ts` 统一读取，所有配置集中在 `GODSPOT_*` 命名空间，避免与现有 CF 图床配置（`CF_UPLOAD_URL`/`CF_AUTH_TOKEN`）混淆
- **express.static 条件注册**：仅在 `GODSPOT_STORAGE=local` 时才注册 `/godspot-files` 静态文件服务；`cloudflare` 模式下不需要
- **首帧缩略图**：ffmpeg 压缩完成后，额外执行 `ffmpeg -ss 00:00:01 -i input -vframes 1 -vf scale=320:-1 output.jpg` 提取首帧

### 性能

- 视频压缩是 CPU 密集型操作，建议大文件异步执行（需要时后续可改为任务队列）
- 列表接口只返回元数据（JSON），不含文件流
- 视频预览通过 express.static 直接提供，零 CPU 开销
- 移动端 `<video>` 利用设备硬件解码播放

### 日志

- 复用 `server/lib/logger.ts` 的 `logger` 实例，tag 前缀 `[神人点位]`
- 记录：上传开始、压缩完成（含压缩比）、存储完成（含目标位置）、删除操作
- 上传失败的临时文件自动清理

### 爆炸半径控制

- 新增路由和数据存储完全独立于现有功能
- 仅修改 Sidebar.tsx、App.tsx、server.ts 三个现有文件
- 不更改任何现有 API、组件逻辑或数据结构
- 新文件按项目惯例放在对应模块目录

## Agent Extensions

### SubAgent

- **code-explorer**
- Purpose: 在实现 godspotStore.ts 和 godspotStorage.ts 时，需要深入探索现有 server/lib/communityUpload.ts 的 CF 上传模式（PUT 请求地址拼接、Authorization header、错误处理）以及 server/routes/community.ts 的 busboy 解析模式，确保存储抽象层完全对齐现有实现
- Expected outcome: 准确复用 cfUploadUrl/cfAuthToken 的环境变量读取方式、PUT 请求的 URL 拼接逻辑（`${baseUrl}/${key}`）、错误响应格式，避免模式偏离

### Skills

- **baoyu-image-gen** (仅在需要首帧缩略图美化时考虑，当前阶段不需要)

注意：**未使用任何 MCP 或 Integration**（tcb/eop/cloudStudio/lighthouse 均为 disconnected 状态）。