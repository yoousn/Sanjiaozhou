# 项目断点存档

## 当前项目目标

这个项目当前目标分成 2 部分：

1. 网站继续稳定跑在 `127.0.0.1:3000`，前端 + Express 一体运行，数据仍写入 `src/data.json`。
2. 完成“手动采集改枪码”流程：选枪械 → 选博主 → 搜索命中视频 → 多选视频 → 选模型 → 测试模型 → 确认加入网站。

当前这条采集链路的真实需求已经明确：
- 默认模型固定为 `openai/gpt-oss-120b`
- 搜索结果显示在“命中视频”区域，并支持多选
- 点击“确认加入网站”后，自动把选中视频提取出的内容合并进现有卡片；没有卡片就新增
- 搜索阶段必须能看到当前执行到哪里，不能只显示空 loading
- 页面不能因为采集过程自动刷新，弹窗不能闪退
- 中文标题、简介、提取结果不能乱码
- “确认加入网站”速度需要明显优化

---

## 已完成内容

### 后端接口骨架已完成
`server.ts` 已经具备并正在使用这些接口：
- `GET /api/builds`
- `GET /api/collect/meta`
- `POST /api/collect/search`
- `POST /api/collect/preview`
- `POST /api/model/test`
- `POST /api/collect/apply`

核心业务规则也已经在 `server.ts` 中落好：
- 同枪合并到同一卡片
- 单枪最多保留 5 条配置
- `locked` 配置优先保留，不被新采集覆盖

### 旧问题里已确认修过的点
- Vite 监听 `scripts` 目录导致页面频繁刷新：已通过 `vite.config.ts` 忽略 `**/scripts/**` 处理
- 采集模型默认值：已固定默认 `120b`
- 搜索结果支持多选视频：前端结构已接上
- “生成预览”已从显式流程里弱化，当前交互目标是点击“确认加入网站”时内部先 preview 再 apply

### Python 采集脚本已经重构过一轮
`scripts/collect_bilibili_test.py` 已支持 3 种 mode：
- `search`
- `preview`
- `test-model`

并且已经做过这些调整：
- 搜索阶段会返回结构化 `logs`
- `yt-dlp` 已增加 `--socket-timeout 45`
- 默认不再写调试 JSON，避免触发页面 reload

---

## 当前仍然存在的问题

这是新会话需要直接接着处理的重点。

### 1. 搜索日志面板现在不是真实时
当前前端“搜索实时记录”面板会一直显示“正在等待服务器返回搜索日志…”，原因是：
- 现在 `server.ts` 的搜索仍然主要依赖同步等待 Python 进程结束后一次性返回 JSON
- 前端虽然有日志卡片，但还没有真正持续轮询/流式拿到搜索中的过程日志

结果：
- 搜索中用户看不到“当前执行了什么命令 / 正在抓哪位博主 / 正在抓哪个视频”
- 请求结束后 UI 又可能退回空状态，体验还是不对

### 2. 中文乱码
用户已经反馈：
- 搜索命中的视频标题出现乱码
- 加入网站后的卡片内容也出现乱码

这说明当前至少有一处编码链路有问题，重点排查：
- `scripts/collect_bilibili_test.py` 输出编码
- `server.ts` 读取 Python stdout 的编码
- `yt-dlp` / subprocess / Windows 控制台编码影响
- 前端收到的视频标题、简介、提取结果是否已经在接口层被污染

已知高风险点：
- 之前 Python 输出里做过 `gbk` 编码转换，这非常可能是乱码根因
- 新会话必须先确认这段是否已经彻底去掉，并检查接口实测返回值是否还是乱码

### 3. 确认加入网站很慢
当前“确认加入网站”慢的核心原因大概率是：
- 预览阶段 `preview_mode()` 还会重新走一遍搜索链路
- 也就是用户已经搜到并勾选视频后，点确认时又重复去 B 站抓一次

正确优化方向已经很明确：
- 搜索完成时前端就拿到了命中视频的完整信息
- `preview` 不应该再重新 search
- 应该把已选视频数据直接传给 preview / AI 提取阶段，只处理勾选的视频

---

## 当前关键文件状态

### `server.ts`
状态：不要重做整体结构，只在现有接口基础上继续修。

