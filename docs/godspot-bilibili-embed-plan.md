# 神人点位 B 站外链嵌入播放器实施计划

## 目标

在“神人点位”页面新增 B 站外链视频能力：用户粘贴 B 站链接后，系统自动识别标题，保存为外链视频记录；点击列表卡片时，右侧预览区使用 B 站官方 iframe 播放器播放，不下载、不转存视频文件。

## 设计原则

- 不自动下载 B 站视频，避免服务器存储、下载队列、反爬、Cookie 和版权风险。
- 保留现有本地/云存储上传能力，两种视频来源并存。
- B 站外链数据只写入运行态元数据，不影响真实视频文件存储。
- 如果嵌入播放器不可用，提供“打开原视频”作为兜底入口。
- 所有运行态数据继续保存在服务器 `runtime/`，不随代码发布覆盖。

## 用户流程

### 本地上传模式

1. 选择“本地上传”。
2. 填写视频名称，或用 B 站链接辅助识别标题。
3. 选择地图。
4. 选择本地视频文件。
5. 点击“上传视频”。
6. 右侧预览区使用 HTML5 `<video>` 播放。

### B 站外链模式

1. 选择“B 站外链”。
2. 粘贴 B 站链接，例如 `https://www.bilibili.com/video/BVxxxx` 或 `https://b23.tv/xxxx`。
3. 系统识别标题，并默认填入“视频名称”。
4. 用户可手动修改标题。
5. 选择地图。
6. 点击“保存 B 站视频”。
7. 视频列表新增一张 B 站外链卡片。
8. 点击卡片后，右侧预览区展示 B 站 iframe 播放器。

## 数据结构调整

现有视频记录需要兼容两类来源。

建议新增字段：

```ts
type GodspotSourceType = "upload" | "bilibili";

type GodspotVideo = {
  id: string;
  displayName: string;
  mapName: string;
  originalFilename: string;
  mimeType: string;
  size: number;
  videoKey: string;
  videoUrl: string;
  storageType: "local" | "cloudflare" | "external";
  sourceType: GodspotSourceType;
  sourceUrl?: string;
  bvid?: string;
  coverUrl?: string;
  uploader: string;
  createdAt: string;
};
```

兼容策略：

- 旧数据没有 `sourceType` 时，统一视为 `upload`。
- B 站外链记录：
  - `sourceType = "bilibili"`
  - `storageType = "external"`
  - `sourceUrl` 保存原链接
  - `bvid` 保存 BV 号
  - `videoUrl` 可为空或保存播放器 URL，但推荐播放时动态生成
  - `originalFilename` 可保存为空字符串或 `bvid`
  - `mimeType` 可保存 `text/html` 或空字符串
  - `size = 0`

## 后端接口计划

### 1. 增强 B 站链接解析

当前已有 `/api/godspot/resolve-bilibili`，建议增强返回：

```json
{
  "success": true,
  "data": {
    "title": "视频标题",
    "url": "https://www.bilibili.com/video/BVxxxx",
    "bvid": "BVxxxx",
    "coverUrl": "https://..."
  }
}
```

需要支持：

- `www.bilibili.com/video/BV...`
- `bilibili.com/video/BV...`
- `b23.tv/...` 短链重定向
- 链接中带 `?p=1`、`?vd_source=...` 等参数

### 2. 新增保存外链接口

新增：

```http
POST /api/godspot/save-bilibili
Content-Type: application/json
```

请求体：

```json
{
  "url": "https://www.bilibili.com/video/BVxxxx",
  "displayName": "自定义标题",
  "mapName": "零号🚌"
}
```

后端处理：

1. 要求登录。
2. 限流，避免高频解析。
3. 校验 URL 并提取 `bvid`。
4. 如标题为空，则自动解析标题。
5. 创建 `sourceType = "bilibili"` 的视频记录。
6. 写入 `runtime/godspot/metadata.json`。
7. 返回新记录。

### 3. 查询接口兼容

`GET /api/godspot/videos` 返回本地上传视频和 B 站外链视频。

旧视频记录在返回前补默认值：

```ts
sourceType: video.sourceType || "upload"
storageType: video.storageType || "local"
```

### 4. 删除接口兼容

`DELETE /api/godspot/videos/:id`：

- `sourceType = "upload"`：删除元数据，并按现有逻辑删除本地/云端文件。
- `sourceType = "bilibili"`：只删除元数据，不调用云存储删除。

## 前端页面计划

### 1. 上传面板增加模式切换

左侧上传面板顶部增加：

```text
[本地上传] [B站外链]
```

状态建议：

```ts
const [uploadMode, setUploadMode] = useState<"upload" | "bilibili">("upload");
```

### 2. 本地上传模式 UI

保留现有能力：

- B 站标题识别输入可保留为辅助填标题。
- 视频名称。
- 地图选择。
- 文件选择。
- 上传视频按钮。

### 3. B 站外链模式 UI

显示：

- B 站链接输入框。
- 识别按钮。
- 视频名称输入框。
- 地图选择。
- 保存 B 站视频按钮。

按钮文案建议：

- `识别标题`
- `保存 B站视频`

提示文案建议：

```text
该模式不会下载视频，只保存链接并使用 B 站播放器嵌入播放。
```

### 4. 预览区播放器分流

如果是本地/云端上传视频：

