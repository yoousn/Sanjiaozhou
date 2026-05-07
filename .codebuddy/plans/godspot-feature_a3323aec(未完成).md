---
name: godspot-feature
overview: 在左侧导航栏新增"神人点位"页面，支持视频上传、ffmpeg自动压缩、网格预览、横向地图筛选按钮。
design:
  architecture:
    framework: react
  fontSystem:
    fontFamily: PingFang SC
    heading:
      size: 28px
      weight: 800
    subheading:
      size: 14px
      weight: 500
    body:
      size: 14px
      weight: 400
  colorSystem:
    primary:
      - "#18181B"
      - "#27272A"
      - "#3F3F46"
    background:
      - "#F8F9FA"
      - "#FFFFFF"
      - "#0B0B0C"
      - "#121214"
    text:
      - "#18181B"
      - "#71717A"
      - "#A1A1AA"
      - "#FFFFFF"
    functional:
      - "#10B981"
      - "#EF4444"
      - "#F59E0B"
      - "#3B82F6"
todos:
  - id: create-godspot-store
    content: 创建 server/lib/godspotStore.ts：元数据CRUD + fluent-ffmpeg 视频压缩封装 + thumbnail 首帧生成
    status: pending
  - id: create-godspot-api
    content: 创建 server/routes/godspot.ts：GET列表/POST上传压缩+首帧/DELETE删除
    status: pending
    dependencies:
      - create-godspot-store
  - id: register-route-and-deps
    content: 修改 server.ts 注册路由+视频静态服务；更新 package.json (fluent-ffmpeg, v1.3.0) 和 Dockerfile (安装ffmpeg)
    status: pending
    dependencies:
      - create-godspot-api
  - id: create-godspot-page
    content: 创建 src/pages/GodSpotPage.tsx：完整页面（地图按钮组+上传区+3列视频网格+内嵌预览）
    status: pending
  - id: add-nav-and-routing
    content: 修改 Sidebar.tsx 新增导航按钮；修改 App.tsx 添加 activeTab='godspot' 路由与 React.lazy 懒加载
    status: pending
    dependencies:
      - create-godspot-page
  - id: update-release-notes
    content: 更新 docs/release-notes.md 添加 v1.3.0 版本说明
    status: pending
---

## 核心需求

在面板网站左侧导航栏添加"神人点位"按钮，点击进入独立管理页面，支持视频上传压缩、预览、自定义命名和地图筛选。

## 核心功能

1. **导航入口**：左侧导航栏新增"神人点位"按钮（Crosshair 图标），点击切换至独立页面
2. **视频上传与自动压缩**：选择本地视频上传，服务端自动用 ffmpeg 压缩（H.264, CRF28, 720p）
3. **地图筛选按钮**：横向排列的切换按钮组——全部 | 零号巴士 | 长工戏骨 | 巴克什 | 航天基地 | 抄袭监狱；默认选中"全部"，点击筛选对应地图的视频
4. **自定义命名**：上传时填写视频的自定义显示名称
5. **3列视频网格**：视频以 3 列网格展示，每张卡片包含缩略图/预览、自定义名称、地图标签、文件大小/压缩率、删除
6. **快速预览**：点击卡片直接在当前页内嵌 HTML5 视频播放器播放
7. **独立页面**：完整页面实现，非弹窗，React.lazy 懒加载

## 技术栈

| 层级 | 技术 | 说明 |
| --- | --- | --- |
| 前端 | React 19 + TypeScript + Tailwind CSS 4 + Framer Motion | 沿用现有栈 |
| 图标 | lucide-react（Crosshair / Film 图标） |  |
| 后端 | Express 4 + TypeScript | 沿用现有栈 |
| 文件解析 | busboy | 复用社区上传模式 |
| 视频压缩 | fluent-ffmpeg + 系统 ffmpeg | 服务端压缩 |
| 持久化 | JSON 文件 (atomicJson) | runtime/godspot/metadata.json |
| 视频文件 | 本地文件系统 | runtime/godspot/videos/ |
| 认证 | requireAuth 中间件 | 上传/删除需登录 |


## 实现方案

### 整体策略

沿用 activeTab + localStorage 的 SPA 路由模式，复用 busboy 解析 multipart 文件上传模式。视频压缩采用服务端 fluent-ffmpeg。

### 视频压缩流程

1. 前端 multipart 上传文件 + 自定义名称 + 地图名
2. busboy 解析原始视频 buffer 写入临时文件
3. fluent-ffmpeg 执行压缩：libx264、max 1280px 宽、CRF28、medium preset、AAC 64kbps
4. 压缩后文件保存至 runtime/godspot/videos/{uuid}.mp4
5. 元数据写入 runtime/godspot/metadata.json
6. 返回原始大小/压缩后大小/压缩比