重点：
- 保留现有 collect 接口结构
- 在此基础上补“搜索开始 + 状态查询”或其它稳定的实时日志方案
- 处理 Python stdout/stderr 编码与日志透传
- 优化 preview，不再重复 search

### `scripts/collect_bilibili_test.py`
状态：这是接下来最关键的修复点之一。

重点：
- 确认 stdout 统一输出 UTF-8 JSON
- 进度日志从 stderr 输出，格式固定，便于 Node 实时解析
- `preview_mode()` 支持直接接收前端已选视频数据，避免二次搜索
- 保留 `search / preview / test-model` 三模式，不要退回旧脚本

### `src/App.tsx`
状态：已接 collect 流程，但仍需继续补齐。

重点：
- 搜索时不能只等最终结果，要有轮询/状态刷新
- 搜索日志应在请求进行中持续更新
- 搜索完成后不能错误退回“这里会显示搜索命中的视频”空态
- apply 时把已选视频完整数据传给后端 preview

### `src/components/CollectModal.tsx`
状态：UI 骨架已在，但交互还没完全对。

重点：
- “搜索实时记录”卡片要显示真实进行中的状态
- 搜索中、搜索完成、有错误、有结果，这 4 个状态要稳定切换
- 如果命中视频存在，不要被空态覆盖
- 必要时把日志卡与命中视频列表同时保留

### `vite.config.ts`
状态：已改过。

保留当前这点：
- `server.watch.ignored` 要继续忽略 `**/scripts/**`

---

## 根因结论

### 关于 `Read timed out`
这个报错不是 120b 模型没发请求导致的，根因链路是：
- 搜索阶段先用 `yt-dlp` 抓 B 站博主视频列表和视频详情
- 抓某个视频详情时，请求 `https://www.bilibili.com/video/...`
- 该请求超时，报 `Read timed out`
- 因为流程卡在搜索阶段，所以根本还没进入 AI preview / apply 阶段

### 关于乱码
根因高度怀疑是“Python 输出编码转换 + Node 解析 stdout”链路不一致，优先按 UTF-8 全链路统一处理。

### 关于确认加入慢
根因高度怀疑是 preview 阶段重复 search，造成多余的 B 站抓取和等待。

---

## 下一步计划

新会话开始后，严格按这个顺序继续：

1. 先读这份 `DEPLOYMENT_GUIDE.md`，再读当前最新的：
   - `server.ts`
   - `scripts/collect_bilibili_test.py`
   - `src/App.tsx`
   - `src/components/CollectModal.tsx`
   - `src/types.ts`

2. 第一优先级先修“实时日志 + 乱码 + apply 过慢”这 3 个问题，不要先做别的样式优化。

3. 具体先做这 3 件事：
   - 在 `server.ts` 补一个可工作的搜索实时状态方案：`search/start` + `search/status/:id`，由前端轮询
   - 在 `scripts/collect_bilibili_test.py` 确保日志走 `stderr`，最终 JSON 走 UTF-8 `stdout`
   - 改 `preview_mode()` 和前端 `handleApply`，让 preview 直接使用已选视频数据，不再重新 search

4. 然后立刻做实测验证：
   - 搜索时日志卡会持续更新，不再一直显示“正在等待服务器返回搜索日志…”
   - 视频标题、简介、加入后的卡片中文不乱码
   - 点击“确认加入网站”速度明显快于之前
   - 页面不刷新，弹窗不闪退

5. 最后再运行：
   - `npm run lint`
   - 启动/重启 `127.0.0.1:3000` 服务做手测

---

## 新会话第一句话建议

把下面这段直接带到新会话最前面：

```md
先读 jx.md，再继续 d:\Desktop\网站2 项目。
不要重做 server.ts 的 collect 接口结构。
当前优先修 3 个问题：
1. 搜索实时日志要在搜索过程中持续显示
2. 搜索结果和加入后的内容中文乱码要彻底修掉
3. 点击“确认加入网站”过慢，要避免 preview 阶段重复 search
先检查 server.ts、scripts/collect_bilibili_test.py、src/App.tsx、src/components/CollectModal.tsx、src/types.ts 的当前最新状态，再直接继续改。
```