```tsx
<video src={previewVideo.videoUrl} controls preload="metadata" />
```

如果是 B 站外链：

```tsx
<iframe
  src={`https://player.bilibili.com/player.html?bvid=${previewVideo.bvid}&page=1&autoplay=0`}
  allowFullScreen
/>
```

同时展示：

- `B站` 标签。
- `打开原视频` 按钮。
- 如果没有 `bvid`，不展示 iframe，直接展示兜底打开按钮。

### 5. 列表卡片展示

本地上传视频：继续显示 `<video>` 缩略预览。

B 站外链视频：优先显示封面图：

```tsx
<img src={video.coverUrl} alt={video.displayName} />
```

没有封面时显示 B 站占位卡片。

标签建议：

- 本地：`本地`
- 云端：`云端`
- B 站：`B站外链`

## 分步实施

### Step 1：数据模型兼容

范围：

- `server/lib/godspotStore.ts`
- `src/pages/GodSpotPage.tsx`
- 相关共享类型文件，如存在则同步更新

任务：

1. 给视频记录增加 `sourceType`、`sourceUrl`、`bvid`、`coverUrl` 等可选字段。
2. 查询旧数据时补 `sourceType = "upload"`。
3. 确保现有本地/云端上传不受影响。

验证：

```bash
npm run lint
```

退出标准：

- 旧视频仍能正常列表展示、预览、删除。
- TypeScript 检查通过。

### Step 2：后端 B 站解析增强

范围：

- `server/routes/godspot.ts`

任务：

1. 从 B 站链接中提取 `bvid`。
2. 支持 `b23.tv` 短链重定向。
3. 解析标题。
4. 尝试解析封面 `og:image`。
5. `/resolve-bilibili` 返回 `title`、`url`、`bvid`、`coverUrl`。

验证：

```bash
npm run lint
```

退出标准：

- 有效 B 站链接能返回标题和 BV 号。
- 无效链接返回明确错误。
- 短链尽量能解析到最终视频。

### Step 3：新增保存 B 站外链接口

范围：

- `server/routes/godspot.ts`
- `server/lib/godspotStore.ts`

任务：

1. 新增 `POST /api/godspot/save-bilibili`。
2. 要求登录和限流。
3. 创建 `sourceType = "bilibili"` 的视频记录。
4. 删除接口识别 B 站记录，只删除元数据。

验证：

```bash
npm run lint
```

退出标准：

- 能保存一条 B 站外链视频。
- `GET /api/godspot/videos` 能查到该记录。
- 删除该记录不会触发文件/云对象删除异常。

### Step 4：前端上传面板双模式

范围：

- `src/pages/GodSpotPage.tsx`

任务：

1. 增加 `uploadMode` 状态。
2. 左侧面板增加“本地上传 / B站外链”切换。
3. B 站外链模式下隐藏文件选择，显示保存外链按钮。
4. 保存成功后刷新列表并自动切到新记录预览。
5. 文案明确说明“不下载视频，只保存链接并嵌入播放”。

验证：

```bash
npm run lint
```

退出标准：

- 本地上传模式仍可用。
- B 站外链模式能保存记录。
- 用户不再误以为识别标题会自动上传视频。

### Step 5：预览区和卡片支持 iframe 播放

范围：

- `src/pages/GodSpotPage.tsx`

任务：

1. 根据 `sourceType` 判断使用 `<video>` 或 `<iframe>`。
2. B 站播放器 URL 使用 `bvid` 动态生成。
3. 卡片显示封面图或 B 站占位。
4. 增加“打开原视频”兜底按钮。
5. 显示 `B站外链` 标签。

验证：

```bash
npm run lint
```

退出标准：

- 点击 B 站卡片，右侧显示 iframe 播放器。
- 点击本地视频卡片，右侧仍显示 HTML5 video。
- B 站 iframe 失败时用户能打开原视频。

### Step 6：体验细节和回归

范围：

- `src/pages/GodSpotPage.tsx`
- `docs/release-notes.md`，正式发版时再更新

任务：

1. 检查移动端布局。
2. 检查深色模式样式。
3. 检查无视频、加载中、错误状态。
4. 如作为正式版本发布，按版本规则更新版本号和 release notes。

验证：

```bash
npm run lint
npm run build
```

退出标准：

- 页面核心路径可用。
- 构建通过。
- 没有破坏现有上传、筛选、删除能力。

## 风险和兜底

### B 站禁止嵌入或视频不可播放

兜底：显示“打开原视频”按钮。

### 标题/封面解析失败

兜底：允许用户手动填写标题；封面缺失时显示占位卡片。

### 旧数据字段缺失

兜底：查询时补默认 `sourceType = "upload"`。

### 用户误解“识别标题=上传视频”

兜底：按钮和提示文案必须明确：

```text
识别标题不会上传视频；如要保存 B 站视频，请切换到 B 站外链模式并点击保存。
```

## 推荐实现顺序

1. 数据模型兼容。
2. 后端解析增强。
3. 保存 B 站外链接口。
4. 前端双模式上传面板。
5. iframe 预览和卡片展示。
6. 回归测试和正式发版。

## 是否需要升版本

如果只是先提交计划文档，不需要升版本。

如果实现完整 B 站外链嵌入能力，属于新增功能，建议从 `1.3.2` 升到 `1.4.0`。