### 地图筛选实现

- 地图按钮组为受控组件，选中状态驱动列表筛选
- 每个视频元数据存储 mapName 字段（如"零号巴士"）
- "全部"按钮不设筛选条件，其他按钮按 mapName === selectedMap 过滤
- 地图按钮列表：['全部', '零号巴士', '长工戏骨', '巴克什', '航天基地', '抄袭监狱']

### 3列网格布局

- 使用 CSS Grid：`grid grid-cols-1 md:grid-cols-3 gap-4`
- 每个网格为视频卡片，包含封面帧（video poster 或首帧）、名称、地图标签、大小信息、删除按钮
- 点击卡片展开内嵌 `<video>` 播放器
- 每个卡片支持 hover 播放预览微动效

## 架构设计

```mermaid
flowchart TD
    subgraph 前端
        A[Sidebar.tsx] -->|activeTab='godspot'| B[App.tsx]
        B -->|React.lazy| C[GodSpotPage.tsx]
        C --> D[地图按钮组: 全部|零号巴士|...]
        C --> E[上传区: 拖拽+表单]
        C --> F[视频网格: 3列卡片]
        C -->|fetch| G[/api/godspot/*]
    end

    subgraph 服务端
        G --> H[GET / -> 列表]
        G --> I[POST /upload -> busboy解析 -> ffmpeg压缩 -> 存储]
        G --> J[DELETE /:id -> 删除文件+元数据]
    end

    subgraph 持久化
        I --> K[runtime/godspot/videos/]
        I --> L[runtime/godspot/metadata.json]
    end
```

## 数据结构

```typescript
type GodSpotVideo = {
  id: string;
  customName: string;    // 用户自定义名称
  mapName: string;       // 关联地图（如"零号巴士"）
  fileName: string;      // 存储文件名 (uuid.mp4)
  originalSize: number;  // 原始文件字节数
  compressedSize: number;// 压缩后文件字节数
  createdAt: string;     // ISO 时间戳
};

type GodSpotMetadata = {
  videos: GodSpotVideo[];
};
```

## 目录结构

```
d:/Desktop/网站2/
├── src/
│   ├── pages/
│   │   └── GodSpotPage.tsx       [NEW] 神人点位页面：地图按钮+上传区+3列网格+内嵌预览
│   ├── components/
│   │   └── Sidebar.tsx            [MODIFY] 新增"神人点位"导航按钮
│   └── App.tsx                    [MODIFY] 新增 activeTab='godspot' 路由与懒加载
├── server/
│   ├── routes/
│   │   └── godspot.ts             [NEW] API路由：GET /, POST /upload, DELETE /:id
│   └── lib/
│       └── godspotStore.ts        [NEW] 元数据CRUD + fluent-ffmpeg压缩 + 文件管理
├── server.ts                      [MODIFY] 注册 godspot 路由 + 静态文件服务
├── package.json                   [MODIFY] 新增 fluent-ffmpeg 依赖, 版本 v1.3.0
├── Dockerfile                     [MODIFY] 安装 ffmpeg 系统包
└── docs/
    └── release-notes.md           [MODIFY] 新增 v1.3.0 版本说明
```

## 实现要点

- **地图按钮**：受控状态 `selectedMap`，默认 `'全部'`，切换后过滤列表
- **上传表单**：自定义名称 + 地图选择器（与筛选按钮同列表），上传时一起提交
- **网格卡片**：每张卡片展示视频封面（取首帧作为 poster，需 ffmpeg 生成 thumbnail 或空白占位）
- **预览交互**：点击卡片上的播放按钮，在卡片位置展开 `<video controls>` 播放器
- **压缩进度**：上传中显示进度条 + "正在压缩..." 提示
- **暗色模式**：继承项目现有主题系统

采用与项目一致的极简功能性设计，Tailwind CSS zinc 色调。页面分三大区块：

1. **顶部**：返回按钮 + 页面标题"神人点位管理" + 地图横向切换按钮组（胶囊按钮样式，选中态高亮）
2. **上传区**：左侧拖拽/点击上传区（虚线边框+上传图标），右侧表单（名称输入+地图下拉选择+上传按钮）
3. **视频网格**：3列 CSS Grid，每张卡片含视频缩略图区域、文件名、地图标签徽章、大小/压缩率、删除按钮

## Agent Extensions

### SubAgent

- **code-explorer**: 在实施服务器端路由和文件上传处理时，需探索现有 `server/routes/community.ts` 和 `server/lib/communityUpload.ts`，确保 busboy 解析和文件流处理完全对齐现有模式，避免模式偏离。