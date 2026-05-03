---
name: v1.1-comprehensive-optimization
overview: 基于之前的动效分析，对项目执行全面优化：启用 framer-motion 动效系统、GPU 加速、服务端压缩、Vite 构建压缩，完成后升级版本号至 v1.1.0 并提交推送打标签。
todos:
  - id: install-deps
    content: 安装新依赖（compression, vite-plugin-compression）并移除 motion 死包
    status: completed
  - id: create-motion-provider
    content: 创建 MotionProvider.tsx 动画变体预设中心
    status: completed
    dependencies:
      - install-deps
  - id: gpu-css-optimization
    content: 优化 index.css 中 fadeInUp 改用 translate3d 和 will-change
    status: completed
  - id: modal-animations
    content: 为所有 Modal 组件添加 framer-motion 进出动画（AddGunModal, AuthModal, AutoCollectConfigModal, ModelConfigModal）
    status: completed
    dependencies:
      - create-motion-provider
  - id: toast-and-list-animations
    content: App.tsx Toast 动画改用 AnimatePresence + motion.div，卡片列表改用 motion.div stagger
    status: completed
    dependencies:
      - create-motion-provider
  - id: server-compression
    content: server.ts 添加 compression 中间件，vite.config.ts 配置 brotli 压缩
    status: completed
    dependencies:
      - install-deps
  - id: version-update-and-release
    content: 更新版本号至 1.1.0，更新 progress.md 和 release-notes.md，构建验证，提交推送打标签
    status: completed
    dependencies:
      - modal-animations
      - toast-and-list-animations
      - server-compression
      - gpu-css-optimization
---

## 产品概述

对现有网站项目执行全面性能与动效优化，涵盖动效系统升级（启用已安装但未使用的 framer-motion）、GPU 加速、服务端压缩、Vite 构建压缩，完成后将版本号从 v1.0.22 升级至 v1.1.0，提交、推送并打上版本标签。

## 核心功能

- **动效系统升级**：启用 framer-motion，为所有 Modal 添加进出动画（AnimatePresence + scale/opacity），Toast 通知添加滑入滑出动画，卡片列表入场动画从 CSS 延迟替换为 framer-motion stagger，移除无效的 `animate-scale-up` class 并用 framer-motion 替代
- **GPU 加速**：CSS 动画改用 translate3d，为动画元素添加 will-change
- **服务端压缩**：Express 安装并启用 compression 中间件（gzip）
- **Vite 构建压缩**：安装 vite-plugin-compression 并配置 brotli 压缩
- **清理死依赖**：移除未使用的 `motion` 独立包（framer-motion 已内置）
- **版本更新与发布**：更新 package.json 版本号、progress.md 进度记录、release-notes.md 版本说明，构建验证，提交推送并打 v1.1.0 标签

## 技术栈

- 前端框架：React 19 + TypeScript
- 动效库：framer-motion（已安装未使用，本次全面启用）
- 样式：Tailwind CSS 4 + 自定义 CSS
- 构建工具：Vite 6
- 后端：Express.js
- 部署：Docker

## 实施方案

### 1. 动效系统升级（启用 framer-motion）

**策略**：创建统一的动画封装工具，系统性替换现有 CSS 动画。

**具体改动**：

- **创建 `src/components/MotionProvider.tsx`**：封装常用动画变体（variants），包括 fadeInUp、scaleIn、slideInBottom 等预设，作为全站动画配置中心
- **Modal 进出动画**：4 个 Modal 组件（AddGunModal、AuthModal、AutoCollectConfigModal、ModelConfigModal）+ 1 个社区 Composer 弹出，全部使用 AnimatePresence 包裹，内容区使用 motion.div 添加 initial/animate/exit 动画
- **Toast 动画**：App.tsx 中 Toast 用 AnimatePresence + motion.div 替代 animate-fade-in
- **卡片入场动画**：App.tsx 中 renderGridElements 非排序模式下，将 animate-fade-in + animationDelay 替换为 motion.div 的 stagger children 效果；CommunityFeed.tsx 同理
- **页面级动画**：CommunityPage、SettingsPage 的容器用 motion.div 替代 animate-fade-in
- **修复 AuthModal**：移除无效的 `animate-scale-up` class，用 framer-motion 动画替代
- **保留兼容**：CSS 中的 `.animate-fade-in` 保留（用于 Header 下拉菜单等纯 CSS 场景），但改用 translate3d

### 2. GPU 加速

- `index.css` 中 `fadeInUp` 动画改用 `translate3d(0, 16px, 0)` / `translate3d(0, 0, 0)`
- `.animate-fade-in` 添加 `will-change: transform, opacity`
- GunCard 的 hover 效果 `hover:-translate-y-0.5` 保持（Tailwind 已自动使用 transform，浏览器可 GPU 加速）

### 3. 服务端压缩

- 安装 `compression` 和 `@types/compression`
- 在 `server.ts` 中 `app.use(express.json())` 之后添加 `app.use(compression())`
- compression 默认使用 gzip，兼容性最佳

### 4. Vite 构建压缩

- 安装 `vite-plugin-compression` 为 devDependency
- 在 `vite.config.ts` 中配置 brotliCompress 算法，生成 .br 预压缩文件
- Nginx 可直接使用预压缩文件（需配置 `gzip_static on` / `brotli_static on`），即使不配置也不会影响正常访问

### 5. 清理死依赖

- 移除 `motion` 独立包：framer-motion v12 已内置 motion 核心，无需单独安装
- 运行 `npm uninstall motion` 清理

### 6. 版本更新与发布

- `package.json` version: `1.0.22` → `1.1.0`
- `docs/progress.md` 新增 `2026.5.3-1` 记录
- `docs/release-notes.md` 新增 `v1.1.0` 版本说明
- `npm run build` 验证
- `npm run lint` 验证
- 全部通过后：git add + commit + push + tag v1.1.0 + push tag

## 实施注意事项

- **不提前提交**：所有优化彻底完成后才能执行 git 操作
- **AnimatePresence 必须包裹条件渲染的外层**：`{isOpen && <Modal />}` 改为 `<AnimatePresence>{isOpen && <motion.div ... exit={...} />}</AnimatePresence>`
- **will-change 谨慎使用**：只加在确实会播放动画的元素上，不在静态元素上滥用
- **framer-motion 的 motion 包**：framer-motion v12 内部依赖 motion，移除独立 motion 包后需确认 framer-motion 正常工作
- **Modal 的 backdrop-blur**：AuthModal 使用了 backdrop-blur-sm，需确保 framer-motion 动画不影响模糊效果
- **服务端 compression 中间件位置**：必须在路由注册之前，但在 express.json() 之后
- **vite-plugin-compression 只在构建时生效**：不影响开发模式

## 架构设计

```
动画架构层次：
┌─────────────────────────────────┐
│         MotionProvider           │  ← 动画变体预设中心
│  (fadeInUp, scaleIn, slideIn)   │
└────────────┬────────────────────┘
             │
    ┌────────┴────────┐
    │                 │
┌───▼───┐       ┌────▼────┐
│ Modal │       │  Toast   │    ← AnimatePresence + motion.div
│进出动画│       │ 滑入滑出 │
└───────┘       └─────────┘
    │
┌───▼───┐       ┌─────────┐
│ 列表   │       │  页面    │    ← motion.div stagger / fadeInUp
│stagger │       │  入场    │
└───────┘       └─────────┘
```

## 目录结构

```
d:\Desktop\网站2\
├── package.json                          # [MODIFY] version 1.0.22→1.1.0, 移除 motion, 新增 compression + vite-plugin-compression
├── vite.config.ts                        # [MODIFY] 添加 viteCompression 插件
├── server.ts                             # [MODIFY] 添加 compression 中间件
├── src/
│   ├── index.css                         # [MODIFY] fadeInUp 改 translate3d, animate-fade-in 加 will-change
│   ├── App.tsx                           # [MODIFY] Toast 用 AnimatePresence + motion.div, 卡片列表用 motion.div stagger
│   ├── components/
│   │   ├── MotionProvider.tsx            # [NEW] 动画变体预设中心，导出常用 variants 和 transition 配置
│   │   ├── AddGunModal.tsx               # [MODIFY] 用 AnimatePresence + motion.div 添加进出动画
│   │   ├── AuthModal.tsx                 # [MODIFY] 移除 animate-scale-up, 用 framer-motion 进出动画
│   │   ├── AutoCollectConfigModal.tsx    # [MODIFY] 用 AnimatePresence + motion.div 添加进出动画
│   │   ├── ModelConfigModal.tsx          # [MODIFY] 用 AnimatePresence + motion.div 添加进出动画
│   │   ├── DailyPwdCard.tsx              # [MODIFY] animate-fade-in → motion.div（可选，低优先）
│   │   ├── community/
│   │   │   ├── CommunityFeed.tsx         # [MODIFY] 卡片 stagger 改用 motion.div
│   │   │   └── CommunityComposer.tsx     # [MODIFY] animate-fade-in → motion.div（可选，低优先）
│   │   └── ...
│   └── pages/
│       └── CommunityPage.tsx             # [MODIFY] animate-fade-in → motion.div
├── docs/
│   ├── progress.md                       # [MODIFY] 新增 2026.5.3-1 记录
│   └── release-notes.md                  # [MODIFY] 新增 v1.1.0 版本说明
```

## SubAgent

- **code-explorer**
- Purpose: 在实施过程中如需深入搜索其他组件代码模式时使用
- Expected outcome: 快速定位需要修改的代码位置，确认实现方式与现有代码风格一致